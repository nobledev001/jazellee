import { useState, useEffect } from 'react';
import { Clock, ArrowLeft, ArrowRight, Share2, Check, BookOpen, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useStore } from '@/store/StoreContext';
import { formatNaira } from '@/lib/format';

interface ArticleData {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  image: string;
  body?: string;
  author?: string;
  date?: string;
  contentSections?: {
    heading: string;
    paragraphs: string[];
    callout?: string;
  }[];
  relatedProducts?: string[]; // product slugs
}

const DEFAULT_ARTICLES: Record<string, ArticleData> = {
  'what-does-spf-actually-mean': {
    slug: 'what-does-spf-actually-mean',
    title: 'Wait… what does SPF actually mean?',
    excerpt: 'It sounds technical, but it is really just a little number that tells you how much longer your skin can hang out in the sun before it starts to react. Let us break it down — no science degree needed.',
    category: 'Skincare Basics',
    readTime: '4 min read',
    image: 'https://images.pexels.com/photos/39459688/pexels-photo-39459688.jpeg?auto=compress&cs=tinysrgb&w=900&h=600&fit=crop',
    author: 'Jazelle Editorial Care',
    date: 'March 14, 2026',
    contentSections: [
      {
        heading: 'The simple math behind the letters',
        paragraphs: [
          'SPF stands for Sun Protection Factor. Think of it as a multiplier for your skin’s natural resilience against UVB rays — the ones responsible for sunburn and surface damage.',
          'If your skin normally starts to feel tender or burn after 10 minutes under strong Nigerian midday sunshine, an SPF 30 sunscreen theoretically multiplies that by 30 (giving you around 300 minutes of protection under ideal lab conditions).',
        ],
        callout: 'Real life is humid, warm, and sweaty! That’s why dermatologists recommend reapplying every 2 hours regardless of SPF 30 or 50.',
      },
      {
        heading: 'SPF 30 vs. SPF 50: Is higher always better?',
        paragraphs: [
          'Here is a little secret the beauty industry rarely mentions: SPF 30 filters out about 97% of UVB rays, while SPF 50 filters out about 98%. That is only a 1% difference in actual ray filtering.',
          'What matters infinitely more than chasing SPF 100 is choosing a lightweight sunscreen that feels comfortable on your skin, leaves zero chalky white cast on deeper skin tones, and doesn’t clog your pores during a hot humid afternoon.',
        ],
      },
      {
        heading: 'What about UVA rays and the PA rating?',
        paragraphs: [
          'UVB burns the surface, but UVA rays penetrate deeply into the dermis, causing premature fine lines, collagen breakdown, and persistent dark spots or hyperpigmentation.',
          'Look for the letters "Broad Spectrum" or a "PA++++" rating on your sunscreen. Broad Spectrum means you are guarded against both aging rays (UVA) and burning rays (UVB).',
        ],
      },
      {
        heading: 'How to wear sunscreen without looking greasy',
        paragraphs: [
          'Use the two-finger rule: squeeze two generous lines of sunscreen along the length of your index and middle fingers. Dot evenly across your forehead, cheeks, nose, neck, and behind your ears.',
          'Give it 60 seconds to sink into your skin before applying moisturizer or makeup. When you find the right formula, sunscreen stops being a chore and feels like a silky morning primer.',
        ],
      },
    ],
    relatedProducts: ['ceramide-barrier-moisturiser', 'gentle-glow-daily-cleanser'],
  },
  'self-care-is-not-hygiene': {
    slug: 'self-care-is-not-hygiene',
    title: 'Self-care \u2260 hygiene',
    excerpt: 'One is about staying clean. The other is about feeling good. They are related, but they are not the same thing — and confusing them is why a lot of us feel guilty for "doing nothing."',
    category: 'Self-Care',
    readTime: '5 min read',
    image: 'https://images.pexels.com/photos/2097499/pexels-photo-2097499.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop',
    author: 'Jazelle Wellness Notes',
    date: 'March 18, 2026',
    contentSections: [
      {
        heading: 'When maintenance gets confused with nourishment',
        paragraphs: [
          'Brushing your teeth, washing your body, washing your hair because it is dusty, cutting your nails — that is personal hygiene. It is body maintenance.',
          'Yet so many of us say, "I did my self-care today: I took a bath and went to bed." We set the bar so low because modern life demands so much from us that basic survival tasks feel like personal treats.',
        ],
        callout: 'Hygiene keeps you functioning; self-care reminds you that you are human, precious, and worthy of delight.',
      },
      {
        heading: 'What does genuine self-care look like?',
        paragraphs: [
          'Self-care does not need to cost thousands of naira or require a spa flight to an island. It is the intention behind what you are doing.',
          'Taking a hurried 3-minute shower with cold water while mentally replaying work emails is hygiene. Turning the tap warm, lighting a scented candle, massaging a rich whipped body butter into your ankles with no rush, and breathing deeply — that is self-care.',
        ],
      },
      {
        heading: 'Releasing the guilt of "doing nothing"',
        paragraphs: [
          'Many Nigerian women were raised in environments where resting is viewed as laziness. If your hands are idle, you are urged to find work.',
          'Unlearning that begins with small micro-moments: five quiet minutes with your favourite herbal tea, sitting by the window before the house wakes up, or gently applying a facial oil before sleeping without checking your phone notifications.',
        ],
      },
    ],
    relatedProducts: ['whipped-shea-body-butter', 'nourishing-lip-balm'],
  },
  '3-body-care-mistakes': {
    slug: '3-body-care-mistakes',
    title: '3 body-care mistakes you might be making',
    excerpt: 'Skipping moisturiser on damp skin, forgetting your elbows and knees, and using the same harsh soap everywhere. Little tweaks, big difference.',
    category: 'Body Care',
    readTime: '3 min read',
    image: 'https://images.pexels.com/photos/5632326/pexels-photo-5632326.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop',
    author: 'Jazelle Skin Haven Team',
    date: 'March 20, 2026',
    contentSections: [
      {
        heading: 'Mistake #1: Waiting until your skin is bone dry to apply lotion',
        paragraphs: [
          'Most moisturizers are formulated to seal in hydration rather than generate it from scratch. When you step out of the shower and towel dry until you are completely dry, you miss the golden window.',
          'Instead, lightly pat yourself with your towel so your skin is still softly damp, then glide your body lotion or butter on within 90 seconds. Your skin will lock in that water and feel velvet-soft all day.',
        ],
      },
      {
        heading: 'Mistake #2: Scrubbing rough areas like you are scouring pots',
        paragraphs: [
          'When knees, elbows, or inner thighs feel uneven or rough, the common instinct is to grab a coarse sponge or harsh scrub and scrub aggressively.',
          'Friction actually triggers melanocytes to produce more pigment and makes the skin thicker to protect itself. Gentle chemical exfoliants (like lactic acid or low-percentage urea) work wonders without damaging your barrier.',
        ],
        callout: 'Never scrub dry skin. Be as gentle with your body as you would be with silk.',
      },
      {
        heading: 'Mistake #3: Using drying bar soaps with stripped pH',
        paragraphs: [
          'Traditional hard soaps with high alkaline pH strip the acid mantle of your skin, leaving it feeling tight, squeaky, and prone to ashy patches.',
          'Switch to a nourishing, pH-balanced cleansing bar or gel formulated with shea, ceramides, or plant oils. Your skin should feel quenched, not squeaky.',
        ],
      },
    ],
    relatedProducts: ['whipped-shea-body-butter', 'nourishing-body-oil-rose'],
  },
  'why-elbows-knees-look-darker': {
    slug: 'why-elbows-knees-look-darker',
    title: 'Why your elbows & knees may look darker',
    excerpt: 'It is not dirt, and it is not something is wrong. The skin there is thicker and folds more — which means it needs a different kind of love. Here is what actually helps.',
    category: 'Body Care',
    readTime: '4 min read',
    image: 'https://images.pexels.com/photos/6476116/pexels-photo-6476116.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop',
    author: 'Jazelle Dermatology Advisory',
    date: 'March 22, 2026',
    contentSections: [
      {
        heading: 'Anatomy of friction and joint folds',
        paragraphs: [
          'First, let us clear this up with love: dark elbows and knees are completely normal, especially on melanin-rich skin. They are not dirty, and you did not do anything wrong.',
          'Elbows and knees are joints that bend thousands of times a day. To accommodate that continuous stretching without tearing, the epidermis in these areas is naturally thicker with more layers of stratum corneum. When skin is compressed and folded, pigment appears denser.',
        ],
      },
      {
        heading: 'Friction: The hidden culprit',
        paragraphs: [
          'Every time you lean your elbows on a desk while working on your laptop, or rest on your knees while praying or cleaning, mechanical pressure activates protective melanin production.',
          'The first step in caring for these areas is cushioning: be mindful of leaning on hard surfaces, and avoid scrubbing with hard sponges.',
        ],
        callout: 'Melanin is a protective shield. When skin feels bruised or rubbed, it produces pigment to protect itself. Gentleness is your superpower.',
      },
      {
        heading: 'The 3-step routine for smoother, brighter joints',
        paragraphs: [
          '1. Exfoliate gently: Use a gentle lactic acid or AHA body lotion 2–3 nights a week to loosen dead, thickened skin cells without tearing.',
          '2. Hydrate deeply: Apply a humectant (like glycerin or hyaluronic acid) right after bathing.',
          '3. Seal with rich lipids: Top with unrefined shea butter or a dense ceramide cream to lock in softness overnight.',
        ],
      },
    ],
    relatedProducts: ['whipped-shea-body-butter', 'gentle-glow-daily-cleanser'],
  },
  'beginners-guide-to-a-routine': {
    slug: 'beginners-guide-to-a-routine',
    title: 'A beginner\u2019s guide to building a routine (without overwhelm)',
    excerpt: 'You do not need ten steps. You do not need expensive. You need three things, done consistently. Here is the simplest version that actually works.',
    category: 'Skincare Basics',
    readTime: '6 min read',
    image: 'https://images.pexels.com/photos/31552021/pexels-photo-31552021.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop',
    author: 'Jazelle Skin Haven Team',
    date: 'March 23, 2026',
    contentSections: [
      {
        heading: 'The 10-step trap: Why more is not better',
        paragraphs: [
          'Social media will convince you that you need an oil cleanser, foam cleanser, toner, essence, three serums, an eye cream, a sheet mask, a moisturizer, and an oil — twice a day.',
          'For 90% of skin types, that excessive layering does one thing: it overwhelms and irritates the skin barrier, leading to mysterious breakouts and redness. Skin thrives on consistency with a few well-formulated essentials.',
        ],
      },
      {
        heading: 'The Sacred Trinity: Cleanse, Hydrate, Protect',
        paragraphs: [
          'Morning Routine (2 minutes):\n• Gentle rinse or mild cleanser\n• Lightweight moisturizer\n• Broad Spectrum SPF 30 or 50',
          'Evening Routine (3 minutes):\n• Gentle cleanser to remove dust, oil, and sunscreen\n• Barrier-repairing moisturizer or night balm',
        ],
        callout: 'Master this simple 3-step ritual for 6 weeks before introducing targeted actives like Vitamin C, Niacinamide, or Retinol.',
      },
      {
        heading: 'How to introduce new products safely',
        paragraphs: [
          'Never start three new products on the same day. If you break out or experience an allergic reaction, you will have no idea which bottle caused it.',
          'Introduce one new product at a time. Patch test behind your ear or along your jawline for 48 hours. If all is clear, introduce it into your routine for two full weeks before adding anything else.',
        ],
      },
    ],
    relatedProducts: ['gentle-glow-daily-cleanser', 'ceramide-barrier-moisturiser'],
  },
  'night-rituals-for-busy-women': {
    slug: 'night-rituals-for-busy-women',
    title: 'Night rituals for busy women who say "I don\u2019t have time"',
    excerpt: 'If you have five minutes, you have a ritual. A warm cloth, a little oil, and a deep breath counts. Here are three tiny routines that fit into real life.',
    category: 'Self-Care',
    readTime: '4 min read',
    image: 'https://images.pexels.com/photos/8558476/pexels-photo-8558476.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop',
    author: 'Jazelle Wellness Notes',
    date: 'March 24, 2026',
    contentSections: [
      {
        heading: 'The 5-minute wind-down',
        paragraphs: [
          'By 9:00 PM, you have survived Lagos traffic, answered eighty WhatsApp messages, met deadlines, or cooked for family. The last thing you want is a complicated chore.',
          'A night ritual is not an item on your to-do list; it is the boundary between the world demanding from you and you coming back home to yourself.',
        ],
      },
      {
        heading: 'Step 1: The Warm Flannel Press',
        paragraphs: [
          'Soak a soft cotton washcloth or face towel in warm water. Gently press it over your face and hold it there for three deep, slow belly breaths.',
          'The warmth softens dirt and tension from your brow and jaw, while signal-switching your nervous system from "fight or flight" into "rest and digest."',
        ],
        callout: 'Close your eyes. That one minute of warmth is yours alone.',
      },
      {
        heading: 'Step 2: Gentle Glide & Hydration',
        paragraphs: [
          'Cleanse with a milk or cream cleanser. Pat softly, and while your skin is still dewy, smooth a nourishing moisturizer and a drop of facial or rose body oil over your neck and chest.',
          'Slip on clean silk or satin pillowcases to preserve your moisture barrier and protect your hair edges overnight. Sleep well, Haven girl.',
        ],
      },
    ],
    relatedProducts: ['nourishing-body-oil-rose', 'ceramide-barrier-moisturiser'],
  },
};

