import { formatNaira } from './format';

export type DeliveryMethodId = 'standard' | 'motor_park' | 'fez';

export interface DeliveryMethodDetails {
  park_name?: string;
  park_location?: string;
}

export interface DeliveryMethodOption {
  id: DeliveryMethodId;
  name: string;
  shortLabel: string;
  description: string;
  fee: number;
  isFreeEligible: boolean;
  externalCourier: boolean;
  checkoutNote?: string;
  requiresParkDetails: boolean;
  supportsTrackingNumber: boolean;
  trackingUrl?: string;
  trackingPlatformName?: string;
}

export const DEFAULT_DELIVERY_SETTINGS = {
  standard_delivery_fee: 3500,
  free_delivery_threshold: 35000,
  delivery_fee_motor_park: 2000,
  delivery_fee_fez: 0,
} as const;

export const FEZ_CHECKOUT_NOTE =
  'Fez Delivery will contact you directly to arrange delivery and payment for shipping based on your location.';

export const FEZ_TRACKING_URL = 'https://www.fezdelivery.co/track-delivery';

export function normalizeDeliveryMethodId(raw?: unknown): DeliveryMethodId {
  const val = String(raw || '').trim().toLowerCase();
  if (val === 'motor_park' || val === 'motorpark' || val === 'bus_pickup' || val === 'park') {
    return 'motor_park';
  }
  if (val === 'fez' || val === 'fez_delivery') {
    return 'fez';
  }
  return 'standard';
}

export function getDeliveryMethodLabel(method?: unknown): string {
  const id = normalizeDeliveryMethodId(method);
  switch (id) {
    case 'motor_park':
      return 'Motor Park / Bus Pickup';
    case 'fez':
      return 'Fez Delivery';
    case 'standard':
    default:
      return 'Standard Doorstep Delivery';
  }
}

export function parseSettingNumber(
  raw: string | number | undefined | null,
  fallback: number
): number {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return fallback;
  }
  const cleaned = String(raw).replace(/[^0-9.]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback;
}

/**
 * Calculates the authoritative delivery fee for a given delivery method and cart subtotal
 * using prices configured in site_settings.
 * - Motor Park: reads delivery_fee_motor_park from site_settings
 * - Fez: always 0 on this site (handled externally by courier until direct API integration is added)
 * - Standard: uses standard_delivery_fee / free_delivery_threshold
 */
export function calculateDeliveryFeeForMethod(
  method: unknown,
  subtotal: number,
  settings?: Record<string, string | number | undefined>
): number {
  if (subtotal <= 0) return 0;

  const id = normalizeDeliveryMethodId(method);
  const s = settings || {};

  if (id === 'motor_park') {
    return parseSettingNumber(
      s.delivery_fee_motor_park,
      DEFAULT_DELIVERY_SETTINGS.delivery_fee_motor_park
    );
  }

  // Fez Delivery: No delivery fee is added to the order total on this site.
  // The courier contacts the customer directly to arrange delivery and payment for shipping.
  if (id === 'fez') {
    return 0;
  }

  // Default / 'standard' doorstep delivery option
  const freeThreshold = parseSettingNumber(
    s.free_delivery_threshold,
    DEFAULT_DELIVERY_SETTINGS.free_delivery_threshold
  );
  const standardFee = parseSettingNumber(
    s.standard_delivery_fee,
    DEFAULT_DELIVERY_SETTINGS.standard_delivery_fee
  );

  return subtotal >= freeThreshold ? 0 : standardFee;
}

