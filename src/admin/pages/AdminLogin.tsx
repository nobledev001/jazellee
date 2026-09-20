import { useState } from 'react';
import { Lock, Mail } from 'lucide-react';
import { useAdminAuth } from '../AdminAuth';

export default function AdminLogin() {
  const { signIn } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError('Invalid email or password. If you are a customer, please sign in on the main store.');
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-sm mx-4">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center text-white font-bold text-lg">
            J
          </div>
          <div>
            <div className="text-white font-semibold text-lg">Jazelle Admin</div>
            <div className="text-gray-500 text-xs">Skin Haven Dashboard</div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
          <h1 className="text-white text-xl font-semibold mb-6">Sign in to Admin</h1>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@jazelle.com"
                  className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-pink-600 text-white font-medium py-2.5 text-sm hover:bg-pink-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Admin access only. Customers should sign in on the main store.
        </p>
      </div>
    </div>
  );
}
