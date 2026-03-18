'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { useRouter } from 'next/navigation';
import { ArrowRight, AtSign, Check, X, Loader2, Sparkles } from 'lucide-react';

const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;
const CONSECUTIVE_UNDERSCORES = /__/;
const RESERVED_USERNAMES = new Set([
  'admin', 'ments', 'support', 'help', 'mod', 'moderator',
  'system', 'official', 'team', 'staff', 'root', 'null',
  'undefined', 'api', 'www', 'mail', 'email', 'test',
]);

type ValidationState = 'idle' | 'checking' | 'valid' | 'invalid';

function deriveUsername(email: string | undefined): string {
  if (!email) return '';
  let base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
  // Must start with a letter
  base = base.replace(/^[^a-z]+/, '');
  // Remove consecutive underscores
  base = base.replace(/_+/g, '_');
  // Ensure minimum length
  if (base.length < 3) {
    base = 'user_' + Math.random().toString(36).slice(2, 7);
  }
  return base.slice(0, 20);
}

function validateLocal(value: string): string | null {
  if (!value) return null;
  if (value.length < 3) return 'At least 3 characters';
  if (value.length > 20) return '20 characters max';
  if (!/^[a-z]/.test(value)) return 'Must start with a letter';
  if (/[^a-z0-9_]/.test(value)) return 'Only lowercase letters, numbers & underscores';
  if (CONSECUTIVE_UNDERSCORES.test(value)) return 'No consecutive underscores';
  if (RESERVED_USERNAMES.has(value)) return 'This username is reserved';
  if (!USERNAME_REGEX.test(value)) return 'Invalid username format';
  return null;
}

export default function UsernameSelectionPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { userData, loading: userDataLoading } = useUserData();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-fill with username derived from email
  useEffect(() => {
    if (user?.email && !username) {
      setUsername(deriveUsername(user.email));
    }
  }, [user?.email, username]);

  // Focus input after mount
  useEffect(() => {
    if (mounted && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 800);
      return () => clearTimeout(timer);
    }
  }, [mounted]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  // Redirect if onboarding is already complete
  useEffect(() => {
    if (!userDataLoading && userData?.is_onboarding_done) {
      router.replace('/');
    }
  }, [userDataLoading, userData, router]);

  const checkAvailability = useCallback(async (value: string) => {
    try {
      const res = await fetch(`/api/username/check?username=${encodeURIComponent(value)}`);
      const data = await res.json();

      if (!res.ok) {
        setValidationState('invalid');
        setErrorMessage('Could not check availability');
        return;
      }

      if (data.available) {
        setValidationState('valid');
        setErrorMessage(null);
      } else {
        setValidationState('invalid');
        setErrorMessage('Username is already taken');
      }
    } catch {
      setValidationState('invalid');
      setErrorMessage('Could not check availability');
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value) {
      setValidationState('idle');
      setErrorMessage(null);
      return;
    }

    const localError = validateLocal(value);
    if (localError) {
      setValidationState('invalid');
      setErrorMessage(localError);
      return;
    }

    setValidationState('checking');
    setErrorMessage(null);

    debounceRef.current = setTimeout(() => {
      checkAvailability(value);
    }, 500);
  };

  const saveUsername = async (chosenUsername: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/onboarding/username', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: chosenUsername }),
      });

      const data = await res.json();

      if (res.ok && data.redirect) {
        router.push(data.redirect);
      } else {
        setErrorMessage(data.error || 'Something went wrong');
        setValidationState('invalid');
        setIsSubmitting(false);
      }
    } catch {
      setErrorMessage('Something went wrong');
      setValidationState('invalid');
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || validationState !== 'valid') return;
    await saveUsername(username);
  };

  const handleSkip = async () => {
    // Skip uses the email-derived username to create the account
    const fallback = deriveUsername(user?.email);
    await saveUsername(fallback || username);
  };

  if (authLoading || !user) {
    return (
      <div className="h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500/70 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] bg-[#09090b] relative overflow-hidden font-[family-name:var(--font-manrope)]">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none hidden sm:block">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 sm:px-6">
        {/* Logo */}
        <div
          className={`flex items-center gap-2 mb-5 sm:mb-6 transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}
        >
          <img src="/logo/green_logo.svg" alt="Ments" className="w-8 h-8" />
          <span className="text-white text-lg font-bold tracking-tight">ments</span>
        </div>

        {/* Header */}
        <div
          className={`text-center mb-6 sm:mb-8 transition-all duration-700 delay-100 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3 sm:mb-4">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400 text-[10px] sm:text-xs font-semibold tracking-wide uppercase">
              Almost there
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight mb-1.5 sm:mb-2">
            Choose your{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              username
            </span>
          </h1>
          <p className="text-neutral-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            This is how others will find you on Ments
          </p>
        </div>

        {/* Username input */}
        <div
          className={`w-full max-w-sm transition-all duration-700 delay-200 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div
            className={`
              flex items-center gap-0 rounded-xl border px-4 py-3.5
              transition-all duration-300 bg-white/[0.03]
              ${validationState === 'valid'
                ? 'border-emerald-500/40 ring-1 ring-emerald-500/20'
                : validationState === 'invalid'
                  ? 'border-red-500/40 ring-1 ring-red-500/20'
                  : 'border-white/10 focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/20'
              }
            `}
          >
            <AtSign className="w-5 h-5 text-neutral-500 shrink-0 mr-2" />
            <input
              ref={inputRef}
              type="text"
              value={username}
              onChange={handleChange}
              maxLength={20}
              placeholder="your_username"
              disabled={isSubmitting}
              className="flex-1 bg-transparent text-white text-base font-medium outline-none placeholder:text-neutral-600 disabled:opacity-50"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <div className="shrink-0 w-5 h-5 flex items-center justify-center ml-2">
              {validationState === 'checking' && (
                <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />
              )}
              {validationState === 'valid' && (
                <Check className="w-4 h-4 text-emerald-400" />
              )}
              {validationState === 'invalid' && (
                <X className="w-4 h-4 text-red-400" />
              )}
            </div>
          </div>

          {/* Validation message */}
          <div className="h-6 mt-2">
            {errorMessage && (
              <p className="text-red-400 text-xs font-medium">{errorMessage}</p>
            )}
            {validationState === 'valid' && (
              <p className="text-emerald-400 text-xs font-medium">Username is available</p>
            )}
            {validationState === 'idle' && username.length === 0 && (
              <p className="text-neutral-600 text-xs">3-20 characters, letters, numbers & underscores</p>
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={validationState !== 'valid' || isSubmitting}
          className={`
            flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold
            transition-all duration-300 mt-2
            ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            ${validationState === 'valid' && !isSubmitting
              ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 cursor-pointer'
              : 'bg-white/10 text-neutral-500 cursor-not-allowed'
            }
          `}
          style={{ transitionDelay: '400ms' }}
        >
          {isSubmitting ? (
            <div className="w-4 h-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
          ) : (
            <>
              Claim username
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Skip link */}
        <button
          onClick={handleSkip}
          disabled={isSubmitting}
          className={`
            mt-3 text-neutral-500 text-sm hover:text-neutral-300 transition-colors duration-200 disabled:opacity-50
            ${mounted ? 'opacity-100' : 'opacity-0'}
          `}
          style={{ transitionDelay: '500ms' }}
        >
          Skip for now
        </button>

        {/* Footer hint */}
        <p
          className={`mt-6 text-neutral-600 text-[10px] sm:text-xs text-center transition-all duration-700 delay-700 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}
        >
          You can change this anytime in settings
        </p>
      </div>
    </div>
  );
}
