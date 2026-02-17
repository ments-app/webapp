import { createBrowserClient } from '@supabase/ssr';

let _instance: ReturnType<typeof createBrowserClient>;

export function getSupabaseClient() {
  if (!_instance) {
    _instance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: {
          name: 'sb-web-auth',
        },
      }
    );
  }
  return _instance;
}

// Kept for backwards compatibility — lazy getter
export const supabase = {
  get auth() { return getSupabaseClient().auth; },
  get realtime() { return getSupabaseClient().realtime; },
  get storage() { return getSupabaseClient().storage; },
  get functions() { return getSupabaseClient().functions; },
  from: (...args: Parameters<ReturnType<typeof createBrowserClient>['from']>) => getSupabaseClient().from(...args),
  channel: (...args: Parameters<ReturnType<typeof createBrowserClient>['channel']>) => getSupabaseClient().channel(...args),
  removeChannel: (...args: Parameters<ReturnType<typeof createBrowserClient>['removeChannel']>) => getSupabaseClient().removeChannel(...args),
  removeAllChannels: () => getSupabaseClient().removeAllChannels(),
  rpc: (...args: Parameters<ReturnType<typeof createBrowserClient>['rpc']>) => getSupabaseClient().rpc(...args),
};
