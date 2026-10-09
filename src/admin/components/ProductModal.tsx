import { useState, useEffect, useRef } from 'react';
import { X, Trash2, AlertCircle, Loader2, Plus } from 'lucide-react';
import { supabase, type DbProduct, uploadProductImage } from '../supabase';
import ImageUploadField from './ImageUploadField';

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
  const [gallery, setGallery] = useState<string[]>([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

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
      const mainImg = product.image || '';
      setImageUrl(mainImg);
      const existingGallery = Array.isArray(product.gallery) && product.gallery.length > 0
        ? product.gallery.filter(Boolean)
        : (mainImg ? [mainImg] : []);
      setGallery(existingGallery);
      setIsActive(product.is_active ?? true);
      setError(null);
      setGalleryError(null);
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
      const defaultImg = 'https://images.unsplash.com/photo-1608248597359-00f803c035fa?w=800&auto=format&fit=crop&q=80';
      setImageUrl(defaultImg);
      setGallery([defaultImg]);
      setIsActive(true);
      setError(null);
      setGalleryError(null);
    }
  }, [product, isOpen]);

  const handleGalleryUpload = async (file: File) => {
    setGalleryError(null);
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setGalleryError('Please select a valid image format (JPEG, PNG, WEBP, or AVIF).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setGalleryError('Image size exceeds 5MB limit. Please select a smaller photo.');
      return;
    }

    try {
      setIsUploadingGallery(true);
      const uploadedUrl = await uploadProductImage(file, 'product-images');
      setGallery((prev) => [...prev, uploadedUrl]);
    } catch (err: unknown) {
      console.error('Failed to upload gallery image:', err);
      const msg = err instanceof Error ? err.message : 'Failed to upload image. Please try again.';
      setGalleryError(msg);
    } finally {
      setIsUploadingGallery(false);
    }
  };

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

      const finalImageUrl = imageUrl.trim() || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80';
      const cleanGallery = gallery.filter((url) => typeof url === 'string' && url.trim().length > 0);
      if (!cleanGallery.includes(finalImageUrl)) {
        cleanGallery.unshift(finalImageUrl);
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
        gallery: cleanGallery,
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

          {/* Primary Product Image */}
          <div>
            <ImageUploadField
              label="Primary Product Image (Front Catalog Showcase)"
              value={imageUrl}
              onChange={(url) => {
                setImageUrl(url);
                if (url && !gallery.includes(url)) {
                  setGallery((prev) => [url, ...prev.filter((item) => item !== url)]);
                }
              }}
              bucketName="product-images"
              aspectRatioLabel="Square 1:1 or 4:5 portrait (min 800×800)"
              helpText="Upload the main product bottle/jar photo from your device. Displays on shop catalog and product card."
              required
              previewClassName="h-24 w-24 rounded-xl"
            />
          </div>

          {/* Additional Product Photo Gallery */}
          <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold text-gray-800">
                  Additional Gallery Photos
                </label>
                <p className="text-[11px] text-gray-500">
                  Upload multiple angles, texture shots, or packaging photos from your device.
                </p>
              </div>
              <button
                type="button"
                disabled={isUploadingGallery}
                onClick={() => galleryFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUploadingGallery ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                <span>{isUploadingGallery ? 'Uploading…' : 'Add from Device'}</span>
              </button>
            </div>

            {/* Hidden file input for gallery */}
            <input
              ref={galleryFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  void handleGalleryUpload(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />

            {galleryError && (
              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{galleryError}</span>
              </div>
            )}

            {/* Gallery thumbnails grid */}
            {gallery.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-1">
                {gallery.map((imgUrl, index) => {
                  const isPrimary = imgUrl === imageUrl;
                  return (
                    <div
                      key={`${imgUrl}-${index}`}
                      className={`relative group rounded-xl overflow-hidden border-2 bg-white aspect-square flex items-center justify-center ${
                        isPrimary ? 'border-pink-500 ring-2 ring-pink-200' : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Gallery ${index + 1}`}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80';
                        }}
                      />
                      {isPrimary && (
                        <span className="absolute top-1 left-1 bg-pink-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
                          Primary
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                        {!isPrimary && (
                          <button
                            type="button"
                            onClick={() => setImageUrl(imgUrl)}
                            className="bg-white/90 hover:bg-white text-gray-800 text-[10px] font-semibold px-1.5 py-1 rounded cursor-pointer shadow-xs"
                            title="Make primary image"
                          >
                            Set Main
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setGallery((prev) => prev.filter((_, i) => i !== index))}
                          className="bg-red-600 hover:bg-red-500 text-white p-1 rounded-full cursor-pointer shadow-xs"
                          title="Remove from gallery"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic py-1">
                No additional gallery photos added yet. Click &quot;Add from Device&quot; to upload more views.
              </p>
            )}
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
