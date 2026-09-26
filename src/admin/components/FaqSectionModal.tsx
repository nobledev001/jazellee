import { useState, useEffect } from 'react';
import { X, Trash2, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { supabase, type DbFaqSection } from '../supabase';

interface FaqSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  section?: DbFaqSection | null;
}

const AVAILABLE_ICONS = ['Truck', 'Package', 'CreditCard', 'MessageCircle', 'RefreshCw', 'ShieldCheck', 'HelpCircle'];

export default function FaqSectionModal({ isOpen, onClose, onSaved, section }: FaqSectionModalProps) {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('HelpCircle');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(section?.id);

  useEffect(() => {
    if (section) {
      setTitle(section.title || '');
      setIcon(section.icon || 'HelpCircle');
      setError(null);
    } else {
      setTitle('');
      setIcon('HelpCircle');
      setError(null);
    }
  }, [section, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Section title is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        title: title.trim(),
        icon,
      };

      if (isEditing && section?.id) {
        const { error: updateError } = await supabase
          .from('faq_sections')
          .update(payload)
          .eq('id', section.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('faq_sections')
          .insert({
            ...payload,
            sort_order: 0,
          });

        if (insertError) throw insertError;
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Error saving FAQ section:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save section.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!section?.id) return;
    const confirmed = window.confirm(
      `Delete section "${section.title}" and all questions in it? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError(null);
      // Delete questions first
      await supabase.from('faq_items').delete().eq('section_id', section.id);
      const { error: delError } = await supabase.from('faq_sections').delete().eq('id', section.id);
      if (delError) throw delError;

      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Error deleting FAQ section:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete section.';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div
        className="relative w-full max-w-md my-2 sm:my-8 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isEditing ? 'Edit FAQ Topic / Section' : 'Add FAQ Section'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Category used to group customer questions.
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-sm">
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Section Title <span className="text-pink-600">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Orders & Shipping"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Icon
            </label>
            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 bg-white"
            >
              {AVAILABLE_ICONS.map((ic) => (
                <option key={ic} value={ic}>
                  {ic}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-100">
            {isEditing ? (
              <button
                type="button"
                disabled={deleting || saving}
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>Delete Section</span>
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
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>{isEditing ? 'Save Changes' : 'Create Section'}</span>
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
