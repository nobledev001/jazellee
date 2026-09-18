import { useMemo, useState } from 'react';
import { Search, X, SlidersHorizontal, Heart } from 'lucide-react';
import { PRODUCTS, CATEGORIES, type Category } from '@/lib/catalog';
import ProductCard from '@/components/ProductCard';
import { useStore } from '@/store/StoreContext';

type Filter = 'All' | Category;

export default function ShopPage({ initialSearch = '', initialCategory = 'All' }: { initialSearch?: string; initialCategory?: Filter }) {
  const [search, setSearch] = useState(initialSearch);
  const [activeFilter, setActiveFilter] = useState<Filter>(initialCategory);
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);
  const { wishlist } = useStore();

  const filtered = useMemo(() => {
    let result = PRODUCTS;
    if (activeFilter !== 'All') result = result.filter((product) => product.category === activeFilter);
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((product) => product.name.toLowerCase().includes(query) || product.description.toLowerCase().includes(query) || product.category.toLowerCase().includes(query) || product.features.some((feature) => feature.toLowerCase().includes(query)));
    }
    if (showWishlistOnly) result = result.filter((product) => wishlist.includes(product.slug));
    return result;
  }, [search, activeFilter, showWishlistOnly, wishlist]);

  const filters: Filter[] = ['All', 'Skincare', 'Body Care', 'Self-Care', 'Grooming'];

  return (
    <main className="bg-cream-50">
      <div className="bg-gradient-blush">
        <div className="container-jazelle py-10 sm:py-14">
          <span className="section-subtitle">Shop</span>
          <h1 className="section-title mt-2">All your self-care favourites</h1>
          <p className="mt-2 max-w-lg text-sm text-berry-400">Skincare, body care, grooming and little treats — picked for the modern Nigerian woman.</p>
        </div>
      </div>

      <div className="container-jazelle py-8 sm:py-12">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blush-300" />
            <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, e.g. sunscreen, body oil..." className="input-jazelle pl-12" />
            {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-berry-300 hover:text-berry-500" aria-label="Clear search"><X className="h-4 w-4" /></button>}
          </div>
          <button onClick={() => setShowWishlistOnly(!showWishlistOnly)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${showWishlistOnly ? 'bg-blush-500 text-white' : 'border border-blush-200 bg-white/60 text-berry-600 hover:bg-blush-50'}`}><Heart className={`h-4 w-4 ${showWishlistOnly ? 'fill-current' : ''}`} /> Wishlist ({wishlist.length})</button>
        </div>

        <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <SlidersHorizontal className="h-4 w-4 flex-shrink-0 text-blush-400" />
          {filters.map((filter) => <button key={filter} onClick={() => setActiveFilter(filter)} className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeFilter === filter ? 'bg-berry-800 text-cream-100' : 'bg-white text-berry-600 hover:bg-blush-50'}`}>{filter}</button>)}
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center"><p className="text-lg font-medium text-berry-500">No products found</p><p className="mt-1 text-sm text-berry-400">Try a different search or filter.</p></div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {filtered.map((product) => <ProductCard key={product.slug} product={product} />)}
          </div>
        )}
      </div>

      <div className="bg-gradient-cream py-14 sm:py-20">
        <div className="container-jazelle">
          <div className="text-center"><span className="section-subtitle">Browse by category</span><h2 className="section-title mt-2">Find your kind of self-care</h2></div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {CATEGORIES.map((category) => (
              <a key={category.name} href={`/shop?category=${encodeURIComponent(category.name)}`} className="group overflow-hidden rounded-4xl bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg">
                <div className="aspect-[4/3] overflow-hidden"><img src={category.image} alt={category.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></div>
                <div className="p-4"><h3 className="font-display text-lg font-medium text-berry-700 group-hover:text-blush-500">{category.name}</h3><p className="mt-1 text-xs text-berry-400">{category.description}</p></div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
