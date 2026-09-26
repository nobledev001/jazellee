import { useEffect, useState } from 'react';
import { Search, Plus, Edit3, Trash2, CheckCircle2 } from 'lucide-react';
import { supabase, type DbProduct } from '../supabase';
import ProductModal from '../components/ProductModal';

export default function AdminProducts() {
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DbProduct | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchProducts = () => {
    setLoading(true);
    supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (data) setProducts(data as DbProduct[]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: DbProduct) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (product: DbProduct) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      if (product.id) {
        await supabase.from('products').delete().eq('id', product.id);
      } else {
        await supabase.from('products').delete().eq('slug', product.slug);
      }
      fetchProducts();
      setToastMessage(`"${product.name}" deleted from catalog.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  const handleProductSaved = () => {
    fetchProducts();
    setToastMessage(editingProduct ? 'Product updated successfully.' : 'New product created successfully.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filtered = products.filter((p) => {
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium animate-fadeIn shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage catalog listings, prices, inventory, and labels.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pink-500 shadow-sm transition-colors cursor-pointer w-full sm:w-auto min-h-[42px]"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by name or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-pink-500 min-h-[42px]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-auto rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-pink-500 bg-white min-h-[42px]"
        >
          <option value="All">All Categories</option>
          <option value="Skincare">Skincare</option>
          <option value="Body Care">Body Care</option>
          <option value="Self-Care">Self-Care</option>
          <option value="Grooming">Grooming</option>
        </select>
      </div>

      {/* Products list */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading catalog…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No products matching your search.</div>
        ) : (
          <>
            {/* Mobile Product Cards (< 768px) */}
            <div className="divide-y divide-gray-100 md:hidden">
              {filtered.map((product) => (
                <div key={product.id || product.slug} className="p-4 space-y-3 hover:bg-gray-50/70 transition-colors">
                  <div className="flex items-start gap-3">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-14 w-14 rounded-xl object-cover bg-gray-100 border border-gray-200 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm text-gray-900 leading-snug">{product.name}</h3>
                        <span className="font-bold text-sm text-gray-900 shrink-0">₦{product.price.toLocaleString()}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          {product.category}
                        </span>
                        {product.size && <span>• {product.size}</span>}
                        {product.label && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-medium text-pink-700">
                            {product.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      product.stock > 10 ? 'text-emerald-600' : product.stock > 0 ? 'text-amber-600' : 'text-red-500'
                    }`}>
                      {product.stock > 0 ? `${product.stock} units in stock` : 'Out of stock'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(product)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200 transition-colors cursor-pointer min-h-[36px]"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(product)}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer min-h-[36px] min-w-[36px]"
                        title="Delete product"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet & Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Product</th>
                    <th className="px-6 py-3 whitespace-nowrap">Category</th>
                    <th className="px-6 py-3 whitespace-nowrap">Price</th>
                    <th className="px-6 py-3 whitespace-nowrap">Stock</th>
                    <th className="px-6 py-3 whitespace-nowrap">Badge</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((product) => (
                    <tr key={product.id || product.slug} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-10 w-10 rounded-lg object-cover bg-gray-100 border border-gray-200 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-xs text-gray-400">{product.size}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">₦{product.price.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          product.stock > 10 ? 'text-emerald-600' : product.stock > 0 ? 'text-amber-600' : 'text-red-500'
                        }`}>
                          {product.stock > 0 ? `${product.stock} units` : 'Out of stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.label ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-medium text-pink-700">
                            {product.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(product)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-pink-50 hover:text-pink-600 transition-colors cursor-pointer"
                            title="Edit product"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Product Drawer / Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleProductSaved}
        product={editingProduct}
      />
    </div>
  );
}
