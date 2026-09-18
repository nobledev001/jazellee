import { useState } from 'react';
import { ChevronDown, MessageCircle, Truck, CreditCard, RefreshCw, ShieldCheck, Package, Phone } from 'lucide-react';
import { getWhatsAppLink } from '@/lib/whatsapp';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  icon: typeof Truck;
  items: FAQItem[];
}

const SECTIONS: FAQSection[] = [
  {
    title: 'Delivery & Areas',
    icon: Truck,
    items: [
      { question: 'Where do you deliver?', answer: 'We deliver across all 36 states in Nigeria, including Abuja, Lagos, Port Harcourt, Kano, Ibadan, and everywhere in between. If you have a Nigerian address, we can get your order to you.' },
      { question: 'How long does delivery take?', answer: 'Orders within Abuja typically arrive within 1\u20132 business days. For the rest of Nigeria, expect 3\u20135 business days. You will get a tracking update once your order is on the way.' },
      { question: 'How much is delivery?', answer: 'Delivery is free on orders over \u20A640,000. For orders below that, a flat delivery fee applies based on your location \u2014 you will see the exact amount at checkout before you pay.' },
    ],
  },
  {
    title: 'Ordering',
    icon: Package,
    items: [
      { question: 'How do I place an order?', answer: 'Simply browse the shop, add your favourites to your cart, and check out. You can also chat with us on WhatsApp if you would like help choosing before you buy.' },
      { question: 'Can I modify or cancel my order after placing it?', answer: 'Yes, if your order has not been packed yet. Message us on WhatsApp or email as soon as possible and we will do our best to help. Once your order has been shipped, we are unable to make changes.' },
      { question: 'Do you offer gift wrapping?', answer: 'We do! A little gift wrap option is available at checkout for a small fee \u2014 perfect for treating a friend (or yourself).' },
    ],
  },
  {
    title: 'Payment Methods',
    icon: CreditCard,
    items: [
      { question: 'What payment methods do you accept?', answer: 'We accept bank transfers, debit cards (Visa and Mastercard), and USSD payments. All prices are in Nigerian Naira (\u20A6).' },
      { question: 'Is it safe to pay on your website?', answer: 'Yes. All payments are processed through secure, trusted payment providers. We never see or store your card details.' },
      { question: 'Can I pay on delivery?', answer: 'Payment on delivery is available for select areas in Abuja. For other locations, we ask that you pay before delivery to keep things smooth for everyone.' },
    ],
  },
  {
    title: 'Product Selection Help',
    icon: MessageCircle,
    items: [
      { question: 'I am new to skincare. Where do I start?', answer: 'Start simple! A gentle cleanser, a moisturiser, and a daily SPF are all you need. Check out our "Jazelle Picks" section for beginner-friendly favourites, or chat with us on WhatsApp for a personalised recommendation.' },
      { question: 'Can you help me choose products for my skin type?', answer: 'Absolutely. Message us on WhatsApp with a little about your skin and what you are looking for, and we will point you to the right picks. No jargon, no pressure.' },
      { question: 'Are your products authentic?', answer: 'Yes, every product is sourced directly from trusted brands and distributors. We do not stock counterfeits \u2014 ever. If you ever have a concern, reach out and we will sort it out.' },
    ],
  },
  {
    title: 'Returns & Refunds',
    icon: RefreshCw,
    items: [
      { question: 'What is your return policy?', answer: 'If a product arrives damaged or incorrect, we will replace it or refund you in full. Just let us know within 48 hours of receiving your order with a photo.' },
      { question: 'Can I return a product I simply did not like?', answer: 'For hygiene reasons, we are unable to accept returns on opened products. However, if you are unsure about a product, chat with us before buying and we will help you choose wisely.' },
      { question: 'How long do refunds take?', answer: 'Refunds are processed within 3\u20135 business days of approval, back to your original payment method.' },
    ],
  },
  {
    title: 'Contact & Other Questions',
    icon: Phone,
    items: [
      { question: 'How do I contact you?', answer: 'You can reach us on WhatsApp at +234 801 234 5678, by email at hello@jazelleskinhaven.com, or through our Contact page. We respond within 24 hours, Monday to Saturday.' },
      { question: 'Do you have products for men?', answer: 'Our current collection is curated with young Nigerian women in mind, but many of our products \u2014 especially body care, grooming, and self-care items \u2014 are suitable for everyone. We are working on a dedicated men\u2019s section, so stay tuned.' },
      { question: 'Are your products dermatologically tested?', answer: 'We focus on gentle, well-formulated products from trusted brands. While we are not a clinical or dermatology brand, we choose products that are skin-friendly and suitable for everyday use.' },
    ],
  },
];

export default function FAQPage() {
  const [openSection, setOpenSection] = useState<string | null>(SECTIONS[0].title);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  return (
    <main className="bg-cream-50">
      <div className="bg-gradient-blush">
        <div className="container-jazelle py-10 sm:py-14">
          <span className="section-subtitle">Help Centre</span>
          <h1 className="section-title mt-2">Frequently asked questions</h1>
          <p className="mt-2 max-w-lg text-sm text-berry-400">
            Everything you need to know about shopping, delivery, returns, and
            more. Can\u2019t find your answer? We are one WhatsApp message away.
          </p>
        </div>
      </div>

      <div className="container-jazelle py-10 sm:py-14">
        <div className="mx-auto max-w-3xl space-y-4">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isOpen = openSection === section.title;
            return (
              <div key={section.title} className="overflow-hidden rounded-4xl bg-white shadow-soft">
                <button
                  onClick={() => setOpenSection(isOpen ? null : section.title)}
                  className="flex w-full items-center justify-between gap-3 p-5 sm:p-6 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blush-50 text-blush-500">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h2 className="font-display text-lg font-medium text-berry-700">{section.title}</h2>
                  </div>
                  <ChevronDown className={`h-5 w-5 flex-shrink-0 text-blush-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="animate-fade-in-down px-5 pb-4 sm:px-6">
                    <div className="space-y-3 border-t border-blush-100 pt-4">
                      {section.items.map((item) => {
                        const qOpen = openQuestion === item.question;
                        return (
                          <div key={item.question} className="rounded-3xl bg-blush-50/50">
                            <button
                              onClick={() => setOpenQuestion(qOpen ? null : item.question)}
                              className="flex w-full items-center justify-between gap-2 p-4 text-left"
                            >
                              <span className="text-sm font-semibold text-berry-700">{item.question}</span>
                              <ChevronDown className={`h-4 w-4 flex-shrink-0 text-blush-400 transition-transform duration-200 ${qOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {qOpen && (
                              <p className="animate-fade-in px-4 pb-4 text-sm text-berry-500 leading-relaxed">
                                {item.answer}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still need help */}
        <div className="mx-auto mt-10 max-w-3xl rounded-5xl bg-gradient-rose-soft px-6 py-10 text-center sm:py-12">
          <ShieldCheck className="mx-auto h-10 w-10 text-blush-500" />
          <h2 className="mt-4 font-display text-2xl font-medium text-berry-800">Still have a question?</h2>
          <p className="mt-2 text-sm text-berry-500 max-w-md mx-auto">
            We love hearing from you. Reach out and we will help you out \u2014
            no question is too small.
          </p>
          <a href={getWhatsAppLink('Hi Jazelle! I have a question.')} target="_blank" rel="noopener noreferrer" className="btn-primary mt-5">
            <MessageCircle className="h-4 w-4" />
            Chat With Us
          </a>
        </div>
      </div>
    </main>
  );
}
