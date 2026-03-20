"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Post, fetchPostById, fetchReplies, createReply, createPost, likePost, unlikePost, checkUserLikedPost, deletePost } from "@/api/posts";
import { MentionText } from "@/components/posts/MentionText";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/utils/supabase";
import { compressMediaBatch } from "@/utils/mediaCompressor";
import { toProxyUrl } from '@/utils/imageUtils';
import { LoginPromptModal, useLoginPrompt } from '@/components/auth/LoginPromptModal';
import Image from 'next/image';
import { Heart, MessageCircle, Share, MoreHorizontal, Trash2, Flag, Bookmark, Users, ImageIcon, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears } from 'date-fns';
import { resolveEnvironmentPicture } from '@/lib/environmentAssets';

// Define a new type that extends Post with nested replies
type PostWithReplies = Omit<Post, 'replies'> & {
  replies: PostWithReplies[];
};

// Compact time formatter
const formatTimeShort = (date: Date): string => {
  const now = new Date();
  const y = differenceInYears(now, date); if (y > 0) return `${y}y`;
  const mo = differenceInMonths(now, date); if (mo > 0) return `${mo}mo`;
  const w = differenceInWeeks(now, date); if (w > 0) return `${w}w`;
  const d = differenceInDays(now, date); if (d > 0) return `${d}d`;
  const h = differenceInHours(now, date); if (h > 0) return `${h}h`;
  const m = differenceInMinutes(now, date); if (m > 0) return `${m}m`;
  return 'now';
};

// Recursively fetch replies for a post and build the reply tree
async function fetchRepliesTree(parentPostId: string): Promise<PostWithReplies[]> {
  const { data: replies, error } = await fetchReplies(parentPostId);
  if (error || !replies) return [];

  // Fetch replies for each reply
  const repliesWithNested = await Promise.all(
    replies.map(async (reply) => {
      const nestedReplies = await fetchRepliesTree(reply.id);
      return {
        ...reply,
        replies: nestedReplies,
      } as PostWithReplies;
    })
  );

  return repliesWithNested;
}

// Function to fetch a post with its reply tree
async function fetchPostWithReplies(postId: string): Promise<PostWithReplies | null> {
  const { data: post, error } = await fetchPostById(postId);
  if (error || !post) return null;

  const replies = await fetchRepliesTree(postId);
  return {
    ...post,
    replies,
  };
}

// ── Post Detail View ────────────────────────────────────────────────
// A borderless, content-first layout for viewing a single post.
// No card wrapper, no hover effects — the content flows naturally.

