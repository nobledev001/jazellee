import { ArrowUpRight, Heart } from 'lucide-react';

interface Concern {
  question: string;
  emoji: string;
  href: string;
  gradient: string;
}

const CONCERNS: Concern[] = [
  {
    question: 'Dark spots?',
    emoji: '\u2728',
    href: '/shop?concern=dark-spots',
    gradient: 'from-blush-100 to-blush-200',
  },
  {
    question: 'Dry skin?',
    emoji: '\u{1F637}',
    href: '/shop?concern=dry-skin',
    gradient: 'from-cream-200 to-cream-300',
  },
  {
    question: 'Uneven skin tone?',
    emoji: '\u{1F331}',
    href: '/shop?concern=uneven-tone',
    gradient: 'from-blush-100 to-rose-200',
  },
  {
    question: 'Body bumps?',
    emoji: '\u{1F49B}',
    href: '/shop?concern=body-bumps',
    gradient: 'from-rose-100 to-blush-200',
  },
  {
    question: 'Dull skin?',
    emoji: '\u{1F31F}',
    href: '/shop?concern=dull-skin',
    gradient: 'from-cream-100 to-blush-100',
  },
  {
    question: 'Need better sun protection?',
    emoji: '\u{1F31E}',
    href: '/shop?concern=sun-protection',
    gradient: 'from-gold-100 to-cream-200',
  },
  {
    question: 'Just want to feel softer & fresher?',
    emoji: '\u{1F33C}',
    href: '/shop?concern=soft-fresh',
    gradient: 'from-sage-100 to-cream-200',
  },
];

export default function ShopByConcern() {
  return (
    <section className="bg-gradient-cream py-14 sm:py-20">
      <div className="container-jazelle">
        <div className="text-center mb-10">
          <span className="section-subtitle">Find Your Match</span>
          <h2 className="section-title mt-2">Shop By Concern</h2>
          <p className="text-berry-400 text-sm sm:text-base mt-2 max-w-lg mx-auto">
            Tell us what's bothering you and we'll point you to the right picks.
            No jargon, just solutions.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {CONCERNS.map((concern) => (
            <a
              key={concern.question}
              href={concern.href}
              className={`group relative overflow-hidden rounded-4xl bg-gradient-to-br ${concern.gradient} p-5 sm:p-6 aspect-square flex flex-col justify-between transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-1`}
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl sm:text-4xl">{concern.emoji}</span>
                <ArrowUpRight className="w-5 h-5 text-berry-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              <p className="font-display text-lg sm:text-xl font-medium text-berry-700 leading-tight text-balance">
                {concern.question}
              </p>
            </a>
          ))}

          {/* CTA card */}
          <a
            href="/shop"
            className="group relative overflow-hidden rounded-4xl bg-berry-700 p-5 sm:p-6 aspect-square flex flex-col justify-between transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-1"
          >
            <div className="flex items-start justify-between">
              <span className="text-3xl sm:text-4xl">
                <Heart className="w-7 h-7 sm:w-8 sm:h-8 text-cream-200 fill-cream-200" />
              </span>
              <ArrowUpRight className="w-5 h-5 text-cream-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
            <p className="font-display text-lg sm:text-xl font-medium text-cream-100 leading-tight">
              Browse all products
            </p>
          </a>
        </div>
      </div>
    </section>
  );
}
