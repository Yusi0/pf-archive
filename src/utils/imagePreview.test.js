import { describe, expect, it } from 'vitest';
import { rememberLocalImage, resolveAssetUrl } from './customMarkdownParser';

describe('pasted image preview', () => {
  it('serves the local copy of a just-uploaded image, normal paths otherwise', () => {
    expect(resolveAssetUrl('/uploads/img_1.webp')).toBe('/uploads/img_1.webp');

    rememberLocalImage('/uploads/img_1.webp', new Blob(['x'], { type: 'image/webp' }));
    expect(resolveAssetUrl('/uploads/img_1.webp')).toMatch(/^blob:/);
    expect(resolveAssetUrl('/uploads/img_2.webp')).toBe('/uploads/img_2.webp');
    expect(resolveAssetUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
  });
});
