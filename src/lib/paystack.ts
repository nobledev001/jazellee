/**
 * Client-side Paystack utilities for Jazelle Skin Haven.
 * 
 * ARCHITECTURE:
 * This is a static React/Vite client deployed to Vercel/CDN with no serverless backend routes of its own.
 * All payment verification calls are made DIRECTLY to the deployed Supabase Edge Function full URL:
 * https://otdvuuxmnlfjvtjifudq.supabase.co/functions/v1/verify-paystack
 * 
 * Required request headers:
 * - Authorization: Bearer [VITE_SUPABASE_ANON_KEY]
 * - apikey: [VITE_SUPABASE_ANON_KEY]
 * - Content-Type: application/json
 */

export const getVerifyPaystackEndpoint = (): string => getVerifyPaystackUrl();
export const SUPABASE_VERIFY_PAYSTACK_URL =
  ((typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL)
    ? `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/verify-paystack`
    : '/api/verify-paystack');

export interface PaystackVerificationResult {
  verified: boolean;
  status?: string;
  message?: string;
  amount?: number;
  reference?: string;
  channel?: string;
  paid_at?: string;
  simulated?: boolean;
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
  reference?: string;
  channel?: string;
  paid_at?: string;
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

  // Poll for up to 3 seconds if script is already in the document
  const existing = document.querySelector('script[src*="paystack.co"]');
  if (existing) {
    const startTime = Date.now();
    while (Date.now() - startTime < 3000) {
      if (isReady()) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return isReady();
  }

  // Otherwise dynamically inject script tag
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

/**
 * Retrieves the client-safe public Paystack key from environment variables.
 */
export function getPaystackPublicKey(): string {
  const envKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined)?.trim();
  return envKey || '';
}

/**
 * Retrieves the configured Supabase base URL from environment variables.
 */
export function getSupabaseBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  return (envUrl || '').replace(/\/+$/, '');
}

/**
 * Retrieves the Supabase Anon Key for Authorization and apikey headers.
 */
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
 * Calls the server-side payment verification endpoint (Supabase Edge Function or backend API)
 * to verify transaction validity using the server-stored PAYSTACK_SECRET_KEY.
 */
export async function verifyPaystackTransactionOnServer(
  reference: string,
  expectedAmount?: number
): Promise<PaystackVerificationResult> {
  const anonKey = getSupabaseAnonKey();
  const targetUrl = getVerifyPaystackUrl();

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        reference,
        expectedAmount,
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
        endpointCalled: targetUrl,
      };
    }

    return {
      ...parsed,
      verified: Boolean(parsed.verified),
      status: parsed.status,
      message: parsed.message || (parsed.verified ? 'Payment successfully verified.' : 'Verification failed.'),
      amount: parsed.amount,
      reference: parsed.reference || reference,
      channel: parsed.channel,
      paid_at: parsed.paid_at,
      rawResponse: parsed.rawResponse || parsed,
      httpStatus,
      endpointCalled: targetUrl,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    console.error(`[Paystack Verification] Network error calling ${targetUrl}:`, err);
    return {
      verified: false,
      status: 'network_error',
      message: `Failed to connect to Supabase Edge Function: ${errorMsg}`,
      httpStatus: 0,
      endpointCalled: targetUrl,
    };
  }
}
