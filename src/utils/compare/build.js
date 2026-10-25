import { COLUMNS, DEFAULT_COLUMNS, columnLabel } from './columns';
import { findVariant, findWeapon } from './resolve';
import { mergeStats, foldName, percentChange } from './calc';

const MAX_GRAPH_SERIES = 4;
const COLUMN_LAYOUT_MAX = 4; // up to this many items: items as columns; more: items as rows (sortable)

/** Weapon ids whose variants file the block needs (so the component can fetch exactly those). */
export function neededVariantWeapons(index, config) {
  const ids = new Set();
  for (const item of config.items) {
    if (!item.variants.length && !config.options.variants) continue;
    const found = findWeapon(index, item.weapon);
    if (found.weapon) ids.add(found.weapon.id);
  }
  return [...ids];
}

function expandItems(index, variantFiles, config, errors) {
  const items = [];
  const add = (weapon, variant, note) => items.push({ weapon, variant, note: note || '', stats: mergeStats(weapon.stats, variant?.delta), status: weapon.status });

  for (const entry of config.items) {
    const found = findWeapon(index, entry.weapon);
    if (found.error) {
      errors.push(found.error);
      continue;
    }
    const weapon = found.weapon;
    const file = variantFiles?.get(weapon.id);

    if (config.options.variants) {
      // `변형:` line: the base gun first, then its variants
      const option = config.options.variants;
      add(weapon, null, entry.note);
      if (option.all) {
        const list = (file?.variants ?? []).filter((v) => v.slot === option.all);
        if (!list.length) errors.push(`${weapon.name}에는 ${option.all} 변형이 없습니다.`);
        list.forEach((v) => add(weapon, v, ''));
      } else {
        for (const name of option.names) {
          const hit = findVariant(file, name, weapon.name);
          if (hit.error) errors.push(hit.error);
          else add(weapon, hit.variant, '');
        }
      }
      continue;
    }

    if (!entry.variants.length) {
      add(weapon, null, entry.note);
      continue;
    }
    if (entry.variants.length > 1) {
      errors.push(`"${entry.raw}": 변형은 하나만 붙일 수 있습니다 (여러 부착물을 함께 단 조합은 아직 지원하지 않습니다).`);
      continue;
    }
    const hit = findVariant(file, entry.variants[0], weapon.name);
    if (hit.error) errors.push(hit.error);
    else add(weapon, hit.variant, entry.note);
  }
  return items;
}

function itemLabels(items, mode) {
  const seen = new Map();
  return items.map((item) => {
    let title;
    let sub = '';
    if (mode === 'variant') {
      title = item.variant ? item.variant.name : '기본';
      sub = item.variant ? '' : item.weapon.name;
    } else {
      title = item.variant ? `${item.weapon.name} (${item.variant.name})` : item.weapon.name;
      sub = item.weapon.category ? item.weapon.category.toLowerCase() : '';
    }
    const n = (seen.get(title) ?? 0) + 1;
    seen.set(title, n);
    return { title: n > 1 ? `${title} #${n}` : title, sub };
  });
}

/**
 * The table: { mode, layout, items, rows, errors, footnotes, hiddenCount }.
 * mode 'variant' = every item is one gun (first item is the baseline); 'gun' = different guns.
 * `distance` is the live slider value (TTK rows follow it unless a column fixes its own distance).
 */
