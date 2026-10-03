import { parseFrontmatter } from './frontmatter';
import { POSTS as DEFAULT_POSTS } from '../data/posts';

const INDEXED_POSTS_KEY = 'pf_local_md_cache_v2';

// Check browser support for File System Access API
export function isFileSystemApiSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Reads all .md files in directory handle
 */
export async function readMarkdownFilesFromDir(dirHandle) {
  const files = [];
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.md')) {
      const file = await entry.getFile();
      const text = await file.text();
      const { data, content } = parseFrontmatter(text);

      files.push({
        id: entry.name,
        slug: entry.name.replace(/\.md$/, ''),
        filename: entry.name,
        fileHandle: entry,
        title: data.title || entry.name.replace(/\.md$/, ''),
        date: data.date || new Date(file.lastModified).toISOString().split('T')[0],
        category: data.category || 'PF Revamp',
        summary: data.summary || '',
        content: content,
        rawText: text
      });
    }
  }

  // Sort by date descending
  files.sort((a, b) => new Date(b.date) - new Date(a.date));
  return files;
}

/**
 * Save text directly to a file handle
 */
export async function saveToFileHandle(fileHandle, textContent) {
  if (!fileHandle || !fileHandle.createWritable) {
    throw new Error('No valid file handle provided');
  }
  const writable = await fileHandle.createWritable();
  await writable.write(textContent);
  await writable.close();
}

/**
 * Prompt user to select directory and read posts
 */
export async function openLocalFolder() {
  if (!isFileSystemApiSupported()) {
    throw new Error('File System Access API is not supported in this browser.');
  }

  const dirHandle = await window.showDirectoryPicker();
  const mdFiles = await readMarkdownFilesFromDir(dirHandle);
  
  // Cache to localStorage for Archive page fallback
  localStorage.setItem(INDEXED_POSTS_KEY, JSON.stringify(mdFiles.map(f => ({
    id: f.id,
    slug: f.slug,
    title: f.title,
    date: f.date,
    category: f.category,
    summary: f.summary,
    content: f.content,
    rawText: f.rawText
  }))));

  return { dirHandle, mdFiles };
}

/**
 * Get cached posts for initial render on Archive home
 */
export function getCachedLocalPosts() {
  try {
    const cached = localStorage.getItem(INDEXED_POSTS_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error(e);
  }

  // Fallback to DEFAULT_POSTS if no local folder opened yet
  return DEFAULT_POSTS.map(p => ({
    id: `${p.slug}.md`,
    slug: p.slug,
    title: p.title,
    date: p.date,
    category: p.category || 'PF Revamp',
    summary: p.summary,
    content: p.content,
    rawText: `---\ndate: ${p.date}\ntitle: "${p.title}"\ncategory: "${p.category || 'PF Revamp'}"\n---\n\n${p.content}`
  }));
}

/**
 * Save / Update post in cache
 */
export function updateCachedPosts(updatedPost) {
  const posts = getCachedLocalPosts();
  const index = posts.findIndex(p => p.id === updatedPost.id || p.slug === updatedPost.slug);

  let updated;
  if (index >= 0) {
    updated = [...posts];
    updated[index] = { ...updated[index], ...updatedPost };
  } else {
    updated = [updatedPost, ...posts];
  }

  localStorage.setItem(INDEXED_POSTS_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Download file fallback for unsupported browsers
 */
export function downloadMarkdownFile(filename, textContent) {
  const blob = new Blob([textContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.md') ? filename : `${filename}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
