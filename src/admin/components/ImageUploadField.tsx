import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Check, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { uploadProductImage } from '../supabase';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  bucketName?: string;
  helpText?: string;
  aspectRatioLabel?: string;
  required?: boolean;
  className?: string;
  previewClassName?: string;
}

export default function ImageUploadField({
  label,
  value,
  onChange,
  bucketName = 'site-assets',
  helpText,
  aspectRatioLabel,
  required = false,
  className = '',
  previewClassName = 'h-24 w-24',
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
  const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

  const handleFile = async (file: File) => {
    setUploadError(null);

    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setUploadError('Please select a valid image format (JPEG, PNG, WEBP, or AVIF).');
      return;
    }

    if (file.size > maxSizeBytes) {
      setUploadError(`Image size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller image.`);
      return;
    }

    try {
      setIsUploading(true);
      const publicUrl = await uploadProductImage(file, bucketName);
      onChange(publicUrl);
    } catch (err: unknown) {
      console.error('Failed to upload image:', err);
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-gray-700">
          {label} {required && <span className="text-pink-600">*</span>}
        </label>
        {aspectRatioLabel && (
          <span className="text-[11px] text-gray-400">{aspectRatioLabel}</span>
        )}
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            void handleFile(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* Upload & Preview Container */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        className={`relative rounded-xl border-2 border-dashed p-3 sm:p-4 transition-all ${
          isDragOver
            ? 'border-pink-500 bg-pink-50/60'
            : value
            ? 'border-gray-200 bg-gray-50/40'
            : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50/60'
        }`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
            <p className="text-xs font-semibold text-gray-700">Uploading image from device…</p>
            <p className="text-[11px] text-gray-400">Saving securely to cloud storage</p>
          </div>
        ) : value ? (
          /* Preview Mode with Replace / Remove Actions */
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
            <div className={`relative shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 ${previewClassName}`}>
              <img
                src={value}
                alt="Preview"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80';
                }}
              />
            </div>

            <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
              <div>
                <p className="text-xs font-semibold text-gray-800 flex items-center justify-center sm:justify-start gap-1">
                  <Check className="h-3.5 w-3.5 text-emerald-600" /> Image Ready
                </p>
                <p className="text-[11px] text-gray-500 truncate max-w-sm mt-0.5">
                  {value.startsWith('data:') ? 'Image uploaded from device (local Data URL)' : value}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5 text-pink-600" />
                  <span>Choose Another from Device</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-700 transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty / Upload State */
          <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
            <div className={`rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0 ${previewClassName}`}>
              <ImageIcon className="h-8 w-8 text-gray-300" />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Image from Device</span>
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Or drag and drop an image file here from your computer or phone.
              </p>
              <p className="text-[11px] text-gray-400">
                Accepts JPEG, PNG, WEBP, AVIF (up to 5MB).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Optional Help text & Direct URL toggle */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 px-0.5">
        <span>{helpText || 'Images are automatically optimized for fast storefront loading.'}</span>
        <button
          type="button"
          onClick={() => {
            setShowUrlInput(!showUrlInput);
            if (!showUrlInput && value && !value.startsWith('data:')) {
              setUrlDraft(value);
            }
          }}
          className="text-pink-600 hover:text-pink-700 hover:underline cursor-pointer inline-flex items-center gap-1 shrink-0 ml-2"
        >
          <LinkIcon className="h-3 w-3" />
          <span>{showUrlInput ? 'Hide URL input' : 'Paste web link instead'}</span>
        </button>
      </div>

      {showUrlInput && (
        <div className="flex gap-2 pt-1 animate-fade-in">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:border-pink-500 bg-white"
          />
          <button
            type="button"
            onClick={() => {
              if (urlDraft.trim()) {
                onChange(urlDraft.trim());
                setShowUrlInput(false);
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Apply URL
          </button>
        </div>
      )}
    </div>
  );
}
