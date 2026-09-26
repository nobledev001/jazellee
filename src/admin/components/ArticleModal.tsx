import { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, Check, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase, type DbJournalArticle, uploadProductImage } from '../supabase';

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  article?: DbJournalArticle | null;
}

const CATEGORIES = ['Skincare Basics', 'Body Care', 'Self-Care', 'Mindful Habits', 'Wellness'];

export default function ArticleModal({ isOpen, onClose, onSaved, article }: ArticleModalProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Skincare Basics');
  const [readTime, setReadTime] = useState('4 min read');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(article?.id || article?.slug);

  useEffect(() => {
    if (article) {
      setTitle(article.title || '');
      setSlug(article.slug || '');
      setCategory(article.category || 'Skincare Basics');
      setReadTime(article.read_time || '4 min read');
      setExcerpt(article.excerpt || '');
      setBody(article.body || '');
      setImageUrl(article.image || '');
      setImagePreview(article.image || '');
      setImageFile(null);
      setIsFeatured(article.is_featured ?? false);
      setIsPublished(article.is_published ?? true);
      setError(null);
    } else {
      setTitle('');
      setSlug('');
      setCategory('Skincare Basics');
      setReadTime('4 min read');
      setExcerpt('');
      setBody('');
      setImageUrl('https://images.pexels.com/photos/39459688/pexels-photo-39459688.jpeg?auto=compress&cs=tinysrgb&w=900&h=600&fit=crop');
      setImagePreview('https://images.pexels.com/photos/39459688/pexels-photo-39459688.jpeg?auto=compress&cs=tinysrgb&w=900&h=600&fit=crop');
      setImageFile(null);
      setIsFeatured(false);
      setIsPublished(true);
      setError(null);
    }
  }, [article, isOpen]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
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
      setError('Invalid file format. Please upload a JPEG, PNG, WEBP, or AVIF image.');
      return;
    }

    if (file.size > maxSizeBytes) {
      setError(`Image size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please compress the image.`);
      return;
    }

    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Article title is required.');
      return;
    }

    const finalSlug = slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    try {
      setSaving(true);
      setError(null);

      let finalImageUrl = imageUrl.trim();
      if (imageFile) {
        finalImageUrl = await uploadProductImage(imageFile, 'product-images');
      }

      if (!finalImageUrl) {
        finalImageUrl = 'https://images.pexels.com/photos/39459688/pexels-photo-39459688.jpeg?auto=compress&cs=tinysrgb&w=900&h=600&fit=crop';
      }

      const payload = {
        title: title.trim(),
        slug: finalSlug,
        category,
        read_time: readTime.trim(),
        excerpt: excerpt.trim(),
        body: body.trim(),
        image: finalImageUrl,
        is_featured: isFeatured,
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      };

      if (isEditing && article?.id) {
        const { error: updateError } = await supabase
          .from('journal_articles')
          .update(payload)
          .eq('id', article.id);

        if (updateError) throw updateError;
      } else if (isEditing && article?.slug) {
        const { error: updateError } = await supabase
          .from('journal_articles')
          .update(payload)
          .eq('slug', article.slug);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('journal_articles')
          .insert({
            ...payload,
            sort_order: 0,
            created_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Error saving article:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save article.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!article) return;
    const confirmed = window.confirm(`Delete article "${article.title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError(null);
      if (article.id) {
        const { error: delError } = await supabase.from('journal_articles').delete().eq('id', article.id);
        if (delError) throw delError;
      } else {
        const { error: delError } = await supabase.from('journal_articles').delete().eq('slug', article.slug);
        if (delError) throw delError;
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Error deleting article:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete article.';
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
        <div className="flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
              {isEditing ? `Edit Article: ${article?.title}` : 'Create Journal Story'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Draft or publish educational skin-care editorial content for your customers.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-sm">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Article Title <span className="text-pink-600">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. How to Protect Melanin-Rich Skin in Harmattan"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Category <span className="text-pink-600">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Read Time
              </label>
              <input
                type="text"
                value={readTime}
                onChange={(e) => setReadTime(e.target.value)}
                placeholder="4 min read"
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
                placeholder="protect-melanin-skin"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono text-gray-600 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Cover Image
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                isDragOver ? 'border-pink-500 bg-pink-50/50' : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-14 w-14 object-cover rounded-lg border border-gray-200 shrink-0"
                />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
              <div className="flex-1 text-xs">
                <div className="text-pink-600 font-medium flex items-center gap-1">
                  <Upload className="h-3.5 w-3.5" /> Click or drag image to upload
                </div>
                <p className="text-gray-400 mt-0.5">High-quality editorial banner</p>
                {imageFile && (
                  <span className="text-emerald-600 font-medium mt-0.5 inline-flex items-center gap-1">
                    <Check className="h-3 w-3" /> {imageFile.name}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-400">Or image URL:</span>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  if (!imageFile) setImagePreview(e.target.value);
                }}
                placeholder="https://..."
                className="flex-1 text-xs text-gray-600 rounded-md border border-gray-200 px-2 py-1 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Short Summary / Excerpt <span className="text-pink-600">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="A 2-sentence teaser displayed on journal cards and social previews..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Full Article Story Body <span className="text-pink-600">*</span>
            </label>
            <textarea
              required
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the full editorial content here. Paragraphs, tips, routine steps..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 leading-relaxed font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              Publish article live on storefront
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              Feature at the top of Journal page
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-100">
            {isEditing ? (
              <button
                type="button"
                disabled={deleting || saving}
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>Delete Article</span>
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={saving || deleting}
                className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || deleting}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 rounded-lg bg-pink-600 text-xs font-semibold text-white hover:bg-pink-500 shadow-sm transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving Article…</span>
                  </>
                ) : (
                  <>
                    <span>{isEditing ? 'Save Changes' : 'Publish Story'}</span>
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
