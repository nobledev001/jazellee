import {
  ArrowUpRight,
  Heart,
  Sparkles,
  Droplet,
  Layers,
  CircleDot,
  Sun,
  Feather,
  type LucideIcon,
} from 'lucide-react';

interface Concern {
  question: string;
  icon: LucideIcon;
  href: string;
  gradient: string;
}

const CONCERNS: Concern[] = [
  {
    question: 'Dark spots?',
    icon: Sparkles,
    href: '/shop?concern=dark-spots',
    gradient: 'from-blush-100 to-blush-200',
  },
  {
    question: 'Dry skin?',
    icon: Droplet,
    href: '/shop?concern=dry-skin',
    gradient: 'from-cream-200 to-cream-300',
  },
  {
    question: 'Uneven skin tone?',
    icon: Layers,
    href: '/shop?concern=uneven-tone',
    gradient: 'from-blush-100 to-rose-200',
  },
  {
    question: 'Body bumps?',
    icon: CircleDot,
    href: '/shop?concern=body-bumps',
    gradient: 'from-rose-100 to-blush-200',
  },
  {
    question: 'Dull skin?',
    icon: Sun,
    href: '/shop?concern=dull-skin',
    gradient: 'from-cream-100 to-blush-100',
  },
  {
    question: 'Need better sun protection?',
    icon: Sun,
    href: '/shop?concern=sun-protection',
    gradient: 'from-gold-100 to-cream-200',
  },
  {
    question: 'Just want to feel softer & fresher?',
    icon: Feather,
    href: '/shop?concern=soft-fresh',
    gradient: 'from-sage-100 to-cream-200',
  },
];

export default function ShopByConcern() {
  return (
    <section className="bg-gradient-cream py-14 sm:py-20">
      <div className="container-jazelle">
        <div className="text-center mb-10 sm:mb-12">
          <span className="section-subtitle">Find Your Match</span>
          <h2 className="section-title mt-2">Shop By Concern</h2>
          <p className="text-berry-400 text-sm sm:text-base mt-2 max-w-lg mx-auto">
            Tell us what's bothering you and we'll point you to the right picks.
            No jargon, just solutions.
          </p>
        </div>

        {/* Concern Cards with refined 1.5 stroke icons in soft circular blush containers */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {CONCERNS.map((concern) => {
            const Icon = concern.icon;
            return (
              <a
                key={concern.question}
                href={concern.href}
                className={`group relative overflow-hidden rounded-4xl bg-gradient-to-br ${concern.gradient} p-4 sm:p-5 aspect-square flex flex-col justify-between transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-1`}
              >
                <div className="flex items-start justify-between">
                  {/* Well-proportioned soft circular blush background with consistent stroke-width 1.5 */}
                  <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-blush-100/90 border border-blush-200/70 shadow-xs flex items-center justify-center text-blush-600 group-hover:bg-white group-hover:text-blush-500 group-hover:shadow-soft transition-all duration-300">
                    <Icon className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/50 backdrop-blur-xs flex items-center justify-center text-blush-400 opacity-0 group-hover:opacity-100 group-hover:bg-white group-hover:text-blush-600 transition-all duration-200 shadow-xs">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <p className="font-display text-base sm:text-lg font-medium text-berry-800 leading-snug text-balance group-hover:text-blush-700 transition-colors">
                  {concern.question}
                </p>
              </a>
            );
          })}

          {/* CTA card */}
          <a
            href="/shop"
            className="group relative overflow-hidden rounded-4xl bg-berry-700 p-4 sm:p-5 aspect-square flex flex-col justify-between transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-1 hover:bg-berry-800"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white/20 backdrop-blur-xs border border-white/30 shadow-soft flex items-center justify-center text-cream-100 group-hover:bg-white/30 group-hover:text-white group-hover:scale-105 transition-all duration-300">
                <Heart className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-cream-100 opacity-0 group-hover:opacity-100 group-hover:bg-white/30 transition-all duration-200">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <p className="font-display text-base sm:text-lg font-medium text-cream-100 leading-snug">
              Browse all products
            </p>
          </a>
        </div>
      </div>
    </section>
  );
}
