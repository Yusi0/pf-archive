import { describe, expect, it } from 'vitest';
import { parseFullCustomMarkdown } from './customMarkdownParser';

describe(':::gallery', () => {
  const doc = ['# 제목', '', ':::gallery', '![첫째](/uploads/a.webp)', '![](/uploads/b.webp)', ':::', '', '뒤 문단'].join('\n');
  const { fullHtml } = parseFullCustomMarkdown(doc);

  it('puts the images in one horizontally scrolling row', () => {
    expect(fullHtml.match(/class="markdown-gallery"/g)).toHaveLength(1);
    expect(fullHtml.match(/<img /g)).toHaveLength(2);
    expect(fullHtml).toContain('/uploads/a.webp');
    expect(fullHtml).toContain('/uploads/b.webp');
  });

  it('shows a caption only when there is one', () => {
    expect(fullHtml.match(/<figcaption>/g)).toHaveLength(1);
    expect(fullHtml).toContain('<figcaption>첫째</figcaption>');
  });

  it('leaves the rest of the post alone (no fold, no stray placeholder)', () => {
    expect(fullHtml).not.toContain('@@GALLERY');
    expect(fullHtml).not.toContain('fold');
    expect(fullHtml).toContain('뒤 문단');
  });

  it('escapes captions and drops an empty block', () => {
    const { fullHtml: html } = parseFullCustomMarkdown(':::gallery\n![a"<b>](/x.png)\n:::');
    expect(html).toContain('a&quot;&lt;b&gt;');
    expect(parseFullCustomMarkdown(':::gallery\nno images here\n:::').fullHtml).not.toContain('markdown-gallery');
  });
});
