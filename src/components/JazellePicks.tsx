import { ArrowRight } from 'lucide-react';
import { PRODUCTS } from '@/lib/catalog';
import ProductCard from '@/components/ProductCard';
import { useStore } from '@/store/StoreContext';

const PICK_SLUGS = ['rose-glow-body-oil', 'soft-touch-face-cream', 'gentle-bloom-cleanser', 'honey-lip-souffle'];

export default function JazellePicks() {
  const { products } = useStore();
  const list = products && products.length > 0 ? products : PRODUCTS;
  const picks = PICK_SLUGS.map((slug) => list.find((product) => product.slug === slug)).filter((product): product is NonNullable<typeof product> => Boolean(product));

  return (
    <section className="container-jazelle py-14 sm:py-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
        <div>
          <span className="section-subtitle">Curated With Love</span>
          <h2 className="section-title mt-2">Jazelle Picks</h2>
          <p className="text-berry-400 text-sm sm:text-base mt-2 max-w-md">
            Best sellers, founder favourites, and beginner-friendly picks —
            a little edit of what we love right now.
          </p>
        </div>
        <a href="/shop" className="btn-ghost whitespace-nowrap flex-shrink-0">
          View all
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {picks.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}
