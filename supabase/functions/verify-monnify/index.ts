import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_DELIVERY_FEE = 3500;
const DEFAULT_FREE_DELIVERY_THRESHOLD = 35000;
const DEFAULT_MOTOR_PARK_FEE = 2000;
const DEFAULT_JUMIA_FEE = 3000;
const DEFAULT_FEZ_FEE = 2500;
const DEFAULT_TOKEN_LIFETIME_SECONDS = 3600;
const TOKEN_EXPIRY_SAFETY_BUFFER_MS = 60 * 1000;

function extractDeliveryMethodFromOrder(orderRow: Record<string, unknown>): string {
  const normalize = (val: unknown): string | null => {
    if (typeof val !== 'string') return null;
    const clean = val.trim().toLowerCase();
    if (clean === 'motor_park' || clean === 'motor-park' || clean === 'park') return 'motor_park';
    if (clean === 'jumia') return 'jumia';
    if (clean === 'fez') return 'fez';
    if (clean === 'standard') return 'standard';
    return null;
  };

  const direct = normalize(orderRow.delivery_method);
  if (direct) return direct;

  if (Array.isArray(orderRow.items) && orderRow.items.length > 0) {
    const firstItem = orderRow.items[0] as Record<string, unknown> | null;
    if (firstItem && typeof firstItem === 'object') {
      const fromItem = normalize(firstItem.delivery_method);
      if (fromItem) return fromItem;
    }
  }

  if (typeof orderRow.delivery_landmark === 'string') {
    const match = orderRow.delivery_landmark.match(/\[JSH_DELIVERY:(\{.*?\})\]/);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]) as { m?: string };
        const fromLandmark = normalize(parsed.m);
        if (fromLandmark) return fromLandmark;
      } catch {
        // ignore
      }
    }
  }

  return 'standard';
}

function parseFeeSetting(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  const num = Number(raw);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : fallback;
}

// In-memory fallback rate limiter if DB table is not yet migrated
const fallbackRateMap = new Map<string, { count: number; resetAt: number }>();

function checkFallbackMemoryLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const entry = fallbackRateMap.get(key);
  if (!entry || now > entry.resetAt) {
    fallbackRateMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  entry.count += 1;
  if (entry.count > maxRequests) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  return { allowed: true, retryAfter: 0 };
}

// Cached Monnify OAuth Bearer token (~1 hour lifetime, auto-refreshes when expired)
let cachedMonnifyToken: {
  accessToken: string;
  expiresAt: number;
  cacheKey: string;
} | null = null;

