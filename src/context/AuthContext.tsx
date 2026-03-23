// src/context/AuthContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialSession = null }: { children: React.ReactNode; initialSession?: Session | null }) {
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [session, setSession] = useState<Session | null>(initialSession ?? null);
  const [isLoading, setIsLoading] = useState(!initialSession);
  const initializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      try {
        // Auth state listener — provides session on INITIAL_SESSION event and
        // subsequent auth changes (sign in, sign out, token refresh).
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (_event: AuthChangeEvent, session: Session | null) => {
            if (!mounted) return;
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
          }
        );

        // If we already have a session from the server, skip client refetch entirely
        if (!initialSession) {
          // Use getUser() to verify the session with the Supabase Auth server.
          // This is slower than getSession() but ensures the JWT is authentic
          // and not tampered with in cookies/storage.
          const { data: { user }, error } = await supabase.auth.getUser();

          if (mounted) {
            if (error || !user) {
              // Server rejected the session — clear everything
              setSession(null);
              setUser(null);
            } else {
              // Server verified — session already set by onAuthStateChange
              setUser(user);
            }
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const cleanup = initializeAuth();

    return () => {
      mounted = false;
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [initialSession]);

  const signInWithGoogle = async (redirectTo?: string) => {
    try {
      setIsLoading(true);
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      if (redirectTo) {
        callbackUrl.searchParams.set('redirect', redirectTo);
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setIsLoading(false);
    }
  };

  const signInWithPassword = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setIsLoading(false);
        return { error: error.message };
      }
      return { error: null };
    } catch (error) {
      setIsLoading(false);
      return { error: 'An unexpected error occurred.' };
    }
  };

  const signUpWithPassword = async (email: string, password: string, fullName: string): Promise<{ error: string | null; needsConfirmation: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) return { error: error.message, needsConfirmation: false };
      // If identities array is empty, user already exists
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return { error: 'An account with this email already exists.', needsConfirmation: false };
      }
      return { error: null, needsConfirmation: true };
    } catch {
      return { error: 'An unexpected error occurred.', needsConfirmation: false };
    }
  };

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch {
      return { error: 'An unexpected error occurred.' };
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear state immediately for better UX
      setSession(null);
      setUser(null);

      // Redirect to login (home) page after sign out
      if (typeof window !== 'undefined') {
        // Replace history entry to prevent navigating back into authed pages
        window.location.replace('/');
      }
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    session,
    isLoading,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};