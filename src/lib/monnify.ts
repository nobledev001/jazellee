/**
 * Monnify payment integration utilities for Jazelle Skin Haven.
 *
 * Includes:
 * - Server-side `getMonnifyAccessToken()` helper: base64-encodes `apiKey:secretKey`,
 *   authenticates against Monnify's `/api/v1/auth/login` endpoint, caches the Bearer token
 *   for its ~1 hour lifetime, and auto-refreshes when expired.
 * - Client-side helpers to initialize transactions on the server (`/api/monnify/initialize`),
 *   verify transactions on the server (`/api/verify-monnify`), and support the Monnify Web SDK.
 */

export interface MonnifyTokenCacheEntry {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
  cacheKey: string;
}

const DEFAULT_TOKEN_LIFETIME_SECONDS = 3600; // ~1 hour
const TOKEN_EXPIRY_SAFETY_BUFFER_MS = 60 * 1000; // Refresh 60s before actual expiry

let cachedTokenEntry: MonnifyTokenCacheEntry | null = null;

function getServerEnv(name: string): string {
  if (typeof process !== 'undefined' && process.env && typeof process.env[name] === 'string') {
    return process.env[name]!.trim();
  }
  return '';
}

export function resolveMonnifyBaseUrl(apiKey?: string, explicitBaseUrl?: string): string {
  const customBase = (explicitBaseUrl || getServerEnv('MONNIFY_BASE_URL')).replace(/\/+$/, '');
  if (customBase) return customBase;

  const key = (apiKey || getServerEnv('MONNIFY_API_KEY') || getMonnifyApiKey()).trim();
  if (key.startsWith('MK_PROD_')) {
    return 'https://api.monnify.com';
  }
  return 'https://sandbox.monnify.com';
}

export interface GetMonnifyAccessTokenOptions {
  apiKey?: string;
  secretKey?: string;
  baseUrl?: string;
  forceRefresh?: boolean;
}

/**
 * Base64-encodes `apiKey:secretKey`, calls Monnify's `/api/v1/auth/login` endpoint,
 * caches the returned token for its ~1 hour lifetime, and auto-refreshes when expired.
 */
export async function getMonnifyAccessToken(
  optionsOrBaseUrl?: GetMonnifyAccessTokenOptions | string,
  maybeApiKey?: string,
  maybeSecretKey?: string
): Promise<string> {
  let apiKey = '';
  let secretKey = '';
  let baseUrl = '';
  let forceRefresh = false;

  if (typeof optionsOrBaseUrl === 'string') {
    if (maybeApiKey && maybeSecretKey) {
      baseUrl = optionsOrBaseUrl;
      apiKey = maybeApiKey;
      secretKey = maybeSecretKey;
    } else if (maybeApiKey && !maybeSecretKey) {
      apiKey = optionsOrBaseUrl;
      secretKey = maybeApiKey;
    } else {
      baseUrl = optionsOrBaseUrl;
    }
  } else if (optionsOrBaseUrl && typeof optionsOrBaseUrl === 'object') {
    apiKey = optionsOrBaseUrl.apiKey || '';
    secretKey = optionsOrBaseUrl.secretKey || '';
    baseUrl = optionsOrBaseUrl.baseUrl || '';
    forceRefresh = Boolean(optionsOrBaseUrl.forceRefresh);
  }

  const resolvedApiKey = (apiKey || getServerEnv('MONNIFY_API_KEY') || getServerEnv('VITE_MONNIFY_API_KEY')).trim();
  const resolvedSecretKey = (secretKey || getServerEnv('MONNIFY_SECRET_KEY')).trim();
  const resolvedBaseUrl = resolveMonnifyBaseUrl(resolvedApiKey, baseUrl);

  if (!resolvedApiKey || !resolvedSecretKey) {
    throw new Error('MONNIFY_API_KEY and MONNIFY_SECRET_KEY must be configured on the server.');
  }

  const cacheKey = `${resolvedBaseUrl}|${resolvedApiKey}`;
  const now = Date.now();

  if (
    !forceRefresh &&
    cachedTokenEntry &&
    cachedTokenEntry.cacheKey === cacheKey &&
    cachedTokenEntry.accessToken &&
    now < cachedTokenEntry.expiresAt
  ) {
    return cachedTokenEntry.accessToken;
  }

  const rawCredentials = `${resolvedApiKey}:${resolvedSecretKey}`;
  const base64Credentials =
    typeof Buffer !== 'undefined'
      ? Buffer.from(rawCredentials, 'utf8').toString('base64')
      : btoa(rawCredentials);

  const authRes = await fetch(`${resolvedBaseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${base64Credentials}`,
      'Content-Type': 'application/json',
    },
  });

  const authJson = (await authRes.json().catch(() => null)) as {
    requestSuccessful?: boolean;
    responseMessage?: string;
    responseCode?: string;
    responseBody?: {
      accessToken?: string;
      expiresIn?: number;
    };
  } | null;

  if (!authRes.ok || !authJson?.requestSuccessful || !authJson?.responseBody?.accessToken) {
    cachedTokenEntry = null;
    throw new Error(
      authJson?.responseMessage || `Monnify authentication failed (HTTP ${authRes.status})`
    );
  }

  const accessToken = authJson.responseBody.accessToken;
  const expiresInSeconds = Number(authJson.responseBody.expiresIn) || DEFAULT_TOKEN_LIFETIME_SECONDS;
  const ttlMs = Math.max(
    60 * 1000,
    expiresInSeconds * 1000 - TOKEN_EXPIRY_SAFETY_BUFFER_MS
  );

  cachedTokenEntry = {
    accessToken,
    expiresAt: Date.now() + ttlMs,
    cacheKey,
  };

  return accessToken;
}

