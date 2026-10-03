import { COLOR_PALETTE, DEFAULT_HIGHLIGHT_BG } from './customColorPalette.js';

export function resolveAssetUrl(url) {
  if (!url) return '';
  let clean = url.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('//') || clean.startsWith('data:')) {
    return clean;
  }
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
  const cleanBase = base.endsWith('/') ? base : base + '/';
  const cleanPath = clean.startsWith('/') ? clean.slice(1) : clean;
  return cleanBase + cleanPath;
}

/**
 * 1. Parse Inline Syntax recursively
 */
export function parseInline(text) {
  if (!text || typeof text !== 'string') return '';

  let html = text;

  // Escape HTML tags except allowed ones
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  let prev;
  do {
    prev = html;

    // Standard markdown image: ![alt](url)
    html = html.replace(/!\[([\s\S]*?)\]\(([\s\S]*?)\)/g, (match, alt, url) => {
      const cleanUrl = resolveAssetUrl(url);
      return `<figure class="markdown-figure"><img src="${cleanUrl}" alt="${alt || 'Image'}" loading="lazy" style="max-width: 100%; height: auto; display: block; border: 1px solid var(--border-subtle); margin: 1.25rem 0;" /></figure>`;
    });

    // 1. Text Colors: [r#text], [o#text], etc.
    html = html.replace(/\[([roybgipROYBGIP])#([\s\S]*?)\]/g, (match, colorKey, content) => {
      const key = colorKey.toLowerCase();
      const color = COLOR_PALETTE[key]?.hex || '#ffffff';
      return `<span style="color: ${color};">${content}</span>`;
    });

    // Standard markdown link: [text](url) - parsed after [r#text]
    html = html.replace(/\[([\s\S]*?)\]\(([\s\S]*?)\)/g, (match, linkText, url) => {
      let cleanUrl = url.trim();
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
    });

    // 2. Background Colors: [bg:r#text] or bg:r#text
    html = html.replace(/\[bg:([roybgipROYBGIP])#([\s\S]*?)\]/g, (match, colorKey, content) => {
      const key = colorKey.toLowerCase();
      const bg = COLOR_PALETTE[key]?.bg || DEFAULT_HIGHLIGHT_BG;
      return `<span style="background-color: ${bg}; padding: 0.1em 0.3em; border-radius: 2px;">${content}</span>`;
    });
    html = html.replace(/\bbg:([roybgipROYBGIP])#([^\s<]+)/g, (match, colorKey, content) => {
      const key = colorKey.toLowerCase();
      const bg = COLOR_PALETTE[key]?.bg || DEFAULT_HIGHLIGHT_BG;
      return `<span style="background-color: ${bg}; padding: 0.1em 0.3em; border-radius: 2px;">${content}</span>`;
    });

    // 3. Color Highlights: ==r#text==, etc.
    html = html.replace(/==([roybgipROYBGIP])#([\s\S]*?)==/g, (match, colorKey, content) => {
      const key = colorKey.toLowerCase();
      const bg = COLOR_PALETTE[key]?.bg || DEFAULT_HIGHLIGHT_BG;
      return `<mark style="background-color: ${bg}; padding: 0.1em 0.3em; color: inherit; border-radius: 2px;">${content}</mark>`;
    });

    // 4. Default Highlight: ==text==
    html = html.replace(/==([\s\S]*?)==/g, (match, content) => {
      return `<mark style="background-color: ${DEFAULT_HIGHLIGHT_BG}; padding: 0.1em 0.3em; color: inherit; border-radius: 2px;">${content}</mark>`;
    });

    // 5. Strikethrough: ~~text~~
    html = html.replace(/~~([\s\S]*?)~~/g, '<del>$1</del>');

    // 6. Inline code: `text`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 7. Underline: __text__
    html = html.replace(/__([\s\S]*?)__/g, '<u>$1</u>');

    // 8. Bold: **text**
    html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');

    // 9. Italic: *text*
    html = html.replace(/\*([\s\S]*?)\*/g, '<em>$1</em>');

  } while (html !== prev);

  return html;
}

