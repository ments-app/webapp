'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) { setError(error.message); return; }
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

          {success ? (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle size={28} className="text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Password updated</h2>
              <p className="text-neutral-500 text-sm mb-6">
                Your password has been successfully updated. You can now sign in with your new password.
              </p>
              <button onClick={() => router.push('/')}
                className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base py-3.5 rounded-xl transition-all text-center">
                Continue
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-neutral-900 tracking-tight mb-1.5">Set new password</h2>
              <p className="text-neutral-500 text-sm mb-6">Enter your new password below.</p>

              {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-600">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password (min. 6 characters)" required minLength={6} autoFocus
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 pr-11 text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:border-emerald-500 focus:bg-white text-sm" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password" required minLength={6}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 pr-11 text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:border-emerald-500 focus:bg-white text-sm" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg active:scale-[0.98] disabled:opacity-50">
                  {loading ? <div className="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-white/30 border-t-white" /> : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
