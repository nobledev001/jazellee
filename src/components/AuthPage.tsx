import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Mail, Lock, User as UserIcon, CheckCircle, AlertCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/router';

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthPage({ mode }: { mode: Mode }) {
  const { signIn, signUp, resetPassword } = useAuth();
  const { navigate } = useRouter();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(form.email, form.password);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/account');
      }
    } else if (mode === 'signup') {
      if (form.password.length < 8) {
        setError('Password must be at least 8 characters.');
        setLoading(false);
        return;
      }
      const { error } = await signUp(form.email, form.password, form.fullName);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        setSuccess('Account created! You are now signed in.');
        setLoading(false);
        setTimeout(() => navigate('/account'), 1500);
      }
    } else {
      const { error } = await resetPassword(form.email);
      if (error) {
        setError(error);
      } else {
        setSuccess('Password reset link sent! Check your email inbox.');
      }
      setLoading(false);
    }
  };

  const titles: Record<Mode, { title: string; subtitle: string; button: string }> = {
    login: { title: 'Welcome back', subtitle: 'Your saved favourites and little self-care moments are waiting.', button: 'Sign in' },
    signup: { title: 'Create your account', subtitle: 'Save favourites, track orders, and make self-care feel easy.', button: 'Create account' },
    forgot: { title: 'Reset password', subtitle: 'Enter your email and we will send you a reset link.', button: 'Send reset link' },
  };

  return (
    <main className="min-h-[70vh] bg-gradient-blush px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-md rounded-5xl bg-white/90 p-7 shadow-soft-lg backdrop-blur-sm sm:p-10">
        <a href="/" className="mb-8 flex justify-center"><Logo /></a>
        <div className="text-center">
          <span className="section-subtitle">{mode === 'signup' ? 'Welcome to the haven' : mode === 'forgot' ? 'Password recovery' : 'Welcome back'}</span>
          <h1 className="section-title mt-2">{titles[mode].title}</h1>
          <p className="mt-2 text-sm text-berry-400">{titles[mode].subtitle}</p>
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-3xl bg-blush-50 px-4 py-3 text-sm text-blush-600 animate-fade-in-down">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mt-6 flex items-center gap-2 rounded-3xl bg-sage-50 px-4 py-3 text-sm text-sage-700 animate-fade-in-down">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {success}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label className="block">
              <span className="text-sm font-medium text-berry-700">Your name</span>
              <div className="relative mt-2">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blush-300" />
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="What should we call you?"
                  className="input-jazelle pl-12"
                />
              </div>
            </label>
          )}
          <label className="block">
            <span className="text-sm font-medium text-berry-700">Email address</span>
            <div className="relative mt-2">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blush-300" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="input-jazelle pl-12"
              />
            </div>
          </label>
          {mode !== 'forgot' && (
            <label className="block">
              <span className="text-sm font-medium text-berry-700">Password</span>
              <div className="relative mt-2">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blush-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 8 characters"
                  className="input-jazelle px-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-berry-400 hover:text-blush-500"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          )}
          {mode === 'login' && (
            <div className="text-right">
              <a href="/forgot-password" className="text-sm font-medium text-blush-500 hover:text-blush-600 transition-colors">
                Forgot password?
              </a>
            </div>
          )}
          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                {titles[mode].button}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-berry-400">
          {mode === 'login' && (
            <>
              <p>Don't have an account? <a className="font-semibold text-blush-600 hover:text-blush-700" href="/signup">Create one</a></p>
            </>
          )}
          {mode === 'signup' && (
            <p>Already have an account? <a className="font-semibold text-blush-600 hover:text-blush-700" href="/login">Sign in</a></p>
          )}
          {mode === 'forgot' && (
            <p>Remember your password? <a className="font-semibold text-blush-600 hover:text-blush-700" href="/login">Back to sign in</a></p>
          )}
        </div>
      </div>
    </main>
  );
}
