import { columnNames, resolveColumn } from './columns';

// :::compare block text -> { valid, items, options } (or { valid: false, error }).
//
//   :::compare
//   SPEAR LT, VZ. 808, AK-12            guns, one per line or comma separated
//   UAR A3 + 7.62x39mm                  a gun with one attachment / ammo (spaces around the plus)
//   UAR A3 + .300 BLK | 근거리 특화      text after | is a note under that column
//   거리: 50                            studs, used for TTK (default 50)
//   열: 탄속, 관통력, TTK@30             extra rows; the core rows (RPM, damage, range, TTK, mag) are always there
//   배치: 열|행|자동                     guns as columns (default for 4 or fewer) or as rows (sortable)
//   그래프: 끄기 | A, B                  damage curves under the table
//   버전: 11.16
//   변형: 탄약 전체 | 7.62x39mm, .300 BLK  base gun first, then its variants (needs exactly one gun)
//   :::

const OPTION_KEY = {
  '거리': 'distance', 'distance': 'distance',
  '열': 'columns', 'columns': 'columns', 'cols': 'columns',
  '배치': 'layout', 'layout': 'layout',
  '그래프': 'graph', 'graph': 'graph',
  '버전': 'version', 'version': 'version',
  '변형': 'variants', 'variants': 'variants',
};

const MAX_ITEMS = 12;

const keyOf = (text) => String(text).toLowerCase().replace(/\s+/g, '');
const fail = (lineNo, message) => ({ valid: false, error: `줄 ${lineNo}: ${message}` });

function parseItem(text, note) {
  const parts = text.split(/\s\+\s/).map((p) => p.trim()).filter(Boolean);
  return { raw: text.trim(), weapon: parts[0], variants: parts.slice(1), note: note ? note.trim() : '' };
}

export function parseCompareBlock(blockText) {
  if (!blockText || typeof blockText !== 'string' || !blockText.trim()) {
    return { valid: false, error: '비교할 무기가 입력되지 않았습니다.' };
  }

  const options = { distance: 50, columns: null, layout: 'auto', graph: { mode: 'on', names: null }, version: null, variants: null };
  const items = [];

  const lines = blockText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const lineNo = i + 1;

    const match = /^([^:：|]+?)\s*[:：]\s*(.*)$/.exec(line);
    const option = match && OPTION_KEY[keyOf(match[1])];

    if (option) {
      const value = match[2].trim();
      const v = keyOf(value);

      if (option === 'distance') {
        const d = parseFloat(value);
        if (!(d >= 1 && d <= 400)) return fail(lineNo, `거리는 1~400 사이 숫자여야 합니다 ("${value}")`);
        options.distance = d;
      } else if (option === 'columns') {
        const names = value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
        const columns = [];
        for (const name of names) {
          const column = resolveColumn(name);
          if (!column) return fail(lineNo, `알 수 없는 열 "${name}" (사용 가능: ${columnNames().join(', ')})`);
          columns.push(column);
        }
        options.columns = columns;
      } else if (option === 'layout') {
        if (['열', 'column', 'columns'].includes(v)) options.layout = 'column';
        else if (['행', 'row', 'rows'].includes(v)) options.layout = 'row';
        else if (['자동', 'auto', ''].includes(v)) options.layout = 'auto';
        else return fail(lineNo, `배치는 열, 행, 자동 중 하나여야 합니다 ("${value}")`);
      } else if (option === 'graph') {
        if (['끄기', 'off', 'no', 'false', '없음'].includes(v)) options.graph = { mode: 'off', names: null };
        else if (['켜기', 'on', 'yes', 'true', ''].includes(v)) options.graph = { mode: 'on', names: null };
        else options.graph = { mode: 'on', names: value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) };
      } else if (option === 'version') {
        const found = /\d+\.\d+/.exec(value);
        if (!found) return fail(lineNo, `버전은 11.17 또는 11.16 같은 형식이어야 합니다 ("${value}")`);
        options.version = found[0];
      } else if (option === 'variants') {
        if (['탄약전체', '전체', 'ammo', 'ammoall', 'all'].includes(v)) options.variants = { all: 'Ammo' };
        else options.variants = { names: value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) };
      }
      continue;
    }

    // Item line. A note after "|" belongs to a single item, so such a line is not split on commas.
    const bar = line.indexOf('|');
    if (bar >= 0) {
      items.push(parseItem(line.slice(0, bar), line.slice(bar + 1)));
    } else {
      for (const part of line.split(/[,，]/)) {
        if (part.trim()) items.push(parseItem(part, ''));
      }
    }
  }

  if (!items.length) return { valid: false, error: '비교할 무기가 입력되지 않았습니다.' };
  if (options.variants && items.length !== 1) {
    return { valid: false, error: '"변형:"은 무기가 하나일 때만 쓸 수 있습니다. 여러 무기는 "무기 + 변형" 줄로 적어 주세요.' };
  }
  if (items.length > MAX_ITEMS) return { valid: false, error: `한 번에 비교할 수 있는 항목은 ${MAX_ITEMS}개까지입니다.` };

  return { valid: true, items, options };
}
