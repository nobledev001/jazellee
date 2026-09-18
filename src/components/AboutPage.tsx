import { Heart, Sparkles, Check, ArrowRight } from 'lucide-react';

const WHY_SHOP = [
  {
    title: 'Carefully Selected',
    description: 'Every product is hand-picked and personally tested. If it is not good enough for my own routine, it does not make it to the shelf.',
    emoji: '\u{1F4AB}',
  },
  {
    title: 'Self-Care Focused',
    description: 'This is not just about looking good — it is about feeling good. Every pick is chosen with your comfort and confidence in mind.',
    emoji: '\u{1F49D}',
  },
  {
    title: 'Beginner Friendly',
    description: 'No complicated ten-step routines or confusing jargon. Just simple, gentle products that are easy to love and easy to use.',
    emoji: '\u{1F331}',
  },
  {
    title: 'Affordable Luxury',
    description: 'A little treat should not break the bank. Quality self-care at prices that make sense for the modern Nigerian woman.',
    emoji: '\u{1F48E}',
  },
  {
    title: 'Nigerian-Friendly',
    description: 'Made with our climate, our skin, and our lifestyle in mind. Delivered across Nigeria, from Abuja with love.',
    emoji: '\u{1F9E1}',
  },
];

export default function AboutPage() {
  return (
    <main className="bg-cream-50">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-blush">
        <div className="absolute inset-0 bg-[url('/assets/images/image%20copy.png')] bg-[length:200px_200px] opacity-[0.03] mix-blend-multiply pointer-events-none" />
        <div className="relative container-jazelle py-14 sm:py-20">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
            <div>
              <div className="inline-flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-blush-400" />
                <span className="section-subtitle">Our Story</span>
              </div>
              <h1 className="font-display text-4xl font-medium text-berry-800 sm:text-5xl leading-tight text-balance">
                Hi, I am Jazelle — and this is my little corner for you
              </h1>
              <p className="mt-4 text-berry-500 text-base sm:text-lg leading-relaxed">
                What started as a personal obsession with soft, happy skin
                became a business, then a pause, and now — a clearer, warmer
                version of the dream. This is why I created this little space
                for you.
              </p>
            </div>
            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden rounded-5xl shadow-soft-lg">
                <img
                  src="https://images.pexels.com/photos/8076238/pexels-photo-8076238.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Jazelle, founder of Jazelle Skin Haven"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -left-3 sm:-left-6 rounded-3xl bg-cream-50 px-5 py-4 shadow-soft-lg">
                <p className="font-display text-lg font-medium text-berry-700">Jazelle</p>
                <p className="text-xs text-blush-400">Founder, Jazelle Skin Haven</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Story sections */}
      <div className="container-jazelle py-14 sm:py-20">
        <div className="mx-auto max-w-2xl space-y-10">
          <StoryBlock
            heading="How it started"
            body="I have loved skincare for as long as I can remember. As a teenager, I was the girl reading ingredient labels, mixing little concoctions, and sharing finds with anyone who would listen. It was never about looking perfect — it was about that quiet, happy feeling of taking a moment just for yourself."
          />
          <StoryBlock
            heading="Learning the hard way"
            body="When I first started the business, I was so excited that I rushed. I stocked everything, said yes to every trend, and burnt out trying to be everything to everyone. I learned — through experience, through mistakes, through listening to my customers — that less is more, and that trust is built slowly."
          />
          <StoryBlock
            heading="The pause"
            body="So I stepped back. I took a breath. I spent time understanding what I actually wanted Jazelle Skin Haven to be — not just a store, but a soft place. A little corner on the internet where a young Nigerian woman could find good products, honest advice, and a gentle reminder that she deserves care."
          />
          <StoryBlock
            heading="And now, we are back"
            body="This relaunch is clearer, warmer, and more intentional. Every product is one I would recommend to my younger sister. Every word is written the way I would speak to a friend. This is why I created this little space for you — because self-care should feel like a haven, not a chore."
          />
        </div>
      </div>

      {/* Why Shop Jazelle */}
      <div className="relative overflow-hidden bg-gradient-cream py-14 sm:py-20">
        <div className="absolute inset-0 bg-[url('/assets/images/image%20copy.png')] bg-[length:220px_220px] opacity-[0.025] mix-blend-multiply pointer-events-none" />
        <div className="relative container-jazelle">
          <div className="text-center mb-10">
            <span className="section-subtitle">What Makes Us Different</span>
            <h2 className="section-title mt-2">Why shop Jazelle</h2>
            <p className="mt-2 max-w-lg mx-auto text-sm text-berry-400">
              Five little reasons we think you will love shopping with us.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_SHOP.map((item) => (
              <div
                key={item.title}
                className="rounded-4xl bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blush-50 text-2xl">
                  {item.emoji}
                </div>
                <h3 className="font-display text-lg font-medium text-berry-700">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-berry-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
            <div className="flex flex-col items-center justify-center rounded-4xl bg-berry-800 p-6 text-center">
              <Heart className="mb-3 h-8 w-8 text-cream-200 fill-cream-200" />
              <p className="font-display text-lg font-medium text-cream-100">
                Made with love, for you
              </p>
              <a href="/shop" className="mt-4 inline-flex items-center gap-2 rounded-full bg-cream-50 px-5 py-2.5 text-sm font-semibold text-berry-700 transition-colors hover:bg-cream-100">
                Explore the shop
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function StoryBlock({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="rounded-4xl bg-white p-6 shadow-soft sm:p-8">
      <h2 className="font-display text-xl font-medium text-berry-800 sm:text-2xl">
        {heading}
      </h2>
      <p className="mt-3 text-berry-500 leading-relaxed">{body}</p>
    </div>
  );
}