/**
 * Superscript Number Helper
 */
export function toSuperscript(num) {
  const sups = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return String(num).split('').map(ch => sups[ch] || ch).join('');
}

/**
 * 2. Unified Media Syntax Parser [[URL]]
 */
export function parseMedia(url) {
  if (!url) return '';
  let cleanUrl = resolveAssetUrl(url);

  let pathname = cleanUrl;
  try {
    const parsed = new URL(cleanUrl, 'https://dummy.base');
    pathname = parsed.pathname;
  } catch (e) {
    pathname = cleanUrl.split('?')[0];
  }

  const lowerPath = pathname.toLowerCase();

  // YouTube check
  const ytMatch = cleanUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  if (ytMatch && ytMatch[2].length === 11) {
    const embedId = ytMatch[2];
    return `<div class="embed-video-container"><iframe src="https://www.youtube.com/embed/${embedId}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  }

  // Video extensions
  const videoExts = ['.mp4', '.webm', '.mov', '.m4v', '.ogg'];
  if (videoExts.some(ext => lowerPath.endsWith(ext)) || lowerPath.includes('/video/') || lowerPath.includes('/videos/')) {
    return `<div class="media-video-wrapper"><video src="${cleanUrl}" controls style="max-width: 100%; height: auto; display: block; margin: 1.5rem 0; border: 1px solid var(--border-subtle);"></video></div>`;
  }

  // Image extensions
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
  if (imageExts.some(ext => lowerPath.endsWith(ext)) || lowerPath.includes('/attachments/')) {
    return `<figure class="markdown-figure"><img src="${cleanUrl}" alt="Media" loading="lazy" style="max-width: 100%; height: auto; display: block; border: 1px solid var(--border-subtle);" /></figure>`;
  }

  return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>`;
}

/**
 * 3. Custom Table Parser (Supports bg:r#text table cell backgrounds)
 */
function parseCustomTables(blockText) {
  if (!blockText) return '';
  const lines = blockText.split('\n');
  const resultLines = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableRows = [];

      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const curLine = lines[i].trim();
        const cells = curLine.slice(1, -1).split('|');

        // Check if this line is a separator row (e.g., |---| or |:---|---| or |-|-|)
        const isSeparator = cells.length > 0 && cells.every(c => /^[\s:-]*[-]{1,}[\s:-]*$/.test(c.trim()));

        if (!isSeparator) {
          tableRows.push(cells);
        }
        i++;
      }

      if (tableRows.length > 0) {
        let tableHtml = '<div class="markdown-table-wrapper"><table class="custom-table"><tbody>';
        for (const rowCells of tableRows) {
          tableHtml += '<tr>';
          for (const rawCell of rowCells) {
            const hasLeading = /^\s+/.test(rawCell);
            const hasTrailing = /\s+$/.test(rawCell);

            let align = 'left';
            if (!hasLeading && hasTrailing) align = 'left';
            else if (hasLeading && !hasTrailing) align = 'right';
            else if (hasLeading && hasTrailing) align = 'center';

            let cellContent = rawCell.trim();
            let cellBgStyle = '';

            // Check table cell background syntax: bg:r#text, [bg:r#text], bg:r#, [bg:r#]
            const bgCellMatch = cellContent.match(/^\[?\s*bg:\s*([roybgipROYBGIP])#\s*([\s\S]*?)$/);
            if (bgCellMatch) {
              const colorKey = bgCellMatch[1].toLowerCase();
              let innerContent = bgCellMatch[2] || '';
              if (cellContent.startsWith('[') && innerContent.endsWith(']')) {
                innerContent = innerContent.slice(0, -1);
              }
              const bgColor = COLOR_PALETTE[colorKey]?.bg || DEFAULT_HIGHLIGHT_BG;
              cellBgStyle = `background-color: ${bgColor};`;
              cellContent = innerContent.trim();
            }

            const parsedCellText = parseInline(cellContent);
            tableHtml += `<td style="text-align: ${align}; ${cellBgStyle}">${parsedCellText}</td>`;
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table></div>';
        resultLines.push(tableHtml);
        continue;
      }
    } else {
      resultLines.push(line);
      i++;
    }
  }

  return resultLines.join('\n');
}

/**
 * Parse :::graph block text into structured JSON object
 */
export function parseGraphBlock(blockText) {
  if (!blockText || typeof blockText !== 'string') {
    return { valid: false, error: '그래프 데이터가 비어 있습니다.', rawText: blockText };
  }

  const lines = blockText.split('\n');
  const seriesList = [];
  let currentSeries = null;
  let parseError = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Series header: @M16A3
    if (rawLine.startsWith('@')) {
      const name = rawLine.slice(1).trim();
      if (!name) {
        parseError = `줄 ${i + 1}: 시리즈 이름(@)이 입력되지 않았습니다.`;
        break;
      }
      currentSeries = {
        name,
        points: [],
        multipliers: { head: 1.0, torso: 1.0, limb: 1.0 }
      };
      seriesList.push(currentSeries);
      continue;
    }

    // Damage point line: 40 @ 50
    if (rawLine.includes('@')) {
      if (!currentSeries) {
        parseError = `줄 ${i + 1}: 시리즈 이름(@시리즈명)이 선언되기 전에 데이터가 입력되었습니다.`;
        break;
      }
      const parts = rawLine.split('@');
      const dmg = parseFloat(parts[0].trim());
      const range = parseFloat(parts[1].trim());

      if (isNaN(dmg) || isNaN(range)) {
        parseError = `줄 ${i + 1}: 잘못된 데미지/사거리 수치입니다 ("${rawLine}")`;
        break;
      }
      currentSeries.points.push({ damage: dmg, range });
      continue;
    }

    // Multipliers line: 1.4, 1.1, 1.0
    if (rawLine.includes(',')) {
      if (!currentSeries) {
        parseError = `줄 ${i + 1}: 시리즈 선언 없이 배수가 입력되었습니다.`;
        break;
      }
      const parts = rawLine.split(',');
      if (parts.length < 3) {
        parseError = `줄 ${i + 1}: 배수는 head, torso, limb 3개 숫자를 쉼표로 구분해야 합니다 ("${rawLine}")`;
        break;
      }
      const head = parseFloat(parts[0].trim());
      const torso = parseFloat(parts[1].trim());
      const limb = parseFloat(parts[2].trim());

      if (isNaN(head) || isNaN(torso) || isNaN(limb)) {
        parseError = `줄 ${i + 1}: 유효하지 않은 배수 수치입니다 ("${rawLine}")`;
        break;
      }
      currentSeries.multipliers = { head, torso, limb };
      continue;
    }
  }

  if (parseError) {
    return { valid: false, error: parseError, rawText: blockText };
  }

  if (seriesList.length === 0) {
    return { valid: false, error: '그래프에 유효한 시리즈(@시리즈명)가 없습니다.', rawText: blockText };
  }

  // Validate points count for each series
  for (const s of seriesList) {
    if (!s.points || s.points.length === 0) {
      return { valid: false, error: `"${s.name}" 시리즈에 데미지 포인트(데미지 @ 사거리)가 입력되지 않았습니다.`, rawText: blockText };
    }
    // Sort points by range ascending
    s.points.sort((a, b) => a.range - b.range);
  }

  return { valid: true, series: seriesList };
}

/**
 * Parse ::: Title ... ::: fold blocks recursively
 */
function parseFolds(markdownText, parseBlockFn) {
  if (!markdownText || typeof markdownText !== 'string') return '';

  const lines = markdownText.split('\n');
  const resultLines = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimLine = line.trim();

    // Match fold block header: ::: Title (excluding :::graph)
    const foldMatch = trimLine.match(/^:::\s*(?!graph\b)(.+)$/i);

    if (foldMatch) {
      const title = foldMatch[1].trim();
      let nestingLevel = 1;
      const contentLines = [];
      let j = i + 1;

      while (j < lines.length) {
        const curLine = lines[j];
        const curTrim = curLine.trim();

        if (/^:::\s*(?!graph\b)(.+)$/i.test(curTrim) || /^:::\s*graph\b/i.test(curTrim)) {
          nestingLevel++;
          contentLines.push(curLine);
        } else if (/^:::\s*$/i.test(curTrim)) {
          nestingLevel--;
          if (nestingLevel === 0) {
            break;
          } else {
            contentLines.push(curLine);
          }
        } else {
          contentLines.push(curLine);
        }
        j++;
      }

      if (nestingLevel === 0) {
        const foldContent = contentLines.join('\n');
        // Parse fold content recursively using full block parser!
        const innerHtml = parseBlockFn(foldContent.trim());
        const foldHtml = `<details class="custom-fold"><summary>${title}</summary><div class="fold-content">${innerHtml}</div></details>`;
        resultLines.push(foldHtml);
        i = j + 1;
        continue;
      }
    }

    resultLines.push(line);
    i++;
  }

  return resultLines.join('\n');
}