function PostDetailView({ post, onReply }: { post: Post; onReply: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const loginPrompt = useLoginPrompt();
  const [avatarError, setAvatarError] = useState(false);
  const [envImgError, setEnvImgError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handle = post.author?.handle || post.author?.username?.toLowerCase() || 'anonymous';
  const displayName = post.author?.full_name || post.author?.username || 'Anonymous';
  const initial = post.author?.username?.charAt(0).toUpperCase() || 'U';
  const isVerified = post.author?.is_verified;
  const isAuthor = user?.id === post.author_id;
  const replyCount = typeof post.replies === 'number' ? post.replies : 0;
  const createdAt = new Date(post.created_at);
  const fullDate = format(createdAt, 'MMM d, yyyy · h:mm a');
  const envPicture = resolveEnvironmentPicture(post.environment?.name, post.environment?.picture);

  // Check user interactions
  useEffect(() => {
    if (!user?.id) return;
    checkUserLikedPost(post.id, user.id).then(({ liked }) => setIsLiked(liked));
    fetch(`/api/posts/${post.id}/bookmark`).then(r => r.json()).then(d => setIsBookmarked(!!d.bookmarked)).catch(() => { });
  }, [user?.id, post.id]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc); };
  }, [menuOpen]);

  const handleLike = useCallback(async () => {
    if (!user?.id) { loginPrompt.open('Sign in to like', 'You need to sign in to like posts.'); return; }
    if (isLiking) return;
    setIsLiking(true);
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);
    try {
      const { error } = wasLiked ? await unlikePost(post.id, user.id) : await likePost(post.id, user.id);
      if (error) { setIsLiked(wasLiked); setLikeCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1)); }
    } catch { setIsLiked(wasLiked); setLikeCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1)); }
    finally { setIsLiking(false); }
  }, [user?.id, isLiked, isLiking, post.id, loginPrompt]);

  const handleBookmark = useCallback(async () => {
    if (!user?.id) { loginPrompt.open('Sign in to bookmark', 'You need to sign in to bookmark posts.'); return; }
    const was = isBookmarked;
    setIsBookmarked(!was);
    try {
      const res = await fetch(`/api/posts/${post.id}/bookmark`, { method: was ? 'DELETE' : 'POST' });
      if (!res.ok) setIsBookmarked(was);
      else toast.success(was ? 'Removed from bookmarks' : 'Bookmarked');
    } catch { setIsBookmarked(was); }
  }, [user?.id, isBookmarked, post.id, loginPrompt]);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) { navigator.share({ title: `Post by ${displayName}`, url }).catch(() => { }); }
    else { navigator.clipboard.writeText(url).then(() => toast.success('Link copied')).catch(() => { }); }
  }, [post.id, displayName]);

  const handleDelete = useCallback(async () => {
    if (!user?.id) return;
    setIsDeleting(true);
    try {
      const { error } = await deletePost(post.id, user.id);
      if (!error) { toast.success('Post deleted'); router.push('/'); }
      else toast.error('Failed to delete');
    } catch { toast.error('Failed to delete'); }
    finally { setIsDeleting(false); setMenuOpen(false); }
  }, [user?.id, post.id, router]);

  const goToProfile = useCallback(() => {
    if (post.author?.username) router.push(`/profile/${post.author.username}`);
  }, [post.author?.username, router]);

  return (
    <div className="pb-4">
      {/* Author header */}
      <div className="flex items-center gap-3 mb-4">
        {/* Avatar */}
        <div className="flex-shrink-0 cursor-pointer" onClick={goToProfile}>
          <div className="w-11 h-11 rounded-full overflow-hidden ring-1 ring-border/30">
            {post.author?.avatar_url && !avatarError ? (
              <Image src={toProxyUrl(post.author.avatar_url, { width: 44, quality: 82 })} alt={handle}
                width={44} height={44} className="w-full h-full object-cover" loading="eager"
                onError={() => setAvatarError(true)} />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <span className="text-base font-bold text-primary">{initial}</span>
              </div>
            )}
          </div>
        </div>

        {/* Name + handle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold text-foreground truncate cursor-pointer hover:underline" onClick={goToProfile}>
              {displayName}
            </span>
            {isVerified && (
              <Image src="/icons/verify_badge.svg" alt="Verified" width={14} height={14} className="w-3.5 h-3.5 flex-shrink-0" />
            )}
          </div>
          <span className="text-[13px] text-muted-foreground">@{handle}</span>
        </div>

        {/* Environment badge + menu */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {post.environment && (
            <button
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded-full bg-muted/40 dark:bg-muted/20 border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => post.environment?.id && router.push(`/environments/${post.environment.id}`)}
            >
              {envPicture && !envImgError ? (
                <Image src={toProxyUrl(envPicture, { width: 14, quality: 80 })} alt={post.environment.name} width={14} height={14}
                  className="w-3.5 h-3.5 rounded-full object-cover" onError={() => setEnvImgError(true)} loading="lazy" />
              ) : (
                <Users className="w-3 h-3" />
              )}
              <span className="truncate max-w-[100px]">{post.environment.name}</span>
            </button>
          )}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              aria-label="More options">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 w-48 rounded-xl bg-popover border border-border shadow-xl z-20 py-1 animate-in fade-in-0 zoom-in-95">
                {isAuthor && (
                  <button className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    onClick={handleDelete} disabled={isDeleting}>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? 'Deleting...' : 'Delete post'}</span>
                  </button>
                )}
                <button className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted/50 transition-colors"
                  onClick={() => { handleShare(); setMenuOpen(false); }}>
                  <Share className="w-3.5 h-3.5" />
                  <span>Copy link</span>
                </button>
                {!isAuthor && user && (
                  <button className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    onClick={() => { setMenuOpen(false); toast.info('Report feature coming soon'); }}>
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <div className="mb-4">
          <MentionText content={post.content} className="text-[16px] text-foreground leading-relaxed" />
        </div>
      )}

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className="mb-4 rounded-xl overflow-hidden border border-border/30">
          {post.media.length === 1 ? (
            // Single media — full width
            post.media[0].media_type === 'video' ? (
              <video src={post.media[0].media_url} className="w-full max-h-[500px] object-contain bg-black" controls preload="metadata" />
            ) : (
              <Image src={toProxyUrl(post.media[0].media_url, { width: 600, quality: 85 })} alt="" width={600} height={400}
                className="w-full object-cover max-h-[500px]" loading="eager" />
            )
          ) : (
            // Multiple media — grid
            <div className={`grid gap-0.5 ${post.media.length === 2 ? 'grid-cols-2' : post.media.length === 3 ? 'grid-cols-2' : 'grid-cols-2'}`}>
              {post.media.slice(0, 4).map((m, i) => (
                <div key={m.id || i} className={`overflow-hidden ${post.media!.length === 3 && i === 0 ? 'row-span-2' : ''}`}>
                  {m.media_type === 'video' ? (
                    <video src={m.media_url} className="w-full h-full object-cover max-h-[250px]" controls preload="metadata" />
                  ) : (
                    <Image src={toProxyUrl(m.media_url, { width: 300, quality: 80 })} alt="" width={300} height={200}
                      className="w-full h-full object-cover max-h-[250px]" loading="lazy" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timestamp — full date */}
      <div className="mb-3 pb-3 border-b border-border/30">
        <span className="text-[13px] text-muted-foreground">{fullDate}</span>
      </div>

      {/* Stats row */}
      {(replyCount > 0 || likeCount > 0) && (
        <div className="flex items-center gap-4 mb-3 pb-3 border-b border-border/30">
          {replyCount > 0 && (
            <span className="text-sm">
              <span className="font-bold text-foreground">{replyCount}</span>{' '}
              <span className="text-muted-foreground">{replyCount === 1 ? 'Reply' : 'Replies'}</span>
            </span>
          )}
          {likeCount > 0 && (
            <span className="text-sm">
              <span className="font-bold text-foreground">{likeCount}</span>{' '}
              <span className="text-muted-foreground">{likeCount === 1 ? 'Like' : 'Likes'}</span>
            </span>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-around py-1 border-b border-border/30">
        <button onClick={onReply}
          className="flex items-center gap-2 py-2 px-3 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/5 transition-colors">
          <MessageCircle className="w-[18px] h-[18px]" />
        </button>
        <button onClick={handleLike} disabled={isLiking}
          className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-all ${isLiked ? 'text-red-500 hover:bg-red-500/10' : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/5'}`}>
          <Heart className={`w-[18px] h-[18px] ${isLiked ? 'fill-current' : ''}`} />
        </button>
        <button onClick={handleBookmark}
          className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-all ${isBookmarked ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/5'}`}>
          <Bookmark className={`w-[18px] h-[18px] ${isBookmarked ? 'fill-current' : ''}`} />
        </button>
        <button onClick={handleShare}
          className="flex items-center gap-2 py-2 px-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
          <Share className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>
  );
}

// ── Lightweight Reply Card ──────────────────────────────────────────
// A compact, conversational reply component — much lighter than PostCard.
// Smaller avatar, inline actions, no environment badge/tags, no hover lift.

function ReplyCard({ post, onReply, onRefresh }: { post: PostWithReplies; onReply?: (target: PostWithReplies) => void; onRefresh?: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const loginPrompt = useLoginPrompt();
  const [avatarError, setAvatarError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handle = post.author?.handle || post.author?.username?.toLowerCase() || 'anonymous';
  const displayName = post.author?.full_name || post.author?.username || 'Anonymous';
  const initial = post.author?.username?.charAt(0).toUpperCase() || 'U';
  const timeAgo = formatTimeShort(new Date(post.created_at));
  const isAuthor = user?.id === post.author_id;
  const isVerified = post.author?.is_verified;
  const replyCount = post.replies?.length || 0;

  // Check if user liked this reply
  useEffect(() => {
    if (!user?.id) return;
    checkUserLikedPost(post.id, user.id).then(({ liked }) => setIsLiked(liked));
  }, [user?.id, post.id]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc); };
  }, [menuOpen]);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id) { loginPrompt.open('Sign in to like', 'You need to sign in to like posts.'); return; }
    if (isLiking) return;
    setIsLiking(true);
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);
    try {
      const { error } = wasLiked ? await unlikePost(post.id, user.id) : await likePost(post.id, user.id);
      if (error) { setIsLiked(wasLiked); setLikeCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1)); }
    } catch { setIsLiked(wasLiked); setLikeCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1)); }
    finally { setIsLiking(false); }
  }, [user?.id, isLiked, isLiking, post.id, loginPrompt]);

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) { navigator.share({ title: `Reply by ${displayName}`, url }).catch(() => { }); }
    else { navigator.clipboard.writeText(url).then(() => toast.success('Link copied')).catch(() => { }); }
  }, [post.id, displayName]);

  const handleDelete = useCallback(async () => {
    if (!user?.id) return;
    setIsDeleting(true);
    try {
      const { error } = await deletePost(post.id, user.id);
      if (!error) { toast.success('Reply deleted'); onRefresh?.(); }
      else toast.error('Failed to delete');
    } catch { toast.error('Failed to delete'); }
    finally { setIsDeleting(false); setMenuOpen(false); }
  }, [user?.id, post.id, onRefresh]);

  const goToProfile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.author?.username) router.push(`/profile/${post.author.username}`);
  }, [post.author?.username, router]);

  // Deleted placeholder — compact single line
  if (post.deleted) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-1">
        <Trash2 className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
        <p className="text-xs italic text-muted-foreground/35 select-none">This reply was deleted</p>
      </div>
    );
  }

  return (
    <div className="group/reply flex items-start gap-2.5 py-2.5 relative">
      {/* Avatar */}
      <div className="flex-shrink-0 cursor-pointer" onClick={goToProfile}>
        <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-border/20 dark:ring-border/30">
          {post.author?.avatar_url && !avatarError ? (
            <Image src={toProxyUrl(post.author.avatar_url, { width: 32, quality: 80 })} alt={handle}
              width={32} height={32} className="w-full h-full object-cover" loading="lazy"
              onError={() => setAvatarError(true)} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{initial}</span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        {/* Author line */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[13px] font-semibold text-foreground truncate cursor-pointer hover:underline" onClick={goToProfile}>
            {displayName}
          </span>
          {isVerified && (
            <Image src="/icons/verify_badge.svg" alt="Verified" width={12} height={12} className="w-3 h-3 flex-shrink-0" />
          )}
          <span className="text-[12px] text-muted-foreground/60 truncate">@{handle}</span>
          <span className="text-muted-foreground/40 text-[10px]">·</span>
          <span className="text-[12px] text-muted-foreground/50 flex-shrink-0">{timeAgo}</span>

          {/* Menu button — appears on hover */}
          <div className="ml-auto relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="opacity-0 group-hover/reply:opacity-100 focus:opacity-100 p-1 rounded-md hover:bg-muted/50 text-muted-foreground/50 hover:text-muted-foreground transition-all"
              aria-label="More options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-6 w-44 rounded-lg bg-popover border border-border shadow-lg z-20 py-1 animate-in fade-in-0 zoom-in-95">
                {isAuthor && (
                  <button
                    className="w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{isDeleting ? 'Deleting...' : 'Delete reply'}</span>
                  </button>
                )}
                <button
                  className="w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-muted/50 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleShare(e); setMenuOpen(false); }}
                >
                  <Share className="w-3 h-3" />
                  <span>Copy link</span>
                </button>
                {!isAuthor && user && (
                  <button
                    className="w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); toast.info('Report feature coming soon'); }}
                  >
                    <Flag className="w-3 h-3" />
                    <span>Report</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {post.content && (
          <div className="mb-1.5">
            <MentionText content={post.content} className="text-[14px] text-foreground leading-relaxed" />
          </div>
        )}

        {/* Media (compact) */}
        {post.media && post.media.length > 0 && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto">
            {post.media.map((m, i) => (
              <div key={m.id || i} className="flex-shrink-0 rounded-lg overflow-hidden border border-border/30 max-w-[200px] max-h-[150px]">
                {m.media_type === 'video' ? (
                  <video src={m.media_url} className="w-full h-full object-cover max-h-[150px]" controls preload="metadata" />
                ) : (
                  <Image src={toProxyUrl(m.media_url, { width: 200, quality: 80 })} alt="" width={200} height={150}
                    className="w-full h-full object-cover" loading="lazy" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action row — compact inline */}
        <div className="flex items-center gap-4 -ml-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onReply?.(post); }}
            className="flex items-center gap-1 text-muted-foreground/60 hover:text-blue-500 transition-colors py-0.5 px-1.5 rounded-md hover:bg-blue-500/5"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {replyCount > 0 && <span className="text-[11px] font-medium">{replyCount}</span>}
          </button>

          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center gap-1 py-0.5 px-1.5 rounded-md transition-all ${isLiked
                ? 'text-red-500 hover:bg-red-500/10'
                : 'text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/5'
              }`}
          >
            <Heart className={`w-3.5 h-3.5 transition-all ${isLiked ? 'fill-current scale-110' : ''}`} />
            {likeCount > 0 && <span className="text-[11px] font-medium">{likeCount}</span>}
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1 text-muted-foreground/60 hover:text-emerald-500 transition-colors py-0.5 px-1.5 rounded-md hover:bg-emerald-500/5"
          >
            <Share className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reply Tree ──────────────────────────────────────────────────────
// Project-tree style with ├── └── │ connectors.
// `ancestorContinues` tracks which ancestor levels still have siblings
// below so we know whether to draw │ (continue) or blank (done).

function ReplyTree({
  replies,
  onReply,
  onRefresh,
  depth = 0,
  ancestorContinues = [],
}: {
  replies: PostWithReplies[];
  onReply?: (target: PostWithReplies) => void;
  onRefresh?: () => void;
  depth?: number;
  ancestorContinues?: boolean[];
}) {
  if (!replies || replies.length === 0) return null;

  return (
    <div>
      {replies.map((reply, idx) => {
        const hasChildren = reply.replies && reply.replies.length > 0;
        const isLast = idx === replies.length - 1;

        return (
          <div key={reply.id}>
            {/* Reply row with gutter columns */}
            <div className="flex">
              {/* Gutter: one column per depth level */}
              {Array.from({ length: depth }).map((_, d) => (
                <div
                  key={d}
                  className="w-5 flex-shrink-0 flex justify-center relative select-none"
                  style={{ minHeight: '100%' }}
                >
                  {d < depth - 1 ? (
                    /* Ancestor column: show │ if that ancestor has more siblings */
                    ancestorContinues[d] ? (
                      <div className="w-px h-full bg-border/30 dark:bg-border/20" />
                    ) : null
                  ) : (
                    /* Current depth: ├ or └ connector */
                    <>
                      {/* Vertical segment: full height for ├, half for └ */}
                      <div
                        className="absolute left-1/2 top-0 w-px bg-border/30 dark:bg-border/20 -translate-x-1/2"
                        style={{ height: isLast ? '50%' : '100%' }}
                      />
                      {/* Horizontal branch ── to the reply */}
                      <div
                        className="absolute top-1/2 right-0 h-px bg-border/30 dark:bg-border/20 -translate-y-1/2"
                        style={{ width: '50%' }}
                      />
                    </>
                  )}
                </div>
              ))}

              {/* Reply content */}
              <div className="flex-1 min-w-0">
                <ReplyCard post={reply} onReply={onReply} onRefresh={onRefresh} />
              </div>
            </div>

            {/* Children */}
            {hasChildren && (
              <ReplyTree
                replies={reply.replies}
                onReply={onReply}
                onRefresh={onRefresh}
                depth={Math.min(depth + 1, 6)}
                ancestorContinues={[...ancestorContinues, !isLast]}
              />
            )}

            {/* Top-level divider */}
            {depth === 0 && !isLast && (
              <div className="h-px bg-border/15 dark:bg-border/10 my-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<PostWithReplies | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();
  const loginPrompt = useLoginPrompt();
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  // Reply popup state
  const [replyTarget, setReplyTarget] = useState<PostWithReplies | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);

  useEffect(() => {
    if (!postId) return;
    fetchPostWithReplies(postId as string).then((data) => {
      setPost(data);
      setLoading(false);
    });
  }, [postId]);

  if (loading) return (
    <DashboardLayout showSidebar={false}>
      <div className="max-w-xl mx-auto px-2 py-12 flex justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/50 border-t-transparent animate-spin" />
      </div>
    </DashboardLayout>
  );
  if (!post) return (
    <DashboardLayout showSidebar={false}>
      <div className="max-w-xl mx-auto px-2 py-12 text-center text-muted-foreground">Post not found.</div>
    </DashboardLayout>
  );

  // Convert main post to regular Post type for the detail view
  const mainPost: Post = {
    ...post,
    replies: post.replies.length
  };

  // Open reply popup — if target is a reply, reply to it; otherwise reply to main post
  const openReplyPopup = (target?: PostWithReplies) => {
    if (!user?.id) {
      loginPrompt.open('Sign in to reply', 'You need to sign in to reply to this post.');
      return;
    }
    setReplyTarget(target || null);
    setReplyContent('');
    setSelectedMedia([]);
    setMediaPreviews([]);
    setError(null);
    setShowReplyModal(true);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const closeReplyModal = () => {
    setShowReplyModal(false);
    setReplyTarget(null);
    setReplyContent('');
    mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
    setSelectedMedia([]);
    setMediaPreviews([]);
    setError(null);
  };

  const refreshReplies = async () => {
    const refreshed = await fetchPostWithReplies(postId as string);
    setPost(refreshed);
  };

  const handleSubmitReply = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!user?.id) {
      loginPrompt.open('Sign in to reply', 'You need to sign in to reply to this post.');
      return;
    }
    if (!replyContent.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const parentId = replyTarget ? replyTarget.id : mainPost.id;

      // If media attached, create a media reply and upload files
      if (selectedMedia.length > 0) {
        setIsUploading(true);
        const { data: replyPost, error: postErr } = await createPost(
          user.id,
          mainPost.environment_id,
          replyContent.trim(),
          'media',
          parentId
        );
        if (postErr || !replyPost) {
          setError(postErr?.message || 'Failed to create media reply');
        } else {
          // upload each file via edge and insert into post_media
          for (const file of selectedMedia) {
            // Status update per file (videos: compression occurs server-side)
            if (file.type.startsWith('video/')) {
              setUploadStatus('Compressing video on server…');
            } else if (file.type.startsWith('image/')) {
              setUploadStatus('Uploading image…');
            } else {
              setUploadStatus('Uploading…');
            }
            try {
              const uploaded = await uploadFileViaEdge(file, user.id);
              const { error: mediaError } = await supabase
                .from('post_media')
                .insert({
                  post_id: replyPost.id,
                  media_url: uploaded.url,
                  media_type: uploaded.type?.startsWith('video/') ? 'video' : 'photo',
                  width: uploaded.width ?? null,
                  height: uploaded.height ?? null,
                  created_at: new Date().toISOString()
                });
              if (mediaError) console.error('post_media insert error', mediaError);
            } catch (upErr) {
              console.error('Upload failed', upErr);
              setError('One of the media uploads failed. Others may have succeeded.');
            }
          }
          setUploadStatus('');
          // Clear media selection & reply target
          mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
          setSelectedMedia([]);
          setMediaPreviews([]);
          setReplyContent('');
          setReplyTarget(null);
          setShowReplyModal(false);
          // Refresh
          const refreshed = await fetchPostWithReplies(mainPost.id);
          setPost(refreshed);
        }
        setIsUploading(false);
        setUploadStatus('');
      } else {
        // text-only reply
        const { error } = await createReply({
          authorId: user.id,
          environmentId: mainPost.environment_id,
          parentPostId: parentId,
          content: replyContent.trim(),
        });
        if (error) {
          setError(error.message || "Failed to post reply.");
        } else {
          setReplyContent("");
          setReplyTarget(null);
          setShowReplyModal(false);
          const refreshed = await fetchPostWithReplies(mainPost.id);
          setPost(refreshed);
        }
      }
    } catch (err: unknown) {
      const error = err as Error | undefined;
      setError(error?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  // Edge upload helpers (mirrors CreatePostInput minimal)
  const EDGE_UPLOAD_URL = 'https://lrgwsbslfqiwoazmitre.supabase.co/functions/v1/upload-post-media';
  const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  type EdgeUploadResponse = { imageUrl: string; fileType: string; width?: number; height?: number };
  const uploadFileViaEdge = async (file: File, userId: string) => {
    const safeName = file.name.replace(/[^A-Za-z0-9_.-]/g, '_');
    const dataUrl = await fileToDataUrl(file);
    const isVideo = file.type.startsWith('video/');
    // Send server-side compression hints for videos. Images may still be pre-compressed client-side.
    const payload: Record<string, unknown> = {
      imageData: dataUrl,
      fileName: safeName,
      userId,
      fileType: file.type,
      isVideo,
    };
    if (isVideo) {
      payload.videoOptions = {
        maxWidth: 1280,
        maxHeight: 1280,
        targetBitrateKbps: 2500, // ~2.5 Mbps target
        crf: 28,
        preset: 'veryfast',
        faststart: true,
      };
      console.info('[compress] video will be compressed server-side with', payload.videoOptions);
    }
    const attempt = async () => {
      const res = await fetch(EDGE_UPLOAD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error((json?.error as string) || `Upload failed: ${res.status}`);
      return { url: (json as EdgeUploadResponse).imageUrl, type: (json as EdgeUploadResponse).fileType, width: (json as EdgeUploadResponse).width, height: (json as EdgeUploadResponse).height };
    };
    try { return await attempt(); } catch { await new Promise(r => setTimeout(r, 300)); return await attempt(); }
  };

  const onSelectFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      // Compress images/videos before preview and upload
      const originalArr = Array.from(files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
      const results = await compressMediaBatch(files);
      // Log sizes to console
      results.forEach((r, i) => {
        const orig = originalArr[i];
        if (!orig) return;
        const origKB = (orig.size / 1024).toFixed(1);
        const compKB = (r.file.size / 1024).toFixed(1);
        const savings = orig.size > 0 ? (((orig.size - r.file.size) / orig.size) * 100).toFixed(1) : '0.0';
        console.log(
          `[compress] ${orig.name} -> ${r.file.name} | ${origKB} KB -> ${compKB} KB | ${r.wasCompressed ? `saved ${savings}%` : `no change${r.reason ? ` (${r.reason})` : ''}`}`
        );
      });
      const compressedFiles = results.map(r => r.file);
      const previewUrls = results.map(r => r.previewUrl);
      if (compressedFiles.length === 0) return;
      setSelectedMedia(prev => [...prev, ...compressedFiles]);
      setMediaPreviews(prev => [...prev, ...previewUrls]);
    } catch {
      // Fallback: if compression fails unexpectedly, add originals
      const arr = Array.from(files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
      const previews = arr.map(f => URL.createObjectURL(f));
      setSelectedMedia(prev => [...prev, ...arr]);
      setMediaPreviews(prev => [...prev, ...previews]);
    }
  };

  return (
    <DashboardLayout showSidebar={false}>
      <div className="max-w-xl mx-auto px-1 sm:px-2 pb-20 md:pb-8">
        {/* Main post — borderless detail view */}
        <PostDetailView post={mainPost} onReply={() => openReplyPopup()} />

        {/* Replies */}
        {post.replies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No replies yet. Be the first to reply!</p>
          </div>
        ) : (
          <div className="pt-3">
            <ReplyTree replies={post.replies} onReply={openReplyPopup} onRefresh={refreshReplies} />
          </div>
        )}
      </div>
      <LoginPromptModal {...loginPrompt.modalProps} />

      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onSelectFiles(e.target.files)} />
      <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => onSelectFiles(e.target.files)} />

      {/* ── Reply Popup Modal ── */}
      {showReplyModal && user && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200" onClick={closeReplyModal} />

          {/* Modal */}
          <div className="relative w-full sm:max-w-lg mx-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-4 duration-300">
            <div className="bg-card border border-border/40 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <button
                  type="button"
                  onClick={closeReplyModal}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <span className="text-sm font-semibold text-foreground">Reply</span>
                <button
                  type="button"
                  onClick={handleSubmitReply}
                  disabled={(!replyContent.trim() && selectedMedia.length === 0) || submitting}
                  className="text-sm font-semibold text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:text-primary/80 transition-colors"
                >
                  {submitting ? 'Posting...' : 'Post'}
                </button>
              </div>

              <div className="h-px bg-border/20" />

              {/* Replying-to context */}
              <div className="px-4 pt-3">
                <div className="flex items-start gap-3">
                  {/* Parent avatar + thread line */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted/30 flex items-center justify-center flex-shrink-0 ring-1 ring-border/20">
                      {(replyTarget || mainPost).author?.avatar_url ? (
                        <Image
                          src={toProxyUrl((replyTarget || mainPost).author!.avatar_url!, { width: 32, quality: 80 })}
                          alt="" width={32} height={32} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">
                          {((replyTarget || mainPost).author?.username?.[0] || 'U').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="w-px flex-1 min-h-[20px] bg-border/25" />
                  </div>

                  {/* Parent content preview */}
                  <div className="flex-1 min-w-0 pb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {(replyTarget || mainPost).author?.full_name || (replyTarget || mainPost).author?.username || 'User'}
                      </span>
                      <span className="text-xs text-muted-foreground/60 truncate">
                        @{(replyTarget || mainPost).author?.handle || (replyTarget || mainPost).author?.username}
                      </span>
                    </div>
                    {(replyTarget || mainPost).content && (
                      <p className="text-sm text-muted-foreground/70 line-clamp-2 mt-0.5">
                        {(replyTarget || mainPost).content}
                      </p>
                    )}
                  </div>
                </div>

                {/* Your reply input area */}
                <div className="flex items-start gap-3 pb-2">
                  {/* Your avatar */}
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0 ring-1 ring-primary/20">
                    <span className="text-xs font-bold text-primary">
                      {(user?.user_metadata?.username?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                    </span>
                  </div>

                  {/* Text input */}
                  <div className="flex-1 min-w-0">
                    <input
                      ref={inputRef}
                      type="text"
                      className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/50 py-1.5"
                      placeholder={`Reply to @${(replyTarget || mainPost).author?.handle || (replyTarget || mainPost).author?.username || 'user'}...`}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      disabled={submitting}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (replyContent.trim() && !submitting) handleSubmitReply(e as React.FormEvent);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Media previews */}
                {mediaPreviews.length > 0 && (
                  <div className="flex gap-2 pb-3 pl-11 overflow-x-auto scrollbar-none">
                    {mediaPreviews.map((src, i) => (
                      <div key={i} className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden ring-1 ring-border/30">
                        {selectedMedia[i]?.type.startsWith('video/') ? (
                          <video src={src} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={src} alt="preview" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => { setSelectedMedia(prev => prev.filter((_, idx) => idx !== i)); setMediaPreviews(prev => prev.filter((_, idx) => idx !== i)); URL.revokeObjectURL(src); }}
                          className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/90 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload status */}
                {uploadStatus && (
                  <div className="pb-2 pl-11 text-xs text-muted-foreground flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    <span>{uploadStatus}</span>
                  </div>
                )}
                {error && <p className="pb-2 pl-11 text-xs text-red-500">{error}</p>}
              </div>

              {/* Bottom toolbar */}
              <div className="h-px bg-border/20" />
              <div className="flex items-center gap-1 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                  aria-label="Add photo"
                >
                  <ImageIcon className="w-[18px] h-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                  aria-label="Add video"
                >
                  <Video className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}