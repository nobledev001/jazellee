export const WHATSAPP_NUMBER = '070171386752';

export function getWhatsAppLink(message: string = 'Hi Jazelle! I need help choosing the right products for my skin.'): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
