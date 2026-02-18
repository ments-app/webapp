import type { FeedEvent, FeedEventType } from './types';
import {
  EVENT_BATCH_FLUSH_INTERVAL_MS,
  EVENT_BATCH_MAX_SIZE,
} from './constants';

export class FeedEventTracker {
  private buffer: FeedEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string;
  private userId: string;
  private experimentId: string | null = null;
  private variant: string | null = null;

  constructor(userId: string, sessionId: string) {
    this.userId = userId;
    this.sessionId = sessionId;
    this.startFlushTimer();
    this.setupVisibilityHandler();
  }

  setExperiment(experimentId: string | null, variant: string | null) {
    this.experimentId = experimentId;
    this.variant = variant;
  }

  track(
    postId: string,
    authorId: string,
    eventType: FeedEventType,
    metadata?: Record<string, unknown>,
    positionInFeed?: number
  ) {
    const event: FeedEvent = {
      user_id: this.userId,
      session_id: this.sessionId,
      post_id: postId,
      author_id: authorId,
      event_type: eventType,
      metadata,
      position_in_feed: positionInFeed,
      experiment_id: this.experimentId,
      variant: this.variant,
      created_at: new Date().toISOString(),
    };

    this.buffer.push(event);

    if (this.buffer.length >= EVENT_BATCH_MAX_SIZE) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      // Use sendBeacon for reliability on page unload
      const blob = new Blob([JSON.stringify({ events })], {
        type: 'application/json',
      });
      const sent = navigator.sendBeacon('/api/feed/events', blob);

      if (!sent) {
        // Fallback to fetch
        await fetch('/api/feed/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events }),
          keepalive: true,
        });
      }
    } catch {
      // Re-add events to buffer on failure (up to a limit)
      if (this.buffer.length < EVENT_BATCH_MAX_SIZE * 3) {
        this.buffer.unshift(...events);
      }
    }
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, EVENT_BATCH_FLUSH_INTERVAL_MS);
  }

  private setupVisibilityHandler() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }

  destroy() {
    this.flush();
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
