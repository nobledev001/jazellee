export const OFFICIAL_WHATSAPP_LINK = 'https://wa.me/message/ET5GM7MR4LYIC1';
export const DEFAULT_WHATSAPP_NUMBER = '2348123456789';

export function getWhatsAppNumber(): string {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('jazelle_site_settings_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.whatsapp_number) {
          return String(parsed.whatsapp_number).replace(/[^0-9]/g, '');
        }
      }
    } catch {
      // fallback
    }
  }
  return DEFAULT_WHATSAPP_NUMBER;
}

export function getWhatsAppLink(message?: string): string {
  if (message) {
    return `${OFFICIAL_WHATSAPP_LINK}?text=${encodeURIComponent(message)}`;
  }
  return OFFICIAL_WHATSAPP_LINK;
}
