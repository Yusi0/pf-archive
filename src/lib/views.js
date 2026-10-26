import { useEffect, useState } from 'react';

// Per-post view counter kept in Supabase (see supabase/post_views.sql). Every call fails quietly:
// until the table exists, or when offline, the counter is simply not shown.

const SEEN_KEY = 'pf_views_seen';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function markSeen(slug) {
  try {
    const seen = readSeen();
    // Keep the record small: only today's posts matter
    const fresh = Object.fromEntries(Object.entries(seen).filter(([, day]) => day === today()));
    fresh[slug] = today();
    localStorage.setItem(SEEN_KEY, JSON.stringify(fresh));
  } catch {
    // storage unavailable: the visit just counts again next time
  }
}

/** The signed-in owner's own visits (editing, previewing) are not counted. */
function isOwnerBrowser() {
  try {
    return Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k));
  } catch {
    return false;
  }
}

async function loadCount(supabase, slug) {
  const { data, error } = await supabase.from('post_views').select('views').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data ? Number(data.views) : 0;
}

/** Counts this visit (once per browser, post and day) and returns the total, or null when unavailable. */
async function countAndLoad(slug) {
  const { supabase } = await import('./supabase');
  const countable = !import.meta.env.DEV && !isOwnerBrowser() && readSeen()[slug] !== today();
  if (!countable) return loadCount(supabase, slug);

  const { data, error } = await supabase.rpc('increment_post_view', { p_slug: slug });
  if (error) throw error;
  markSeen(slug);
  return Number(data);
}

export function usePostViews(slug) {
  const [views, setViews] = useState(null);

  useEffect(() => {
    setViews(null);
    if (!slug) return undefined;
    let cancelled = false;
    countAndLoad(slug)
      .then((n) => {
        if (!cancelled && Number.isFinite(n)) setViews(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return views;
}

let allViewsPromise = null;

/** { slug: views } for every post, one request per page load; {} while loading or when unavailable. */
export function useAllPostViews() {
  const [map, setMap] = useState({});

  useEffect(() => {
    let cancelled = false;
    if (!allViewsPromise) {
      allViewsPromise = import('./supabase')
        .then(({ supabase }) => supabase.from('post_views').select('slug, views'))
        .then(({ data, error }) => {
          if (error) throw error;
          return Object.fromEntries((data ?? []).map((r) => [r.slug, Number(r.views)]));
        })
        .catch(() => {
          allViewsPromise = null; // try again next time the list opens
          return {};
        });
    }
    allViewsPromise.then((m) => {
      if (!cancelled) setMap(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return map;
}