export function clearMonnifyTokenCache(): void {
  cachedTokenEntry = null;
}

export const getVerifyMonnifyEndpoint = (): string => getVerifyMonnifyUrl();
export const SUPABASE_VERIFY_MONNIFY_URL =
  typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL
    ? `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/verify-monnify`
    : '/api/verify-monnify';

export type MonnifyPaymentMethod =
  | 'CARD'
  | 'PAY_WITH_BANK'
  | 'ACCOUNT_TRANSFER'
  | 'USSD'
  | 'PHONE_NUMBER';

export interface MonnifyInitializePayload {
  orderNumber: string;
  paymentReference?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  redirectUrl?: string;
  paymentDescription?: string;
  paymentMethods?: MonnifyPaymentMethod[];
  metadata?: Record<string, unknown>;
}

export interface MonnifyInitializeResult {
  initialized: boolean;
  checkoutUrl?: string;
  transactionReference?: string;
  paymentReference?: string;
  amount?: number;
  serverSubtotal?: number;
  serverDiscountAmount?: number;
  serverDeliveryFee?: number;
  apiKey?: string;
  contractCode?: string;
  isTestMode?: boolean;
  redirectUrl?: string;
  status?: string;
  message?: string;
  error?: string;
}

export interface MonnifyVerificationResult {
  verified: boolean;
  status?: string;
  message?: string;
  amount?: number;
  serverExpectedNaira?: number;
  serverDiscountAmount?: number;
  reference?: string;
  transactionReference?: string;
  channel?: string;
  paid_at?: string;
  enforcedBy?: string;
  rawResponse?: unknown;
  httpStatus?: number;
  endpointCalled?: string;
}

export interface MonnifySDKOptions {
  amount: number;
  currency?: string;
  reference: string;
  customerFullName: string;
  customerEmail: string;
  customerMobileNumber?: string;
  apiKey: string;
  contractCode: string;
  paymentDescription: string;
  isTestMode?: boolean;
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
  paymentMethods?: MonnifyPaymentMethod[];
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onComplete: (response: {
    status?: string;
    message?: string;
    transactionReference?: string;
    paymentReference?: string;
    authorizedAmount?: number;
    amountPaid?: number;
  }) => void;
  onClose: (data?: {
    responseCode?: string;
    paymentStatus?: string;
    status?: string;
    transactionReference?: string;
    paymentReference?: string;
  }) => void;
}

interface MonnifySDKWindow extends Window {
  MonnifySDK?: {
    initialize?: (options: MonnifySDKOptions) => void;
  };
}

interface VerificationApiResponse {
  verified?: boolean;
  status?: string;
  message?: string;
  error?: string;
  code?: string;
  amount?: number;
  serverExpectedNaira?: number;
  serverDiscountAmount?: number;
  reference?: string;
  transactionReference?: string;
  channel?: string;
  paid_at?: string;
  enforcedBy?: string;
  customer?: Record<string, unknown>;
  rawResponse?: unknown;
  data?: Record<string, unknown>;
}

/**
 * Ensures Monnify Web SDK script is loaded and window.MonnifySDK.initialize is available.
 */
export async function ensureMonnifyScriptLoaded(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const isReady = () => {
    const w = window as unknown as MonnifySDKWindow;
    return typeof w.MonnifySDK?.initialize === 'function';
  };

  if (isReady()) return true;

  const existing = document.querySelector('script[src*="sdk.monnify.com"]');
  if (existing) {
    const startTime = Date.now();
    while (Date.now() - startTime < 3500) {
      if (isReady()) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return isReady();
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.monnify.com/plugin/monnify.js';
    script.async = true;
    script.onload = () => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (isReady() || attempts > 25) {
          clearInterval(interval);
          resolve(isReady());
        }
      }, 60);
    };
    script.onerror = () => {
      console.warn('[Monnify Client] Failed to load Monnify inline script from sdk.monnify.com');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export function getMonnifyApiKey(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const envKey = (import.meta.env.VITE_MONNIFY_API_KEY as string | undefined)?.trim();
    if (envKey) return envKey;
  }
  return '';
}

export function getMonnifyContractCode(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const envCode = (import.meta.env.VITE_MONNIFY_CONTRACT_CODE as string | undefined)?.trim();
    if (envCode) return envCode;
  }
  return '';
}

