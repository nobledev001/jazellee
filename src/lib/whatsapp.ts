// WhatsApp helper — uses the official Jazelle Skin Haven WhatsApp click-to-chat link and phone number

export const DEFAULT_WHATSAPP_NUMBER = '2347017186752';
export const WHATSAPP_CHAT_URL = 'https://wa.me/message/ET5GM7MR4LYIC1';

export function getActiveWhatsAppNumber(): string {
  return DEFAULT_WHATSAPP_NUMBER;
}

export function getWhatsAppLink(_message?: string, customNumber?: string): string {
  if (customNumber) {
    const cleanNumber = customNumber.replace(/[^0-9]/g, '');
    if (cleanNumber && cleanNumber !== '2348000000000') {
      return _message
        ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(_message)}`
        : `https://wa.me/${cleanNumber}`;
    }
  }
  return WHATSAPP_CHAT_URL;
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
