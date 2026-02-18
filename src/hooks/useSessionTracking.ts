"use client";

import { useEffect, useRef, useCallback } from 'react';
import { SESSION_HEARTBEAT_INTERVAL_MS } from '@/lib/feed/constants';

function generateSessionId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return 'mobile';
  if (/Tablet|iPad/i.test(ua)) return 'tablet';
  return 'desktop';
}

export function useSessionTracking(userId: string | undefined) {
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSession = useCallback(async () => {
    if (!userId) return null;

    const sessionId = generateSessionId();
    sessionIdRef.current = sessionId;

    try {
      await fetch('/api/feed/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: {
            id: sessionId,
            user_id: userId,
            device_type: getDeviceType(),
            action: 'start',
          },
        }),
      });
    } catch {
      // Non-blocking
    }

    return sessionId;
  }, [userId]);

  const heartbeat = useCallback(async () => {
    if (!sessionIdRef.current || !userId) return;

    try {
      await fetch('/api/feed/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: {
            id: sessionIdRef.current,
            user_id: userId,
            action: 'heartbeat',
          },
        }),
      });
    } catch {
      // Non-blocking
    }
  }, [userId]);

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current || !userId) return;

    try {
      const blob = new Blob(
        [
          JSON.stringify({
            session: {
              id: sessionIdRef.current,
              user_id: userId,
              action: 'end',
            },
          }),
        ],
        { type: 'application/json' }
      );
      navigator.sendBeacon('/api/feed/events', blob);
    } catch {
      // Non-blocking
    }

    sessionIdRef.current = null;
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    startSession();

    // Heartbeat interval
    heartbeatRef.current = setInterval(heartbeat, SESSION_HEARTBEAT_INTERVAL_MS);

    // End session on page hide
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        endSession();
      } else if (document.visibilityState === 'visible' && !sessionIdRef.current) {
        startSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      endSession();
    };
  }, [userId, startSession, heartbeat, endSession]);

  return { sessionId: sessionIdRef.current };
}
