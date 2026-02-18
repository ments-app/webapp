"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { FeedEventTracker } from '@/lib/feed/event-tracker';
import { useAuth } from '@/context/AuthContext';
import { useSessionTracking } from '@/hooks/useSessionTracking';

interface FeedTrackingContextValue {
  tracker: FeedEventTracker | null;
  sessionId: string | null;
}

const FeedTrackingContext = createContext<FeedTrackingContextValue>({
  tracker: null,
  sessionId: null,
});

export function useFeedTrackingContext() {
  return useContext(FeedTrackingContext);
}

export function FeedTrackingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { sessionId } = useSessionTracking(user?.id);
  const [tracker, setTracker] = useState<FeedEventTracker | null>(null);
  const trackerRef = useRef<FeedEventTracker | null>(null);

  useEffect(() => {
    if (!user?.id || !sessionId) {
      if (trackerRef.current) {
        trackerRef.current.destroy();
        trackerRef.current = null;
        setTracker(null);
      }
      return;
    }

    // Create new tracker
    const newTracker = new FeedEventTracker(user.id, sessionId);
    trackerRef.current = newTracker;
    setTracker(newTracker);

    return () => {
      newTracker.destroy();
    };
  }, [user?.id, sessionId]);

  return (
    <FeedTrackingContext.Provider value={{ tracker, sessionId }}>
      {children}
    </FeedTrackingContext.Provider>
  );
}
