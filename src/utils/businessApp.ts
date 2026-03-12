const DEFAULT_BUSINESS_APP_URL = 'https://business.ments.app';

function getAppOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://www.ments.app';
}

export function getBusinessAppBaseUrl() {
  return process.env.NEXT_PUBLIC_BUSINESS_APP_URL || DEFAULT_BUSINESS_APP_URL;
}

export function buildBusinessAppUrl(path: string, params?: Record<string, string | null | undefined>) {
  const url = new URL(path, getBusinessAppBaseUrl());
  for (const [key, value] of Object.entries(params || {})) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export function getFacilitatorSetupUrl(returnPath = '/startups?tab=facilitators') {
  return buildBusinessAppUrl('/facilitators/setup', {
    return_to: `${getAppOrigin()}${returnPath}`,
  });
}

export function getFacilitatorBusinessDashboardUrl(returnPath = '/startups?tab=facilitators') {
  return buildBusinessAppUrl('/facilitators', {
    return_to: `${getAppOrigin()}${returnPath}`,
  });
}
