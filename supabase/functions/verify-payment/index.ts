import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_DELIVERY_FEE = 3500;
const DEFAULT_FREE_DELIVERY_THRESHOLD = 35000;

const fallbackRateMap = new Map<string, { count: number; resetAt: number }>();

function checkFallbackMemoryLimit(key: string, maxRequests: number, windowSeconds: number): { allowed: boolean; retryAfter: number } {
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
    const paystackSecretKey = (Deno.env.get('PAYSTACK_SECRET_KEY') || '').trim();

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
    const rawReference = body.reference || body.orderNumber;

    if (!rawReference || typeof rawReference !== 'string' || !rawReference.trim()) {
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'invalid_reference',
          message: 'Missing or invalid transaction reference.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanRef = rawReference.trim();
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown-ip';

    // 1. Database-backed rate limit (5 attempts / 60s per reference, 15 / 60s per IP)
    const refRateKey = `verify_paystack_ref:${cleanRef}`;
    const ipRateKey = `verify_paystack_ip:${clientIp}`;

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

    // 2. Look up actual order in public.orders
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

    if (orderRow.status !== 'pending' && orderRow.stock_decremented === true) {
      return new Response(
        JSON.stringify({
          verified: true,
          alreadyProcessed: true,
          status: 'success',
          reference: cleanRef,
          orderNumber: orderRow.order_number,
          amount: Number(orderRow.total) * 100,
          currency: 'NGN',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Recalculate true expected total from public.products and public.coupons
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

      serverSubtotal += Number(matchedProduct.price) * qty;
    }

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

      if (couponErr || !couponRow || couponRow.is_active !== true) {
        return new Response(
          JSON.stringify({
            verified: false,
            status: 'invalid_coupon',
            message: `Security Check Failed: Promo code "${rawCouponCode}" is invalid or inactive.`,
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

    const { data: thresholdSetting } = await supabaseAdmin
      .from('site_settings')
      .select('value')
      .eq('key', 'free_delivery_threshold')
      .maybeSingle();

    const parsedThreshold = thresholdSetting?.value ? Number(thresholdSetting.value) : NaN;
    const freeDeliveryThreshold =
      Number.isFinite(parsedThreshold) && parsedThreshold >= 0
        ? parsedThreshold
        : DEFAULT_FREE_DELIVERY_THRESHOLD;

    const serverDeliveryFee =
      serverSubtotal === 0 || serverSubtotal >= freeDeliveryThreshold ? 0 : DEFAULT_DELIVERY_FEE;

    const serverExpectedTotalNaira = Math.max(0, serverSubtotal - serverDiscountAmount) + serverDeliveryFee;
    const serverExpectedKobo = Math.round(serverExpectedTotalNaira * 100);

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
          serverExpectedTotalNaira,
          serverDiscountAmount,
          clientOrderTotalNaira,
          clientOrderDiscount,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Verify with Paystack API
    if (!paystackSecretKey || !paystackSecretKey.startsWith('sk_')) {
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'missing_secret_key',
          message: 'PAYSTACK_SECRET_KEY is missing or invalid in Edge Function secrets.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanRef)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const paystackData = await paystackRes.json();
    const txData = paystackData?.data;

    if (!paystackRes.ok || !paystackData.status || !txData || txData.status !== 'success') {
      return new Response(
        JSON.stringify({
          verified: false,
          status: txData?.status || 'transaction_not_found',
          message: paystackData?.message || `Transaction "${cleanRef}" was not verified by Paystack.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paidKobo = Number(txData.amount);
    if (Math.abs(paidKobo - serverExpectedKobo) > 100) {
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'amount_mismatch',
          message: `Amount mismatch: Paystack confirmed ₦${(paidKobo / 100).toLocaleString()}, but server-calculated order total is ₦${serverExpectedTotalNaira.toLocaleString()}.`,
          paidKobo,
          serverExpectedKobo,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Finalize order, decrement stock, increment coupon used_count
    let claimed = false;
    const { data: claimRes, error: claimErr } = await supabaseAdmin.rpc(
      'claim_order_stock_decrement',
      { p_order_number: cleanRef, p_payment_reference: txData.reference || cleanRef }
    );

    if (!claimErr && claimRes === true) {
      claimed = true;
    } else if (claimErr) {
      const { data: condRows } = await supabaseAdmin
        .from('orders')
        .update({ status: 'placed', updated_at: new Date().toISOString() })
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

      if (verifiedCouponId) {
        await supabaseAdmin
          .from('coupons')
          .update({ used_count: verifiedCouponUsedCount + 1 })
          .eq('id', verifiedCouponId);
      }
    }

    return new Response(
      JSON.stringify({
        verified: true,
        status: 'success',
        reference: txData.reference || cleanRef,
        orderNumber: cleanRef,
        amount: paidKobo,
        serverExpectedKobo,
        serverDiscountAmount,
        currency: txData.currency || 'NGN',
        paidAt: txData.paid_at,
        channel: txData.channel,
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
