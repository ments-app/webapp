import { createBrowserClient } from '@supabase/ssr';

function getSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: 'sb-web-auth',
      },
    }
  );
}

let _instance: ReturnType<typeof getSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof getSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_instance) {
      _instance = getSupabaseClient();
    }
    const value = Reflect.get(_instance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(_instance);
    }
    return value;
  },
});
