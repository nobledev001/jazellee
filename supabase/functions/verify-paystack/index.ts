// Supabase Edge Function: verify-paystack
// Securely verifies Paystack transaction status on the server-side using PAYSTACK_SECRET_KEY.
// The secret key is never exposed to the client or browser.

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  serve?: (handler: (req: Request) => Promise<Response>) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// In-memory sliding-window rate limiter per IP / reference (Max 10 requests per 60 seconds)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

function isRateLimited(clientKey: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitMap.get(clientKey) || []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(clientKey, timestamps);
    return true;
  }

  timestamps.push(now);
  rateLimitMap.set(clientKey, timestamps);

  // Periodically clean up stale entries (every 100 items)
  if (rateLimitMap.size > 200) {
    for (const [key, times] of rateLimitMap.entries()) {
      const active = times.filter((t) => t > windowStart);
      if (active.length === 0) rateLimitMap.delete(key);
      else rateLimitMap.set(key, active);
    }
  }

  return false;
}

/**
 * Persistent Database-Backed Rate Limiter for Deno Serverless Edge Functions.
 * Queries PostgreSQL `check_and_increment_rate_limit` RPC so counters survive
 * cold starts and synchronize across global edge worker isolates.
 */
async function checkPersistentRateLimit(
  bucketKey: string,
  maxRequests = 10,
  windowSeconds = 60
): Promise<{ allowed: boolean; retryAfter: number; source: 'database' | 'memory-fallback' }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://otdvuuxmnlfjvtjifudq.supabase.co';
  const supabaseKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    Deno.env.get('SUPABASE_ANON_KEY') ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90ZHZ1dXhtbmxmanZ0amlmdWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MTc5MTYsImV4cCI6MjEwNTE5MzkxNn0.Wm-6krE2MxQJCSxxSq5KUKDIwuSfo8SGE0KxJunN1Pw';

  try {
    const res = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/check_and_increment_rate_limit`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_key: bucketKey,
        p_max_requests: maxRequests,
        p_window_seconds: windowSeconds,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { allowed?: boolean; retry_after?: number };
      if (typeof data?.allowed === 'boolean') {
        return {
          allowed: data.allowed,
          retryAfter: data.retry_after ?? windowSeconds,
          source: 'database',
        };
      }
    }
  } catch (err) {
    console.warn('[verify-paystack] Database rate limit check fallback to memory:', err);
  }

  const limited = isRateLimited(bucketKey);
  return {
    allowed: !limited,
    retryAfter: windowSeconds,
    source: 'memory-fallback',
  };
}

export async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Allow GET for simple ping / health check
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        status: 'ok',
        service: 'verify-paystack edge function',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract client IP for rate limiting
    const clientIp =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown-client';

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Malformed JSON payload in request body',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { reference, expectedAmount } = body;

    // Validate reference format
    if (!reference || typeof reference !== 'string') {
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Missing or invalid transaction reference parameter',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const cleanRef = reference.trim();
    if (cleanRef.length < 3 || cleanRef.length > 100 || !/^[a-zA-Z0-9_\-.:]+$/.test(cleanRef)) {
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Invalid transaction reference format. Must be alphanumeric (3-100 characters).',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Enforce persistent database-backed rate limiting (survives Deno cold starts & multi-region isolates)
    // Max 10 requests per 60s per client IP, and max 5 requests per 60s per transaction reference
    const ipLimit = await checkPersistentRateLimit(`verify_ip:${clientIp}`, 10, 60);
    const refLimit = await checkPersistentRateLimit(`verify_ref:${cleanRef}`, 5, 60);

    if (!ipLimit.allowed || !refLimit.allowed) {
      const retryAfter = Math.max(ipLimit.retryAfter, refLimit.retryAfter, 60);
      console.warn(
        `[verify-paystack] Rate limit exceeded (${ipLimit.source}) for IP: ${clientIp}, Ref: ${cleanRef}`
      );
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'rate_limited',
          enforcedBy: ipLimit.source,
          error: `Rate limit exceeded: Too many verification attempts. Please wait ${retryAfter} seconds.`,
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

    // Validate expectedAmount if supplied
    if (expectedAmount !== undefined) {
      const numAmount = Number(expectedAmount);
      if (Number.isNaN(numAmount) || numAmount < 0 || numAmount > 100000000) {
        return new Response(
          JSON.stringify({
            verified: false,
            error: 'Invalid expectedAmount parameter',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Read server-only secret key strictly from environment variables
    const secretKey =
      (typeof Deno !== 'undefined' ? Deno.env?.get('PAYSTACK_SECRET_KEY') : undefined) ||
      (typeof process !== 'undefined' ? process.env?.PAYSTACK_SECRET_KEY : undefined);

    if (!secretKey) {
      console.error('[verify-paystack] PAYSTACK_SECRET_KEY is not configured on server');
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Server configuration error: PAYSTACK_SECRET_KEY missing',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[verify-paystack] Calling Paystack verify API for reference: ${cleanRef}`);

    // Call Paystack verify endpoint securely
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanRef)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const rawText = await paystackRes.text();
    let paystackData: Record<string, unknown> | null = null;
    try {
      paystackData = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      return new Response(
        JSON.stringify({
          verified: false,
          status: 'paystack_api_error',
          message: 'Paystack returned non-JSON response',
          rawResponse: rawText.slice(0, 300),
          httpStatus: paystackRes.status,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!paystackRes.ok || !paystackData?.status) {
      const dataObj = paystackData?.data as Record<string, unknown> | undefined;
      return new Response(
        JSON.stringify({
          verified: false,
          status: dataObj?.status || paystackData?.code || 'failed',
          message: paystackData?.message || 'Transaction could not be verified by Paystack',
          rawResponse: paystackData,
          httpStatus: paystackRes.status,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const transaction = (paystackData.data || {}) as Record<string, unknown>;
    const isSuccessful = transaction?.status === 'success';

    // Verify amount in kobo if expectedAmount (in Naira) was provided
    if (expectedAmount && isSuccessful) {
      const expectedKobo = Math.round(Number(expectedAmount) * 100);
      const actualKobo = Number(transaction.amount || 0);
      if (actualKobo < expectedKobo) {
        return new Response(
          JSON.stringify({
            verified: false,
            status: 'amount_mismatch',
            message: `Paid amount (₦${actualKobo / 100}) is less than order amount (₦${expectedAmount})`,
            rawResponse: paystackData,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        verified: isSuccessful,
        status: transaction.status,
        amount: transaction.amount,
        reference: transaction.reference,
        channel: transaction.channel,
        paid_at: transaction.paid_at,
        customer: transaction.customer,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({
        verified: false,
        error: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

// Support Deno.serve native runner in Supabase Edge Runtime
if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve(handler);
}

export default handler;
