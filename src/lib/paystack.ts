/**
 * Client-side Paystack utilities for Jazelle Skin Haven.
 *
 * All payment verification and order finalization (marking order as placed/paid,
 * decrementing product stock, and incrementing coupon used_count) happens strictly
 * server-side via the verify-paystack Edge Function / backend API.
 * Client-supplied expectedAmount is never trusted as the source of truth.
 */

export const getVerifyPaystackEndpoint = (): string => getVerifyPaystackUrl();
export const SUPABASE_VERIFY_PAYSTACK_URL =
  typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL
    ? `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/verify-paystack`
    : '/api/verify-paystack';

export interface PaystackVerificationResult {
  verified: boolean;
  status?: string;
  message?: string;
  amount?: number;
  serverExpectedKobo?: number;
  serverDiscountAmount?: number;
  reference?: string;
  channel?: string;
  paid_at?: string;
  enforcedBy?: string;
  rawResponse?: unknown;
  httpStatus?: number;
  endpointCalled?: string;
}

interface PaystackPopWindow extends Window {
  PaystackPop?: {
    setup?: (options: Record<string, unknown>) => { openIframe?: () => void };
  };
}

interface VerificationApiResponse {
  verified?: boolean;
  status?: string;
  message?: string;
  error?: string;
  code?: string;
  amount?: number;
  serverExpectedKobo?: number;
  serverDiscountAmount?: number;
  reference?: string;
  channel?: string;
  paid_at?: string;
  enforcedBy?: string;
  customer?: Record<string, unknown>;
  rawResponse?: unknown;
  data?: Record<string, unknown>;
}

/**
 * Ensures Paystack inline script is loaded and window.PaystackPop is available.
 */
export async function ensurePaystackScriptLoaded(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const isReady = () => {
    const w = window as unknown as PaystackPopWindow;
    return typeof w.PaystackPop?.setup === 'function';
  };

  if (isReady()) return true;

  const existing = document.querySelector('script[src*="paystack.co"]');
  if (existing) {
    const startTime = Date.now();
    while (Date.now() - startTime < 3000) {
      if (isReady()) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return isReady();
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (isReady() || attempts > 20) {
          clearInterval(interval);
          resolve(isReady());
        }
      }, 50);
    };
    script.onerror = () => {
      console.warn('[Paystack Client] Failed to load Paystack inline script from js.paystack.co');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export function getPaystackPublicKey(): string {
  const envKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined)?.trim();
  return envKey || '';
}

export function getSupabaseBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  return (envUrl || '').replace(/\/+$/, '');
}

export function getSupabaseAnonKey(): string {
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  return envKey || '';
}

export function getVerifyPaystackUrl(): string {
  const baseUrl = getSupabaseBaseUrl();
  if (baseUrl) {
    return `${baseUrl}/functions/v1/verify-paystack`;
  }
  return '/api/verify-paystack';
}

/**
 * Calls the server-side payment verification endpoint to:
 * 1. Look up the order in public.orders by reference
 * 2. Recalculate the true expected total from public.products and public.coupons
 * 3. Verify the payment with Paystack and compare against the server-calculated total
 * 4. Finalize the order (status -> placed, payment_status -> paid, stock decrement, coupon used_count increment)
 */
export async function verifyPaystackTransactionOnServer(
  reference: string,
  expectedAmount?: number,
  contact?: string
): Promise<PaystackVerificationResult> {
  const anonKey = getSupabaseAnonKey();
  const edgeUrl = getVerifyPaystackUrl();

  // First check the full-stack server endpoint (/api/verify-paystack) if available,
  // which enforces server-side order & coupon recalculation and delegates to Supabase Edge Function.
  try {
    const apiRes = await fetch('/api/verify-paystack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        reference,
        expectedAmount,
        contact,
      }),
    });

    if (apiRes.status !== 404) {
      const rawText = await apiRes.text();
      try {
        const parsed = JSON.parse(rawText) as VerificationApiResponse;
        return {
          ...parsed,
          verified: Boolean(parsed.verified),
          status: parsed.status,
          message:
            parsed.message ||
            parsed.error ||
            (parsed.verified ? 'Payment successfully verified.' : 'Verification failed.'),
          amount: parsed.amount,
          serverExpectedKobo: parsed.serverExpectedKobo,
          serverDiscountAmount: parsed.serverDiscountAmount,
          reference: parsed.reference || reference,
          channel: parsed.channel,
          paid_at: parsed.paid_at,
          enforcedBy: parsed.enforcedBy,
          rawResponse: parsed.rawResponse || parsed,
          httpStatus: apiRes.status,
          endpointCalled: '/api/verify-paystack',
        };
      } catch {
        // Fall through to Edge Function URL if response was not JSON
      }
    }
  } catch {
    // Fall through to Edge Function URL if local API route is unavailable
  }

  try {
    const response = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        reference,
        expectedAmount,
        contact,
      }),
    });

    const httpStatus = response.status;
    const rawText = await response.text();

    let parsed: VerificationApiResponse | null = null;
    try {
      parsed = JSON.parse(rawText) as VerificationApiResponse;
    } catch {
      return {
        verified: false,
        status: 'non_json_response',
        message: `Verification endpoint returned non-JSON (HTTP ${httpStatus})`,
        rawResponse: rawText.slice(0, 150),
        httpStatus,
        endpointCalled: edgeUrl,
      };
    }

    return {
      ...parsed,
      verified: Boolean(parsed.verified),
      status: parsed.status,
      message:
        parsed.message ||
        parsed.error ||
        (parsed.verified ? 'Payment successfully verified.' : 'Verification failed.'),
      amount: parsed.amount,
      serverExpectedKobo: parsed.serverExpectedKobo,
      serverDiscountAmount: parsed.serverDiscountAmount,
      reference: parsed.reference || reference,
      channel: parsed.channel,
      paid_at: parsed.paid_at,
      enforcedBy: parsed.enforcedBy,
      rawResponse: parsed.rawResponse || parsed,
      httpStatus,
      endpointCalled: edgeUrl,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    console.error(`[Paystack Verification] Network error calling ${edgeUrl}:`, err);
    return {
      verified: false,
      status: 'network_error',
      message: `Failed to connect to Supabase Edge Function: ${errorMsg}`,
      httpStatus: 0,
      endpointCalled: edgeUrl,
    };
  }
}