export function getDeliveryMethodOptions(
  subtotal: number,
  settings?: Record<string, string | number | undefined>
): DeliveryMethodOption[] {
  const s = settings || {};
  const freeThreshold = parseSettingNumber(
    s.free_delivery_threshold,
    DEFAULT_DELIVERY_SETTINGS.free_delivery_threshold
  );
  const standardBaseFee = parseSettingNumber(
    s.standard_delivery_fee,
    DEFAULT_DELIVERY_SETTINGS.standard_delivery_fee
  );
  const motorParkFee = parseSettingNumber(
    s.delivery_fee_motor_park,
    DEFAULT_DELIVERY_SETTINGS.delivery_fee_motor_park
  );

  const standardEffectiveFee =
    subtotal > 0 && subtotal >= freeThreshold ? 0 : standardBaseFee;

  return [
    {
      id: 'standard',
      name: 'Standard Doorstep Delivery',
      shortLabel: 'Standard Delivery',
      description: `Direct doorstep courier delivery (Free on orders over ${formatNaira(freeThreshold)})`,
      fee: standardEffectiveFee,
      isFreeEligible: true,
      externalCourier: false,
      requiresParkDetails: false,
      supportsTrackingNumber: false,
    },
    {
      id: 'motor_park',
      name: 'Motor Park / Bus Pickup',
      shortLabel: 'Motor Park Pickup',
      description: 'Interstate bus/park waybill pickup — enter your preferred bus company and destination park',
      fee: motorParkFee,
      isFreeEligible: false,
      externalCourier: false,
      requiresParkDetails: true,
      supportsTrackingNumber: true,
    },
    {
      id: 'fez',
      name: 'Fez Delivery',
      shortLabel: 'Fez Delivery',
      description: 'Nationwide delivery via Fez Delivery (shipping arranged & paid directly with Fez)',
      fee: 0,
      isFreeEligible: false,
      externalCourier: true,
      checkoutNote: FEZ_CHECKOUT_NOTE,
      requiresParkDetails: false,
      supportsTrackingNumber: false,
    },
  ];
}

export const calculateDeliveryFee = calculateDeliveryFeeForMethod;

export function formatAdminDeliverySummary(
  method: unknown,
  details?: DeliveryMethodDetails | null
): string {
  const id = normalizeDeliveryMethodId(method);
  if (id === 'motor_park') {
    const parts = [details?.park_name, details?.park_location].filter(Boolean);
    return parts.length > 0
      ? `Motor Park Pickup — ${parts.join(', ')}`
      : 'Motor Park Pickup';
  }
  if (id === 'fez') {
    return 'Delivery: Fez Delivery — handled externally';
  }
  return getDeliveryMethodLabel(id);
}

export function encodeDeliveryMetadataInLandmark(
  landmark: string | undefined | null,
  method: DeliveryMethodId,
  details?: DeliveryMethodDetails | null,
  trackingNumber?: string | null
): string {
  const clean = String(landmark || '')
    .replace(/\s*\[JSH_DELIVERY:\{.*?\}\]/g, '')
    .trim();
  const meta: { m: DeliveryMethodId; d?: DeliveryMethodDetails; t?: string } = {
    m: method,
  };
  if (details && (details.park_name || details.park_location)) {
    meta.d = details;
  }
  if (trackingNumber && trackingNumber.trim()) {
    meta.t = trackingNumber.trim();
  }
  const tag = `[JSH_DELIVERY:${JSON.stringify(meta)}]`;
  return clean ? `${clean} ${tag}` : tag;
}

/**
 * Extracts delivery_method, delivery_method_details, and tracking_number from an order record,
 * supporting top-level columns on public.orders, fallback item metadata, and landmark metadata.
 */
