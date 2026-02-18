'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AlertTriangle, Copy, Shield } from 'lucide-react';
import { supabase } from '@/utils/supabase';

interface ScreenGuardProps {
  active: boolean;
  onTabSwitch: () => void;
  onCopyPaste?: (type: 'copy' | 'paste') => void;
  onExtensionDetected?: () => void;
  onAccountSwitch?: () => void;
  userId?: string;
}

type WarningType = 'tab_switch' | 'copy_paste' | 'extension' | 'account_switch';

export default function ScreenGuard({
  active,
  onTabSwitch,
  onCopyPaste,
  onExtensionDetected,
  onAccountSwitch,
  userId,
}: ScreenGuardProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [warningType, setWarningType] = useState<WarningType>('tab_switch');
  const originalUserIdRef = useRef<string | undefined>(userId);

  // Store the original user ID on mount
  useEffect(() => {
    if (userId) {
      originalUserIdRef.current = userId;
    }
  }, [userId]);

  // Prevent browser navigation
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);

  // Detect tab switches + account switch detection on return
  const handleVisibilityChange = useCallback(async () => {
    if (!active) return;
    if (document.hidden) {
      onTabSwitch();
      setWarningType('tab_switch');
      setShowWarning(true);
    } else {
      // When returning to tab, verify the same user is still logged in
      if (originalUserIdRef.current) {
        try {
          const { data } = await supabase.auth.getUser();
          if (data.user && data.user.id !== originalUserIdRef.current) {
            onAccountSwitch?.();
            setWarningType('account_switch');
            setShowWarning(true);
          }
        } catch {
          // ignore auth check failures
        }
      }
    }
  }, [active, onTabSwitch, onAccountSwitch]);

  useEffect(() => {
    if (!active) return;
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [active, handleVisibilityChange]);

  // Prevent back navigation
  useEffect(() => {
    if (!active) return;
    window.history.pushState(null, '', window.location.href);
    const handler = () => {
      window.history.pushState(null, '', window.location.href);
      setWarningType('tab_switch');
      setShowWarning(true);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [active]);

  // Copy-paste detection
  useEffect(() => {
    if (!active) return;

    const handleCopy = () => {
      onCopyPaste?.('copy');
      setWarningType('copy_paste');
      setShowWarning(true);
    };

    const handlePaste = () => {
      onCopyPaste?.('paste');
      setWarningType('copy_paste');
      setShowWarning(true);
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [active, onCopyPaste]);

  // Browser extension detection
  useEffect(() => {
    if (!active) return;

    const SUSPICIOUS_SELECTORS = [
      '[data-grammarly-shadow]',
      '#grammarly-integration-panel',
      '[class*="chatgpt"]',
      '[id*="chatgpt"]',
      '[class*="copilot"]',
      '[id*="copilot"]',
    ];

    const checkForExtensions = () => {
      for (const selector of SUSPICIOUS_SELECTORS) {
        if (document.querySelector(selector)) {
          onExtensionDetected?.();
          setWarningType('extension');
          setShowWarning(true);
          return true;
        }
      }
      return false;
    };

    // Initial check
    checkForExtensions();

    // Watch for runtime DOM injections
    const observer = new MutationObserver(() => {
      checkForExtensions();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [active, onExtensionDetected]);

  const warningConfig = {
    tab_switch: {
      icon: <AlertTriangle className="h-7 w-7 text-amber-500" />,
      iconBg: 'bg-amber-500/10 border-amber-500/30',
      title: 'Stay Focused!',
      message: 'You switched away from this tab during your application.',
      detail: 'Tab switches are tracked and visible to the hiring team. Please stay on this page until you complete your application.',
    },
    copy_paste: {
      icon: <Copy className="h-7 w-7 text-orange-500" />,
      iconBg: 'bg-orange-500/10 border-orange-500/30',
      title: 'Copy/Paste Detected',
      message: 'Copy-paste activity was detected during your application.',
      detail: 'This action has been logged. Please answer questions in your own words to ensure a fair assessment.',
    },
    extension: {
      icon: <Shield className="h-7 w-7 text-red-500" />,
      iconBg: 'bg-red-500/10 border-red-500/30',
      title: 'Browser Extension Detected',
      message: 'An AI assistant or writing extension was detected.',
      detail: 'For a fair assessment, please disable browser extensions that could assist with answering questions.',
    },
    account_switch: {
      icon: <AlertTriangle className="h-7 w-7 text-red-500" />,
      iconBg: 'bg-red-500/10 border-red-500/30',
      title: 'Account Change Detected',
      message: 'A different user account was detected.',
      detail: 'It appears that the logged-in account changed during the application. This has been flagged for review.',
    },
  };

  if (!showWarning) return null;

  const config = warningConfig[warningType];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl text-center">
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border ${config.iconBg}`}>
          {config.icon}
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">
          {config.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-1">
          {config.message}
        </p>
        <p className="text-xs text-muted-foreground mb-5">
          {config.detail}
        </p>
        <button
          onClick={() => setShowWarning(false)}
          className="w-full rounded-xl bg-foreground text-background px-6 py-3 text-sm font-semibold hover:opacity-90 transition"
        >
          Continue Application
        </button>
      </div>
    </div>
  );
}
