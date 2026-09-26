import { useMemo, useState, useEffect } from 'react';
import { Search, X, SlidersHorizontal, Heart, ArrowDownAZ, Check } from 'lucide-react';
import { PRODUCTS, CATEGORIES, type Category } from '@/lib/catalog';
import ProductCard from '@/components/ProductCard';
import { useStore } from '@/store/StoreContext';

type Filter = 'All' | Category;
type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'best-sellers';

export default function ShopPage({
  initialSearch = '',
  initialCategory = 'All',
}: {
  initialSearch?: string;
  initialCategory?: Filter;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [activeFilter, setActiveFilter] = useState<Filter>(initialCategory);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const { wishlist, products } = useStore();

  useEffect(() => {
    setActiveFilter(initialCategory);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [initialCategory]);

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  const allProducts = useMemo(() => {
    return (products && products.length > 0 ? products : PRODUCTS).filter(
      (p) => p.isActive !== false
    );
  }, [products]);

  const filtered = useMemo(() => {
    let result = [...allProducts];

    if (activeFilter !== 'All') {
      result = result.filter((product) => product.category === activeFilter);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query) ||
          (product.brand && product.brand.toLowerCase().includes(query)) ||
          (product.features && product.features.some((feature) => feature.toLowerCase().includes(query)))
      );
    }

    if (showWishlistOnly) {
      result = result.filter((product) => wishlist.includes(product.slug));
    }

    // Apply sorting
    const sorted = [...result];
    if (sortBy === 'price-asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'best-sellers') {
      sorted.sort((a, b) => (b.reviews?.length || 0) - (a.reviews?.length || 0));
    }

    return sorted;
  }, [allProducts, search, activeFilter, showWishlistOnly, wishlist, sortBy]);

  const filters: Filter[] = ['All', 'Skincare', 'Body Care', 'Self-Care', 'Grooming'];

  const hasActiveFilters =
    activeFilter !== 'All' || search.trim() !== '' || showWishlistOnly || sortBy !== 'featured';

  const resetFilters = () => {
    setActiveFilter('All');
    setSearch('');
    setShowWishlistOnly(false);
    setSortBy('featured');
  };

  return (
    <main className="min-h-screen bg-cream-50/70">
      {/* Header section with Breadcrumb & Editorial Mixed-weight title */}
      <section className="bg-white border-b border-gray-100">
        <div className="container-jazelle pt-6 pb-8 sm:pt-8 sm:pb-10">
          {/* Breadcrumb navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-400 font-medium mb-3">
            <a href="/" className="hover:text-blush-600 transition-colors">
              Home
            </a>
            <span className="text-gray-300">/</span>
            <span className="text-gray-800 font-medium">
              {activeFilter === 'All' ? 'All Products' : activeFilter}
            </span>
          </nav>

          {/* Page title styled with mixed weight/style (editorial feel) */}
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
            {activeFilter === 'All' ? (
              <>
                All{' '}
                <span className="font-serif italic font-normal text-berry-700">
                  Products
                </span>
              </>
            ) : (
              <>
                {activeFilter.split(' ')[0]}{' '}
                <span className="font-serif italic font-normal text-berry-700">
                  {activeFilter.split(' ').slice(1).join(' ') || 'Collection'}
                </span>
              </>
            )}
          </h1>

          <p className="mt-2 text-sm text-gray-500 max-w-xl">
            Thoughtfully formulated self-care, glowing body care &amp; gentle essentials picked for the modern Nigerian woman.
          </p>

          {/* Product count line & Sort/Filter trigger */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-5">
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              {filtered.length} of {allProducts.length} products
            </p>

            <div className="flex items-center gap-2.5">
              {/* Desktop inline quick sort */}
              <div className="relative hidden sm:flex items-center">
                <ArrowDownAZ className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  aria-label="Sort products"
                  className="rounded-full border border-gray-200 bg-white pl-9 pr-8 py-2 text-xs font-medium text-gray-700 hover:border-blush-300 focus:outline-none focus:border-blush-500 cursor-pointer appearance-none shadow-xs"
                >
                  <option value="featured">Featured</option>
                  <option value="best-sellers">Best Sellers</option>
                  <option value="rating">Top Rated</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>

              {/* Sort & Filter Button */}
              <button
                type="button"
                onClick={() => setShowFilterDrawer(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-xs sm:text-sm font-medium text-gray-700 hover:border-blush-400 hover:text-blush-600 transition-colors shadow-xs cursor-pointer active:scale-95"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-blush-500" />
                <span>Sort &amp; Filter</span>
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-blush-500" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  activeFilter === filter
                    ? 'bg-berry-800 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-blush-100 hover:text-blush-700'
                }`}
              >
                {filter}
              </button>
            ))}

            {showWishlistOnly && (
              <button
                onClick={() => setShowWishlistOnly(false)}
                className="flex-shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium bg-blush-500 text-white shadow-xs"
              >
                <Heart className="w-3 h-3 fill-current" />
                <span>Wishlist only ({wishlist.length})</span>
                <X className="w-3 h-3 ml-0.5" />
              </button>
            )}

            {search && (
              <button
                onClick={() => setSearch('')}
                className="flex-shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-700"
              >
                <span>"{search}"</span>
                <X className="w-3 h-3 ml-0.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Product Grid Section */}
      <section className="container-jazelle py-8 sm:py-12">
        {filtered.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl p-8 border border-gray-100">
            <p className="text-lg font-medium text-berry-700">No products found</p>
            <p className="mt-1 text-sm text-gray-400">
              Try adjusting your search terms or clearing your filters.
            </p>
            <button
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blush-500 hover:bg-blush-600 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          /* 2 columns on mobile, 3 on tablet, 4 on desktop with generous spacing and soft rounded cards */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {filtered.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Category Navigation Footer section */}
      <section className="bg-white py-14 sm:py-20 border-t border-gray-100">
        <div className="container-jazelle">
          <div className="text-center mb-8">
            <span className="section-subtitle">Browse by category</span>
            <h2 className="section-title mt-2">Find your kind of self-care</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {CATEGORIES.map((category) => (
              <a
                key={category.name}
                href={`/shop?category=${encodeURIComponent(category.name)}`}
                className="group overflow-hidden rounded-3xl bg-cream-50/60 p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg hover:bg-white"
              >
                <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-3">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <h3 className="font-display text-base sm:text-lg font-medium text-gray-900 group-hover:text-blush-600 transition-colors">
                  {category.name}
                </h3>
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">{category.description}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Off-canvas Sort & Filter Drawer */}
      {showFilterDrawer && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowFilterDrawer(false)}
        >
          <div
            className="w-full max-w-sm sm:max-w-md h-full bg-white p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blush-500" />
                  <h3 className="font-display text-lg font-semibold text-gray-900">
                    Sort &amp; Filter
                  </h3>
                </div>
                <button
                  onClick={() => setShowFilterDrawer(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search in Drawer */}
              <div className="mt-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, brand, benefit..."
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:border-blush-500 transition-colors"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sort By Section */}
              <div className="mt-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Sort By
                </label>
                <div className="space-y-1.5">
                  {[
                    { value: 'featured', label: 'Featured Picks' },
                    { value: 'best-sellers', label: 'Best Sellers' },
                    { value: 'rating', label: 'Top Customer Rated' },
                    { value: 'price-asc', label: 'Price: Low to High' },
                    { value: 'price-desc', label: 'Price: High to Low' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSortBy(opt.value as SortOption)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors text-left ${
                        sortBy === opt.value
                          ? 'bg-blush-50 text-blush-600 font-semibold'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.value && <Check className="w-4 h-4 text-blush-500" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories Section */}
              <div className="mt-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all text-center ${
                        activeFilter === filter
                          ? 'bg-berry-800 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-blush-50 hover:text-blush-700'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wishlist toggle */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowWishlistOnly(!showWishlistOnly)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-colors ${
                    showWishlistOnly
                      ? 'border-blush-300 bg-blush-50 text-blush-600'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Heart className={`w-4 h-4 ${showWishlistOnly ? 'fill-current' : ''}`} />
                    <span>Saved Wishlist Products ({wishlist.length})</span>
                  </div>
                  {showWishlistOnly && <Check className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Bottom Actions in Drawer */}
            <div className="pt-6 border-t border-gray-100 flex items-center gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium transition-colors"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setShowFilterDrawer(false)}
                className="flex-1 py-2.5 rounded-full bg-blush-500 hover:bg-blush-600 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                View {filtered.length} Results
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
