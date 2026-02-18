"use client";

import { useCallback, useEffect, useRef } from 'react';
import { IMPRESSION_VISIBILITY_THRESHOLD, IMPRESSION_MIN_DWELL_MS } from '@/lib/feed/constants';
import type { FeedEventType } from '@/lib/feed/types';
import { useFeedTrackingContext } from '@/context/FeedTrackingContext';

interface TrackingOptions {
  postId: string;
  authorId: string;
  positionInFeed: number;
}

export function useFeedTracking({ postId, authorId, positionInFeed }: TrackingOptions) {
  const { tracker } = useFeedTrackingContext();
  const elementRef = useRef<HTMLDivElement>(null);
  const impressionSent = useRef(false);
  const enterTime = useRef<number | null>(null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trackEvent = useCallback(
    (eventType: FeedEventType, metadata?: Record<string, unknown>) => {
      tracker?.track(postId, authorId, eventType, metadata, positionInFeed);
    },
    [tracker, postId, authorId, positionInFeed]
  );

  // Intersection Observer for impression + dwell tracking
  useEffect(() => {
    const el = elementRef.current;
    if (!el || !tracker) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && entry.intersectionRatio >= IMPRESSION_VISIBILITY_THRESHOLD) {
          // Post became visible
          enterTime.current = Date.now();

          // Set timer for impression (500ms minimum visibility)
          if (!impressionSent.current) {
            dwellTimer.current = setTimeout(() => {
              if (!impressionSent.current) {
                impressionSent.current = true;
                trackEvent('impression', {
                  viewport_pct: Math.round(entry.intersectionRatio * 100),
                  position_in_feed: positionInFeed,
                });
              }
            }, IMPRESSION_MIN_DWELL_MS);
          }
        } else if (!entry.isIntersecting && enterTime.current) {
          // Post left viewport
          const dwellMs = Date.now() - enterTime.current;
          enterTime.current = null;

          if (dwellTimer.current) {
            clearTimeout(dwellTimer.current);
            dwellTimer.current = null;
          }

          if (impressionSent.current) {
            // Send dwell event
            trackEvent('dwell', { dwell_ms: dwellMs });
          } else if (dwellMs < IMPRESSION_MIN_DWELL_MS) {
            // Scrolled past without viewing
            trackEvent('scroll_past');
          }
        }
      },
      {
        threshold: [0, IMPRESSION_VISIBILITY_THRESHOLD, 1.0],
        rootMargin: '0px',
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (dwellTimer.current) {
        clearTimeout(dwellTimer.current);
      }
      // Send final dwell if still visible on unmount
      if (enterTime.current && impressionSent.current) {
        const dwellMs = Date.now() - enterTime.current;
        trackEvent('dwell', { dwell_ms: dwellMs });
      }
    };
  }, [tracker, trackEvent, positionInFeed]);

  return {
    ref: elementRef,
    trackEvent,
    trackClick: useCallback(() => trackEvent('click'), [trackEvent]),
    trackLike: useCallback(() => trackEvent('like'), [trackEvent]),
    trackUnlike: useCallback(() => trackEvent('unlike'), [trackEvent]),
    trackReply: useCallback(() => trackEvent('reply'), [trackEvent]),
    trackShare: useCallback(() => trackEvent('share'), [trackEvent]),
    trackBookmark: useCallback(() => trackEvent('bookmark'), [trackEvent]),
    trackPollVote: useCallback(
      (optionIndex: number) => trackEvent('poll_vote', { option_index: optionIndex }),
      [trackEvent]
    ),
    trackProfileClick: useCallback(() => trackEvent('profile_click'), [trackEvent]),
    trackExpandContent: useCallback(() => trackEvent('expand_content'), [trackEvent]),
  };
}