export function buildComparison({ index, variantFiles, config, version, distance }) {
  const errors = [];
  const items = expandItems(index, variantFiles, config, errors);
  const mode = items.length > 1 && items.every((i) => i.weapon.id === items[0].weapon.id) ? 'variant' : 'gun';
  const labels = itemLabels(items, mode);
  items.forEach((item, i) => Object.assign(item, labels[i]));

  const layout = config.options.layout === 'auto' ? (items.length <= COLUMN_LAYOUT_MAX ? 'column' : 'row') : config.options.layout;

  const explicit = Boolean(config.options.columns);
  const core = Object.keys(COLUMNS).filter((id) => COLUMNS[id].core).map((id) => ({ id }));
  const extra = (explicit ? config.options.columns : DEFAULT_COLUMNS.map((id) => ({ id }))).filter((c) => c.distance !== undefined || !COLUMNS[c.id].core);
  const columns = [];
  for (const c of [...core, ...extra]) {
    if (!columns.some((x) => x.id === c.id && x.distance === c.distance)) columns.push(c);
  }

  const rows = [];
  const footnotes = new Set();
  let hiddenCount = 0;

  for (const column of columns) {
    const def = COLUMNS[column.id];
    if (def.variantOnly && mode !== 'variant') continue;

    const ctx = { distance: column.distance ?? distance ?? config.options.distance, version };
    const cells = items.map((item) => def.cell(item, ctx));

    if (cells.every((c) => c.key === '-')) {
      if (column.id === 'reload') footnotes.add('장전 시간은 탄창식 총기만 계산합니다 (한 발씩 장전하는 샷건, 볼트액션, 리볼버 등은 표시하지 않습니다).');
      if (!def.core) continue;
    }
    if (column.id === 'reload' && cells.some((c) => c.unsupported)) footnotes.add('장전 시간은 탄창식 총기만 계산합니다 (한 발씩 장전하는 샷건, 볼트액션, 리볼버 등은 표시하지 않습니다).');
    if (cells.some((c) => c.dagger)) footnotes.add('† 11.17에서 바뀐 값이 반영되지 않았을 수 있는 11.16 기준 값입니다.');
    if (cells.some((c) => c.text?.startsWith('≈'))) footnotes.add('≈ 샷건의 TTK는 모든 펠릿이 명중했을 때의 값입니다.');

    const hidden = mode === 'variant' && !explicit && !def.core && cells.every((c) => c.key === cells[0].key);
    if (hidden) hiddenCount++;

    rows.push({
      id: `${column.id}${column.distance !== undefined ? `@${column.distance}` : ''}`,
      label: columnLabel(column, ctx),
      core: Boolean(def.core),
      hidden,
      cells: cells.map((cell, i) => {
        const changed = mode === 'variant' && i > 0 && cell.key !== cells[0].key;
        // A cell can change without its main number moving (a 1x multiplier whose bracketed damage changed): no "0%"
        const pct = changed && !def.noPct ? percentChange(cells[0].value, cell.value) : null;
        return { ...cell, changed, pct: pct === 0 ? null : pct };
      }),
    });
  }

  return { mode, layout, items, rows, errors, footnotes: [...footnotes], hiddenCount };
}

/** Input for the existing <WeaponDamageGraph>: one series per item (at most 4, or the ones named in `그래프:`). */
export function buildGraphData(items, config) {
  if (config.options.graph.mode === 'off' || !items.length) return null;

  let chosen = items;
  const wanted = config.options.graph.names;
  if (wanted) {
    chosen = wanted
      .map((name) => items.find((i) => foldName(i.title) === foldName(name) || foldName(i.weapon.name) === foldName(name)))
      .filter(Boolean);
  }
  chosen = chosen.slice(0, MAX_GRAPH_SERIES);

  const series = chosen
    .filter((item) => item.stats.damageGraph.length)
    .map((item) => {
      const pellets = item.stats.pellets > 1 ? item.stats.pellets : 1;
      return {
        name: item.title,
        points: item.stats.damageGraph.map((p) => ({ damage: p.damage * pellets, range: p.distance, pelletDmg: p.damage, pelletCount: pellets })),
        multipliers: { head: item.stats.multhead ?? 1, torso: item.stats.multtorso ?? 1, limb: 1 },
        ...(pellets > 1 ? { isShotgun: true, pelletCount: pellets } : {}),
      };
    });
  return series.length ? { valid: true, series } : null;
}