/**
 * Generate clean, unique, URL-safe heading ID
 */
export function generateHeadingSlug(text, slugCounts = null) {
  const stripped = String(text || '')
    .replace(/\[[rgbyp]#([^\]]+)\]/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/[\[\]]/g, '')
    .trim();

  let slug = stripped
    .toLowerCase()
    .replace(/[^\w\s가-힣-]/g, '')
    .replace(/\s+/g, '-')
    .trim();

  if (!slug) slug = 'section';

  if (!slugCounts) return slug;

  if (!slugCounts.has(slug)) {
    slugCounts.set(slug, 1);
    return slug;
  }
  const count = slugCounts.get(slug);
  slugCounts.set(slug, count + 1);
  return `${slug}-${count}`;
}

/**
 * Reusable Block Parser
 */
export function parseBlocks(markdownText) {
  if (!markdownText || typeof markdownText !== 'string') return '';

  // 0. Normalize Windows CRLF (\r\n) and legacy CR (\r) to standard LF (\n)
  const normalized = markdownText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 1. Process Folds recursively
  let processed = parseFolds(normalized, (foldContent) => parseBlocks(foldContent));

  // 2. Process Unified Media [[URL]]
  processed = processed.replace(/\[\[\s*([\s\S]*?)\s*\]\]/g, (match, mediaUrl) => {
    return `\n\n${parseMedia(mediaUrl)}\n\n`;
  });

  // 3. Process Custom Tables
  processed = parseCustomTables(processed);

  // 4. Process Headings, Lists, Blockquotes, Codeblocks & Paragraphs line-by-line
  const lines = processed.split('\n');
  const output = [];
  let pendingPara = [];
  const headingSlugCounts = new Map();

  const flushPara = () => {
    if (pendingPara.length > 0) {
      output.push(`<p>${pendingPara.join('<br>')}</p>`);
      pendingPara = [];
    }
  };

  // Helper: check if a line is a list item (ordered, unordered, or tag bullet)
  const checkListItem = (line) => {
    if (!line || !line.trim()) return null;
    // Exclude markdown links starting with [text](url)
    if (/^\s*\[[^\]]+\]\(/.test(line)) return null;

    const m = line.match(/^(\s*)([-*+]|\d+\.|\[[+\-=\w~!?]{1,4}\])\s*(.*)$/);
    if (!m) return null;

    const leadingWs = m[1];
    const marker = m[2];
    const itemContent = m[3];

    // Indent level calculation: Tabs first-class
    const tabCount = (leadingWs.match(/\t/g) || []).length;
    const spaceCount = (leadingWs.match(/ /g) || []).length;
    let indentLevel = tabCount;
    if (spaceCount >= 4) {
      indentLevel += Math.floor(spaceCount / 4);
    } else if (spaceCount >= 2) {
      indentLevel += Math.floor(spaceCount / 2);
    }

    const isOrdered = /^\d+\./.test(marker);
    const isTag = marker.startsWith('[') && marker.endsWith(']');

    return {
      level: indentLevel,
      type: isOrdered ? 'ol' : 'ul',
      num: isOrdered ? marker.replace('.', '') : null,
      marker,
      isTag,
      content: itemContent
    };
  };

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Empty line separates blocks or preserves intentional blank line
    if (!trimmed) {
      if (pendingPara.length > 0) {
        flushPara();
      } else if (output.length > 0) {
        output.push('<div class="markdown-blank-line" style="height: 1.25rem;"></div>');
      }
      i++;
      continue;
    }

    // Graph block placeholder
    if (/^@@GRAPH:\d+@@$/.test(trimmed)) {
      flushPara();
      output.push(trimmed);
      i++;
      continue;
    }

    // Standalone HTML block (div, details, figure, table, etc.)
    if (/^<(div|details|figure|table|h[1-6]|ul|ol|blockquote|p|pre|hr)/i.test(trimmed)) {
      flushPara();
      output.push(trimmed);
      i++;
      continue;
    }

    // Fenced Code Block: ```
    if (trimmed.startsWith('```')) {
      flushPara();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      const escapedCode = codeLines.join('\n')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      output.push(`<pre><code>${escapedCode}</code></pre>`);
      continue;
    }

    // Horizontal Rule: ---, ***, ___
    if (/^([-*_]){3,}$/.test(trimmed)) {
      flushPara();
      output.push('<hr>');
      i++;
      continue;
    }

    // Headings: #, ##, ###, ####, #####, ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushPara();
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const parsedContent = parseInline(content);
      const headingId = generateHeadingSlug(content, headingSlugCounts);

      output.push(`<h${level} id="${headingId}">${parsedContent}</h${level}>`);
      i++;
      continue;
    }

    // Blockquotes: > ...
    if (/^>\s?(.*)$/.test(trimmed)) {
      flushPara();
      const quoteLines = [];
      while (i < lines.length) {
        const curTrim = lines[i].trim();
        const quoteMatch = curTrim.match(/^>\s?(.*)$/);
        if (quoteMatch) {
          quoteLines.push(parseInline(quoteMatch[1]));
          i++;
        } else {
          break;
        }
      }
      output.push(`<blockquote><p>${quoteLines.join('<br>')}</p></blockquote>`);
      continue;
    }

    // Hierarchical Tree List (Unordered, Ordered, and Tag-based, Tab and Space indented)
    const firstListItem = checkListItem(lines[i]);
    if (firstListItem) {
      flushPara();
      const rawItems = [];

      while (i < lines.length) {
        const curRaw = lines[i];
        if (!curRaw.trim()) break;

        const curItem = checkListItem(curRaw);
        if (!curItem) break;

        rawItems.push(curItem);
        i++;
      }

      // Convert rawItems to nested tree
      const root = { children: [] };
      const stack = [{ node: root, level: -1 }];

      for (const item of rawItems) {
        const node = { ...item, children: [] };
        while (stack.length > 1 && stack[stack.length - 1].level >= item.level) {
          stack.pop();
        }
        stack[stack.length - 1].node.children.push(node);
        stack.push({ node, level: item.level });
      }

      // Recursive tree renderer
      const renderTree = (nodes) => {
        if (!nodes || nodes.length === 0) return '';
        const isOl = nodes[0].type === 'ol';
        const tag = isOl ? 'ol' : 'ul';

        const lis = nodes.map(n => {
          const hasChildren = n.children && n.children.length > 0;
          const inlineText = parseInline(n.content);

          if (hasChildren) {
            const childHtml = renderTree(n.children);
            return `<li class="list-tree-item has-children">` +
              `<div class="list-item-row">` +
                `<button class="list-tree-toggle" type="button" aria-expanded="true" title="하위 항목 접기/펼치기">▾</button>` +
                `<span class="list-item-content">${inlineText}</span>` +
              `</div>` +
              `<div class="list-children-wrap">${childHtml}</div>` +
            `</li>`;
          } else {
            let bullet = '•';
            if (n.type === 'ol') {
              bullet = `${n.num}.`;
            } else if (n.isTag) {
              bullet = n.marker;
            }
            return `<li class="list-tree-item">` +
              `<div class="list-item-row">` +
                `<span class="list-leaf-bullet">${bullet}</span>` +
                `<span class="list-item-content">${inlineText}</span>` +
              `</div>` +
            `</li>`;
          }
        }).join('');

        return `<${tag} class="list-tree-group">${lis}</${tag}>`;
      };

      output.push(renderTree(root.children));
      continue;
    }

    // Normal Paragraph line
    pendingPara.push(parseInline(trimmed));
    i++;
  }

  flushPara();
  return output.join('\n');
}

