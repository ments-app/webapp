"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';

export function useRealtimeFeedUpdates() {
  const { user } = useAuth();
  const [newPostCount, setNewPostCount] = useState(0);
  const lastCheckRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    if (!user) return;

    // Subscribe to new posts via Supabase Realtime
    const channel = supabase
      .channel('feed-new-posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `deleted=eq.false`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const newPost = payload.new as { author_id: string; parent_post_id: string | null; created_at: string };
          // Only count root posts from other users
          if (
            newPost.author_id !== user.id &&
            !newPost.parent_post_id &&
            newPost.created_at > lastCheckRef.current
          ) {
            setNewPostCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const dismiss = useCallback(() => {
    setNewPostCount(0);
    lastCheckRef.current = new Date().toISOString();
  }, []);

  return { newPostCount, dismiss };
}
