import { useMemo, useState, useEffect, useRef } from 'react';
import { Search, X, SlidersHorizontal, Heart, ArrowDownAZ, Check, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { PRODUCTS, CATEGORIES, type Category, type Product } from '@/lib/catalog';
import ProductCard from '@/components/ProductCard';
import { useStore } from '@/store/StoreContext';
import { formatNaira } from '@/lib/format';
import { useRouter } from '@/router';

type Filter = 'All' | Category;
type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'best-sellers';

function highlightMatch(text: string, query: string) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return text;
  const escaped = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, idx) =>
    part.toLowerCase() === cleanQuery.toLowerCase() ? (
      <mark key={idx} className="bg-blush-100 text-berry-800 rounded px-0.5 font-semibold">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [justAddedSlug, setJustAddedSlug] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { wishlist, products, addToCart } = useStore();
  const { navigate } = useRouter();

  useEffect(() => {
    setActiveFilter(initialCategory);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [initialCategory]);

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  // Close live search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allProducts = useMemo(() => {
    return (products && products.length > 0 ? products : PRODUCTS).filter(
      (p) => p.isActive !== false
    );
  }, [products]);

  // Real-time live search suggestions ranked by relevance as user types
  const liveSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const scored: Array<{ product: Product; score: number }> = [];
    for (const product of allProducts) {
      const nameLower = product.name.toLowerCase();
      const catLower = product.category.toLowerCase();
      const descLower = product.description.toLowerCase();
      const brandLower = (product.brand || '').toLowerCase();
      const featuresMatch =
        product.features &&
        product.features.some((feature) => feature.toLowerCase().includes(q));

      let score = 0;
      if (nameLower.startsWith(q)) score += 100;
      else if (nameLower.includes(q)) score += 60;
      if (catLower.includes(q)) score += 35;
      if (brandLower.includes(q)) score += 30;
      if (featuresMatch) score += 20;
      if (descLower.includes(q)) score += 10;

      if (score > 0) {
        scored.push({ product, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 6).map((item) => item.product);
  }, [allProducts, search]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [search]);

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

          {/* Real-time Live Search Bar with Instant Product Suggestions */}
          <div ref={searchContainerRef} className="relative mt-6 max-w-2xl">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-4 h-4 w-4 text-blush-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (!showSuggestions || liveSuggestions.length === 0) {
                    if (e.key === 'Escape') setShowSuggestions(false);
                    return;
                  }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlightedIndex((prev) =>
                      prev < liveSuggestions.length - 1 ? prev + 1 : 0
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlightedIndex((prev) =>
                      prev > 0 ? prev - 1 : liveSuggestions.length - 1
                    );
                  } else if (e.key === 'Enter' && highlightedIndex >= 0) {
                    e.preventDefault();
                    const chosen = liveSuggestions[highlightedIndex];
                    if (chosen) {
                      setShowSuggestions(false);
                      navigate(`/product/${chosen.slug}`);
                    }
                  } else if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  }
                }}
                placeholder="Search cleansers, body oils, lip care, serums, or skin concerns..."
                aria-label="Live search products"
                aria-expanded={showSuggestions && search.trim().length > 0}
                aria-autocomplete="list"
                className="w-full rounded-full border border-blush-200 bg-cream-50/60 pl-11 pr-24 py-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-2xs transition-all focus:border-blush-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blush-100"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setShowSuggestions(false);
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute right-3 inline-flex items-center gap-1 rounded-full bg-gray-200/80 hover:bg-gray-300/80 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Live Suggestions Dropdown */}
            {showSuggestions && search.trim().length > 0 && (
              <div
                role="listbox"
                aria-label="Product suggestions"
                className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-3xl border border-blush-100 bg-white shadow-xl animate-fade-in"
              >
                <div className="flex items-center justify-between border-b border-gray-100 bg-cream-50/70 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-berry-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blush-500" />
                    <span>Live Product Suggestions</span>
                  </span>
                  <span>
                    {filtered.length} {filtered.length === 1 ? 'match' : 'matches'}
                  </span>
                </div>

                {liveSuggestions.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm font-medium text-berry-700">
                      No products matching &ldquo;{search.trim()}&rdquo;
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Try searching for cleanser, oil, scrub, moisturizer, or lip care.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {liveSuggestions.map((product, idx) => {
                      const isHighlighted = idx === highlightedIndex;
                      const isOutOfStock = (product.stock ?? 20) <= 0;
                      const isJustAdded = justAddedSlug === product.slug;

                      return (
                        <div
                          key={product.slug}
                          role="option"
                          aria-selected={isHighlighted}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors ${
                            isHighlighted ? 'bg-blush-50/70' : 'hover:bg-gray-50'
                          }`}
                        >
                          <a
                            href={`/product/${product.slug}`}
                            onClick={(e) => {
                              e.preventDefault();
                              setShowSuggestions(false);
                              navigate(`/product/${product.slug}`);
                            }}
                            className="flex items-center gap-3.5 min-w-0 flex-1"
                          >
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-12 w-12 rounded-2xl object-cover border border-gray-100 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blush-600 bg-blush-50 px-2 py-0.5 rounded-full">
                                  {product.category}
                                </span>
                                {product.label && (
                                  <span className="text-[10px] font-medium text-berry-500">
                                    &bull; {product.label}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">
                                {highlightMatch(product.name, search)}
                              </p>
                              <p className="truncate text-xs text-gray-500">
                                {highlightMatch(product.description, search)}
                              </p>
                            </div>
                          </a>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-sm font-bold text-berry-800 whitespace-nowrap">
                              {formatNaira(product.price)}
                            </span>
                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isOutOfStock) return;
                                addToCart(product.slug, 1);
                                setJustAddedSlug(product.slug);
                                setTimeout(() => {
                                  setJustAddedSlug((curr) =>
                                    curr === product.slug ? null : curr
                                  );
                                }, 1500);
                              }}
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                                isOutOfStock
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : isJustAdded
                                  ? 'bg-sage-600 text-white'
                                  : 'bg-blush-500 text-white hover:bg-blush-600'
                              }`}
                              title={isOutOfStock ? 'Out of stock' : `Add ${product.name} to bag`}
                            >
                              {isJustAdded ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  <span>Added</span>
                                </>
                              ) : (
                                <>
                                  <ShoppingBag className="h-3 w-3" />
                                  <span>Add</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-between bg-cream-50/50 px-4 py-2.5">
                      <span className="text-xs text-gray-500">
                        Showing top {liveSuggestions.length} of {filtered.length} matching products
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSuggestions(false)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blush-600 hover:text-blush-700 cursor-pointer"
                      >
                        <span>View all results below</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

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
