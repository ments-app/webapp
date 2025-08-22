"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears } from 'date-fns';
import { MoreVertical, MessageCircle, Heart, Share, Bookmark, TrendingUp, Users, Clock, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createPortal } from 'react-dom';
import { Post, likePost, unlikePost, votePollOption, checkUserLikedPost, checkUserPollVotes, deletePost } from '@/api/posts';
import { useAuth } from '@/context/AuthContext';
import { PollVoters } from '@/components/polls/PollVoters';
import Image from 'next/image';
import { MentionText } from './MentionText';
import { EditPostModal } from './EditPostModal';
import { Trash2, Edit } from 'lucide-react';

type PostCardProps = {
  post: Post;
  onReply?: () => void;
  onLike?: () => void;
};

// Standard aspect ratios for posts
const IMAGE_ASPECT = '4 / 5'; // Portrait-friendly like many social feeds
const VIDEO_ASPECT = '16 / 9'; // Common video aspect ratio

// Enhanced tag styling with more visual appeal
const getTagStyling = (tag: string) => {
  const normalizedTag = tag.toLowerCase();
  
  if (normalizedTag.includes('app') || normalizedTag.includes('dev')) {
    return 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 hover:border-blue-500/50 shadow-sm';
  } else if (normalizedTag.includes('collaborat') || normalizedTag.includes('team')) {
    return 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 dark:text-green-300 border border-green-500/30 hover:border-green-500/50 shadow-sm';
  } else if (normalizedTag.includes('ai') || normalizedTag.includes('artificial')) {
    return 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:border-purple-500/50 shadow-sm';
  }
  return 'bg-gradient-to-r from-slate-500/10 to-slate-600/10 text-slate-700 dark:text-slate-300 border border-slate-500/20 hover:border-slate-500/30 shadow-sm';
};

