import { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, Check, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase, type DbProduct, uploadProductImage } from '../supabase';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  product?: DbProduct | null;
}

const PROMO_LABELS = [
  { value: 'none', label: 'None (No badge)' },
  { value: 'Best Seller', label: 'Best Seller' },
  { value: 'New', label: 'New' },
  { value: 'Back in Stock', label: 'Back in Stock' },
  { value: 'Jazelle Pick', label: 'Jazelle Pick' },
  { value: 'Limited Stock', label: 'Limited Stock' },
];

const CATEGORIES = ['Skincare', 'Body Care', 'Self-Care', 'Grooming'];

export default function ProductModal({ isOpen, onClose, onSaved, product }: ProductModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Skincare');
  const [price, setPrice] = useState<number | string>(15000);
  const [stock, setStock] = useState<number | string>(20);
  const [size, setSize] = useState('100ml / 3.4 fl oz');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [whatItDoes, setWhatItDoes] = useState('');
  const [label, setLabel] = useState('none');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(product?.id || product?.slug);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setSlug(product.slug || '');
      setCategory(product.category || 'Skincare');
      setPrice(product.price ?? 0);
      setStock(product.stock ?? 0);
      setSize(product.size || '');
      setDescription(product.description || '');
      setWhatItDoes(product.what_it_does || '');
      // Format ingredients from features or what_it_does
      const ingredientsText = Array.isArray(product.features) && product.features.length > 0
        ? product.features.join('\n')
        : (product.what_it_does || '');
      setIngredients(ingredientsText);
      setLabel(product.label || 'none');
      setImageUrl(product.image || '');
      setImagePreview(product.image || '');
      setImageFile(null);
      setIsActive(product.is_active ?? true);
      setError(null);
    } else {
      // Defaults for new product
      setName('');
      setSlug('');
      setCategory('Skincare');
      setPrice(15000);
      setStock(25);
      setSize('100ml');
      setDescription('');
      setIngredients('Niacinamide (5%)\nHyaluronic Acid\nCentella Asiatica\nAfrican Shea Butter');
      setWhatItDoes('Hydrates, calms inflammation, and locks in moisture for long-lasting barrier strength.');
      setLabel('none');
      setImageUrl('https://images.unsplash.com/photo-1608248597359-00f803c035fa?w=800&auto=format&fit=crop&q=80');
      setImagePreview('https://images.unsplash.com/photo-1608248597359-00f803c035fa?w=800&auto=format&fit=crop&q=80');
      setImageFile(null);
      setIsActive(true);
      setError(null);
    }
  }, [product, isOpen]);

  // Auto-generate slug from name if creating
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generated);
    }
  };

  const handleFileSelect = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError('Invalid file format. Please upload a JPEG, PNG, WEBP, or AVIF image (SVGs and executables are blocked).');
      return;
    }

    if (file.size > maxSizeBytes) {
      setError(`Image size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please compress the image.`);
      return;
    }

    setError(null);
    setImageFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }

    const numericPrice = Math.max(0, Math.round(Number(price) || 0));
    const numericStock = Math.max(0, Math.round(Number(stock) || 0));
    const finalSlug = slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    try {
      setSaving(true);
      setError(null);

      // 1. Upload image if a file was selected
      let finalImageUrl = imageUrl.trim();
      if (imageFile) {
        finalImageUrl = await uploadProductImage(imageFile, 'product-images');
      }

      if (!finalImageUrl) {
        finalImageUrl = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80';
      }

      // Format ingredients into features array
      const featuresArray = ingredients
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const promoBadge = label === 'none' || !label.trim() ? null : label.trim();

      const payload = {
        name: name.trim(),
        slug: finalSlug,
        category,
        price: numericPrice,
        stock: numericStock,
        size: size.trim(),
        description: description.trim(),
        what_it_does: whatItDoes.trim() || description.trim(),
        who_its_for: product?.who_its_for || 'All melanin-rich & sensitive skin types',
        how_to_use: product?.how_to_use || 'Apply gently onto clean damp skin morning and night.',
        features: featuresArray,
        label: promoBadge,
        image: finalImageUrl,
        gallery: product?.gallery && product.gallery.length > 0 ? product.gallery : [finalImageUrl],
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      if (isEditing && product?.id) {
        const { error: updateError } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id);

        if (updateError) throw updateError;
      } else if (isEditing && product?.slug) {
        const { error: updateError } = await supabase
          .from('products')
          .update(payload)
          .eq('slug', product.slug);

        if (updateError) throw updateError;
      } else {
        const newId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
          ? crypto.randomUUID()
          : `prod-${Date.now()}`;

        const { error: insertError } = await supabase
          .from('products')
          .insert({
            id: newId,
            ...payload,
            sort_order: 0,
            created_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Error saving product:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save product. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    const confirmed = window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError(null);
      if (product.id) {
        const { error: delError } = await supabase.from('products').delete().eq('id', product.id);
        if (delError) throw delError;
      } else {
        const { error: delError } = await supabase.from('products').delete().eq('slug', product.slug);
        if (delError) throw delError;
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Error deleting product:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete product.';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div
        className="relative w-full max-w-2xl my-2 sm:my-8 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
              {isEditing ? `Edit Product: ${product?.name}` : 'Add New Product'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Fill in product information and upload high-res imagery for the storefront catalog.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-sm">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Product Name <span className="text-pink-600">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Niacinamide Clarifying Elixir"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Category <span className="text-pink-600">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Promotional Badge
              </label>
              <div className="relative">
                <select
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 bg-white"
                >
                  {PROMO_LABELS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Price in ₦ (Naira) <span className="text-pink-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₦</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Stock Quantity <span className="text-pink-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="25"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Volume / Size
              </label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. 100ml / 3.4 fl oz"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                URL Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="niacinamide-clarifying-elixir"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono text-gray-600 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Image Upload Area */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Product Image (Supabase Storage) <span className="text-pink-600">*</span>
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 cursor-pointer transition-colors ${
                isDragOver ? 'border-pink-500 bg-pink-50/50' : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              {imagePreview ? (
                <div className="relative group shrink-0">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-20 w-20 object-cover rounded-lg border border-gray-200 bg-gray-100 shadow-xs"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-white font-medium">Change</span>
                  </div>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}

              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1 text-pink-600 font-medium">
                  <Upload className="h-4 w-4" />
                  <span>Click to browse or drag & drop</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Upload directly to the <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-600">product-images</code> Supabase bucket. PNG, JPG, or WEBP.
                </p>
                {imageFile && (
                  <div className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Selected: {imageFile.name} ({(imageFile.size / 1024).toFixed(0)} KB)
                  </div>
                )}
              </div>
            </div>

            {/* Direct URL input fallback */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-400">Or image URL:</span>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  if (!imageFile) setImagePreview(e.target.value);
                }}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 text-xs text-gray-600 rounded-md border border-gray-200 px-2 py-1 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Description <span className="text-pink-600">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the product formula, feel, aroma, and primary benefits..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 leading-relaxed"
            />
          </div>

          {/* Ingredients & What It Does */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Key Ingredients (One per line or comma-separated)
              </label>
              <textarea
                rows={3}
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="Niacinamide (5%)&#10;Hyaluronic Acid&#10;Aloe Barbadensis Leaf Juice"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-pink-500 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                What It Does / Formulation Notes
              </label>
              <textarea
                rows={3}
                value={whatItDoes}
                onChange={(e) => setWhatItDoes(e.target.value)}
                placeholder="Fades post-blemish spots, controls excess sebum without drying, and strengthens the epidermal barrier."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-pink-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Visibility status */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
            />
            <label htmlFor="is_active" className="text-xs font-medium text-gray-700 cursor-pointer">
              Product is active and visible on the storefront
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-100">
            {isEditing ? (
              <button
                type="button"
                disabled={deleting || saving}
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50 min-h-[42px] cursor-pointer"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>Delete Product</span>
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={saving || deleting}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors min-h-[42px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || deleting}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-pink-600 text-xs font-semibold text-white hover:bg-pink-500 shadow-sm transition-all disabled:opacity-50 min-h-[42px] cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving to Supabase…</span>
                  </>
                ) : (
                  <>
                    <span>{isEditing ? 'Save Changes' : 'Create Product'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
