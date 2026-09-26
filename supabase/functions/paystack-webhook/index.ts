import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_DELIVERY_FEE = 3500;
const DEFAULT_FREE_DELIVERY_THRESHOLD = 35000;

async function verifyPaystackSignature(rawBody: string, signatureHeader: string, secretKey: string): Promise<boolean> {
  if (!signatureHeader || !secretKey) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const computedHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return computedHex === signatureHeader.trim().toLowerCase();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const paystackSecretKey = (Deno.env.get('PAYSTACK_SECRET_KEY') || '').trim();
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!paystackSecretKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing webhook server configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown-ip';

    // Database-backed rate limit (60 webhooks / 60s per IP)
    const { data: rateData, error: rateErr } = await supabaseAdmin.rpc(
      'check_and_increment_rate_limit',
      { p_key: `paystack_webhook:${clientIp}`, p_max_requests: 60, p_window_seconds: 60 }
    );
    if (!rateErr && rateData && !rateData.allowed) {
      return new Response(JSON.stringify({ error: 'Too many webhook requests' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const signature = req.headers.get('x-paystack-signature') || '';
    const rawBody = await req.text();

    const isValidSig = await verifyPaystackSignature(rawBody, signature, paystackSecretKey);
    if (!isValidSig) {
      return new Response(JSON.stringify({ error: 'Invalid HMAC signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload?.event;
    const data = payload?.data;

    if (eventType !== 'charge.success' || !data || data.status !== 'success') {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reference: string = (data.reference || '').trim();
    const paidAmountKobo = Number(data.amount || 0);

    if (!reference) {
      return new Response(JSON.stringify({ error: 'Missing transaction reference' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_number', reference)
      .maybeSingle();

    if (!existingOrder) {
      return new Response(JSON.stringify({ received: true, status: 'order_not_found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingOrder.status !== 'pending' && existingOrder.stock_decremented === true) {
      return new Response(
        JSON.stringify({ received: true, alreadyProcessed: true, reference }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Server-side recalculation of expected total from products & coupons
    const orderItems = Array.isArray(existingOrder.items) ? existingOrder.items : [];
    const { data: dbProducts } = await supabaseAdmin
      .from('products')
      .select('id, slug, name, price, stock');

    if (!dbProducts || dbProducts.length === 0 || orderItems.length === 0) {
      return new Response(JSON.stringify({ error: 'Catalog lookup failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let serverSubtotal = 0;
    for (const item of orderItems) {
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const matched = dbProducts.find(
        (p: { id?: string; slug?: string }) =>
          (item.slug && p.slug === item.slug) || (item.id && p.id === item.id)
      );
      if (!matched) {
        return new Response(JSON.stringify({ error: `Unknown product ${item.slug}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      serverSubtotal += Number(matched.price) * qty;
    }

    let serverDiscountAmount = 0;
    let verifiedCouponId: string | null = null;
    let verifiedCouponUsedCount = 0;
    const rawCouponCode = existingOrder.coupon_code
      ? String(existingOrder.coupon_code).trim().toUpperCase()
      : '';

    if (rawCouponCode) {
      const { data: couponRow } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .ilike('code', rawCouponCode)
        .maybeSingle();

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

    if (Math.abs(paidAmountKobo - serverExpectedKobo) > 100) {
      return new Response(
        JSON.stringify({
          error: 'Amount mismatch against server-calculated order total',
          paidAmountKobo,
          serverExpectedKobo,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: claimed } = await supabaseAdmin.rpc('claim_order_stock_decrement', {
      p_order_number: reference,
      p_payment_reference: reference,
    });

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
      .eq('order_number', reference);

    if (claimed === true) {
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
      JSON.stringify({ received: true, finalized: true, reference }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook handler error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