// Media gallery supporting multiple photos and videos (top-level to preserve state)
function MediaGallery({ items, onOpen }: { items: Array<{ id?: string; media_type: 'photo' | 'video'; media_url: string; media_thumbnail?: string | null; width?: number | null; height?: number | null }>; onOpen?: (index: number) => void }) {
  // Hooks must be called unconditionally
  const total = items?.length || 0;
  const [current, setCurrent] = useState(0);
  const [imageError, setImageError] = useState(false);
  const handleImageError = () => setImageError(true);
  const goPrev = useCallback((e?: React.MouseEvent) => { if (e) e.stopPropagation(); setCurrent(c => (c - 1 + total) % total); }, [total]);
  const goNext = useCallback((e?: React.MouseEvent) => { if (e) e.stopPropagation(); setCurrent(c => (c + 1) % total); }, [total]);
  // Swipe support
  const touchStartX = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);
  const lastTouchXRef = useRef<number | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; touchStartTime.current = Date.now(); }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => { lastTouchXRef.current = e.touches[0].clientX; }, []);
  const onTouchEnd = useCallback(() => {
    if (touchStartX.current == null || touchStartTime.current == null) return;
    const dx = (lastTouchXRef.current ?? touchStartX.current) - touchStartX.current;
    const dt = Date.now() - touchStartTime.current;
    if (dt < 400 && Math.abs(dx) > 40) {
      if (dx > 0) goNext(); else goPrev();
    }
    touchStartX.current = null; touchStartTime.current = null; lastTouchXRef.current = null;
  }, [goNext, goPrev]);

  if (!items || total === 0) return null;

  // If only a single item, render directly
  if (total === 1) {
    const m = items[0];
    const aspect = m.width && m.height 
      ? `${m.width} / ${m.height}` 
      : IMAGE_ASPECT;
    if (m.media_type === 'photo') {
      return (
        <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden max-h-[520px] md:max-h-[600px] cursor-zoom-in" style={{ aspectRatio: aspect }} onClick={(e) => { e.stopPropagation(); onOpen?.(0); }} data-no-nav="true">
          {!imageError ? (
            <Image
              src={toProxyUrl(m.media_url)}
              alt="Post media"
              fill
              className="object-contain w-full h-full rounded-2xl transition-transform duration-300 group-hover:scale-[1.02] bg-black will-change-transform"
              sizes="(max-width: 768px) 100vw, 700px"
              draggable={false}
              loading="lazy"
              priority={false}
              onError={handleImageError}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/50 rounded-2xl flex items-center justify-center">
              <span className="text-muted-foreground">Failed to load image</span>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="relative w-full max-w-2xl mx-auto">
        <ResponsiveVideo src={toProxyUrl(m.media_url)} poster={m.media_thumbnail || undefined} />
      </div>
    );
  }

  const m = items[current];
  const currentAspect = m.width && m.height 
    ? `${m.width} / ${m.height}` 
    : IMAGE_ASPECT;
  return (
    <div className="relative w-full max-w-2xl mx-auto" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="rounded-2xl overflow-hidden bg-black max-h-[520px] md:max-h-[600px] will-change-transform">
        {m.media_type === 'photo' ? (
          <div className="relative w-full max-h-[520px] md:max-h-[600px] cursor-zoom-in" style={{ aspectRatio: currentAspect }} onClick={(e) => { e.stopPropagation(); onOpen?.(current); }} data-no-nav="true">
            <Image
              src={toProxyUrl(m.media_url)}
              alt={`Media ${current + 1}`}
              fill
              className="object-contain w-full h-full bg-black will-change-transform"
              sizes="(max-width: 768px) 100vw, 700px"
              draggable={false}
              loading="lazy"
              onError={handleImageError}
              unoptimized
            />
          </div>
        ) : (
          <div
            data-no-nav="true"
            className="relative w-full max-h-[520px] md:max-h-[600px] cursor-zoom-in"
            onClick={(e) => { e.stopPropagation(); onOpen?.(current); }}
          >
            <ResponsiveVideo src={toProxyUrl(m.media_url)} poster={m.media_thumbnail || undefined} />
          </div>
        )}
      </div>

      {/* Prev/Next */}
      {total > 1 && (
        <>
          <button
            data-no-nav="true"
            className="absolute top-1/2 -translate-y-1/2 left-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-9 h-9 flex items-center justify-center"
            onClick={goPrev}
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            data-no-nav="true"
            className="absolute top-1/2 -translate-y-1/2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-9 h-9 flex items-center justify-center"
            onClick={goNext}
            aria-label="Next"
          >
            ›
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1">
            {items.map((_, i) => (
              <button
                data-no-nav="true"
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`w-2.5 h-2.5 rounded-full ${i === current ? 'bg-white' : 'bg-white/40'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Fullscreen lightbox for image previews
function Lightbox({ items, index, onClose, onPrev, onNext }: { items: Array<{ media_type: 'photo' | 'video'; media_url: string; media_thumbnail?: string | null }>; index: number; onClose: () => void; onPrev: () => void; onNext: () => void; }) {
  const current = items[index];
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  if (!mounted || !current) return null;

  const overlay = (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center" role="dialog" aria-modal="true" data-no-nav="true" onClick={onClose}>
      <div className="absolute inset-0" />
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-full h-full">
          {current.media_type === 'photo' ? (
            <Image
              src={toProxyUrl(current.media_url)}
              alt="Preview"
              fill
              className="object-contain select-none"
              sizes="100vw"
              draggable={false}
              priority={true}
            />
          ) : (
            <video
              className="absolute inset-0 w-full h-full object-contain"
              controls
              poster={items[index].media_thumbnail || undefined}
            >
              <source src={toProxyUrl(current.media_url)} type="video/mp4" />
              <source src={toProxyUrl(current.media_url)} type="video/webm" />
              <source src={toProxyUrl(current.media_url)} type="video/ogg" />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
        <button className="absolute top-4 right-4 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center" onClick={onClose} aria-label="Close" data-no-nav="true">✕</button>
        {items.length > 1 && (
          <>
            <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-10 h-10" onClick={onPrev} aria-label="Previous" data-no-nav="true">‹</button>
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-10 h-10" onClick={onNext} aria-label="Next" data-no-nav="true">›</button>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
  

// Compact time formatter like 13d, 4h, 2m
function formatTimeAgoShort(date: Date): string {
  const now = new Date();
  const years = differenceInYears(now, date);
  if (years > 0) return `${years}y`;
  const months = differenceInMonths(now, date);
  if (months > 0) return `${months}mo`;
  const weeks = differenceInWeeks(now, date);
  if (weeks > 0) return `${weeks}w`;
  const days = differenceInDays(now, date);
  if (days > 0) return `${days}d`;
  const hours = differenceInHours(now, date);
  if (hours > 0) return `${hours}h`;
  const minutes = differenceInMinutes(now, date);
  if (minutes > 0) return `${minutes}m`;
  return 'now';
}

// Build proxy URL for both images and videos stored as s3://...
const toProxyUrl = (rawUrl: string) => `https://lrgwsbslfqiwoazmitre.supabase.co/functions/v1/get-image?url=${encodeURIComponent(rawUrl)}`;

// Enhanced ResponsiveVideo with better controls
function ResponsiveVideo({ src, poster }: { src: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => setIsLoaded(true);
    const onError = () => { setHasError(true); setIsLoaded(true); };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('error', onError);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('error', onError);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [src]);

  if (hasError) {
    return (
      <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border border-red-200 dark:border-red-800">
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="text-red-500 mb-2 text-2xl">⚠️</div>
            <span className="text-red-600 dark:text-red-400 text-sm font-medium">Failed to load video</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative mx-auto rounded-2xl overflow-hidden bg-black shadow-xl group max-h-[520px] md:max-h-[600px]"
      style={{ aspectRatio: VIDEO_ASPECT, width: '100%', maxWidth: '100%' }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        controls={showControls}
        preload="metadata"
        poster={poster}
        className="absolute inset-0 w-full h-full object-contain rounded-2xl transition-all duration-300"
        playsInline
      >
        <source src={src} type="video/mp4" />
        <source src={src} type="video/webm" />
        <source src={src} type="video/ogg" />
        Your browser does not support the video tag.
      </video>
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-3 border-white/20 border-t-white/80"></div>
            <span className="text-sm text-white/90 font-medium">Loading video...</span>
          </div>
        </div>
      )}
      
      {/* Play/Pause overlay */}
      {isLoaded && (
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
          <Button
            variant="ghost"
            size="icon"
            className="w-16 h-16 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/20"
            onClick={(e) => {
              e.stopPropagation();
              const video = videoRef.current;
              if (video) {
                if (video.paused) {
                  video.play();
                } else {
                  video.pause();
                }
              }
            }}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 text-white" />
            ) : (
              <Play className="h-8 w-8 text-white ml-1" />
            )}
          </Button>
        </div>
      )}
      
      {/* Enhanced border with gradient */}
      <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none"></div>
    </div>
  );
}

// Helper: determine if an avatar URL is a Google avatar we want to avoid
function isGoogleAvatar(url?: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname === 'lh3.googleusercontent.com';
  } catch {
    return false;
  }
}

export function PostCard({ post, onReply, onLike }: PostCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [likes, setLikes] = useState(post.likes || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [replies] = useState(post.replies || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [envImageError, setEnvImageError] = useState(false);
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  // Edit/Delete state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Menu refs/UX
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isMenuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const n = menuRef.current;
      if (n && !n.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen]);
  
  // Poll voting state
  const [pollVotes, setPollVotes] = useState<{[key: string]: number}>({});
  const [userVotedOptions, setUserVotedOptions] = useState<string[]>([]);
  const [hasUserVoted, setHasUserVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);

  // Content truncation (normalize possibly null content)
  const content = post.content ?? '';
  const isLongContent = content.length > 280;
  const displayContent = isLongContent && !showFullContent 
    ? content.substring(0, 280) + '...' 
    : content;

  useEffect(() => {
    if (!user?.id) return;

    const checkUserInteractions = async () => {
      try {
        const { liked, error: likeError } = await checkUserLikedPost(post.id, user.id);
        if (likeError) {
          console.warn('Error checking user likes:', likeError);
        } else {
          setIsLiked(liked);
        }

        if (post.poll) {
          const { votes, error: pollError } = await checkUserPollVotes(post.poll.id, user.id);
          if (pollError) {
            if (typeof pollError === 'object') {
              console.warn('Error checking poll votes:', JSON.stringify(pollError));
            } else {
              console.warn('Error checking poll votes:', pollError);
            }
          } else {
            const votedOptionIds = votes.map(v => v.option_id);
            setUserVotedOptions(votedOptionIds);
            setHasUserVoted(votedOptionIds.length > 0);
          }
          
          if (post.poll.options) {
            const initialVotes: {[key: string]: number} = {};
            post.poll.options.forEach(option => {
              initialVotes[option.id] = option.votes;
            });
            setPollVotes(initialVotes);
          }
        }
      } catch (error) {
        console.error('Error in checkUserInteractions:', error);
      }
    };

    checkUserInteractions();
  }, [user?.id, post.id, post.poll]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id || isLiking) return;

    setIsLiking(true);
    
    try {
      if (isLiked) {
        const { error } = await unlikePost(post.id, user.id);
        if (!error) {
          setLikes(likes - 1);
          setIsLiked(false);
        }
      } else {
        const { error } = await likePost(post.id, user.id);
        if (!error) {
          setLikes(likes + 1);
          setIsLiked(true);
        }
      }
    } catch (error) {
      console.error('Error liking/unliking post:', error);
    } finally {
      setIsLiking(false);
    }
    
    if (onLike) onLike();
  };

  const handlePollVote = async (optionId: string) => {
    if (!user?.id || isVoting) return;

    // Store previous state for potential rollback
    const previousVotes = { ...pollVotes };
    const previousUserVotes = [...userVotedOptions];
    const previousHasVoted = hasUserVoted;

    // Optimistic UI update - instant feedback
    const newVotes = { ...pollVotes };
    let newUserVotes = [...userVotedOptions];
    let action: 'added' | 'removed' = 'added';
    let previousOptionId: string | null = null;

    // Determine if user is removing their vote (clicking same option)
    const isRemovingVote = userVotedOptions.includes(optionId);
    
    if (isRemovingVote) {
      // Remove vote
      action = 'removed';
      newUserVotes = newUserVotes.filter(id => id !== optionId);
      newVotes[optionId] = Math.max(0, (newVotes[optionId] || 1) - 1);
    } else {
      // Add new vote, potentially switching from another option
      previousOptionId = userVotedOptions[0] || null; // Get current vote if any
      
      // Remove previous vote if exists
      if (previousOptionId) {
        newUserVotes = newUserVotes.filter(id => id !== previousOptionId);
        newVotes[previousOptionId] = Math.max(0, (newVotes[previousOptionId] || 1) - 1);
      }
      
      // Add new vote
      newUserVotes = [optionId]; // Only one vote allowed
      newVotes[optionId] = (newVotes[optionId] || 0) + 1;
    }

    // Apply optimistic update immediately
    setPollVotes(newVotes);
    setUserVotedOptions(newUserVotes);
    setHasUserVoted(newUserVotes.length > 0);
    setIsVoting(true);
    setVotingOptionId(optionId);

    try {
      const { data, error } = await votePollOption(optionId, user.id);
      
      // If API call fails, rollback to previous state
      if (error || !data || !data.success) {
        console.error('Vote failed, rolling back:', error);
        setPollVotes(previousVotes);
        setUserVotedOptions(previousUserVotes);
        setHasUserVoted(previousHasVoted);
        return;
      }

      // Verify our optimistic update matches the server response
      // If there's a discrepancy, use server data
      if (data.action !== action) {
        const serverVotes = { ...pollVotes };
        let serverUserVotes = [...userVotedOptions];
        
        if (data.action === 'removed') {
          serverUserVotes = serverUserVotes.filter(id => id !== optionId);
          serverVotes[optionId] = Math.max(0, (serverVotes[optionId] || 1) - 1);
        } else if (data.action === 'added') {
          if (data.previous_option_id) {
            serverUserVotes = serverUserVotes.filter(id => id !== data.previous_option_id);
            serverVotes[data.previous_option_id] = Math.max(0, (serverVotes[data.previous_option_id] || 1) - 1);
          }
          if (!serverUserVotes.includes(optionId)) {
            serverUserVotes.push(optionId);
          }
          serverVotes[optionId] = (serverVotes[optionId] || 0) + 1;
        }
        
        setPollVotes(serverVotes);
        setUserVotedOptions(serverUserVotes);
        setHasUserVoted(serverUserVotes.length > 0);
      }
    } catch (error) {
      console.error('Error voting on poll:', error);
      // Rollback on network error
      setPollVotes(previousVotes);
      setUserVotedOptions(previousUserVotes);
      setHasUserVoted(previousHasVoted);
    } finally {
      setIsVoting(false);
      setVotingOptionId(null);
    }
  };

  const handleReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReply) {
      onReply();
    } else {
      router.push(`/post/${post.id}`);
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const username = post.author?.username || post.author?.handle;
    if (username) {
      router.push(`/profile/${username}`);
    }
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleCardClick = () => {
    router.push(`/post/${post.id}`);
  };

  // Navigate to detail when clicking the card, but ignore interactions on controls or tagged elements
  const onCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const tag = target.tagName;
    // If click originated inside an element that should not trigger navigation, bail
    const interactiveTags = new Set(['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL']);
    if (interactiveTags.has(tag)) return;
    if (target.closest('[data-no-nav="true"]')) return;
    // Video controls & media: if user clicked a control overlay we stop
    if (target.closest('video')) return;
    handleCardClick();
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleEnvImageError = () => {
    setEnvImageError(true);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Implement share functionality
    if (navigator.share) {
      navigator.share({
        title: `Post by ${post.author?.username || 'Anonymous'}`,
        text: content,
        url: `${window.location.origin}/post/${post.id}`
      }).catch(console.error);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
        .then(() => {
          // You could show a toast notification here
          console.log('Link copied to clipboard');
        })
        .catch(console.error);
    }
  };

  const isVerified = post.author?.is_verified || false;
  const isAuthor = user?.id === post.author_id;

  // Calculate total poll votes
  const totalPollVotes = Object.values(pollVotes).reduce((sum, votes) => sum + votes, 0);


  return (
    <article
      className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl p-6 cursor-pointer transition-all duration-300 hover:bg-card/80 hover:border-border/80 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5 hover:-translate-y-1"
      onClick={onCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleCardClick(); }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header with enhanced user info */}
        <header className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Enhanced Profile Picture */}
            <div className="relative" onClick={handleProfileClick} data-no-nav="true" role="link" tabIndex={0}>
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-border/20 group-hover:ring-primary/30 transition-all duration-300">
                {post.author?.avatar_url && !isGoogleAvatar(post.author.avatar_url) && !imageError ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={`https://lrgwsbslfqiwoazmitre.supabase.co/functions/v1/get-image?url=${encodeURIComponent(post.author.avatar_url)}`}
                      alt={post.author.username || 'User'}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={handleImageError}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">
                      {post.author?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
              {isVerified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6" aria-label="Verified">
                  <svg
                    viewBox="0 0 40 40"
                    width="24"
                    height="24"
                    className="block"
                    aria-hidden="true"
                  >
                    <path
                      d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                      fill="#0095F6"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
            
            {/* Enhanced User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors duration-200 cursor-pointer" onClick={handleProfileClick} data-no-nav="true" role="link">
                  {post.author?.full_name || post.author?.username || 'Anonymous'}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <span className="font-medium cursor-pointer" onClick={handleProfileClick} data-no-nav="true" role="link">@{post.author?.handle || post.author?.username?.toLowerCase() || 'anonymous'}</span>
                <span className="opacity-60">•</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span title={formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}>{formatTimeAgoShort(new Date(post.created_at))}</span>
                </div>
              </div>
              
              {/* Environment info moved below username */}
              {post.environment && (
              <div className="flex items-center gap-3 text-sm bg-[#1C1F26] px-4 py-2 rounded-xl border border-[#2A2E38] w-fit">
                {/* Icon or fallback */}
                {post.environment.picture && !envImageError ? (
                  <div className="w-6 h-6 rounded-md overflow-hidden ring-1 ring-[#3C4049]">
                    <Image
                      src={`https://lrgwsbslfqiwoazmitre.supabase.co/functions/v1/get-image?url=${encodeURIComponent(post.environment.picture)}`}
                      alt={post.environment.name}
                      width={24}
                      height={24}
                      className="object-cover w-full h-full"
                      onError={handleEnvImageError}
                    />
                  </div>
                ) : (
                  <Users className="h-5 w-5 text-gray-400" />
                )}
                {/* Environment name */}
                <span className="text-white font-semibold">{post.environment.name}</span>
              </div>
            )}
            </div>
          </div>
          
          {/* Standard More menu */}
          <div className="relative" ref={menuRef}>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-10 w-10 rounded-2xl transition-colors hover:bg-accent/40 text-foreground/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={toggleMenu}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-label="More options"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
            {isMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-56 rounded-xl bg-popover text-popover-foreground border border-border/60 shadow-xl z-20 overflow-hidden animate-in fade-in-0 zoom-in-95"
                role="menu"
              >
                <div className="py-1">
                  {isAuthor && (
                    <>
                      <button 
                        className="w-full px-3 py-2 text-sm flex items-center gap-3 hover:bg-accent/50 transition-colors"
                        role="menuitem"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 opacity-80" />
                        <span>Edit post</span>
                      </button>
                      <button 
                        className="w-full px-3 py-2 text-sm flex items-center gap-3 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                        role="menuitem"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          setShowDeleteConfirm(true);
                        }}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 opacity-80" />
                        <span>{isDeleting ? 'Deleting...' : 'Delete post'}</span>
                      </button>
                      <div className="h-px bg-border/60 my-1" />
                    </>
                  )}
                  <button 
                    className="w-full px-3 py-2 text-sm flex items-center gap-3 hover:bg-accent/50 transition-colors"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(e);
                      setIsMenuOpen(false);
                    }}
                  >
                    <Share className="h-4 w-4 opacity-80" />
                    <span>Copy link</span>
                  </button>
                  {!isAuthor && (
                    <>
                      <div className="h-px bg-border/60 my-1" />
                      <button 
                        className="w-full px-3 py-2 text-sm flex items-center gap-3 hover:bg-accent/50 transition-colors"
                        role="menuitem"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          // TODO: open report modal / flow
                        }}
                      >
                        <TrendingUp className="h-4 w-4 opacity-80" />
                        <span>Report post</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        
        {/* Enhanced Tags Section */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-2 mb-5 flex-wrap">
            {post.tags.map((tag, index) => (
              <div 
                key={index} 
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105 cursor-pointer ${getTagStyling(tag)}`}
              >
                <span>{tag}</span>
                {tag.toLowerCase() === 'ai' && <span className="ml-1.5 text-xs">✨</span>}
              </div>
            ))}
          </div>
        )}
        
        {/* Enhanced Post content */}
        <div className="mb-5">
          <MentionText 
            content={displayContent}
            className="text-foreground leading-relaxed text-base block"
          />
          {isLongContent && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFullContent(!showFullContent);
              }}
              className="mt-2 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
            >
              {showFullContent ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
        
        {/* Enhanced Media content */}
        {post.media && post.media.length > 0 && (
          <div className="mb-5 rounded-2xl overflow-hidden bg-muted/5 ring-1 ring-border/20 p-2">
            <MediaGallery
              items={post.media}
              onOpen={(index) => {
                setLightboxIndex(index);
                setLightboxOpen(true);
              }}
            />
          </div>
        )}

        {/* Enhanced Poll content */}
        {post.poll && (
          <div className="mb-5 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 p-5 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold mb-4 text-foreground text-lg">{post.poll.question}</div>
            <div className="space-y-3">
              {post.poll.options?.map(option => {
                const voteCount = pollVotes[option.id] || 0;
                const percentage = totalPollVotes > 0 ? (voteCount / totalPollVotes) * 100 : 0;
                const isSelected = userVotedOptions.includes(option.id);
                const isCurrentlyVoting = votingOptionId === option.id;
                const isDisabled = isVoting && !isCurrentlyVoting;
                
                return (
                  <div key={option.id} className="relative">
                    <button 
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 relative overflow-hidden ${
                        isSelected
                          ? 'bg-gradient-to-r from-primary/20 to-primary/10 border-primary/40 text-primary shadow-lg shadow-primary/10 transform scale-[1.02]' 
                          : 'bg-muted/30 border-border/30 hover:bg-muted/50 hover:border-border/50 hover:scale-[1.01]'
                      } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                      ${isCurrentlyVoting ? 'ring-2 ring-primary/30 animate-pulse' : ''}`}
                      onClick={() => handlePollVote(option.id)}
                      disabled={isDisabled}
                    >
                      {/* Progress bar background */}
                      {hasUserVoted && (
                        <div 
                          className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-xl transition-all duration-700 ease-out"
                          style={{ width: `${percentage}%` }}
                        />
                      )}
                      
                      {/* Loading indicator for current voting option */}
                      {isCurrentlyVoting && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-xl">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-slide-right" />
                        </div>
                      )}
                      
                      <span className="text-foreground font-medium relative z-10 flex items-center gap-2">
                        {option.option_text}
                        {isCurrentlyVoting && (
                          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        )}
                      </span>
                      
                      {hasUserVoted && (
                        <div className="flex items-center gap-2 relative z-10">
                          <span className="text-muted-foreground text-sm font-medium transition-all duration-300">
                            {voteCount} vote{voteCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-primary text-sm font-bold transition-all duration-300">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            {hasUserVoted && (
              <div className="mt-4 pt-3 border-t border-border/30">
                <p className="text-muted-foreground text-sm text-center">
                  {totalPollVotes} total vote{totalPollVotes !== 1 ? 's' : ''}
                </p>
                
                {/* Poll Voters List for Creators */}
                <PollVoters
                  pollId={post.poll.id}
                  isCreator={user?.id === post.author_id}
                  totalVotes={totalPollVotes}
                />
              </div>
            )}
          </div>
        )}
        
        {/* Enhanced Interaction buttons */}
        <footer className="flex items-center justify-between pt-4 border-t border-border/30">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-2xl px-4 py-2 transition-all duration-200 group/reply"
            onClick={handleReply}
          >
            <MessageCircle className="h-5 w-5 group-hover/reply:scale-110 transition-transform duration-200" />
            <span className="text-sm font-semibold">
              {replies > 0 ? replies : 'Reply'}
            </span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 transition-all duration-200 group/like ${
              isLiked 
                ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' 
                : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'
            } ${isLiking ? 'opacity-50 scale-95' : ''}`}
            onClick={handleLike}
            disabled={isLiking}
          >
            <Heart className={`h-5 w-5 group-hover/like:scale-110 transition-all duration-200 ${isLiked ? 'fill-current animate-pulse' : ''}`} />
            <span className="text-sm font-semibold">
              {likes > 0 ? likes : 'Like'}
            </span>
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 transition-all duration-200 group/bookmark ${
              isBookmarked 
                ? 'text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20' 
                : 'text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10'
            }`}
            onClick={handleBookmark}
          >
            <Bookmark className={`h-5 w-5 group-hover/bookmark:scale-110 transition-all duration-200 ${isBookmarked ? 'fill-current' : ''}`} />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-2 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 rounded-2xl px-4 py-2 transition-all duration-200 group/share"
            onClick={handleShare}
          >
            <Share className="h-5 w-5 group-hover/share:scale-110 transition-transform duration-200" />
          </Button>
        </footer>
      </div>
      
      {/* Interactive hover effects */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {/* Subtle animation dots */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-30 transition-opacity duration-300">
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
      {/* Lightbox overlay */}
      {lightboxOpen && post.media && (
        <Lightbox
          items={post.media}
          index={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onPrev={() => {
            if (!post.media) return;
            const total = post.media.length;
            const i = (lightboxIndex - 1 + total) % total;
            setLightboxIndex(i);
          }}
          onNext={() => {
            if (!post.media) return;
            const total = post.media.length;
            const i = (lightboxIndex + 1) % total;
            setLightboxIndex(i);
          }}
        />
      )}
      
      {/* Edit Post Modal */}
      {isEditModalOpen && user && (
        <EditPostModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          postId={post.id}
          initialContent={post.content || ''}
          userId={user.id}
          onPostUpdated={() => {
            // Refresh the post or notify parent to refresh
            window.location.reload();
          }}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Delete Post?</h3>
            <p className="text-muted-foreground text-sm mb-4">
              This action cannot be undone. This post will be permanently deleted.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!user) return;
                  setIsDeleting(true);
                  try {
                    const { error } = await deletePost(post.id, user.id);
                    if (!error) {
                      // Refresh the page or notify parent to remove the post
                      window.location.reload();
                    } else {
                      console.error('Error deleting post:', error);
                    }
                  } catch (error) {
                    console.error('Error deleting post:', error);
                  } finally {
                    setIsDeleting(false);
                    setShowDeleteConfirm(false);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}