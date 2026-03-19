"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { fetchPostById } from '@/api/posts';
import { toProxyUrl } from '@/utils/imageUtils';

interface PostData {
  id: string;
  content?: string;
  author?: {
    username: string;
    full_name?: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  media?: Array<{
    media_url: string;
    media_type: 'video' | 'photo';
    media_thumbnail?: string | null;
  }>;
}

interface SharedPostPreviewProps {
  postId: string;
  isOwn: boolean;
}

export default function SharedPostPreview({ postId, isOwn }: SharedPostPreviewProps) {
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await fetchPostById(postId);
        if (!cancelled && data) {
          setPost(data as unknown as PostData);
        } else if (!cancelled) {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [postId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current animate-spin opacity-40" />
        <span className="text-xs opacity-60">Loading post...</span>
      </div>
    );
  }

  if (error || !post) {
    return (
      <Link href={`/post/${postId}`} className="block">
        <div className={`rounded-xl p-3 border ${
          isOwn ? 'border-primary-foreground/20 bg-primary-foreground/10' : 'border-border/40 bg-accent/20'
        }`}>
          <p className="text-xs opacity-60">Post unavailable</p>
          <p className="text-[11px] opacity-40 mt-0.5">Tap to view</p>
        </div>
      </Link>
    );
  }

  const firstMedia = post.media?.[0];
  const thumbUrl = firstMedia?.media_thumbnail || (firstMedia?.media_type === 'photo' ? firstMedia.media_url : null);
  const authorAvatar = post.author?.avatar_url
    ? toProxyUrl(post.author.avatar_url, { width: 28, quality: 80 })
    : null;

  return (
    <Link href={`/post/${postId}`} className="block">
      <div className={`rounded-xl overflow-hidden border ${
        isOwn ? 'border-primary-foreground/20 bg-primary-foreground/10' : 'border-border/40 bg-accent/20'
      }`}>
        {/* Media thumbnail */}
        {thumbUrl && (
          <div className="relative w-full aspect-video max-h-36 overflow-hidden">
            <Image
              src={toProxyUrl(thumbUrl, { width: 300, quality: 70 })}
              alt=""
              fill
              className="object-cover"
            />
            {firstMedia?.media_type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Post info */}
        <div className="p-2.5">
          {/* Author */}
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
              {authorAvatar ? (
                <Image src={authorAvatar} alt="" width={20} height={20} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-[9px] font-bold ${
                  isOwn ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/20 text-primary'
                }`}>
                  {(post.author?.full_name || post.author?.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className={`text-xs font-medium truncate ${
              isOwn ? 'text-primary-foreground/80' : 'text-foreground/80'
            }`}>
              {post.author?.full_name || post.author?.username || 'Unknown'}
            </span>
            {post.author?.is_verified && (
              <Image src="/icons/verify_badge.svg" alt="Verified" width={12} height={12} className="w-3 h-3 flex-shrink-0" />
            )}
          </div>

          {/* Content */}
          {post.content && (
            <p className={`text-[13px] leading-snug line-clamp-2 ${
              isOwn ? 'text-primary-foreground/70' : 'text-foreground/70'
            }`}>
              {post.content}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * Extracts a post ID from a message content if it's a shared post URL.
 * Matches patterns like: https://domain.com/post/[uuid] or /post/[uuid]
 */
export function extractPostId(content: string): string | null {
  if (!content) return null;
  const trimmed = content.trim();
  // Match full URL with /post/uuid or just /post/uuid
  const match = trimmed.match(/(?:https?:\/\/[^/]+)?\/post\/([a-f0-9-]{36})(?:\?.*)?$/i);
  if (match && trimmed === match[0]) {
    return match[1];
  }
  return null;
}
