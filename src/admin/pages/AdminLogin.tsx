import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAdminAuth } from '../AdminAuth';
import jazelleWordmark from '@/assets/images/jazelle_wordmark_transparent.png';

export default function AdminLogin() {
  const { signIn } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your administrator or store owner email.');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn(cleanEmail, password);
      if (result && result.error) {
        let errorText = 'Invalid email or password. Please check your credentials and try again.';
        if (typeof result.error === 'string') {
          errorText = result.error;
        } else if (result.error instanceof Error) {
          errorText = result.error.message || errorText;
        } else if (typeof result.error === 'object' && result.error !== null) {
          const errObj = result.error as { message?: string; error_description?: string };
          errorText = errObj.message || errObj.error_description || errorText;
        }
        if (errorText.toLowerCase().includes('invalid login credentials')) {
          errorText = 'Incorrect email or password. Please check your details and try again.';
        }
        setError(String(errorText));
      }
    } catch (err: unknown) {
      console.error('[AdminLogin] Error during sign in:', err);
      let msg = 'Incorrect email or password. Please check your details and try again.';
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'string') {
        msg = err;
      } else if (err && typeof err === 'object') {
        const obj = err as { message?: string };
        msg = obj.message || msg;
      }
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Header / Brand */}
        <div className="flex flex-col items-center justify-center mb-6 text-center">
          <img
            src={jazelleWordmark}
            alt="Jazelle Skin Haven"
            className="h-10 w-auto object-contain brightness-0 invert opacity-95"
          />
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-white text-xl font-semibold">Administrator Sign In</h1>
            <p className="text-gray-400 text-xs mt-1">
              Sign in with your administrator or store owner credentials to access the management portal.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-300 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-xs text-red-200">Sign In Failed</p>
                <p className="text-xs text-red-300/90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@jazelle.com"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-medium py-2.5 text-sm transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-pink-600/20"
            >
              {loading ? 'Authenticating…' : 'Sign In as Owner'}
            </button>
          </form>
        </div>

        {/* Footer Navigation */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <a
            href="/"
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            ← Return to Jazelle Skin Haven Storefront
          </a>
        </div>
      </div>
    </div>
  );
}
