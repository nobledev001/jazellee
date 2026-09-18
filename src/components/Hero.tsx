import { ArrowRight, Sparkles, Star } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-blush">
      {/* Decorative blobs */}
      <div className="absolute top-10 right-[-60px] w-72 h-72 rounded-full bg-blush-200/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-40px] left-[-40px] w-56 h-56 rounded-full bg-cream-300/30 blur-3xl pointer-events-none" />

      <div className="container-jazelle relative py-12 sm:py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Text content */}
          <div className="order-2 lg:order-1 text-center lg:text-left animate-fade-in">
            <div className="inline-flex items-center gap-2 mb-5">
              <span className="badge-jazelle">
                <Sparkles className="w-3 h-3" />
                Now delivering across Nigeria
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium text-berry-800 leading-[1.1] text-balance mb-4">
              Your little{' '}
              <span className="text-gradient-blush italic">self-care haven</span>
            </h1>

            <p className="text-berry-500 text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0 mb-8">
              Skincare, body care & little things that make you feel good.
              Thoughtfully picked for the modern Nigerian woman — soft, warm,
              and made for you.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <a href="/shop" className="btn-primary">
                Shop Now
                <ArrowRight className="w-4 h-4" />
              </a>
              <a href="/categories/self-care" className="btn-secondary">
                Explore Self-Care
              </a>
            </div>

            {/* Social proof */}
            <div className="mt-8 flex items-center gap-3 justify-center lg:justify-start">
              <div className="flex -space-x-2">
                {[
                  'https://images.pexels.com/photos/7321500/pexels-photo-7321500.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop',
                  'https://images.pexels.com/photos/7622877/pexels-photo-7622877.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop',
                  'https://images.pexels.com/photos/5468699/pexels-photo-5468699.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop',
                ].map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="w-9 h-9 rounded-full border-2 border-cream-50 object-cover"
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
                <p className="text-xs text-berry-400 mt-0.5">
                  Loved by 500+ women across Nigeria
                </p>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="order-1 lg:order-2 relative animate-scale-in">
            <div className="relative max-w-md mx-auto lg:max-w-none">
              {/* Main image */}
              <div className="relative rounded-5xl overflow-hidden shadow-soft-xl aspect-[4/5]">
                <img
                  src="https://images.pexels.com/photos/7321500/pexels-photo-7321500.jpeg?auto=compress&cs=tinysrgb&w=900"
                  alt="A woman in a soft robe applying skincare, enjoying a self-care moment"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-berry-900/10 to-transparent" />
              </div>

              {/* Floating product card */}
              <div className="absolute -bottom-4 -left-2 sm:-left-6 bg-cream-50 rounded-3xl shadow-soft-lg p-3 sm:p-4 flex items-center gap-3 max-w-[200px] animate-fade-in-down">
                <img
                  src="https://images.pexels.com/photos/4857799/pexels-photo-4857799.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&fit=crop"
                  alt="Bestseller"
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover flex-shrink-0"
                />
                <div>
                  <p className="text-xs font-semibold text-berry-700">Bestseller</p>
                  <p className="text-[0.7rem] text-berry-400">Glow Body Oil</p>
                  <p className="text-sm font-bold text-blush-500 mt-0.5">&#8358;12,500</p>
                </div>
              </div>

              {/* Floating heart badge */}
              <div className="absolute -top-3 -right-2 sm:-right-4 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blush-500 text-white flex items-center justify-center shadow-soft-lg animate-bounce-soft">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