/**
 * 4. Main Document Custom Parser
 */
export function parseFullCustomMarkdown(markdownText) {
  if (!markdownText || typeof markdownText !== 'string') {
    return { fullHtml: '', footnotes: [], graphs: [] };
  }

  // Normalize Windows CRLF (\r\n) and legacy CR (\r) to standard LF (\n)
  const normalized = markdownText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const footnotesMap = new Map();
  const footnotesList = [];
  const graphsList = [];
  let fnCounter = 1;
  let refCounter = 1;
  let graphCounter = 1;

  // 0. Extract & Replace :::graph Blocks BEFORE any collapsible ::: blocks!
  const graphBlockRegex = /:::\s*graph\s*\n([\s\S]*?)\n:::/gi;
  let processed = normalized.replace(graphBlockRegex, (match, graphContent) => {
    const graphData = parseGraphBlock(graphContent);
    const graphId = graphCounter++;

    graphsList.push({
      id: graphId,
      ...graphData
    });

    return `\n\n@@GRAPH:${graphId}@@\n\n`;
  });

  // 1. Extract Footnotes & Insert Safe Placeholders (@@FNREF:refId:fnId:fnLabel@@)
  processed = processed.replace(/(.*?)\{\^(\d+)?:\s*([\s\S]*?)\}/g, (match, prefix, numStr, fnContent) => {
    const trimmedFn = fnContent.trim();
    let fnItem = footnotesMap.get(trimmedFn);

    if (!fnItem) {
      const parsedFnTextHtml = parseInline(trimmedFn);
      const fnLabel = `[${fnCounter}]`;

      fnItem = {
        id: refCounter,
        number: fnLabel,
        num: fnCounter++,
        rawText: trimmedFn,
        content: parsedFnTextHtml
      };
      footnotesMap.set(trimmedFn, fnItem);
      footnotesList.push(fnItem);
    }

    const currentRefId = refCounter++;
    const fnLabel = fnItem.number;
    const placeholder = `@@FNREF:${currentRefId}:${fnItem.id}:${fnLabel}@@`;

    return `${prefix}${placeholder}`;
  });

  // 2. Parse Blocks (Paragraphs, Headings, Folds, Tables, Media, Lists, Code, etc.)
  let fullHtml = parseBlocks(processed);

  // 3. Replace Footnote Placeholders with Final HTML
  fullHtml = fullHtml.replace(/@@FNREF:(\d+):(\d+):([^@]+)@@/g, (match, currentRefId, fnId, fnLabel) => {
    return `<span id="fn-ref-${currentRefId}" class="footnote-anchor"><sup class="footnote-sup"><button type="button" class="fn-trigger-btn" data-fn-id="${fnId}">${fnLabel}</button></sup></span>`;
  });

  // 4. Replace Graph Placeholders with HTML Placeholders for React renderer
  fullHtml = fullHtml.replace(/@@GRAPH:(\d+)@@/g, (match, graphId) => {
    return `<div class="graph-placeholder" data-graph-id="${graphId}"></div>`;
  });

  return { fullHtml, footnotes: footnotesList, graphs: graphsList };
}
