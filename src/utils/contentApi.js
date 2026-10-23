import { parseFrontmatter } from './frontmatter';

// Writes go to the Vite dev server while developing; otherwise (the deployed site, or a dev
// server run with VITE_CONTENT_BACKEND=remote) to the pf-content Supabase edge function,
// which commits to GitHub for the signed-in owner.
export const isRemoteBackend =
  !import.meta.env.DEV || import.meta.env.VITE_CONTENT_BACKEND === 'remote';

/**
 * Whether to show the "Edit" link: always in dev, on the deployed site only in a browser that
 * has signed in before (Supabase keeps its session under sb-*-auth-token). A UI hint only —
 * the edge function decides who may actually write.
 */
export function canShowEditLink() {
  if (!isRemoteBackend) return true;
  try {
    return Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k));
  } catch {
    return false;
  }
}

async function callRemote(action, payload = {}) {
  const { supabase } = await import('../lib/supabase');
  const { data, error } = await supabase.functions.invoke('pf-content', {
    body: { action, ...payload },
  });
  if (error) {
    let detail = error.message;
    try {
      const body = await error.context?.json?.();
      if (body?.error) detail = body.error;
    } catch {
      // Not a JSON error body: keep the generic message.
    }
    throw new Error(detail);
  }
  return data;
}

function toPost(item) {
  const { data, content } = parseFrontmatter(item.rawText);
  return {
    id: item.filename,
    slug: item.filename.replace(/\.md$/, ''),
    filename: item.filename,
    title: data.title || item.filename.replace(/\.md$/, ''),
    date: data.date || (item.lastModified ? new Date(item.lastModified).toISOString().split('T')[0] : '2026-10-03'),
    summary: data.summary || '',
    category: data.category || 'PF Revamp',
    content,
    rawText: item.rawText
  };
}

/**
 * Fetch all posts from content/ via Vite Dev Server API.
 * `fresh` (editor only): on the deployed site read straight from GitHub through the edge
 * function, because the static posts.json lags a deploy behind the last save.
 */
export async function fetchContentPosts({ fresh = false } = {}) {
  if (fresh && isRemoteBackend) {
    const posts = (await callRemote('list')).files.map(toPost);
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    return posts;
  }

  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL)
    ? import.meta.env.BASE_URL.replace(/\/$/, '')
    : '';

  // Only the dev server serves /api/posts; a built site has the static posts.json (and a static
  // preview server answers unknown paths with index.html, so probing /api/posts would break).
  let res = import.meta.env.DEV ? await fetch(`${base}/api/posts`) : null;
  if (!res || !res.ok) {
    res = await fetch(`${base}/api/posts.json`);
  }
  if (!res.ok) throw new Error('글 목록을 불러오지 못했습니다.');

  const files = await res.json();
  const posts = files.map(toPost);

  // Sort descending by date
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  return posts;
}

/**
 * Save / Update post in content/ via API
 */
export async function saveContentPost(filename, rawText) {
  const safeFilename = filename.endsWith('.md') ? filename : `${filename}.md`;

  if (isRemoteBackend) return callRemote('save', { filename: safeFilename, rawText });

  const res = await fetch('/api/save-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: safeFilename, rawText })
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || 'Failed to save post');
  }

  return await res.json();
}

/**
 * Delete post in content/ via API
 */
export async function deleteContentPost(filename) {
  if (isRemoteBackend) {
    await callRemote('delete', { filename });
    return;
  }

  const res = await fetch('/api/delete-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || 'Failed to delete post');
  }

}

/**
 * Upload image to public/uploads/ via API
 */
export async function uploadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result;
        const type = file.type || 'image/png';
        const ext = type.split('/')[1] || 'png';
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const randomId = Math.random().toString(36).substring(2, 7);
        const filename = `img_${timestamp}_${randomId}.${ext}`;

        if (isRemoteBackend) {
          resolve(await callRemote('upload-image', { filename, base64 }));
          return;
        }

        const res = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, base64 })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || '이미지 업로드에 실패했습니다.');
        }

        const data = await res.json();
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
}


/**
 * Upload a video clip; the dev server transcodes it with ffmpeg (720p max, H.264) and stores it in public/uploads/.
 * Resolves { url, filename, size, warning? }.
 */
export async function uploadVideo(file) {
  if (isRemoteBackend) {
    throw new Error('영상 업로드는 PC에서 개발 서버(npm run dev)로만 가능합니다.');
  }
  const res = await fetch('/api/upload-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'x-filename': encodeURIComponent(file.name || 'clip') },
    body: file
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '영상 업로드에 실패했습니다.');
  return data;
}