export function getMonnifyIsTestMode(): boolean {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const explicitMode = (import.meta.env.VITE_MONNIFY_IS_TEST_MODE as string | undefined)?.trim()?.toLowerCase();
    if (explicitMode === 'false' || explicitMode === '0') return false;
    if (explicitMode === 'true' || explicitMode === '1') return true;
  }
  const apiKey = getMonnifyApiKey();
  if (apiKey.startsWith('MK_PROD_')) return false;
  return true;
}

export function getMonnifyConfig() {
  return {
    apiKey: getMonnifyApiKey(),
    contractCode: getMonnifyContractCode(),
    isTestMode: getMonnifyIsTestMode(),
  };
}

export function getSupabaseBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
    return (envUrl || '').replace(/\/+$/, '');
  }
  return '';
}

export function getSupabaseAnonKey(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
    return envKey || '';
  }
  return '';
}

export function getVerifyMonnifyUrl(): string {
  const baseUrl = getSupabaseBaseUrl();
  if (baseUrl) {
    return `${baseUrl}/functions/v1/verify-monnify`;
  }
  return '/api/verify-monnify';
}

/**
 * Calls the server-side Monnify Initialize Transaction endpoint (`/api/monnify/initialize`) which:
 * 1. Recalculates the true order total server-side (reusing catalog prices, active coupon rules, and delivery threshold)
 * 2. Calls Monnify's Initialize Transaction API (`/api/v1/merchant/transactions/init-transaction`)
 *    with the server-calculated amount, unique `paymentReference` (`order_number`),
 *    `paymentMethods: ["CARD", "PAY_WITH_BANK"]`, and `redirectUrl`
 * 3. Returns `checkoutUrl` and `transactionReference` to redirect or launch the modal
 */
export async function initializeMonnifyTransactionOnServer(
  payload: MonnifyInitializePayload
): Promise<MonnifyInitializeResult> {
  const anonKey = getSupabaseAnonKey();
  try {
    const res = await fetch('/api/monnify/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(anonKey ? { Authorization: `Bearer ${anonKey}`, apikey: anonKey } : {}),
      },
      body: JSON.stringify({
        ...payload,
        paymentReference: payload.paymentReference || payload.orderNumber,
        paymentMethods:
          payload.paymentMethods && payload.paymentMethods.length > 0
            ? payload.paymentMethods
            : ['CARD', 'PAY_WITH_BANK'],
      }),
    });

    const rawText = await res.text();
    let parsed: MonnifyInitializeResult | null = null;
    try {
      parsed = JSON.parse(rawText) as MonnifyInitializeResult;
    } catch {
      return {
        initialized: false,
        status: 'non_json_response',
        message: `Server returned non-JSON response (HTTP ${res.status})`,
      };
    }

    if (!res.ok || !parsed?.initialized) {
      return {
        ...parsed,
        initialized: false,
        message:
          parsed?.message ||
          parsed?.error ||
          `Failed to initialize Monnify transaction (HTTP ${res.status})`,
      };
    }

    return {
      ...parsed,
      initialized: true,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return {
      initialized: false,
      status: 'network_error',
      message: `Unable to reach payment initialization server: ${msg}`,
    };
  }
}

/**
 * Calls the server-side Monnify payment verification endpoint to:
 * 1. Look up the order in public.orders by paymentReference (order_number)
 * 2. Recalculate the true expected total from public.products and public.coupons
 * 3. Authenticate with Monnify API and verify the transaction status & amountPaid
 * 4. Finalize the order (status -> placed, payment_status -> paid, stock decrement, coupon used_count increment)
 */
export async function verifyMonnifyTransactionOnServer(
  paymentReference: string,
  transactionReference?: string,
  expectedAmount?: number,
  contact?: string
): Promise<MonnifyVerificationResult> {
  const anonKey = getSupabaseAnonKey();
  const edgeUrl = getVerifyMonnifyUrl();

  try {
    const apiRes = await fetch('/api/verify-monnify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        reference: paymentReference,
        paymentReference,
        transactionReference,
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
          serverExpectedNaira: parsed.serverExpectedNaira,
          serverDiscountAmount: parsed.serverDiscountAmount,
          reference: parsed.reference || paymentReference,
          transactionReference: parsed.transactionReference || transactionReference,
          channel: parsed.channel,
          paid_at: parsed.paid_at,
          enforcedBy: parsed.enforcedBy,
          rawResponse: parsed.rawResponse || parsed,
          httpStatus: apiRes.status,
          endpointCalled: '/api/verify-monnify',
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
        reference: paymentReference,
        paymentReference,
        transactionReference,
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
      serverExpectedNaira: parsed.serverExpectedNaira,
      serverDiscountAmount: parsed.serverDiscountAmount,
      reference: parsed.reference || paymentReference,
      transactionReference: parsed.transactionReference || transactionReference,
      channel: parsed.channel,
      paid_at: parsed.paid_at,
      enforcedBy: parsed.enforcedBy,
      rawResponse: parsed.rawResponse || parsed,
      httpStatus,
      endpointCalled: edgeUrl,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    console.error(`[Monnify Verification] Network error calling ${edgeUrl}:`, err);
    return {
      verified: false,
      status: 'network_error',
      message: `Failed to connect to verification service: ${errorMsg}`,
      httpStatus: 0,
      endpointCalled: edgeUrl,
    };
  }
}
