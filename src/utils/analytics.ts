/**
 * Google Analytics GA4 integration.
 *
 * Usage:
 *   import { trackEvent, trackError, trackPageView } from '@/utils/analytics';
 *
 *   trackEvent('button_click', { button_name: 'signup' });
 *   trackError('API Error', 'Feed load failed', true);
 *   trackPageView('/profile/123');
 *
 * Set NEXT_PUBLIC_GA_MEASUREMENT_ID in .env.local to enable.
 */

// ─── Types ──────────────────────────────────────────────────────────
type GTagEvent = {
    action: string;
    category?: string;
    label?: string;
    value?: number;
    [key: string]: unknown;
};

// ─── Core ───────────────────────────────────────────────────────────

/** Google Analytics Measurement ID from env */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

/** Whether GA is configured */
export const isGAEnabled = (): boolean => {
    return typeof window !== 'undefined' && !!GA_MEASUREMENT_ID;
};

/** Safe wrapper around gtag — no-ops if GA is not loaded */
function gtag(...args: unknown[]) {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (!w.gtag) return;
    w.gtag(...args);
}

// ─── Page Views ─────────────────────────────────────────────────────

/** Track a page view (called automatically by the GoogleAnalytics component) */
export function trackPageView(url: string) {
    gtag('config', GA_MEASUREMENT_ID, {
        page_path: url,
    });
}

// ─── Custom Events ──────────────────────────────────────────────────

/** Track a custom event */
export function trackEvent({ action, category, label, value, ...rest }: GTagEvent) {
    gtag('event', action, {
        event_category: category,
        event_label: label,
        value,
        ...rest,
    });
}

// ─── Error / Exception Tracking ─────────────────────────────────────

/**
 * Report an error/exception to Google Analytics.
 * @param description  Short description of the error
 * @param fatal        Whether the error is fatal (crashes the page)
 */
export function trackError(description: string, fatal = false) {
    gtag('event', 'exception', {
        description,
        fatal,
    });

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.error(`[Analytics Error] ${fatal ? 'FATAL: ' : ''}${description}`);
    }
}

/**
 * Track an API error with context.
 */
export function trackAPIError(endpoint: string, status: number, message?: string) {
    trackError(`API ${status}: ${endpoint}${message ? ` — ${message}` : ''}`, status >= 500);

    trackEvent({
        action: 'api_error',
        category: 'error',
        label: endpoint,
        value: status,
        error_message: message,
    });
}

// ─── User Identification ────────────────────────────────────────────

/** Set user properties for GA (call after login) */
export function setAnalyticsUser(userId: string, properties?: Record<string, string>) {
    gtag('set', 'user_properties', {
        user_id: userId,
        ...properties,
    });
    gtag('config', GA_MEASUREMENT_ID, {
        user_id: userId,
    });
}

/** Clear user identity (call on logout) */
export function clearAnalyticsUser() {
    gtag('set', 'user_properties', {
        user_id: null,
    });
}

// ─── Performance Tracking ───────────────────────────────────────────

/** Track Web Vitals metrics */
export function trackWebVitals(metric: { name: string; value: number; id: string }) {
    trackEvent({
        action: 'web_vitals',
        category: 'performance',
        label: metric.name,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        metric_id: metric.id,
        metric_name: metric.name,
    });
}

// ─── Engagement Events ──────────────────────────────────────────────
// Pre-built helpers for common app actions

export const Analytics = {
    /** User signed up / completed onboarding */
    signUp: (method: string) =>
        trackEvent({ action: 'sign_up', category: 'engagement', label: method }),

    /** User logged in */
    login: (method: string) =>
        trackEvent({ action: 'login', category: 'engagement', label: method }),

    /** Post created */
    postCreated: (postType: string) =>
        trackEvent({ action: 'post_created', category: 'content', label: postType }),

    /** Post liked */
    postLiked: (postId: string) =>
        trackEvent({ action: 'post_liked', category: 'engagement', label: postId }),

    /** Message sent */
    messageSent: () =>
        trackEvent({ action: 'message_sent', category: 'messaging' }),

    /** Feed scrolled to depth */
    feedScrollDepth: (depth: number) =>
        trackEvent({ action: 'feed_scroll_depth', category: 'engagement', value: depth }),

    /** Search performed */
    search: (query: string) =>
        trackEvent({ action: 'search', category: 'engagement', label: query }),

    /** Feature used */
    featureUsed: (featureName: string) =>
        trackEvent({ action: 'feature_used', category: 'engagement', label: featureName }),
};
