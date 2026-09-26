import { useState, useEffect } from 'react';
import { X, Trash2, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { supabase, type DbFaqItem, type DbFaqSection } from '../supabase';

interface FaqItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  item?: DbFaqItem | null;
  sections: DbFaqSection[];
  defaultSectionId?: string;
}

export default function FaqItemModal({
  isOpen,
  onClose,
  onSaved,
  item,
  sections,
  defaultSectionId,
}: FaqItemModalProps) {
  const [sectionId, setSectionId] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(item?.id);

  useEffect(() => {
    if (item) {
      setSectionId(item.section_id || sections[0]?.id || '');
      setQuestion(item.question || '');
      setAnswer(item.answer || '');
      setError(null);
    } else {
      setSectionId(defaultSectionId || sections[0]?.id || '');
      setQuestion('');
      setAnswer('');
      setError(null);
    }
  }, [item, defaultSectionId, sections, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('Please provide a question.');
      return;
    }
    if (!answer.trim()) {
      setError('Please provide an answer.');
      return;
    }
    if (!sectionId) {
      setError('Please choose a FAQ section.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        section_id: sectionId,
        question: question.trim(),
        answer: answer.trim(),
      };

      if (isEditing && item?.id) {
        const { error: updateError } = await supabase
          .from('faq_items')
          .update(payload)
          .eq('id', item.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('faq_items')
          .insert({
            ...payload,
            sort_order: 0,
          });

        if (insertError) throw insertError;
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Error saving FAQ item:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save question.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item?.id) return;
    const confirmed = window.confirm(`Delete question "${item.question}"?`);
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError(null);
      const { error: delError } = await supabase.from('faq_items').delete().eq('id', item.id);
      if (delError) throw delError;

      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Error deleting FAQ item:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete question.';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div
        className="relative w-full max-w-lg my-2 sm:my-8 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isEditing ? 'Edit FAQ Question' : 'Add FAQ Question'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Customer question displayed on the FAQ and Help pages.
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-sm">
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Section / Topic <span className="text-pink-600">*</span>
            </label>
            <select
              required
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 bg-white"
            >
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Question <span className="text-pink-600">*</span>
            </label>
            <input
              type="text"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Do you deliver outside Lagos and Abuja?"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Answer <span className="text-pink-600">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Provide a warm, reassuring, and concise response..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 leading-relaxed"
            />
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
                <span>Delete</span>
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
                    <span>{isEditing ? 'Save Changes' : 'Add Question'}</span>
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
