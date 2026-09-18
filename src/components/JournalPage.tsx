import { Clock, ArrowRight, BookOpen } from 'lucide-react';

interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  image: string;
  featured?: boolean;
}

const ARTICLES: Article[] = [
  {
    slug: 'what-does-spf-actually-mean',
    title: 'Wait… what does SPF actually mean?',
    excerpt: 'It sounds technical, but it is really just a little number that tells you how much longer your skin can hang out in the sun before it starts to react. Let us break it down — no science degree needed.',
    category: 'Skincare Basics',
    readTime: '4 min read',
    image: 'https://images.pexels.com/photos/39459688/pexels-photo-39459688.jpeg?auto=compress&cs=tinysrgb&w=900&h=600&fit=crop',
    featured: true,
  },
  {
    slug: 'self-care-is-not-hygiene',
    title: 'Self-care \u2260 hygiene',
    excerpt: 'One is about staying clean. The other is about feeling good. They are related, but they are not the same thing — and confusing them is why a lot of us feel guilty for "doing nothing."',
    category: 'Self-Care',
    readTime: '5 min read',
    image: 'https://images.pexels.com/photos/2097499/pexels-photo-2097499.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop',
  },
  {
    slug: '3-body-care-mistakes',
    title: '3 body-care mistakes you might be making',
    excerpt: 'Skipping moisturiser on damp skin, forgetting your elbows and knees, and using the same harsh soap everywhere. Little tweaks, big difference.',
    category: 'Body Care',
    readTime: '3 min read',
    image: 'https://images.pexels.com/photos/5632326/pexels-photo-5632326.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop',
  },
  {
    slug: 'why-elbows-knees-look-darker',
    title: 'Why your elbows & knees may look darker',
    excerpt: 'It is not dirt, and it is not something is wrong. The skin there is thicker and folds more — which means it needs a different kind of love. Here is what actually helps.',
    category: 'Body Care',
    readTime: '4 min read',
    image: 'https://images.pexels.com/photos/6476116/pexels-photo-6476116.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop',
  },
  {
    slug: 'beginners-guide-to-a-routine',
    title: 'A beginner\u2019s guide to building a routine (without overwhelm)',
    excerpt: 'You do not need ten steps. You do not need expensive. You need three things, done consistently. Here is the simplest version that actually works.',
    category: 'Skincare Basics',
    readTime: '6 min read',
    image: 'https://images.pexels.com/photos/31552021/pexels-photo-31552021.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop',
  },
  {
    slug: 'night-rituals-for-busy-women',
    title: 'Night rituals for busy women who say "I don\u2019t have time"',
    excerpt: 'If you have five minutes, you have a ritual. A warm cloth, a little oil, and a deep breath counts. Here are three tiny routines that fit into real life.',
    category: 'Self-Care',
    readTime: '4 min read',
    image: 'https://images.pexels.com/photos/8558476/pexels-photo-8558476.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop',
  },
];

export default function JournalPage() {
  const featured = ARTICLES.find((article) => article.featured);
  const rest = ARTICLES.filter((article) => !article.featured);

  return (
    <main className="bg-cream-50">
      {/* Header */}
      <div className="bg-gradient-blush">
        <div className="container-jazelle py-10 sm:py-14">
          <div className="inline-flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-blush-400" />
            <span className="section-subtitle">Jazelle Journal</span>
          </div>
          <h1 className="section-title">Little reads for your self-care journey</h1>
          <p className="mt-2 max-w-lg text-sm text-berry-400">
            Cute, easy, non-technical guides on skincare, body care, and taking
            a little time for yourself. No jargon, no pressure — just good
            information, served warm.
          </p>
        </div>
      </div>

      <div className="container-jazelle py-10 sm:py-14">
        {/* Featured article */}
        {featured && (
          <a
            href={`/journal/${featured.slug}`}
            className="group mb-8 block overflow-hidden rounded-5xl bg-white shadow-soft transition-all duration-300 hover:shadow-soft-lg lg:flex"
          >
            <div className="aspect-[16/10] overflow-hidden lg:w-1/2 lg:aspect-auto">
              <img
                src={featured.image}
                alt={featured.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-10 lg:w-1/2">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge-jazelle">{featured.category}</span>
                <span className="inline-flex items-center gap-1 text-xs text-berry-400">
                  <Clock className="w-3 h-3" />
                  {featured.readTime}
                </span>
              </div>
              <h2 className="font-display text-2xl font-medium text-berry-800 sm:text-3xl group-hover:text-blush-500 transition-colors text-balance">
                {featured.title}
              </h2>
              <p className="mt-3 text-sm text-berry-500 leading-relaxed">
                {featured.excerpt}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blush-500">
                Read more
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </a>
        )}

        {/* Article grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((article) => (
            <a
              key={article.slug}
              href={`/journal/${article.slug}`}
              className="group overflow-hidden rounded-4xl bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={article.image}
                  alt={article.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="badge-jazelle">{article.category}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-berry-400">
                    <Clock className="w-3 h-3" />
                    {article.readTime}
                  </span>
                </div>
                <h3 className="font-display text-lg font-medium text-berry-700 group-hover:text-blush-500 transition-colors leading-tight text-balance">
                  {article.title}
                </h3>
                <p className="mt-2 text-sm text-berry-400 leading-relaxed line-clamp-3">
                  {article.excerpt}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blush-500">
                  Read more
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
