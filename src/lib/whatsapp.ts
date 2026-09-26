// WhatsApp helper — builds click-to-chat URLs with pre-filled messages

const DEFAULT_WHATSAPP_NUMBER = '2348000000000';

export function getActiveWhatsAppNumber(): string {
  return DEFAULT_WHATSAPP_NUMBER;
}

export function getWhatsAppLink(message?: string, customNumber?: string): string {
  const baseNumber = (customNumber || getActiveWhatsAppNumber()).replace(/[^0-9]/g, '');
  const base = `https://wa.me/${baseNumber}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_MESSAGES = {
  general: 'Hi Jazelle! I visited your website and would love some help choosing products.',
  orderHelp: (orderId: string) =>
    `Hi Jazelle! I need help with my order #${orderId}. Can you assist me?`,
  productInquiry: (productName: string) =>
    `Hi Jazelle! I have a question about the ${productName}. Is it currently available?`,
  skincareAdvice:
    "Hi Jazelle! I'm not sure what products are best for my skin type. Can you help me pick a routine?",
  deliveryQuestion: 'Hi Jazelle! I have a question about delivery to my area.',
};
