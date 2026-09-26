import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

interface RequestWithRawBody extends express.Request {
  rawBody?: Buffer;
}

// In-memory set of processed payment references to prevent duplicate stock decrements or processing
const processedReferences = new Set<string>();
const sentAbandonedReminders = new Set<string>();

// Rate Limiting helper: in-memory sliding window bucket
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitBuckets = new Map<string, RateLimitBucket>();

function checkRateLimit(key: string, limit = 10, windowMs = 60000): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetInSec: Math.ceil(windowMs / 1000) };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetInSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, resetInSec: Math.ceil((bucket.resetAt - now) / 1000) };
}

const DEFAULT_DELIVERY_FEE = 3500;
const DEFAULT_FREE_DELIVERY_THRESHOLD = 35000;

function getSupabaseConfig() {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  return {
    supabaseUrl,
    supabaseKey: supabaseServiceKey || supabaseAnonKey,
    hasServiceRole: Boolean(supabaseServiceKey),
  };
}

async function checkDatabaseRateLimit(
  key: string,
  limit = 10,
  windowSeconds = 60
): Promise<{ allowed: boolean; remaining: number; resetInSec: number; enforcedBy: string }> {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  if (supabaseUrl && supabaseKey) {
    try {
      const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/check_and_increment_rate_limit`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_key: key,
          p_max_requests: limit,
          p_window_seconds: windowSeconds,
        }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as {
          allowed?: boolean;
          remaining?: number;
          retry_after?: number;
        } | null;
        if (data && typeof data.allowed === 'boolean') {
          return {
            allowed: data.allowed,
            remaining: Number(data.remaining ?? 0),
            resetInSec: Number(data.retry_after || windowSeconds),
            enforcedBy: 'database',
          };
        }
      }
    } catch {
      // Fallback to local memory bucket if DB RPC not yet applied
    }
  }
  const mem = checkRateLimit(key, limit, windowSeconds * 1000);
  return { ...mem, enforcedBy: 'memory_fallback' };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitBuckets.entries()) {
    if (now > v.resetAt) rateLimitBuckets.delete(k);
  }
}, 5 * 60 * 1000);

// Server-side admin login attempt store
interface LoginAttemptRecord {
  failedCount: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}
const adminLoginAttempts = new Map<string, LoginAttemptRecord>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Capture raw body for webhook HMAC signature verification
  app.use(
    express.json({
      verify: (req: RequestWithRawBody, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // CORS / headers for internal APIs
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Paystack-Signature');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Jazelle Skin Haven Full-Stack API',
      paystackKeyConfigured: Boolean(process.env.PAYSTACK_SECRET_KEY),
      resendKeyConfigured: Boolean(process.env.RESEND_API_KEY),
      webhookEndpoint: '/api/paystack-webhook',
      timestamp: new Date().toISOString(),
    });
  });

  // Secure Paystack Verification API (Called from client post-payment)
  app.post(['/api/verify-paystack', '/api/paystack/verify'], async (req, res) => {
    try {
      const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
        .split(',')[0]
        .trim();

      const { reference, orderNumber, contact } = req.body || {};
      const rawRef = reference || orderNumber;

      if (!rawRef || typeof rawRef !== 'string') {
        return res.status(400).json({
          verified: false,
          error: 'Transaction reference is required and must be a string',
          message: 'Missing or invalid transaction reference parameter',
        });
      }

      const cleanRef = rawRef.trim();
      if (cleanRef.length < 4 || cleanRef.length > 128 || !/^[a-zA-Z0-9_\-.:/]+$/.test(cleanRef)) {
        return res.status(400).json({
          verified: false,
          error: 'Invalid reference format',
          message: 'Reference must be between 4 and 128 alphanumeric characters',
        });
      }

      // 1. Database-backed Rate Limiting: Max 5 attempts per 60s per reference, 15 per 60s per IP
      const refLimit = await checkDatabaseRateLimit(`verify_paystack_ref:${cleanRef}`, 5, 60);
      if (!refLimit.allowed) {
        res.setHeader('Retry-After', String(refLimit.resetInSec));
        return res.status(429).json({
          verified: false,
          status: 'rate_limited',
          enforcedBy: refLimit.enforcedBy,
          error: `Too many verification attempts for reference "${cleanRef}". Please wait before retrying.`,
          message: `Too many verification attempts for reference "${cleanRef}". Please wait ${refLimit.resetInSec} seconds before retrying.`,
          retryAfterSeconds: refLimit.resetInSec,
        });
      }

      const ipLimit = await checkDatabaseRateLimit(`verify_paystack_ip:${clientIp}`, 15, 60);
      if (!ipLimit.allowed) {
        res.setHeader('Retry-After', String(ipLimit.resetInSec));
        return res.status(429).json({
          verified: false,
          status: 'rate_limited',
          enforcedBy: ipLimit.enforcedBy,
          error: 'Rate limit exceeded: Too many verification requests. Please wait a minute before retrying.',
          message: 'Rate limit exceeded: Too many verification requests. Please wait a minute before retrying.',
          retryAfterSeconds: ipLimit.resetInSec,
        });
      }

      const { supabaseUrl, supabaseKey, hasServiceRole } = getSupabaseConfig();
      if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({
          verified: false,
          status: 'config_missing',
          message: 'Supabase URL or key is missing on server.',
        });
      }

      // 2. Look up the actual order in Supabase by reference (order_number)
      let orderRow: Record<string, unknown> | null = null;
      if (hasServiceRole) {
        const ordResp = await fetch(
          `${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(cleanRef)}&select=*`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );
        if (ordResp.ok) {
          const rows = (await ordResp.json()) as Array<Record<string, unknown>>;
          if (Array.isArray(rows) && rows.length > 0) {
            orderRow = rows[0];
          }
        }
      }

      if (!orderRow) {
        // Fallback to track_order RPC if service_role is not in local env
        const trackResp = await fetch(`${supabaseUrl}/rest/v1/rpc/track_order`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_order_number: cleanRef,
            p_contact: typeof contact === 'string' ? contact : '',
          }),
        });
        if (trackResp.ok) {
          const tracked = await trackResp.json();
          if (tracked && typeof tracked === 'object' && !Array.isArray(tracked)) {
            orderRow = tracked as Record<string, unknown>;
          } else if (Array.isArray(tracked) && tracked.length > 0) {
            orderRow = tracked[0] as Record<string, unknown>;
          }
        }
      }

      if (!orderRow) {
        return res.status(404).json({
          verified: false,
          status: 'order_not_found',
          message: `Order "${cleanRef}" was not found in the database.`,
        });
      }

      // 3. Recalculate true expected total server-side from public.products, public.coupons, and public.site_settings
      const orderItems = Array.isArray(orderRow.items)
        ? (orderRow.items as Array<{ id?: string; slug?: string; name?: string; quantity?: number }>)
        : [];
      if (orderItems.length === 0) {
        return res.status(400).json({
          verified: false,
          status: 'invalid_order_items',
          message: 'Order contains no line items.',
        });
      }

      const prodResp = await fetch(`${supabaseUrl}/rest/v1/products?select=id,slug,name,price,stock`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });
      const dbProducts = prodResp.ok
        ? ((await prodResp.json()) as Array<{ id?: string; slug?: string; name?: string; price: number; stock?: number }>)
        : [];

      if (!Array.isArray(dbProducts) || dbProducts.length === 0) {
        return res.status(500).json({
          verified: false,
          status: 'catalog_lookup_failed',
          message: 'Unable to load product catalog from database for server-side price calculation.',
        });
      }

      let serverSubtotal = 0;
      for (const item of orderItems) {
        const qty = Math.floor(Number(item.quantity) || 0);
        if (qty <= 0) {
          return res.status(400).json({
            verified: false,
            status: 'invalid_item_quantity',
            message: `Invalid item quantity for "${item.name || item.slug}".`,
          });
        }

        const matchedProduct = dbProducts.find(
          (p) => (item.slug && p.slug === item.slug) || (item.id && p.id === item.id)
        );
        if (!matchedProduct) {
          return res.status(400).json({
            verified: false,
            status: 'unknown_product',
            message: `Product "${item.slug || item.name}" does not exist in the catalog.`,
          });
        }
        serverSubtotal += Number(matchedProduct.price) * qty;
      }

      // Re-validate coupon server-side if attached
      let serverDiscountAmount = 0;
      const rawCouponCode = orderRow.coupon_code ? String(orderRow.coupon_code).trim().toUpperCase() : '';

      if (rawCouponCode) {
        let couponValid = false;
        let discountType = 'percentage';
        let discountValue = 0;
        let couponFailureReason = `Security Check Failed: Promo code "${rawCouponCode}" is invalid, expired, or has reached its usage limit.`;

        if (hasServiceRole) {
          const coupResp = await fetch(
            `${supabaseUrl}/rest/v1/coupons?code=ilike.${encodeURIComponent(rawCouponCode)}&select=*`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
            }
          );
          if (coupResp.ok) {
            const coupRows = (await coupResp.json()) as Array<Record<string, unknown>>;
            const couponRow = coupRows?.[0];
            if (couponRow && couponRow.is_active === true) {
              const notExpired =
                !couponRow.expiry_date || new Date(String(couponRow.expiry_date)).getTime() >= Date.now();
              const usageLimit =
                couponRow.usage_limit !== null && couponRow.usage_limit !== undefined
                  ? Number(couponRow.usage_limit)
                  : null;
              const usedCount = Number(couponRow.used_count || 0);
              const underLimit = usageLimit === null || usageLimit <= 0 || usedCount < usageLimit;
              if (notExpired && underLimit) {
                couponValid = true;
                discountType = String(couponRow.discount_type || 'percentage');
                discountValue = Number(couponRow.discount_value || 0);
              }
            }
          }
        } else {
          // Validate via SECURITY DEFINER RPC validate_coupon(p_code)
          const rpcResp = await fetch(`${supabaseUrl}/rest/v1/rpc/validate_coupon`, {
            method: 'POST',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ p_code: rawCouponCode }),
          });
          if (rpcResp.ok) {
            const rpcResult = (await rpcResp.json()) as {
              valid?: boolean;
              discount_type?: string;
              discount_value?: number;
              message?: string;
            } | null;
            if (rpcResult && rpcResult.valid === true) {
              couponValid = true;
              discountType = String(rpcResult.discount_type || 'percentage');
              discountValue = Number(rpcResult.discount_value || 0);
            } else if (rpcResult?.message) {
              couponFailureReason = `Security Check Failed: ${rpcResult.message}`;
            }
          }
        }

        if (!couponValid) {
          return res.status(400).json({
            verified: false,
            status: 'invalid_coupon',
            message: couponFailureReason,
          });
        }

        if (discountType === 'percentage') {
          serverDiscountAmount = Math.min(
            serverSubtotal,
            Math.round((serverSubtotal * discountValue) / 100)
          );
        } else {
          serverDiscountAmount = Math.min(serverSubtotal, Math.max(0, Math.round(discountValue)));
        }
      }

      // Fetch free_delivery_threshold from site_settings
      const settingsResp = await fetch(
        `${supabaseUrl}/rest/v1/site_settings?key=eq.free_delivery_threshold&select=value`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      const settingsRows = settingsResp.ok
        ? ((await settingsResp.json()) as Array<{ value?: string }>)
        : [];
      const parsedThreshold = settingsRows?.[0]?.value ? Number(settingsRows[0].value) : NaN;
      const freeDeliveryThreshold =
        Number.isFinite(parsedThreshold) && parsedThreshold >= 0
          ? parsedThreshold
          : DEFAULT_FREE_DELIVERY_THRESHOLD;

      const serverDeliveryFee =
        serverSubtotal === 0 || serverSubtotal >= freeDeliveryThreshold ? 0 : DEFAULT_DELIVERY_FEE;
      const serverExpectedTotalNaira = Math.max(0, serverSubtotal - serverDiscountAmount) + serverDeliveryFee;
      const serverExpectedKobo = Math.round(serverExpectedTotalNaira * 100);

      // Detect if client tampered with order discount_amount or total before checkout
      const clientOrderDiscount = Math.round(Number(orderRow.discount_amount || 0));
      const clientOrderTotalNaira = Math.round(Number(orderRow.total || 0));

      if (
        Math.abs(clientOrderDiscount - serverDiscountAmount) > 1 ||
        Math.abs(clientOrderTotalNaira - serverExpectedTotalNaira) > 1
      ) {
        return res.status(400).json({
          verified: false,
          status: 'amount_mismatch',
          message: `Security Verification Rejected: Tampered discount or order total detected. Client submitted discount ₦${clientOrderDiscount.toLocaleString()} (total ₦${clientOrderTotalNaira.toLocaleString()}), but server calculated discount ₦${serverDiscountAmount.toLocaleString()} (true expected total ₦${serverExpectedTotalNaira.toLocaleString()}).`,
          serverExpectedTotalNaira,
          serverDiscountAmount,
          clientOrderTotalNaira,
          clientOrderDiscount,
        });
      }

      const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();

      if (!secretKey) {
        console.error('[Server Paystack Verify] Error: PAYSTACK_SECRET_KEY is not set in environment variables');
        return res.status(500).json({
          verified: false,
          status: 'config_missing',
          error: 'Server configuration error: PAYSTACK_SECRET_KEY is not configured',
          message: 'Payment verification secret key is not set on the server.',
        });
      }

      const verifyUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanRef)}`;

      const paystackRes = await fetch(verifyUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const rawText = await paystackRes.text();
      let paystackData: Record<string, unknown> | null = null;
      try {
        paystackData = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        return res.status(400).json({
          verified: false,
          status: 'paystack_api_error',
          message: `Paystack API returned non-JSON response (HTTP ${paystackRes.status})`,
          rawResponse: rawText.slice(0, 300),
          httpStatus: paystackRes.status,
        });
      }

      if (!paystackRes.ok || !paystackData?.status) {
        return res.status(400).json({
          verified: false,
          status: (paystackData?.data as Record<string, unknown>)?.status || paystackData?.code || 'failed',
          message: paystackData?.message || 'Transaction could not be verified by Paystack',
          rawResponse: paystackData,
          httpStatus: paystackRes.status,
        });
      }

      const tx = (paystackData.data || {}) as Record<string, unknown>;
      const isSuccess = tx.status === 'success';
      if (!isSuccess) {
        return res.status(400).json({
          verified: false,
          status: String(tx.status || 'failed'),
          message: `Payment status is "${tx.status}".`,
        });
      }

      // Compare paid amount strictly against SERVER-CALCULATED total (never client expectedAmount)
      const paidKobo = Number(tx.amount || 0);
      if (Math.abs(paidKobo - serverExpectedKobo) > 100) {
        return res.status(400).json({
          verified: false,
          status: 'amount_mismatch',
          message: `Paid amount (₦${(paidKobo / 100).toLocaleString()}) does not match server-calculated order total (₦${serverExpectedTotalNaira.toLocaleString()})`,
          paidKobo,
          serverExpectedKobo,
        });
      }

      if (tx.reference) {
        processedReferences.add(String(tx.reference));
      }

      // 5. Finalize the order in Supabase server-side (status -> placed, payment_status -> paid, stock decrement, coupon used_count increment)
      try {
        await fetch(`${supabaseUrl}/rest/v1/rpc/claim_order_stock_decrement`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_order_number: cleanRef,
            p_payment_reference: String(tx.reference || cleanRef),
          }),
        });

        if (hasServiceRole) {
          await fetch(`${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(cleanRef)}`, {
            method: 'PATCH',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'placed',
              subtotal: serverSubtotal,
              discount_amount: serverDiscountAmount,
              delivery_fee: serverDeliveryFee,
              total: serverExpectedTotalNaira,
              updated_at: new Date().toISOString(),
            }),
          });
        }
      } catch (finErr) {
        console.warn('[Server Paystack Verify] Order finalization RPC notice:', finErr);
      }

      return res.status(200).json({
        verified: true,
        status: tx.status,
        reference: tx.reference,
        amount: paidKobo,
        serverExpectedKobo,
        serverDiscountAmount,
        channel: tx.channel,
        paid_at: tx.paid_at,
        customer: tx.customer,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown server error';
      console.error('[Server Paystack Verify] Unhandled error:', err);
      return res.status(500).json({
        error: `Server verification error: ${msg}`,
        verified: false,
      });
    }
  });

  // ============================================================
  // SECURE PAYSTACK WEBHOOK API (Backup verification & browser drop protection)
  // Verifies x-paystack-signature with HMAC SHA512
  // Enforces server-side database idempotency
  // ============================================================
  app.post('/api/paystack-webhook', async (req: RequestWithRawBody, res) => {
    try {
      // Database-backed rate limit on webhook endpoint (max 30/minute per IP)
      const webhookIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
        .split(',')[0]
        .trim();
      const webhookLimit = await checkDatabaseRateLimit(`paystack_webhook:${webhookIp}`, 30, 60);
      if (!webhookLimit.allowed) {
        res.setHeader('Retry-After', String(webhookLimit.resetInSec));
        return res.status(429).json({
          error: 'Webhook rate limit exceeded',
          enforcedBy: webhookLimit.enforcedBy,
        });
      }

      const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();

      if (!secretKey) {
        console.error('[Paystack Webhook] PAYSTACK_SECRET_KEY not configured');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const signature = req.headers['x-paystack-signature'] as string | undefined;

      if (!signature) {
        console.warn('[Paystack Webhook] Missing x-paystack-signature header');
        return res.status(401).json({ error: 'Missing webhook signature header' });
      }

      // Compute HMAC SHA512 digest from raw request body
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
      const expectedSignature = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');

      // Constant-time signature comparison to prevent timing attacks
      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (
        signatureBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
      ) {
        console.warn('[Paystack Webhook] Signature verification failed');
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      const event = req.body?.event;
      const data = req.body?.data || {};

      console.log(`[Paystack Webhook] Verified event received: ${event} for reference: ${data.reference}`);

      if (event === 'charge.success') {
        const reference = data.reference;

        if (!reference || typeof reference !== 'string') {
          return res.status(400).json({ error: 'Missing reference in webhook payload' });
        }

        // Database-level idempotency check:
        // Try to atomically claim stock decrement on the database
        const { supabaseUrl, supabaseKey } = getSupabaseConfig();

        try {
          const claimResp = await fetch(`${supabaseUrl}/rest/v1/rpc/claim_order_stock_decrement`, {
            method: 'POST',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ p_order_number: reference, p_payment_ref: reference }),
          });

          if (claimResp.ok) {
            const claimed = await claimResp.json();
            if (claimed === false) {
              console.log(
                `[Paystack Webhook Idempotency] Order ${reference} was already finalized and decremented in database. Skipping duplicate processing.`
              );
              return res.status(200).json({ status: 'ok', note: 'already_finalized_in_database' });
            }
          }
        } catch (dbErr) {
          console.warn('[Paystack Webhook] Database claim notice:', dbErr);
        }

        processedReferences.add(reference);

        return res.status(200).json({
          status: 'success',
          reference,
          message: 'Payment confirmed and claimed via webhook',
        });
      }

      return res.status(200).json({ status: 'ignored', event });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown webhook error';
      console.error('[Paystack Webhook] Error processing webhook:', err);
      return res.status(500).json({ error: msg });
    }
  });

  // ============================================================
  // SERVER-SIDE ADMIN LOGIN RATE LIMITING & LOCKOUT GUARD
  // Uses authoritative Supabase PostgreSQL table (admin_login_attempts) first,
  // with local in-memory map only as an offline dev fallback.
  // ============================================================
  app.get('/api/admin/login-guard', async (req, res) => {
    const email = String(req.query.email || '').trim().toLowerCase();
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
    const key = email || ip;

    const { supabaseUrl, supabaseKey } = getSupabaseConfig();

    // 1. Check authoritative PostgreSQL database first
    if (email) {
      try {
        const dbResp = await fetch(`${supabaseUrl}/rest/v1/rpc/check_admin_login_lockout`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ p_email: email }),
        });
        if (dbResp.ok) {
          const dbStatus = await dbResp.json();
          if (dbStatus?.locked) {
            return res.json({
              locked: true,
              remainingSeconds: dbStatus.remaining_seconds || 900,
              failedAttempts: dbStatus.failed_attempts || 5,
              enforcedBy: 'database',
            });
          }
        }
      } catch {
        // Fallback to local memory in dev if DB unreachable
      }
    }

    const now = Date.now();
    const record = adminLoginAttempts.get(key);

    if (record && record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return res.json({
        locked: true,
        remainingSeconds,
        failedAttempts: record.failedCount,
        enforcedBy: 'local-memory-fallback',
      });
    }

    return res.json({
      locked: false,
      remainingSeconds: 0,
      failedAttempts: record?.failedCount || 0,
    });
  });

  app.post('/api/admin/login-guard', async (req, res) => {
    const { email, success } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
    const key = cleanEmail || ip;

    const now = Date.now();
    let record = adminLoginAttempts.get(key);

    const { supabaseUrl, supabaseKey } = getSupabaseConfig();

    if (success) {
      if (record) {
        record.failedCount = 0;
        record.lockedUntil = null;
      }
      if (cleanEmail) {
        try {
          await fetch(`${supabaseUrl}/rest/v1/rpc/record_admin_login_attempt`, {
            method: 'POST',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ p_email: cleanEmail, p_success: true, p_ip: ip }),
          });
        } catch {
          // ignore
        }
      }
      return res.json({ status: 'ok', locked: false });
    }

    // Failed attempt
    if (!record) {
      record = { failedCount: 1, lockedUntil: null, lastAttemptAt: now };
    } else {
      record.failedCount += 1;
      record.lastAttemptAt = now;
    }

    const MAX_ATTEMPTS = 5;
    const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout matching DB

    if (record.failedCount >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS;
    }
    adminLoginAttempts.set(key, record);

    let dbStatus: Record<string, unknown> | null = null;
    if (cleanEmail) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/rpc/record_admin_login_attempt`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ p_email: cleanEmail, p_success: false, p_ip: ip }),
        });

        const checkResp = await fetch(`${supabaseUrl}/rest/v1/rpc/check_admin_login_lockout`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ p_email: cleanEmail }),
        });
        if (checkResp.ok) {
          dbStatus = await checkResp.json();
        }
      } catch {
        // ignore
      }
    }

    const isLocked = Boolean(dbStatus?.locked) || Boolean(record.lockedUntil && record.lockedUntil > now);
    const remainingSecs = isLocked
      ? Number(dbStatus?.remaining_seconds || Math.ceil(((record.lockedUntil || now) - now) / 1000))
      : 0;

    return res.json({
      status: isLocked ? 'locked' : 'recorded',
      locked: isLocked,
      remainingSeconds: remainingSecs,
      failedAttempts: record.failedCount,
    });
  });

  // Transactional Email Dispatch API
  app.post(['/api/send-order-email', '/api/send-email'], async (req, res) => {
    try {
      const data = req.body || {};
      const resendKey = process.env.RESEND_API_KEY?.trim();

      if (resendKey && resendKey.length > 0) {
        try {
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: data.from || 'Jazelle Skin Haven <orders@jazelleskinhaven.com>',
              to: data.to,
              subject: data.subject,
              html: data.html,
              text: data.text,
            }),
          });

          const resendData = await resendResponse.json();
          if (!resendResponse.ok) {
            console.warn('[Resend API Warning]', resendData);
            return res.status(200).json({
              id: `sim_${Date.now()}`,
              simulated: true,
              resendNotice: resendData.message || 'Resend domain pending verification',
            });
          }

          return res.status(200).json({ id: resendData.id, success: true });
        } catch (apiErr) {
          console.warn('[Resend Dispatch Error]', apiErr);
        }
      }

      // Simulated email log fallback (does not leak email content or keys)
      return res.status(200).json({
        id: `sim_${Date.now()}`,
        simulated: true,
        message: 'Order confirmation email generated (Resend API key not configured or simulated)',
      });
    } catch {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
  });

  // ============================================================
  // PENDING / ABANDONED CART RECOVERY SERVICE
  // ============================================================

  function buildAbandonedCartEmailHtml(order: {
    order_number: string;
    customer_name: string;
    items?: Array<{ name: string; quantity: number; price: number; image?: string }>;
    total: number;
  }, baseUrl: string) {
    const firstName = order.customer_name ? order.customer_name.trim().split(' ')[0] : 'there';
    const resumeUrl = `${baseUrl}/checkout?resume=${encodeURIComponent(order.order_number)}`;
    const itemsList = Array.isArray(order.items) ? order.items : [];

    const itemsRows = itemsList
      .map(
        (it) => `
        <div style="padding: 12px 0; border-bottom: 1px dashed #F5BCD5; display: table; width: 100%;">
          <div style="display: table-cell; vertical-align: middle; width: 65%;">
            <strong style="color: #760536; font-size: 14px; display: block;">${it.name}</strong>
            <span style="color: #A20B4C; font-size: 12px;">Qty: ${it.quantity} &times; ₦${Number(it.price || 0).toLocaleString()}</span>
          </div>
          <div style="display: table-cell; vertical-align: middle; text-align: right; font-weight: 700; color: #760536; font-size: 14px;">
            ₦${Number((it.price || 0) * (it.quantity || 1)).toLocaleString()}
          </div>
        </div>
      `
      )
      .join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; background-color: #FCF3F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #760536; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 28px; overflow: hidden; box-shadow: 0 10px 25px rgba(241, 49, 132, 0.08); border: 1px solid #F8DDE9; }
        .header { background: linear-gradient(135deg, #FCF3F7 0%, #F8DDE9 100%); padding: 36px 24px; text-align: center; border-bottom: 1px solid #F5BCD5; }
        .logo-text { font-size: 26px; font-weight: 700; color: #A20B4C; letter-spacing: -0.5px; margin: 0; }
        .tagline { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #F13184; margin-top: 4px; font-weight: 600; }
        .content { padding: 32px 28px; }
        .title { font-size: 22px; font-weight: 700; color: #760536; margin: 12px 0; }
        .lead { font-size: 15px; line-height: 1.6; color: #A20B4C; margin: 0 0 24px 0; }
        .box { background: #FCF3F7; border-radius: 16px; padding: 20px; border: 1px solid #F8DDE9; margin: 20px 0; }
        .btn { display: inline-block; background-color: #F13184; color: #ffffff !important; text-decoration: none; padding: 16px 36px; border-radius: 9999px; font-weight: 600; font-size: 15px; text-align: center; margin: 24px 0 10px 0; }
        .footer { background: #FCF3F7; padding: 24px; text-align: center; font-size: 12px; color: #A20B4C; border-top: 1px solid #F8DDE9; }
        .footer a { color: #F13184; text-decoration: none; font-weight: 600; margin: 0 8px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; background: #F8DDE9; color: #A20B4C; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo-text">Jazelle Skin Haven</h1>
          <div class="tagline">Your Self-Care Corner</div>
        </div>
        <div class="content">
          <span class="badge">Haven Cart Reminder</span>
          <h2 class="title">You left something in your cart, ${firstName}! 💕</h2>
          <p class="lead">
            We noticed you started checkout but didn't get to finish. Your self-care picks are still reserved for you, but popular products sell out quickly.
          </p>

          <div class="box">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #F13184; font-weight: 700; margin-bottom: 12px;">
              Reserved Items (Order #${order.order_number})
            </div>
            ${itemsRows}
            <div style="padding-top: 14px; margin-top: 6px; display: table; width: 100%;">
              <div style="display: table-cell; font-size: 14px; color: #760536; font-weight: 600;">Total with Delivery:</div>
              <div style="display: table-cell; text-align: right; font-size: 18px; font-weight: 800; color: #F13184;">
                ₦${Number(order.total || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0 10px 0;">
            <a href="${resumeUrl}" class="btn">
              Complete My Order &rarr;
            </a>
            <p style="font-size: 12px; color: #A20B4C; margin-top: 10px;">
              Your items and delivery information are saved and will be restored immediately.
            </p>
          </div>

          <div style="background: #ffffff; border-radius: 14px; border: 1px solid #F8DDE9; padding: 16px 20px; margin-top: 24px; text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #760536;">
              Questions about payment methods or shipping to your location?
            </p>
            <p style="margin: 8px 0 0 0; font-size: 13px;">
              <a href="https://wa.me/2348012345678?text=${encodeURIComponent(`Hi Jazelle! I have a question regarding my pending order ${order.order_number}`)}" style="color: #25D366; font-weight: 700; text-decoration: none;">
                Chat with us on WhatsApp &rarr;
              </a>
            </p>
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0 0 10px 0;">Jazelle Skin Haven &bull; Delivered with love across Nigeria</p>
          <div>
            <a href="https://instagram.com/jazelle.skin.haven">Instagram</a> &bull;
            <a href="https://wa.me/2348012345678">WhatsApp Us</a> &bull;
            <a href="mailto:hello@jazelleskinhaven.com">hello@jazelleskinhaven.com</a>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  // 1. Direct admin trigger endpoint for instant follow-up testing
  app.post('/api/admin/send-abandoned-reminder', async (req, res) => {
    try {
      const { order_number, customer_email, customer_name, items, total } = req.body || {};

      if (!order_number || !customer_email) {
        return res.status(400).json({ error: 'order_number and customer_email are required' });
      }

      const host = req.get('origin') || req.get('host') || 'https://jazelleskinhaven.com';
      const baseUrl = host.startsWith('http') ? host : `http://${host}`;
      const html = buildAbandonedCartEmailHtml({ order_number, customer_name, items, total }, baseUrl);

      const resendKey = process.env.RESEND_API_KEY?.trim();
      let emailResult = { simulated: true, id: `sim_${Date.now()}` };

      if (resendKey) {
        try {
          const resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Jazelle Skin Haven <orders@jazelleskinhaven.com>',
              to: customer_email,
              subject: `You left something in your cart! — Complete your Jazelle Haven order 💕`,
              html,
            }),
          });
          const json = await resp.json();
          if (resp.ok) {
            emailResult = { simulated: false, id: json.id };
          }
        } catch (resendErr) {
          console.warn('[Admin Reminder Email] Resend API notice:', resendErr);
        }
      }

      // Update order in Supabase
      const { supabaseUrl, supabaseKey } = getSupabaseConfig();

      try {
        await fetch(`${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(order_number)}`, {
          method: 'PATCH',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            reminder_sent: true,
            reminder_sent_at: new Date().toISOString(),
          }),
        });
      } catch {
        // ignore
      }

      return res.json({
        success: true,
        order_number,
        customer_email,
        emailResult,
        message: 'Abandoned cart reminder dispatched successfully',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return res.status(500).json({ error: msg });
    }
  });

  // 2. Automated cron / time-check endpoint for pending orders
  const runAbandonedOrdersCheck = async (forceAll = false, baseUrl = 'https://jazelleskinhaven.com') => {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();

    const resp = await fetch(
      `${supabaseUrl}/rest/v1/orders?select=*&status=eq.pending&order=created_at.desc`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!resp.ok) return { success: false, count: 0, checked: 0 };
    const orders = (await resp.json()) as Array<{
      order_number: string;
      customer_email: string;
      customer_name: string;
      created_at: string;
      items: Array<{ name: string; quantity: number; price: number; image?: string }>;
      total: number;
    }>;

    const now = Date.now();
    const sentList: string[] = [];
    const resendKey = process.env.RESEND_API_KEY?.trim();

    for (const ord of orders) {
      if (!forceAll && sentAbandonedReminders.has(ord.order_number)) {
        continue;
      }

      const orderTime = new Date(ord.created_at).getTime();
      const elapsedMinutes = (now - orderTime) / (1000 * 60);

      // Trigger if pending between 30 and 1440 minutes (24h), or if forceAll is true
      if (forceAll || (elapsedMinutes >= 30 && elapsedMinutes <= 1440)) {
        if (ord.customer_email) {
          const html = buildAbandonedCartEmailHtml(ord, baseUrl);
          if (resendKey) {
            try {
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${resendKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'Jazelle Skin Haven <orders@jazelleskinhaven.com>',
                  to: ord.customer_email,
                  subject: `You left something in your cart! — Complete your Jazelle Haven order 💕`,
                  html,
                }),
              });
            } catch {
              // ignore
            }
          }

          sentAbandonedReminders.add(ord.order_number);
          sentList.push(ord.order_number);
        }
      }
    }

    return { success: true, count: sentList.length, sentOrders: sentList, checked: orders.length };
  };

  app.all(['/api/cron/check-abandoned-orders', '/api/check-abandoned-orders'], async (req, res) => {
    try {
      const forceAll = req.query.force === 'true';
      const host = req.get('origin') || req.get('host') || 'https://jazelleskinhaven.com';
      const baseUrl = host.startsWith('http') ? host : `http://${host}`;
      const result = await runAbandonedOrdersCheck(forceAll, baseUrl);
      return res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return res.status(500).json({ error: msg });
    }
  });

  // Automated background job every 5 minutes
  setInterval(() => {
    void runAbandonedOrdersCheck(false, 'https://jazelleskinhaven.com').catch((err) => {
      console.warn('[Abandoned Orders Background Check Note]', err);
    });
  }, 5 * 60 * 1000);

  // Vite middleware in dev; static file serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Jazelle Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
