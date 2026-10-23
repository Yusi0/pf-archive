import { createClient } from '@supabase/supabase-js';

// Both values are public by design (the publishable key only identifies the project; what a
// signed-in user may do is enforced server-side by the pf-content edge function).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wegjuflzhgubjcbthtfx.supabase.co';
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_FeilKsFW9gEVa2fyEyt17g_UUrXbvVG';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** `redirectPath` is a router path (no base); the user comes back to it after signing in. */
export function signInWithDiscord(redirectPath = '/editor') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: `${window.location.origin}${base}${redirectPath}` },
  });
}

export function signOut() {
  return supabase.auth.signOut();
}
