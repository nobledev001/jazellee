import { Truck, RotateCcw, ShieldCheck, FileText, ArrowRight } from 'lucide-react';
import { getWhatsAppLink } from '@/lib/whatsapp';
import { useStore } from '@/store/StoreContext';
import { formatNaira } from '@/lib/format';

export type PolicyType = 'shipping' | 'returns' | 'privacy' | 'terms';

interface PolicyConfig {
  title: string;
  subtitle: string;
  icon: typeof Truck;
  content: { heading: string; body: string }[];
}

export default function PolicyPage({ policy }: { policy: PolicyType }) {
  const { freeDeliveryThreshold } = useStore();
  const thresholdLabel = formatNaira(freeDeliveryThreshold);

  const POLICIES: Record<PolicyType, PolicyConfig> = {
    shipping: {
      title: 'Shipping & Delivery Policy',
      subtitle: 'Safe, timely dispatch across all 36 Nigerian states & the FCT.',
      icon: Truck,
      content: [
        {
          heading: '1. Nationwide Delivery Scope',
          body: 'Jazelle Skin Haven delivers across every state in Nigeria. Whether you are in Abuja, Lagos, Port Harcourt, Enugu, Ibadan, Kano, or remote localities, our verified courier partners ensure your package arrives carefully packaged and temperature-safe.',
        },
        {
          heading: '2. Delivery Timelines',
          body: '• Abuja (FCT): Same-day or 1–2 business days.\n• Lagos & South-West: 2–3 business days.\n• Port Harcourt & South-South / South-East: 3–4 business days.\n• Northern States: 3–5 business days.',
        },
        {
          heading: '3. Delivery Rates & Free Shipping',
          body: `Orders of ${thresholdLabel} and above qualify for Free Delivery across Nigeria. For orders under ${thresholdLabel}, a standard flat fee of ₦2,500 applies at checkout.`,
        },
        {
          heading: '4. Order Tracking',
          body: 'Once your order is processed, you will receive an itemized email update and tracking reference. You can also track your live fulfillment status anytime via our Track Order portal.',
        },
      ],
    },
    returns: {
      title: 'Returns & Exchanges',
      subtitle: 'Transparent, fair policies designed to guarantee your peace of mind.',
      icon: RotateCcw,
      content: [
        {
          heading: '1. Hygiene & Safety Standards',
          body: 'Because skincare and body care products are intimate wellness items, we accept returns only on unopened, unsealed products in their original protective packaging within 7 days of delivery.',
        },
        {
          heading: '2. Damaged or Incorrect Items',
          body: 'If an item arrives damaged, leaking, or different from what you ordered, please notify us within 48 hours of receipt with a quick photo or unboxing video via WhatsApp or email. We will arrange an immediate replacement or full refund.',
        },
        {
          heading: '3. Processing Refunds',
          body: 'Approved refunds are credited directly back to your original payment method or issued as store credit within 3–5 business days.',
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'How Jazelle Skin Haven protects and respects your personal data.',
      icon: ShieldCheck,
      content: [
        {
          heading: '1. Information We Collect',
          body: 'We collect your name, delivery address, phone number, and email address solely to process your orders, deliver updates, and provide customer support.',
        },
        {
          heading: '2. Payment Security',
          body: 'All payment processing is handled through PCI-DSS Level 1 certified gateways (such as Paystack). Jazelle Skin Haven never stores, sees, or retains your raw card digits or bank PINs.',
        },
        {
          heading: '3. Communication & Consent',
          body: 'We only send promotional emails if you opt in to our Haven newsletter. You can unsubscribe anytime with a single click. We will never sell, rent, or trade your contact information to third parties.',
        },
      ],
    },
    terms: {
      title: 'Terms of Service',
      subtitle: 'Guidelines governing orders, accounts, and use of our storefront.',
      icon: FileText,
      content: [
        {
          heading: '1. Pricing & Product Accuracy',
          body: 'All product prices are quoted in Nigerian Naira (₦) and include applicable statutory taxes. We strive for absolute accuracy in descriptions, ingredients, and imagery.',
        },
        {
          heading: '2. Customer Accounts',
          body: 'When you create an account, you are responsible for maintaining the confidentiality of your login credentials and for all activities under your account.',
        },
        {
          heading: '3. Order Acceptance',
          body: 'An order confirmation email signifies receipt of your request. Jazelle Skin Haven reserves the right to cancel or limit orders in the rare event of inventory errors or unforeseen stock depletion.',
        },
      ],
    },
  };

  const config = POLICIES[policy] || POLICIES.shipping;
  const Icon = config.icon;

  return (
    <main className="bg-cream-50 min-h-[70vh]">
      {/* Header */}
      <div className="bg-gradient-blush border-b border-blush-100">
        <div className="container-jazelle py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1 text-xs font-semibold text-blush-600 shadow-2xs mb-4">
            <Icon className="h-3.5 w-3.5" />
            <span>Haven Policies</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-berry-800">
            {config.title}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-berry-500 max-w-xl">
            {config.subtitle}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container-jazelle py-12 sm:py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          {config.content.map((sec, idx) => (
            <div key={idx} className="rounded-3xl border border-blush-100 bg-white p-6 sm:p-8 shadow-soft">
              <h2 className="font-display text-lg sm:text-xl font-semibold text-berry-800 mb-3">
                {sec.heading}
              </h2>
              <div className="text-sm sm:text-base text-berry-600 leading-relaxed whitespace-pre-line">
                {sec.body}
              </div>
            </div>
          ))}

          {/* Assistance card */}
          <div className="rounded-3xl bg-blush-50 p-6 text-center border border-blush-200">
            <h3 className="font-display text-lg font-medium text-berry-800">
              Have a specific question about your order?
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-berry-500">
              Our team in Abuja is ready to assist you on WhatsApp or email.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <a
                href={getWhatsAppLink(`Hi Jazelle! I have a question regarding your ${config.title}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs"
              >
                Chat on WhatsApp
              </a>
              <a href="/contact" className="btn-secondary text-xs">
                Contact Support <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
