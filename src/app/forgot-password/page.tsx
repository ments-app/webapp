'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }

    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);

    if (error) { setError(error); return; }
    setSuccess(true);
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-10 font-[family-name:var(--font-manrope)]">
      <div className="w-full max-w-[420px]">

        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/logo/green_logo.svg" alt="Ments" className="w-10 h-10" />
          <span className="text-xl font-bold text-neutral-900 tracking-tight">ments</span>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-sm">

          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors mb-6">
            <ArrowLeft size={16} /> Back to sign in
          </Link>

          {success ? (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle size={28} className="text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Check your email</h2>
              <p className="text-neutral-500 text-sm mb-6">
                We&apos;ve sent a password reset link to <span className="text-neutral-900 font-medium">{email}</span>.
              </p>
              <Link href="/" className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base py-3.5 rounded-xl transition-all text-center">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-neutral-900 tracking-tight mb-1.5">Reset password</h2>
              <p className="text-neutral-500 text-sm mb-6">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-600">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required autoFocus
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:border-emerald-500 focus:bg-white text-sm" />
                <button type="submit" disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg active:scale-[0.98] disabled:opacity-50">
                  {loading ? <div className="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-white/30 border-t-white" /> : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