export function extractOrderDeliveryInfo(order: Record<string, unknown> | null | undefined): {
  deliveryMethod: DeliveryMethodId;
  deliveryMethodLabel: string;
  deliveryDetails: DeliveryMethodDetails;
  deliveryMethodDetails: DeliveryMethodDetails;
  trackingNumber: string;
  fulfillmentSummary: string;
  supportsTrackingNumber: boolean;
  trackingUrl: string | null;
  cleanLandmark: string;
} {
  if (!order) {
    return {
      deliveryMethod: 'standard',
      deliveryMethodLabel: 'Standard Doorstep Delivery',
      deliveryDetails: {},
      deliveryMethodDetails: {},
      trackingNumber: '',
      fulfillmentSummary: 'Deliver via: Standard Doorstep Delivery',
      supportsTrackingNumber: false,
      trackingUrl: null,
      cleanLandmark: '',
    };
  }

  const items = Array.isArray(order.items)
    ? (order.items as Array<Record<string, unknown>>)
    : [];
  const firstItem = items[0] || {};

  const rawLandmark = typeof order.delivery_landmark === 'string' ? order.delivery_landmark : '';
  const cleanLandmark = rawLandmark.replace(/\s*\[JSH_DELIVERY:\{.*?\}\]/g, '').trim();
  let landmarkMeta: { m?: string; d?: DeliveryMethodDetails; t?: string } | null = null;
  const landmarkMatch = rawLandmark.match(/\[JSH_DELIVERY:(\{.*?\})\]/);
  if (landmarkMatch && landmarkMatch[1]) {
    try {
      landmarkMeta = JSON.parse(landmarkMatch[1]);
    } catch {
      landmarkMeta = null;
    }
  }

  const rawMethod =
    order.delivery_method || firstItem.delivery_method || landmarkMeta?.m || 'standard';
  const deliveryMethod = normalizeDeliveryMethodId(rawMethod);
  const deliveryMethodLabel = getDeliveryMethodLabel(deliveryMethod);

  let deliveryDetails: DeliveryMethodDetails = {};
  const rawDetails =
    order.delivery_method_details ?? firstItem.delivery_method_details ?? landmarkMeta?.d;
  if (rawDetails && typeof rawDetails === 'object' && !Array.isArray(rawDetails)) {
    const obj = rawDetails as Record<string, unknown>;
    deliveryDetails = {
      park_name: obj.park_name ? String(obj.park_name).trim() : undefined,
      park_location: obj.park_location ? String(obj.park_location).trim() : undefined,
    };
  } else if (typeof rawDetails === 'string' && rawDetails.trim()) {
    try {
      const parsed = JSON.parse(rawDetails);
      if (parsed && typeof parsed === 'object') {
        deliveryDetails = {
          park_name: parsed.park_name ? String(parsed.park_name).trim() : undefined,
          park_location: parsed.park_location ? String(parsed.park_location).trim() : undefined,
        };
      }
    } catch {
      deliveryDetails = { park_name: rawDetails.trim() };
    }
  }

  const rawTracking =
    order.tracking_number !== undefined &&
    order.tracking_number !== null &&
    String(order.tracking_number).trim() !== ''
      ? String(order.tracking_number).trim()
      : firstItem.tracking_number
      ? String(firstItem.tracking_number).trim()
      : landmarkMeta?.t
      ? String(landmarkMeta.t).trim()
      : '';

  let fulfillmentSummary = `Deliver via: ${deliveryMethodLabel}`;
  if (deliveryMethod === 'motor_park') {
    const parts = [deliveryDetails.park_name, deliveryDetails.park_location].filter(Boolean);
    fulfillmentSummary =
      parts.length > 0
        ? `Deliver via: Motor Park Pickup — ${parts.join(', ')}`
        : 'Deliver via: Motor Park Pickup';
  } else if (deliveryMethod === 'fez') {
    fulfillmentSummary = 'Delivery: Fez Delivery — handled externally';
  }

  // Only Motor Park orders use on-site tracking numbers and automatic tracking emails.
  // Fez handles customer delivery communication and pricing externally.
  const supportsTrackingNumber = deliveryMethod === 'motor_park';

  const trackingUrl = null;

  return {
    deliveryMethod,
    deliveryMethodLabel,
    deliveryDetails,
    deliveryMethodDetails: deliveryDetails,
    trackingNumber: rawTracking,
    fulfillmentSummary,
    supportsTrackingNumber,
    trackingUrl,
    cleanLandmark,
  };
}
