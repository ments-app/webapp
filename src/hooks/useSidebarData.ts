"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';

interface Environment {
  id: string;
  name: string;
  picture: string | null;
}

interface RecentConversation {
  conversation_id: string;
  other_user_id: string;
  other_username: string;
  other_full_name: string;
  other_avatar_url: string | null;
  last_message: string | null;
  updated_at: string;
  unread_count: number;
}

interface Notification {
  id: string;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
  user_id: string;
  notification_source: 'legacy' | 'inapp';
}

interface UserPost {
  id: string;
  content: string | null;
  post_type: string;
  created_at: string;
  likes: number;
  replies: number;
}

interface SuggestedUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  tagline: string | null;
  is_verified: boolean;
}

interface SidebarData {
  unreadMessages: number;
  unreadNotifications: number;
  environments: Environment[];
  recentConversations: RecentConversation[];
  notifications: Notification[];
  myPosts: UserPost[];
  suggestedUsers: SuggestedUser[];
}

const POLL_INTERVAL = 30_000; // 30 seconds

export function useSidebarData() {
  const { user } = useAuth();
  const [data, setData] = useState<SidebarData>({
    unreadMessages: 0,
    unreadNotifications: 0,
    environments: [],
    recentConversations: [],
    notifications: [],
    myPosts: [],
    suggestedUsers: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;

    const userId = user.id;

    try {
      // Resolve username for follow-based queries
      let username = (user.user_metadata?.username as string | undefined)?.toLowerCase();
      if (!username) {
        const { data: uRow } = await supabase
          .from('users')
          .select('username')
          .eq('id', userId)
          .maybeSingle();
        username = uRow?.username?.toLowerCase();
      }

      const [messagesRes, notifRes, envRes, convRes, notifListRes, postsRes, suggestedRes] = await Promise.allSettled([
        fetch(`/api/messages/read?userId=${userId}`),
        fetch(`/api/notifications?userId=${userId}&unreadOnly=true&limit=1`),
        fetch('/api/environments'),
        fetch(`/api/conversations?userId=${userId}&limit=5`),
        // Full notifications list for activity widget
        fetch(`/api/notifications?userId=${userId}&page=1&limit=10`),
        // User's own posts — query supabase directly for author_id match
        (async () => {
          const postIds: string[] = [];
          const { data: posts } = await supabase
            .from('posts')
            .select('id, content, post_type, created_at')
            .eq('author_id', userId)
            .eq('deleted', false)
            .is('parent_post_id', null)
            .order('created_at', { ascending: false })
            .limit(5);

          if (!posts || posts.length === 0) return [];

          posts.forEach(p => postIds.push(p.id));

          // Batch fetch likes + replies counts
          const [likesRes, repliesRes] = await Promise.all([
            supabase.from('post_likes').select('post_id').in('post_id', postIds),
            supabase.from('posts').select('parent_post_id').in('parent_post_id', postIds).eq('deleted', false),
          ]);

          const likesMap = new Map<string, number>();
          const repliesMap = new Map<string, number>();
          likesRes.data?.forEach(l => likesMap.set(l.post_id, (likesMap.get(l.post_id) || 0) + 1));
          repliesRes.data?.forEach(r => {
            if (r.parent_post_id) repliesMap.set(r.parent_post_id, (repliesMap.get(r.parent_post_id) || 0) + 1);
          });

          return posts.map(p => ({
            id: p.id,
            content: p.content,
            post_type: p.post_type,
            created_at: p.created_at,
            likes: likesMap.get(p.id) || 0,
            replies: repliesMap.get(p.id) || 0,
          }));
        })(),
        // Suggested users: random users not already followed
        (async () => {
          // Get IDs user already follows
          const { data: followRows } = await supabase
            .from('user_follows')
            .select('followee_id')
            .eq('follower_id', userId);

          const followingIds = new Set((followRows || []).map(r => r.followee_id));
          followingIds.add(userId); // exclude self

          // Fetch a pool of users
          const { data: users } = await supabase
            .from('users')
            .select('id, username, full_name, avatar_url, tagline, is_verified')
            .order('is_verified', { ascending: false })
            .limit(30);

          if (!users) return [];

          // Filter out already-followed and self, take 5
          return users
            .filter(u => !followingIds.has(u.id))
            .slice(0, 5) as SuggestedUser[];
        })(),
      ]);

      const update: Partial<SidebarData> = {};

      // Unread messages
      if (messagesRes.status === 'fulfilled' && messagesRes.value.ok) {
        const json = await messagesRes.value.json();
        update.unreadMessages = json.total_unread_count ?? 0;
      }

      // Unread notifications count
      if (notifRes.status === 'fulfilled' && notifRes.value.ok) {
        const json = await notifRes.value.json();
        update.unreadNotifications = json.pagination?.total ?? 0;
      }

      // Environments
      if (envRes.status === 'fulfilled' && envRes.value.ok) {
        const json = await envRes.value.json();
        update.environments = Array.isArray(json) ? json : [];
      }

      // Recent conversations
      if (convRes.status === 'fulfilled' && convRes.value.ok) {
        const json = await convRes.value.json();
        update.recentConversations = Array.isArray(json) ? json : [];
      }

      // Notifications list for activity widget
      if (notifListRes.status === 'fulfilled' && notifListRes.value.ok) {
        const json = await notifListRes.value.json();
        update.notifications = Array.isArray(json.data) ? json.data : [];
      }

      // My posts
      if (postsRes.status === 'fulfilled') {
        update.myPosts = postsRes.value as UserPost[];
      }

      // Suggested users
      if (suggestedRes.status === 'fulfilled') {
        update.suggestedUsers = suggestedRes.value as SuggestedUser[];
      }

      setData(prev => ({ ...prev, ...update }));
    } catch {
      // Silently ignore — sidebar data is non-critical
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setData({
        unreadMessages: 0,
        unreadNotifications: 0,
        environments: [],
        recentConversations: [],
        notifications: [],
        myPosts: [],
        suggestedUsers: [],
      });
      setIsLoading(false);
      return;
    }

    fetchAll();
    intervalRef.current = setInterval(fetchAll, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, fetchAll]);

  return { ...data, isLoading, refetch: fetchAll };
}
