import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/** Current Supabase session: undefined while loading, null when signed out. */
export function useSession() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return session;
}