const SLUG_ALIASES: Record<string, string> = {
  'skincare-routine-nigerian-weather': 'beginners-guide-to-a-routine',
  'body-care-smooth-skin': '3-body-care-mistakes',
  'evening-unwind-rituals': 'night-rituals-for-busy-women',
  'hyperpigmentation-guide': 'why-elbows-knees-look-darker',
};

export default function ArticleDetailPage({ slug }: { slug: string }) {
  const resolvedSlug = SLUG_ALIASES[slug] || slug;
  const { addToCart, products } = useStore();
  const [copied, setCopied] = useState(false);
  const [article, setArticle] = useState<ArticleData>(() => DEFAULT_ARTICLES[resolvedSlug] || {
    slug: resolvedSlug,
    title: resolvedSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    excerpt: 'A thoughtful reading guide from the Jazelle Skin Haven team.',
    category: 'Skincare',
    readTime: '4 min read',
    image: 'https://images.pexels.com/photos/39459688/pexels-photo-39459688.jpeg?auto=compress&cs=tinysrgb&w=900&h=600&fit=crop',
    author: 'Jazelle Skin Haven',
    date: 'March 2026',
  });

  useEffect(() => {
    // Start with fallback if known
    if (DEFAULT_ARTICLES[resolvedSlug]) {
      setArticle(DEFAULT_ARTICLES[resolvedSlug]);
    }

    // Attempt to load from Supabase database
    supabase
      .from('journal_articles')
      .select('*')
      .eq('slug', resolvedSlug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (data && !error) {
          const fallback = DEFAULT_ARTICLES[resolvedSlug];
          setArticle({
            slug: data.slug || resolvedSlug,
            title: data.title || fallback?.title || resolvedSlug,
            excerpt: data.excerpt || fallback?.excerpt || '',
            category: data.category || fallback?.category || 'Journal',
            readTime: data.read_time || fallback?.readTime || '4 min read',
            image: data.image || fallback?.image || 'https://images.pexels.com/photos/39459688/pexels-photo-39459688.jpeg?auto=compress&cs=tinysrgb&w=900&h=600&fit=crop',
            body: data.body || fallback?.body || '',
            author: fallback?.author || 'Jazelle Care Team',
            date: fallback?.date || new Date(data.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            contentSections: fallback?.contentSections,
            relatedProducts: fallback?.relatedProducts,
          });
        }
      })
      .catch(() => {});
  }, [resolvedSlug]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.excerpt,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Other articles for the bottom "More from Journal" section
  const otherArticles = Object.values(DEFAULT_ARTICLES)
    .filter((a) => a.slug !== slug)
    .slice(0, 3);

  // Matched products for recommendations
  const recommendedItems = (products || []).filter((p) =>
    article.relatedProducts?.includes(p.slug) ||
    (p.category.toLowerCase().includes(article.category.toLowerCase().split(' ')[0]))
  ).slice(0, 2);

  return (
    <main className="bg-cream-50 min-h-screen">
      {/* Top Breadcrumb & Return Header */}
      <div className="bg-white border-b border-blush-100">
        <div className="container-jazelle py-4 flex items-center justify-between">
          <a
            href="/journal"
            className="inline-flex items-center gap-2 text-xs font-semibold text-berry-600 hover:text-blush-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Journal
          </a>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-berry-500 hover:text-blush-600 transition-colors cursor-pointer rounded-full px-3 py-1 bg-blush-50 border border-blush-150"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Link copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Share read</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hero Article Header */}
      <article className="container-jazelle py-8 sm:py-12 max-w-4xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="badge-jazelle">{article.category}</span>
            <span className="inline-flex items-center gap-1 text-xs text-berry-400">
              <Clock className="w-3 h-3" />
              {article.readTime}
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-berry-900 leading-tight text-balance">
            {article.title}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-berry-600 leading-relaxed font-light">
            {article.excerpt}
          </p>

          <div className="mt-6 flex items-center justify-center gap-3 text-xs text-berry-400">
            <span>By <strong className="text-berry-700">{article.author || 'Jazelle Care Team'}</strong></span>
            <span>&bull;</span>
            <span>{article.date || 'March 2026'}</span>
          </div>
        </div>

        {/* Featured Image */}
        <div className="aspect-[16/9] w-full overflow-hidden rounded-5xl bg-blush-100 shadow-soft-lg mb-10">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Article Content */}
        <div className="bg-white rounded-5xl p-6 sm:p-12 shadow-soft border border-blush-100/60 prose prose-berry max-w-none">
          {/* If there is a raw database body (from admin panel), render it */}
          {article.body && article.body.trim().length > 0 ? (
            <div
              className="text-berry-800 text-base sm:text-lg leading-relaxed space-y-6 font-light whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: article.body }}
            />
          ) : article.contentSections && article.contentSections.length > 0 ? (
            /* Otherwise render the rich curated editorial sections */
            <div className="space-y-10">
              {article.contentSections.map((sec, idx) => (
                <section key={idx} className="space-y-4">
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-berry-900 border-b border-blush-100 pb-2">
                    {sec.heading}
                  </h2>
                  {sec.paragraphs.map((p, pIdx) => (
                    <p key={pIdx} className="text-base sm:text-lg text-berry-700 leading-relaxed font-light">
                      {p}
                    </p>
                  ))}
                  {sec.callout && (
                    <div className="my-6 rounded-3xl bg-blush-50/80 border border-blush-200/70 p-5 sm:p-6 text-berry-800 flex items-start gap-3">
                      <p className="text-sm sm:text-base font-medium italic text-berry-800">
                        {sec.callout}
                      </p>
                    </div>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <div className="space-y-6 text-berry-700 leading-relaxed font-light">
              <p>{article.excerpt}</p>
              <p>
                Self-care is a journey of small, consistent choices. At Jazelle Skin Haven, we believe taking care of your skin and yourself should always feel tender, warm, and entirely unhurried.
              </p>
            </div>
          )}

          {/* End of article signature note */}
          <div className="mt-12 pt-8 border-t border-blush-150 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blush-100 flex items-center justify-center text-blush-600 font-bold text-sm">
                JH
              </div>
              <div>
                <p className="text-sm font-bold text-berry-800">Jazelle Skin Haven Editorial</p>
                <p className="text-xs text-berry-500">Delivering tenderness & radiant skin across Nigeria</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="btn-secondary text-xs py-2 px-4 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share this article
            </button>
          </div>
        </div>

        {/* Recommended Products for this read */}
        {recommendedItems.length > 0 && (
          <section className="mt-12 rounded-4xl bg-gradient-blush p-6 sm:p-8 border border-blush-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-wider font-bold text-berry-700">Haven Recommendations</span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-berry-900 mb-6">
              Pairs well with this reading ritual
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              {recommendedItems.map((prod) => (
                <div
                  key={prod.slug}
                  className="bg-white rounded-3xl p-4 flex items-center gap-4 shadow-2xs hover:shadow-soft transition-all border border-blush-100"
                >
                  <a href={`/product/${prod.slug}`} className="shrink-0">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-20 h-20 rounded-2xl object-cover"
                    />
                  </a>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-blush-600 tracking-wider">
                      {prod.category}
                    </span>
                    <a href={`/product/${prod.slug}`}>
                      <h4 className="font-semibold text-sm text-berry-800 truncate hover:text-blush-600">
                        {prod.name}
                      </h4>
                    </a>
                    <p className="text-xs text-berry-500 font-mono mt-0.5">
                      {formatNaira(prod.price)}
                    </p>
                    <button
                      type="button"
                      onClick={() => addToCart(prod.slug)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blush-600 hover:text-blush-700 cursor-pointer"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      Add to bag
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Read More Section */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-blush-400" />
                <span className="section-subtitle">Keep reading</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-berry-900">More from the Haven Journal</h2>
            </div>
            <a
              href="/journal"
              className="text-xs font-semibold text-blush-600 hover:text-blush-700 flex items-center gap-1"
            >
              All articles <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {otherArticles.map((item) => (
              <a
                key={item.slug}
                href={`/journal/${item.slug}`}
                className="group overflow-hidden rounded-3xl bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg flex flex-col"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="badge-jazelle text-[10px]">{item.category}</span>
                      <span className="text-[11px] text-berry-400">{item.readTime}</span>
                    </div>
                    <h3 className="font-serif font-bold text-sm text-berry-800 group-hover:text-blush-500 transition-colors leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blush-500">
                    Read article <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}
