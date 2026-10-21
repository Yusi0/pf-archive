// Pasted images are shrunk and re-encoded in the browser before upload: the site is a static
// archive, so smaller files mean faster pages and a lighter repository.

const MAX_WIDTH = 1440;
const QUALITY = 0.85;

/**
 * Returns a WebP File (max 1440px wide). Falls back to the original file when encoding is
 * unsupported (e.g. Safari), fails, the result is larger than the original, or the image is
 * an animated/vector format that canvas would flatten.
 */
export async function toWebp(file) {
  if (file.type === 'image/gif' || file.type === 'image/svg+xml' || file.type === 'image/webp') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY));
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file;
    return new File([blob], 'image.webp', { type: 'image/webp' });
  } catch {
    return file;
  }
}
