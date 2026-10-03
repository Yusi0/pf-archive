import { POSTS as INITIAL_POSTS } from '../data/posts';

const STORAGE_KEY = 'pf_revamp_posts_v1';

export function getStoredPosts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_POSTS));
      return INITIAL_POSTS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load posts from localStorage', e);
    return INITIAL_POSTS;
  }
}

export function savePost(postData) {
  const posts = getStoredPosts();
  const index = posts.findIndex(p => p.id === postData.id || p.slug === postData.slug);

  let updated;
  if (index >= 0) {
    // Update existing
    updated = [...posts];
    updated[index] = { ...updated[index], ...postData };
  } else {
    // Insert new
    updated = [postData, ...posts];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deletePost(id) {
  const posts = getStoredPosts();
  const updated = posts.filter(p => p.id !== id && p.slug !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
