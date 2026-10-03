/**
 * Preprocesses custom Markdown syntax for PF Revamp Archive
 * 1. :::original ... ::: -> <details><summary>▶ Original Message</summary> ... </details>
 * 2. :::youtube ... ::: -> <iframe embed> ... </iframe>
 */
export function preprocessMarkdown(text) {
  if (!text) return '';

  let processed = text;

  // Process :::original ... :::
  const originalRegex = /:::original\s*\n([\s\S]*?)\n:::/g;
  processed = processed.replace(originalRegex, (match, content) => {
    return `<details className="original-block"><summary>▶ Original Message</summary>\n\n${content.trim()}\n\n</details>`;
  });

  // Process :::youtube ... :::
  const youtubeRegex = /:::youtube\s*\n([\s\S]*?)\n:::/g;
  processed = processed.replace(youtubeRegex, (match, url) => {
    const trimmedUrl = url.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const youtubeMatch = trimmedUrl.match(regExp);
    const embedId = youtubeMatch && youtubeMatch[2].length === 11 ? youtubeMatch[2] : null;

    if (embedId) {
      return `<div className="embed-video-container"><iframe src="https://www.youtube.com/embed/${embedId}" title="YouTube Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
    return trimmedUrl;
  });

  return processed;
}
