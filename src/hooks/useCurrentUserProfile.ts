"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';

interface CurrentUserProfile {
  username: string | null;
  avatar_url: string | null;
  full_name: string | null;
  profileHref: string;
}

// Module-level cache so multiple components share one fetch
let cached: { userId: string; profile: CurrentUserProfile; fetchedAt: number } | null = null;
const CACHE_TTL = 300_000; // 5 minutes

export function useCurrentUserProfile(): CurrentUserProfile & { isLoading: boolean } {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CurrentUserProfile>({
    username: null,
    avatar_url: null,
    full_name: null,
    profileHref: '/profile',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile({ username: null, avatar_url: null, full_name: null, profileHref: '/profile' });
      setIsLoading(false);
      return;
    }

    // Return cached if same user and fresh
    if (cached && cached.userId === user.id && Date.now() - cached.fetchedAt < CACHE_TTL) {
      setProfile(cached.profile);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('username, avatar_url, full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;

        const username = data?.username?.toLowerCase() || (user.user_metadata?.username as string | undefined)?.toLowerCase() || null;
        const meta = user.user_metadata as Record<string, string> | undefined;

        const result: CurrentUserProfile = {
          username,
          avatar_url: data?.avatar_url || meta?.avatar_url || meta?.picture || null,
          full_name: data?.full_name || meta?.full_name || user.email || null,
          profileHref: username ? `/profile/${encodeURIComponent(username)}` : '/profile',
        };

        cached = { userId: user.id, profile: result, fetchedAt: Date.now() };
        setProfile(result);
      } catch {
        if (!cancelled) {
          const meta = user.user_metadata as Record<string, string> | undefined;
          setProfile({
            username: null,
            avatar_url: meta?.avatar_url || meta?.picture || null,
            full_name: meta?.full_name || user.email || null,
            profileHref: '/profile',
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  return { ...profile, isLoading };
}
