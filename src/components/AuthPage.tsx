import { useState, useEffect } from 'react';
import { ArrowRight, Eye, EyeOff, Mail, Lock, User as UserIcon, CheckCircle, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/router';

type BaseMode = 'login' | 'signup' | 'forgot';
type ViewMode = BaseMode | 'verify-signup' | 'verify-reset';

export default function AuthPage({ mode: initialMode }: { mode: BaseMode }) {
  const { signIn, signUp, resetPassword, verifyOtp, resendOtp, updatePassword } = useAuth();
  const { navigate } = useRouter();

  const [currentMode, setCurrentMode] = useState<ViewMode>(initialMode);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', newPassword: '', confirmPassword: '' });
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 60-second cooldown timer for resending OTP
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    setCurrentMode(initialMode);
    setError(null);
    setSuccess(null);
  }, [initialMode]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || !form.email) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    const type = currentMode === 'verify-reset' ? 'recovery' : 'signup';
    const { error: resendError } = await resendOtp(form.email, type);

    setLoading(false);
    if (resendError) {
      setError(resendError);
    } else {
      setSuccess('A new 6-digit code has been sent to your email.');
      setCooldown(60);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const getDestination = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('redirect') || '/account';
      } catch {
        return '/account';
      }
    };

    if (currentMode === 'login') {
      const { error: signinError, needsOtp } = await signIn(form.email, form.password);
      if (signinError) {
        setError(signinError);
        setLoading(false);
        if (needsOtp) {
          setCurrentMode('verify-signup');
        }
      } else {
        navigate(getDestination());
      }
    } else if (currentMode === 'signup') {
      if (form.password.length < 8) {
        setError('Password must be at least 8 characters.');
        setLoading(false);
        return;
      }
      const { error: signupError } = await signUp(form.email, form.password, form.fullName);
      setLoading(false);
      if (signupError) {
        setError(signupError);
      } else {
        // Move to signup verification step
        setCurrentMode('verify-signup');
        setCooldown(60);
        setSuccess(`Verification code sent to ${form.email}. Enter the code below.`);
      }
    } else if (currentMode === 'verify-signup') {
      if (otpCode.trim().length < 6) {
        setError('Please enter the verification code sent to your email.');
        setLoading(false);
        return;
      }
      const { error: otpError } = await verifyOtp(form.email, otpCode.trim(), 'signup');
      setLoading(false);
      if (otpError) {
        setError(otpError);
      } else {
        setSuccess('Email verified! Welcome to Jazelle Skin Haven.');
        setTimeout(() => navigate(getDestination()), 1200);
      }
    } else if (currentMode === 'forgot') {
      const { error: resetError } = await resetPassword(form.email);
      setLoading(false);
      if (resetError) {
        setError(resetError);
      } else {
        setCurrentMode('verify-reset');
        setCooldown(60);
        setSuccess(`Reset code sent to ${form.email}. Enter the code and your new password.`);
      }
    } else if (currentMode === 'verify-reset') {
      if (otpCode.trim().length < 6) {
        setError('Please enter the recovery code sent to your email.');
        setLoading(false);
        return;
      }
      if (form.newPassword.length < 8) {
        setError('New password must be at least 8 characters.');
        setLoading(false);
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        setError('Passwords do not match. Please re-check.');
        setLoading(false);
        return;
      }

      // 1. Verify recovery OTP
      const { error: verifyError } = await verifyOtp(form.email, otpCode.trim(), 'recovery');
      if (verifyError) {
        setError(verifyError);
        setLoading(false);
        return;
      }

      // 2. Update password
      const { error: updateError } = await updatePassword(form.newPassword);
      setLoading(false);
      if (updateError) {
        setError(updateError);
      } else {
        setSuccess('Password updated successfully! Welcome back to your haven.');
        setTimeout(() => navigate('/account'), 1500);
      }
    }
  };

  const titles: Record<ViewMode, { title: string; subtitle: string; button: string }> = {
    login: {
      title: 'Welcome back',
      subtitle: 'Your saved favourites and little self-care moments are waiting.',
      button: 'Sign in',
    },
    signup: {
      title: 'Create your account',
      subtitle: 'Save favourites, track orders, and make self-care feel easy.',
      button: 'Continue & send verification code',
    },
    'verify-signup': {
      title: 'Verify your email',
      subtitle: `Enter the verification code sent to ${form.email || 'your email'}.`,
      button: 'Verify & complete registration',
    },
    forgot: {
      title: 'Reset password',
      subtitle: 'Enter your email and we will send a verification code.',
      button: 'Send verification code',
    },
    'verify-reset': {
      title: 'Set new password',
      subtitle: `Enter the recovery code sent to ${form.email} and choose a new password.`,
      button: 'Update password & sign in',
    },
  };

  return (
    <main className="min-h-[70vh] bg-gradient-blush px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-md rounded-5xl bg-white/90 p-7 shadow-soft-lg backdrop-blur-sm sm:p-10">
        <a href="/" className="mb-8 flex justify-center">
          <Logo />
        </a>

        <div className="text-center">
          <span className="section-subtitle">
            {currentMode === 'verify-signup'
              ? 'Security Check'
              : currentMode === 'verify-reset'
              ? 'Account Recovery'
              : currentMode === 'signup'
              ? 'Welcome to the haven'
              : currentMode === 'forgot'
              ? 'Password recovery'
              : 'Welcome back'}
          </span>
          <h1 className="section-title mt-2">{titles[currentMode].title}</h1>
          <p className="mt-2 text-sm text-berry-400">{titles[currentMode].subtitle}</p>
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-3xl bg-blush-50 px-4 py-3 text-sm text-blush-600 animate-fade-in-down">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-center gap-2 rounded-3xl bg-sage-50 px-4 py-3 text-sm text-sage-700 animate-fade-in-down">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {/* Signup form fields */}
          {currentMode === 'signup' && (
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

          {/* Email input for login, signup, forgot */}
          {(currentMode === 'login' || currentMode === 'signup' || currentMode === 'forgot') && (
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
          )}

          {/* Password input for login, signup */}
          {(currentMode === 'login' || currentMode === 'signup') && (
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

          {/* OTP Code Input for verify-signup and verify-reset */}
          {(currentMode === 'verify-signup' || currentMode === 'verify-reset') && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-berry-700">Verification Code</span>
                <div className="relative mt-2">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blush-400" />
                  <input
                    type="text"
                    maxLength={10}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter code"
                    className="input-jazelle pl-12 text-center font-mono text-xl tracking-[0.3em] font-bold text-berry-800"
                    autoFocus
                  />
                </div>
              </label>

              {/* Resend button with cooldown */}
              <div className="flex items-center justify-between text-xs text-berry-400">
                <span>Didn't receive the code?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || loading}
                  className="inline-flex items-center gap-1 font-semibold text-blush-600 hover:text-blush-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}

          {/* New password fields for verify-reset */}
          {currentMode === 'verify-reset' && (
            <>
              <label className="block">
                <span className="text-sm font-medium text-berry-700">New Password</span>
                <div className="relative mt-2">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blush-300" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.newPassword}
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
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

              <label className="block">
                <span className="text-sm font-medium text-berry-700">Confirm New Password</span>
                <div className="relative mt-2">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blush-300" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="Repeat new password"
                    className="input-jazelle px-12"
                  />
                </div>
              </label>
            </>
          )}

          {currentMode === 'login' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setCurrentMode('forgot');
                  setError(null);
                  setSuccess(null);
                }}
                className="text-sm font-medium text-blush-500 hover:text-blush-600 transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                {titles[currentMode].button}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-berry-400">
          {currentMode === 'login' && (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setCurrentMode('signup');
                  setError(null);
                  setSuccess(null);
                }}
                className="font-semibold text-blush-600 hover:text-blush-700"
              >
                Create one
              </button>
            </p>
          )}

          {currentMode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setCurrentMode('login');
                  setError(null);
                  setSuccess(null);
                }}
                className="font-semibold text-blush-600 hover:text-blush-700"
              >
                Sign in
              </button>
            </p>
          )}

          {(currentMode === 'forgot' || currentMode === 'verify-signup' || currentMode === 'verify-reset') && (
            <p>
              <button
                type="button"
                onClick={() => {
                  setCurrentMode('login');
                  setError(null);
                  setSuccess(null);
                }}
                className="font-semibold text-blush-600 hover:text-blush-700"
              >
                &larr; Back to sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
