import { ArrowUpRight, ShoppingBag } from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import concernDarkSpotsImg from '@/assets/images/macro_skin_dark_spots_1790509837383.jpg';
import concernDrySkinImg from '@/assets/images/macro_skin_dry_skin_1790509851867.jpg';
import concernUnevenToneImg from '@/assets/images/macro_skin_uneven_tone_1790509862896.jpg';
import concernBodyBumpsImg from '@/assets/images/macro_skin_body_bumps_1790509874175.jpg';
import concernDullSkinImg from '@/assets/images/macro_skin_dull_skin_1790509883787.jpg';
import concernSunProtectionImg from '@/assets/images/macro_skin_sun_protection_1790509895105.jpg';
import concernSoftFreshImg from '@/assets/images/macro_skin_soft_fresh_1790509905630.jpg';

interface Concern {
  id: string;
  question: string;
  image: string;
  href: string;
}

export default function ShopByConcern() {
  const { getSetting } = useSiteSettings();

  const title = getSetting('concern_section_title', 'Shop By Concern');
  const subtitle = getSetting('concern_section_subtitle', 'Find Your Match');
  const description = getSetting(
    'concern_section_description',
    "Tell us what's bothering you and we'll point you to the right picks. No jargon, just solutions."
  );

  const concerns: Concern[] = [
    {
      id: 'dark-spots',
      question: 'Dark spots?',
      image: getSetting('concern_image_dark_spots')?.trim() || concernDarkSpotsImg,
      href: '/shop?concern=dark-spots',
    },
    {
      id: 'dry-skin',
      question: 'Dry skin?',
      image: getSetting('concern_image_dry_skin')?.trim() || concernDrySkinImg,
      href: '/shop?concern=dry-skin',
    },
    {
      id: 'uneven-tone',
      question: 'Uneven skin tone?',
      image: getSetting('concern_image_uneven_tone')?.trim() || concernUnevenToneImg,
      href: '/shop?concern=uneven-tone',
    },
    {
      id: 'body-bumps',
      question: 'Body bumps?',
      image: getSetting('concern_image_body_bumps')?.trim() || concernBodyBumpsImg,
      href: '/shop?concern=body-bumps',
    },
    {
      id: 'dull-skin',
      question: 'Dull skin?',
      image: getSetting('concern_image_dull_skin')?.trim() || concernDullSkinImg,
      href: '/shop?concern=dull-skin',
    },
    {
      id: 'sun-protection',
      question: 'Need better sun protection?',
      image: getSetting('concern_image_sun_protection')?.trim() || concernSunProtectionImg,
      href: '/shop?concern=sun-protection',
    },
    {
      id: 'soft-fresh',
      question: 'Just want to feel softer & fresher?',
      image: getSetting('concern_image_soft_fresh')?.trim() || concernSoftFreshImg,
      href: '/shop?concern=soft-fresh',
    },
  ];

  return (
    <section className="bg-gradient-cream py-14 sm:py-20">
      <div className="container-jazelle">
        <div className="text-center mb-10 sm:mb-12">
          <span className="section-subtitle">{subtitle}</span>
          <h2 className="section-title mt-2">{title}</h2>
          <p className="text-berry-400 text-sm sm:text-base mt-2 max-w-lg mx-auto">
            {description}
          </p>
        </div>

        {/* Concern Cards with customizable device-uploaded Black skin imagery */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {concerns.map((concern) => (
            <a
              key={concern.id}
              href={concern.href}
              className="group relative overflow-hidden rounded-4xl aspect-square flex flex-col justify-between p-4 sm:p-5 transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-1 bg-berry-900"
            >
              <img
                src={concern.image}
                alt={concern.question}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/5 group-hover:from-black/80 transition-colors duration-300" />

              <div className="relative z-10 flex items-start justify-end">
                <div className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-xs flex items-center justify-center text-berry-800 opacity-90 group-hover:opacity-100 group-hover:bg-white group-hover:text-blush-600 transition-all duration-200 shadow-xs">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              <p className="relative z-10 font-display text-base sm:text-lg font-medium text-white leading-snug text-balance drop-shadow-xs">
                {concern.question}
              </p>
            </a>
          ))}

          {/* CTA card */}
          <a
            href="/shop"
            className="group relative overflow-hidden rounded-4xl bg-berry-700 p-4 sm:p-5 aspect-square flex flex-col justify-between transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-1 hover:bg-berry-800"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white/20 backdrop-blur-xs border border-white/30 shadow-soft flex items-center justify-center text-cream-100 group-hover:bg-white/30 group-hover:text-white group-hover:scale-105 transition-all duration-300">
                <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
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
