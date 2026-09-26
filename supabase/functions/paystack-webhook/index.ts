import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createHmac, timingSafeEqual } from 'https://deno.land/std@0.168.0/node/crypto.ts';
import { Buffer } from 'https://deno.land/std@0.168.0/node/buffer.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

// Rate limiting map for webhook endpoints (30 req / min)
const webhookRateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_WEBHOOK_REQUESTS = 30;

function isWebhookRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (webhookRateLimitMap.get(ip) || []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_WEBHOOK_REQUESTS) {
    webhookRateLimitMap.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  webhookRateLimitMap.set(ip, timestamps);
  return false;
}

/**
 * Persistent Database-Backed Rate Limiter for Webhook Edge Function.
 * Enforces sliding-window limit in PostgreSQL across all serverless Deno isolates.
 */
async function checkPersistentWebhookRateLimit(ip: string): Promise<{ allowed: boolean; source: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
        p_key: `webhook_ip:${ip}`,
        p_max_requests: MAX_WEBHOOK_REQUESTS,
        p_window_seconds: 60,
      });

      if (!error && data && typeof data.allowed === 'boolean') {
        return { allowed: data.allowed, source: 'database' };
      }
    } catch (err) {
      console.warn('[paystack-webhook] Database rate limit check notice, falling back to isolate memory:', err);
    }
  }

  return { allowed: !isWebhookRateLimited(ip), source: 'memory-fallback' };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const clientIp =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'webhook-caller';

  const rateLimitResult = await checkPersistentWebhookRateLimit(clientIp);
  if (!rateLimitResult.allowed) {
    console.warn(`[paystack-webhook] Rate limit exceeded (${rateLimitResult.source}) for IP: ${clientIp}`);
    return new Response(JSON.stringify({ error: 'Rate limit exceeded', enforcedBy: rateLimitResult.source }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  try {
    const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY')?.trim();
    if (!secretKey) {
      console.error('[paystack-webhook] PAYSTACK_SECRET_KEY is not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const signature = req.headers.get('x-paystack-signature');
    if (!signature || typeof signature !== 'string' || signature.length !== 128) {
      return new Response(JSON.stringify({ error: 'Missing or malformed x-paystack-signature header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.text();
    const hash = createHmac('sha512', secretKey).update(rawBody).digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const hashBuffer = Buffer.from(hash, 'hex');

    if (
      signatureBuffer.length !== hashBuffer.length ||
      !timingSafeEqual(signatureBuffer, hashBuffer)
    ) {
      console.warn('[paystack-webhook] Invalid signature verification');
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: 'Malformed JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = body.event;
    const data = (body.data || {}) as Record<string, unknown>;
    const reference = data.reference ? String(data.reference) : undefined;

    console.log(`[paystack-webhook] Verified event: ${event}, reference: ${reference}`);

    if (event === 'charge.success' && reference) {
      // Database Idempotency Guard:
      // Connect to Supabase to verify and claim stock decrement atomically
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // 1. Check if order is already marked stock_decremented in the database
        const { data: order } = await supabase
          .from('orders')
          .select('stock_decremented, status, items')
          .eq('order_number', reference)
          .maybeSingle();

        if (order && order.stock_decremented === true) {
          console.log(`[paystack-webhook] Order ${reference} already decremented in database; skipping duplicate decrement.`);
          return new Response(
            JSON.stringify({ status: 'success', event, reference, note: 'already_decremented' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // 2. Atomically claim stock decrement in the database
        const { data: updated } = await supabase
          .from('orders')
          .update({
            stock_decremented: true,
            stock_decremented_at: new Date().toISOString(),
            status: 'placed',
            payment_status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('order_number', reference)
          .eq('stock_decremented', false)
          .select('id');

        if (!updated || updated.length === 0) {
          console.log(`[paystack-webhook] Order ${reference} stock decrement already claimed; skipping.`);
        } else {
          console.log(`[paystack-webhook] Order ${reference} successfully claimed and updated to placed.`);
          // Decrement product inventory for claimed order
          if (Array.isArray(order?.items)) {
            for (const item of order.items as Array<{ slug?: string; quantity?: number }>) {
              if (!item.slug || !item.quantity) continue;
              try {
                const { data: prod } = await supabase
                  .from('products')
                  .select('id, stock')
                  .eq('slug', item.slug)
                  .maybeSingle();

                if (prod && typeof prod.stock === 'number') {
                  const nextStock = Math.max(0, prod.stock - item.quantity);
                  await supabase
                    .from('products')
                    .update({
                      stock: nextStock,
                      availability: nextStock > 10 ? 'In stock' : nextStock > 0 ? 'Limited stock' : 'Back in stock',
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', prod.id);
                }
              } catch (itemErr) {
                console.warn(`[paystack-webhook] Error updating stock for item ${item.slug}:`, itemErr);
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ status: 'success', event, reference }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