async function getMonnifyAccessToken(
  baseUrl: string,
  apiKey: string,
  secretKey: string
): Promise<string> {
  const cacheKey = `${baseUrl}|${apiKey}`;
  const now = Date.now();

  if (
    cachedMonnifyToken &&
    cachedMonnifyToken.cacheKey === cacheKey &&
    cachedMonnifyToken.accessToken &&
    now < cachedMonnifyToken.expiresAt
  ) {
    return cachedMonnifyToken.accessToken;
  }

  const credentials = btoa(`${apiKey}:${secretKey}`);
  const authRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
  });

  const authJson = await authRes.json().catch(() => null);
  const accessToken = authJson?.responseBody?.accessToken;

  if (!authRes.ok || !authJson?.requestSuccessful || !accessToken) {
    cachedMonnifyToken = null;
    throw new Error(
      authJson?.responseMessage || `Monnify authentication failed (HTTP ${authRes.status})`
    );
  }

  const expiresInSeconds = Number(authJson?.responseBody?.expiresIn) || DEFAULT_TOKEN_LIFETIME_SECONDS;
  const ttlMs = Math.max(60 * 1000, expiresInSeconds * 1000 - TOKEN_EXPIRY_SAFETY_BUFFER_MS);

  cachedMonnifyToken = {
    accessToken,
    expiresAt: Date.now() + ttlMs,
    cacheKey,
  };

  return accessToken;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ verified: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const monnifyApiKey = (
      Deno.env.get('MONNIFY_API_KEY') ||
      Deno.env.get('VITE_MONNIFY_API_KEY') ||
      ''
    ).trim();
    const monnifySecretKey = (Deno.env.get('MONNIFY_SECRET_KEY') || '').trim();
    const explicitBase = (Deno.env.get('MONNIFY_BASE_URL') || '').trim().replace(/\/+$/, '');
    const isTestMode = !monnifyApiKey.startsWith('MK_PROD_');
    const monnifyBaseUrl =
      explicitBase || (isTestMode ? 'https://sandbox.monnify.com' : 'https://api.monnify.com');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'server_configuration_error',
          message: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in Edge Function secrets.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => ({}));
    const rawReference = body.paymentReference || body.reference || body.orderNumber;
    const rawTxRef =
      typeof body.transactionReference === 'string' ? body.transactionReference.trim() : '';

    if (!rawReference || typeof rawReference !== 'string' || !rawReference.trim()) {
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'invalid_reference',
          message: 'Missing or invalid payment reference.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanRef = rawReference.trim();
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown-ip';

    // ---------------------------------------------------------------------------
    // 1. DATABASE-BACKED RATE LIMITING (check_and_increment_rate_limit)
    //    - Max 5 attempts per 60s per payment reference
    //    - Max 15 attempts per 60s per client IP
    // ---------------------------------------------------------------------------
    const refRateKey = `verify_monnify_ref:${cleanRef}`;
    const ipRateKey = `verify_monnify_ip:${clientIp}`;

    let rateAllowed = true;
    let retryAfter = 60;
    let enforcedBy = 'database';

    const { data: refRateData, error: refRateError } = await supabaseAdmin.rpc(
      'check_and_increment_rate_limit',
      { p_key: refRateKey, p_max_requests: 5, p_window_seconds: 60 }
    );

    if (!refRateError && refRateData) {
      rateAllowed = Boolean(refRateData.allowed);
      retryAfter = Number(refRateData.retry_after || 60);
    } else {
      enforcedBy = 'memory_fallback';
      const memRef = checkFallbackMemoryLimit(refRateKey, 5, 60);
      rateAllowed = memRef.allowed;
      retryAfter = memRef.retryAfter;
    }

    if (rateAllowed) {
      const { data: ipRateData, error: ipRateError } = await supabaseAdmin.rpc(
        'check_and_increment_rate_limit',
        { p_key: ipRateKey, p_max_requests: 15, p_window_seconds: 60 }
      );
      if (!ipRateError && ipRateData && !ipRateData.allowed) {
        rateAllowed = false;
        retryAfter = Number(ipRateData.retry_after || 60);
      }
    }

    if (!rateAllowed) {
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'rate_limited',
          enforcedBy,
          retryAfter,
          message: `Too many verification requests for reference "${cleanRef}". Please wait ${retryAfter} seconds before trying again.`,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        }
      );
    }

    // ---------------------------------------------------------------------------
    // 2. LOOK UP THE ORDER IN public.orders & RECALCULATE EXPECTED TOTAL SERVER-SIDE
    //    Never trust expectedAmount from the client request body!
    // ---------------------------------------------------------------------------
    const { data: orderRow, error: orderFetchErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_number', cleanRef)
      .maybeSingle();

    if (orderFetchErr || !orderRow) {
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'order_not_found',
          message: `Order "${cleanRef}" was not found in the database.`,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If order is already verified & stock decremented, return idempotent success
    if (orderRow.status !== 'pending' && orderRow.stock_decremented === true) {
      return new Response(
        JSON.stringify({
          verified: true,
          alreadyProcessed: true,
          status: 'PAID',
          reference: cleanRef,
          orderNumber: orderRow.order_number,
          amount: Number(orderRow.total),
          serverExpectedNaira: Number(orderRow.total),
          currency: 'NGN',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse items from orderRow.items and look up current prices from public.products
    const orderItems = Array.isArray(orderRow.items) ? orderRow.items : [];
    if (orderItems.length === 0) {
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'invalid_order_items',
          message: 'Order contains no line items.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: dbProducts, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id, slug, name, price, stock');

    if (prodErr || !dbProducts || dbProducts.length === 0) {
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'catalog_lookup_failed',
          message: 'Unable to load product catalog for server-side price calculation.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let serverSubtotal = 0;
    for (const item of orderItems) {
      const qty = Math.floor(Number(item.quantity) || 0);
      if (qty <= 0) {
        return new Response(
          JSON.stringify({
            verified: false,
            status: 'invalid_item_quantity',
            message: `Invalid item quantity for "${item.name || item.slug}".`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const matchedProduct = dbProducts.find(
        (p: { id?: string; slug?: string }) =>
          (item.slug && p.slug === item.slug) || (item.id && p.id === item.id)
      );

      if (!matchedProduct) {
        return new Response(
          JSON.stringify({
            verified: false,
            status: 'unknown_product',
            message: `Product "${item.slug || item.name}" does not exist in the catalog.`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const realUnitPrice = Number(matchedProduct.price);
      serverSubtotal += realUnitPrice * qty;
    }

    // Re-validate coupon_code server-side if attached
    let serverDiscountAmount = 0;
    let verifiedCouponId: string | null = null;
    let verifiedCouponUsedCount = 0;
    const rawCouponCode = orderRow.coupon_code ? String(orderRow.coupon_code).trim().toUpperCase() : '';

    if (rawCouponCode) {
      const { data: couponRow, error: couponErr } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .ilike('code', rawCouponCode)
        .maybeSingle();

      if (couponErr || !couponRow) {
        return new Response(
          JSON.stringify({
            verified: false,
            status: 'invalid_coupon',
            message: `Security Check Failed: Promo code "${rawCouponCode}" does not exist.`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (couponRow.is_active !== true) {
        return new Response(
          JSON.stringify({
            verified: false,
            status: 'invalid_coupon',
            message: `Security Check Failed: Promo code "${rawCouponCode}" is inactive.`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (couponRow.expiry_date) {
        const expTime = new Date(String(couponRow.expiry_date)).getTime();
        if (!Number.isNaN(expTime) && expTime < Date.now()) {
          return new Response(
            JSON.stringify({
              verified: false,
              status: 'invalid_coupon',
              message: `Security Check Failed: Promo code "${rawCouponCode}" has expired.`,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const usageLimit =
        couponRow.usage_limit !== null && couponRow.usage_limit !== undefined
          ? Number(couponRow.usage_limit)
          : null;
      const usedCount = Number(couponRow.used_count || 0);
      if (usageLimit !== null && usageLimit > 0 && usedCount >= usageLimit) {
        return new Response(
          JSON.stringify({
            verified: false,
            status: 'invalid_coupon',
            message: `Security Check Failed: Promo code "${rawCouponCode}" has reached its usage limit.`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      verifiedCouponId = String(couponRow.id);
      verifiedCouponUsedCount = usedCount;

      if (couponRow.discount_type === 'percentage') {
        serverDiscountAmount = Math.min(
          serverSubtotal,
          Math.round((serverSubtotal * Number(couponRow.discount_value)) / 100)
        );
      } else {
        serverDiscountAmount = Math.min(
          serverSubtotal,
          Math.max(0, Math.round(Number(couponRow.discount_value)))
        );
      }
    }

    // Fetch delivery fee settings from site_settings
    const { data: settingsRows } = await supabaseAdmin
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'free_delivery_threshold',
        'standard_delivery_fee',
        'delivery_fee_motor_park',
        'delivery_fee_jumia',
        'delivery_fee_fez',
      ]);

    const settingsMap: Record<string, string> = {};
    if (Array.isArray(settingsRows)) {
      for (const r of settingsRows) {
        if (r && typeof r.key === 'string') {
          settingsMap[r.key] = String(r.value ?? '');
        }
      }
    }

    const freeDeliveryThreshold = parseFeeSetting(
      settingsMap.free_delivery_threshold,
      DEFAULT_FREE_DELIVERY_THRESHOLD
    );
    const standardDeliveryFee = parseFeeSetting(
      settingsMap.standard_delivery_fee,
      DEFAULT_DELIVERY_FEE
    );
    const motorParkFee = parseFeeSetting(
      settingsMap.delivery_fee_motor_park,
      DEFAULT_MOTOR_PARK_FEE
    );
    const jumiaFee = parseFeeSetting(settingsMap.delivery_fee_jumia, DEFAULT_JUMIA_FEE);
    const fezFee = parseFeeSetting(settingsMap.delivery_fee_fez, DEFAULT_FEZ_FEE);

    const deliveryMethod = extractDeliveryMethodFromOrder(
      orderRow as unknown as Record<string, unknown>
    );

    let serverDeliveryFee = 0;
    if (serverSubtotal > 0) {
      if (deliveryMethod === 'motor_park') {
        serverDeliveryFee = motorParkFee;
      } else if (deliveryMethod === 'jumia') {
        serverDeliveryFee = jumiaFee;
      } else if (deliveryMethod === 'fez') {
        serverDeliveryFee = fezFee;
      } else {
        serverDeliveryFee =
          serverSubtotal >= freeDeliveryThreshold ? 0 : standardDeliveryFee;
      }
    }

    const serverExpectedTotalNaira = Math.max(0, serverSubtotal - serverDiscountAmount) + serverDeliveryFee;

    // Detect if client tampered with order discount_amount or total before checkout
    const clientOrderDiscount = Math.round(Number(orderRow.discount_amount || 0));
    const clientOrderTotalNaira = Math.round(Number(orderRow.total || 0));

    if (
      Math.abs(clientOrderDiscount - serverDiscountAmount) > 1 ||
      Math.abs(clientOrderTotalNaira - serverExpectedTotalNaira) > 1
    ) {
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'amount_mismatch',
          message: `Security Verification Rejected: Tampered discount or order total detected. Client submitted discount ₦${clientOrderDiscount.toLocaleString()} (total ₦${clientOrderTotalNaira.toLocaleString()}), but server calculated discount ₦${serverDiscountAmount.toLocaleString()} (true expected total ₦${serverExpectedTotalNaira.toLocaleString()}).`,
          serverExpectedNaira: serverExpectedTotalNaira,
          serverDiscountAmount,
          clientOrderTotalNaira,
          clientOrderDiscount,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---------------------------------------------------------------------------
    // 3. CALL MONNIFY'S VERIFY TRANSACTION API WITH CACHED BEARER TOKEN
    // ---------------------------------------------------------------------------
    if (!monnifyApiKey || !monnifySecretKey) {
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'missing_secret_key',
          message: 'MONNIFY_API_KEY or MONNIFY_SECRET_KEY is missing in Edge Function secrets.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken: string;
    try {
      accessToken = await getMonnifyAccessToken(monnifyBaseUrl, monnifyApiKey, monnifySecretKey);
    } catch (authErr: unknown) {
      const authMsg = authErr instanceof Error ? authErr.message : 'Monnify authentication failed';
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'monnify_auth_failed',
          message: authMsg,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verifyUrl = rawTxRef
      ? `${monnifyBaseUrl}/api/v2/transactions/${encodeURIComponent(rawTxRef)}`
      : `${monnifyBaseUrl}/api/v1/merchant/transactions/query?paymentReference=${encodeURIComponent(cleanRef)}`;

    const monnifyRes = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const monnifyData = await monnifyRes.json().catch(() => null);
    const txData = monnifyData?.responseBody;

    if (!monnifyRes.ok || !monnifyData?.requestSuccessful || !txData) {
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'transaction_not_found',
          message:
            monnifyData?.responseMessage ||
            `Monnify could not find transaction "${rawTxRef || cleanRef}".`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---------------------------------------------------------------------------
    // 4. CONFIRM paymentStatus === "PAID" AND amountPaid MATCHES SERVER-CALCULATED TOTAL
    // ---------------------------------------------------------------------------
    const paymentStatus = String(txData.paymentStatus || '').toUpperCase();
    if (paymentStatus !== 'PAID') {
      return new Response(
        JSON.stringify({
          verified: false,
          status: paymentStatus.toLowerCase() || 'failed',
          reference: txData.paymentReference || cleanRef,
          transactionReference: txData.transactionReference || rawTxRef,
          message: `Payment status is "${paymentStatus || 'UNKNOWN'}".`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const txCurrency = String(txData.currencyCode || txData.currency || 'NGN').toUpperCase();
    if (txCurrency !== 'NGN') {
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'currency_mismatch',
          message: `Currency mismatch: expected NGN, received ${txCurrency}.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const amountPaid = Number(txData.amountPaid ?? txData.totalPayable ?? 0);
    if (Math.abs(amountPaid - serverExpectedTotalNaira) > 1) {
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'amount_mismatch',
          message: `Amount mismatch: Monnify confirmed ₦${amountPaid.toLocaleString()}, but server-calculated order total is ₦${serverExpectedTotalNaira.toLocaleString()}.`,
          amount: amountPaid,
          serverExpectedNaira: serverExpectedTotalNaira,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resolvedTxRef = String(txData.transactionReference || rawTxRef || cleanRef);

    // ---------------------------------------------------------------------------
    // 5. SERVER-SIDE FINALIZATION (USING SERVICE ROLE KEY)
    //    - Claim stock decrement idempotently via claim_order_stock_decrement
    //    - Decrement product stock in public.products
    //    - Increment coupon used_count in public.coupons
    //    - Mark order as status = 'placed'
    // ---------------------------------------------------------------------------
    let claimed = false;
    const { data: claimRes, error: claimErr } = await supabaseAdmin.rpc(
      'claim_order_stock_decrement',
      { p_order_number: cleanRef, p_payment_reference: resolvedTxRef }
    );

    if (!claimErr && claimRes === true) {
      claimed = true;
    } else if (claimErr) {
      const { data: condRows } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'placed',
          updated_at: new Date().toISOString(),
        })
        .eq('order_number', cleanRef)
        .eq('status', 'pending')
        .select('id');
      claimed = Boolean(condRows && condRows.length > 0);
    }

    await supabaseAdmin
      .from('orders')
      .update({
        status: 'placed',
        subtotal: serverSubtotal,
        discount_amount: serverDiscountAmount,
        delivery_fee: serverDeliveryFee,
        total: serverExpectedTotalNaira,
        updated_at: new Date().toISOString(),
      })
      .eq('order_number', cleanRef);

    if (claimed) {
      // Decrement product stock in public.products
      for (const item of orderItems) {
        const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
        const prod = dbProducts.find(
          (p: { id?: string; slug?: string }) =>
            (item.slug && p.slug === item.slug) || (item.id && p.id === item.id)
        );
        if (prod && prod.id) {
          const currentStock = typeof prod.stock === 'number' ? prod.stock : 20;
          const newStock = Math.max(0, currentStock - qty);
          const newAvailability =
            newStock > 10 ? 'In stock' : newStock > 0 ? 'Limited stock' : 'Back in stock';
          await supabaseAdmin
            .from('products')
            .update({
              stock: newStock,
              availability: newAvailability,
              updated_at: new Date().toISOString(),
            })
            .eq('id', prod.id);
        }
      }

      // Increment coupon used_count server-side
      if (verifiedCouponId) {
        await supabaseAdmin
          .from('coupons')
          .update({ used_count: verifiedCouponUsedCount + 1 })
          .eq('id', verifiedCouponId);
      }

      // Record audit entry in payment_verifications if table exists
      try {
        await supabaseAdmin.from('payment_verifications').upsert({
          reference: resolvedTxRef,
          order_number: cleanRef,
          amount_kobo: Math.round(amountPaid * 100),
          currency: txCurrency,
          status: 'verified',
          verified_via: 'verify-monnify',
          paystack_response: txData,
        });
      } catch {
        // Ignore if audit table not yet migrated
      }
    }

    return new Response(
      JSON.stringify({
        verified: true,
        status: paymentStatus,
        reference: cleanRef,
        transactionReference: resolvedTxRef,
        orderNumber: cleanRef,
        amount: amountPaid,
        serverExpectedNaira: serverExpectedTotalNaira,
        serverDiscountAmount,
        currency: txCurrency,
        paid_at: txData.paidOn || txData.createdOn,
        channel: txData.paymentMethod,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({
        verified: false,
        status: 'error',
        message: `Server error during payment verification: ${errMsg}`,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
