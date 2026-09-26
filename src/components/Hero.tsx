import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Star } from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

interface HeroSlide {
  image: string;
  alt: string;
  tagline?: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    image: '/assets/images/hero_slide_1.jpg',
    alt: 'Close-up of gentle hands applying velvety cream onto glowing, dewy skin',
    tagline: 'Delicate Daily Rituals',
  },
  {
    image: '/assets/images/hero_slide_2.jpg',
    alt: 'Editorial frosted glass dropper bottles on textured linen with rose petals',
    tagline: 'Clean, Thoughtful Formulas',
  },
  {
    image: '/assets/images/hero_slide_3.jpg',
    alt: 'Macro radiant bare skin texture with delicate water droplets and natural sheen',
    tagline: 'Deep Hydration & Glow',
  },
  {
    image: '/assets/images/hero_slide_4.jpg',
    alt: 'Hand dispensing golden botanical serum from a glass dropper onto the palm',
    tagline: 'Nourishing Botanical Elixirs',
  },
  {
    image: '/assets/images/hero_slide_5.jpg',
    alt: 'Whipped face cream swirl in an open ceramic jar on warm travertine stone',
    tagline: 'Everyday Comfort',
  },
];

const AVATARS = [
  'https://images.pexels.com/photos/7321500/pexels-photo-7321500.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/7622877/pexels-photo-7622877.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/5468699/pexels-photo-5468699.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { getSetting } = useSiteSettings();

  const heroBadge = getSetting('hero_badge', 'Now delivering across Nigeria');
  const heroHeadline = getSetting('hero_headline', 'Your little self-care haven');
  const heroSubtitle = getSetting(
    'hero_subtitle',
    'Skincare, body care & little things that make you feel good. Thoughtfully picked for the modern Nigerian woman — soft, warm, and made for you.'
  );
  const ctaPrimaryLabel = getSetting('hero_cta_primary_label', 'Shop Now');
  const rawPrimaryLink = getSetting('hero_cta_primary_link', '/shop');
  const ctaSecondaryLabel = getSetting('hero_cta_secondary_label', 'Explore Self-Care');
  const rawSecondaryLink = getSetting('hero_cta_secondary_link', '/about');
  const socialProofText = getSetting('hero_social_proof', 'Loved by 500+ women across Nigeria');

  const normalizeLink = (link: string, fallback: string) => {
    const trimmed = (link || '').trim();
    if (!trimmed) return fallback;
    if (
      trimmed.startsWith('/') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('mailto:')
    ) {
      return trimmed;
    }
    return `/${trimmed}`;
  };

  const ctaPrimaryLink = normalizeLink(rawPrimaryLink, '/shop');
  const ctaSecondaryLink = normalizeLink(rawSecondaryLink, '/about');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  return (
    <section
      className="relative w-full min-h-[580px] sm:min-h-[640px] lg:min-h-[700px] flex items-center overflow-hidden bg-berry-950"
      aria-label="Hero Showcase"
    >
      {/* Background Slideshow with Smooth Cross-Fade */}
      <div className="absolute inset-0 w-full h-full overflow-hidden select-none">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div
              key={index}
              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                className={`w-full h-full object-cover object-center transition-transform duration-[5500ms] ease-out ${
                  isActive ? 'scale-105' : 'scale-100'
                }`}
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            </div>
          );
        })}
      </div>

      {/* Layer 1: Contrast Protection - Directional Gradient from Left/Center for Text Readability */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-berry-950/95 via-berry-950/75 to-berry-950/50 sm:from-berry-950/90 sm:via-berry-950/70 sm:to-berry-950/45" />

      {/* Layer 2: Subtle Vertical Vignette for Top Nav & Bottom Carousel Controls */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-berry-950/85 via-transparent to-berry-950/40" />

      {/* Layer 3: Warm Blush Glow Tint */}
      <div className="absolute inset-0 z-10 bg-blush-950/20 mix-blend-multiply pointer-events-none" />

      {/* Hero Foreground Content */}
      <div className="container-jazelle relative z-20 py-16 sm:py-20 lg:py-28">
        <div className="max-w-2xl text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-4 sm:mb-6 animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md border border-white/25 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white shadow-soft">
              <Sparkles className="w-3.5 h-3.5 text-blush-300 animate-pulse" />
              {heroBadge}
            </span>
          </div>

          {/* Headline & Subtitle in Blurred Glass Panel */}
          <div className="bg-black/35 backdrop-blur-md rounded-3xl px-6 py-6 sm:px-8 sm:py-8 mb-8 sm:mb-10 inline-block">
            {/* Main Headline */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-medium text-white leading-[1.1] sm:leading-[1.12] text-balance drop-shadow-sm mb-4">
              {heroHeadline}
            </h1>

            {/* Subtitle */}
            <p className="text-white/90 text-base sm:text-lg lg:text-xl font-light leading-relaxed max-w-xl drop-shadow-xs">
              {heroSubtitle}
            </p>
          </div>

          {/* Call-to-Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            <a
              href={ctaPrimaryLink}
              className="btn-primary !bg-blush-500 hover:!bg-blush-600 !text-white shadow-soft-lg px-8 py-3.5 text-sm sm:text-base font-semibold text-center group transition-all duration-300"
            >
              <span>{ctaPrimaryLabel}</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
            <a
              href={ctaSecondaryLink}
              className="btn-secondary !bg-white/15 hover:!bg-white/25 !text-white !border-white/35 backdrop-blur-md px-7 py-3.5 text-sm sm:text-base font-semibold text-center transition-all duration-300"
            >
              {ctaSecondaryLabel}
            </a>
          </div>

          {/* Social Proof: Loved by 500+ Women Badge */}
          <div className="mt-8 sm:mt-10 inline-flex items-center gap-3.5 p-2 pr-4 sm:pr-5 rounded-full bg-black/25 backdrop-blur-md border border-white/20 shadow-soft">
            <div className="flex -space-x-2">
              {AVATARS.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white/80 object-cover"
                />
              ))}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5 fill-gold-400 stroke-gold-400"
                  />
                ))}
              </div>
              <p className="text-xs text-white/90 font-medium mt-0.5 tracking-tight">
                {socialProofText}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Small Dot Indicators (Auto-rotation visual cue + clickable) */}
      <div
        className="absolute bottom-6 sm:bottom-8 left-0 right-0 z-20 flex justify-center items-center gap-2 sm:gap-2.5"
        role="tablist"
        aria-label="Slideshow indicators"
      >
        {HERO_SLIDES.map((slide, idx) => {
          const isActive = idx === currentSlide;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}: ${slide.tagline || slide.alt}`}
              className={`transition-all duration-500 rounded-full cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blush-300 ${
                isActive
                  ? 'w-7 sm:w-8 h-2 sm:h-2.5 bg-blush-400 shadow-md ring-1 ring-white/50'
                  : 'w-2 sm:w-2.5 h-2 sm:h-2.5 bg-white/40 hover:bg-white/75'
              }`}
            />
          );
        })}
      </div>
    </section>
  );
}
