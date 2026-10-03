import { parseFrontmatter } from './frontmatter';
import { POSTS as FALLBACK_POSTS } from '../data/posts';

/**
 * Fetch all posts from content/ via Vite Dev Server API
 */
export async function fetchContentPosts() {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL)
    ? import.meta.env.BASE_URL.replace(/\/$/, '')
    : '';

  try {
    let res = await fetch(`${base}/api/posts`);
    if (!res.ok) {
      res = await fetch(`${base}/api/posts.json`);
    }
    if (!res.ok) throw new Error('API server unavailable');
    
    const files = await res.json();
    const posts = files.map(item => {
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
    });

    // Sort descending by date
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    return posts;
  } catch (err) {
    console.warn('Dev server API not active or error, falling back to static samples:', err.message);
    return FALLBACK_POSTS.map(p => ({
      id: `${p.slug}.md`,
      slug: p.slug,
      filename: `${p.slug}.md`,
      title: p.title,
      date: p.date,
      summary: p.summary,
      category: 'PF Revamp',
      content: p.content,
      rawText: `---\ntitle: "${p.title}"\ndate: "${p.date}"\nsummary: "${p.summary}"\n---\n\n${p.content}`
    }));
  }
}

/**
 * Save / Update post in content/ via API
 */
export async function saveContentPost(filename, rawText) {
  const safeFilename = filename.endsWith('.md') ? filename : `${filename}.md`;

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

