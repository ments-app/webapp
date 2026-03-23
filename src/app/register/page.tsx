'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const { signInWithGoogle, signUpWithPassword } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) { setError('Please enter your full name.'); return; }
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    const { error, needsConfirmation } = await signUpWithPassword(email.trim(), password, fullName.trim());
    setLoading(false);

    if (error) { setError(error); return; }
    if (needsConfirmation) { setSuccess(true); }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row font-[family-name:var(--font-manrope)]">

      {/* Left — Brand panel */}
      <div className="relative lg:w-[52%] w-full lg:min-h-screen bg-[#09090b] overflow-hidden">
        <div className="relative z-10 h-full flex flex-col px-6 py-8 sm:px-10 sm:py-10 lg:px-16 lg:py-14">
          <div className="flex items-center gap-2.5">
            <img src="/logo/green_logo.svg" alt="Ments" className="w-8 h-8" />
            <span className="text-white text-base font-bold tracking-tight">ments</span>
          </div>
          <div className="flex-1 flex flex-col justify-center py-10 sm:py-16 lg:py-0 max-w-lg">
            <img src="/logo/green_logo.svg" alt="Ments" className="w-24 h-24 lg:w-32 lg:h-32 mb-10" />
            <h1 className="text-3xl sm:text-4xl lg:text-[3.25rem] font-extrabold text-white tracking-tight leading-[1.1] mb-4 sm:mb-6">
              Join the <span className="text-emerald-400">community.</span>
            </h1>
            <p className="text-neutral-400 text-base sm:text-lg leading-relaxed max-w-md">
              Create your account and start building, connecting, and launching with the Ments ecosystem.
            </p>
          </div>
          <p className="text-neutral-700 text-xs hidden lg:block">&copy; 2025 Ments. All rights reserved.</p>
        </div>
      </div>

      {/* Right — Register form */}
      <div className="lg:w-[48%] w-full lg:min-h-screen flex flex-col bg-neutral-50">
        <div className="flex-1 flex items-center justify-center px-4 py-10 sm:px-8 sm:py-14 lg:px-16">
          <div className="w-full max-w-[420px]">

            <div className="flex items-center justify-center gap-3 mb-10 lg:hidden">
              <img src="/logo/green_logo.svg" alt="Ments" className="w-12 h-12" />
              <span className="text-2xl font-bold text-neutral-900 tracking-tight">ments</span>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-8 lg:p-10 shadow-sm">

              {success ? (
                <div className="text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                    <CheckCircle size={28} className="text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900 mb-2">Check your email</h2>
                  <p className="text-neutral-500 text-sm mb-6">
                    We&apos;ve sent a confirmation link to <span className="text-neutral-900 font-medium">{email}</span>. Click the link to verify your account.
                  </p>
                  <Link href="/" className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base py-3.5 px-6 rounded-xl transition-all text-center">
                    Back to Sign In
                  </Link>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl lg:text-3xl font-bold text-neutral-900 tracking-tight mb-1.5">Create account</h2>
                  <p className="text-neutral-500 text-base mb-6">Get started with Ments today</p>

                  {error && (
                    <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-600">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <button
                    onClick={() => signInWithGoogle()}
                    disabled={loading}
                    className="group w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-base py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 hover:shadow-lg active:scale-[0.98] mb-5 disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign up with Google
                  </button>

                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-neutral-200"></div>
                    <span className="text-xs text-neutral-400 font-medium">OR</span>
                    <div className="flex-1 h-px bg-neutral-200"></div>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-3.5">
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" required autoFocus
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:border-emerald-500 focus:bg-white text-sm" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:border-emerald-500 focus:bg-white text-sm" />
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min. 6 characters)" required minLength={6}
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 pr-11 text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:border-emerald-500 focus:bg-white text-sm" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="relative">
                      <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" required minLength={6}
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 pr-11 text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:border-emerald-500 focus:bg-white text-sm" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base py-3.5 px-6 rounded-xl transition-all duration-200 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 mt-1">
                      {loading ? <div className="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-white/30 border-t-white" /> : 'Create account'}
                    </button>
                  </form>

                  <p className="text-sm text-neutral-500 text-center mt-5">
                    Already have an account?{' '}
                    <Link href="/" className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors">Sign in</Link>
                  </p>
                </>
              )}
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed mt-6 text-center">
              By continuing, you agree to our{' '}
              <button className="text-neutral-500 hover:text-neutral-800 underline underline-offset-2 transition-colors">Terms of Service</button>
              {' '}and{' '}
              <button className="text-neutral-500 hover:text-neutral-800 underline underline-offset-2 transition-colors">Privacy Policy</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
