import { bulletsToKill, damageAt, damagePerShot, foldName, percentChange, rangeOf, round, timeToKillMs } from './calc';

// Table rows. A column has a label, a `core` flag (always shown, never auto-hidden) and `cell(item, ctx)`
// returning { text, sub?, value?, key }: `key` decides whether two cells are "the same", `value` (a number) lets
// variant mode show a percentage change.
//
// An item is { stats, status }. ctx is { distance, version }.

const dash = { text: '-', key: '-' };
const num = (v) => (typeof v === 'number' && Number.isFinite(v));
const fmt = (v, digits = 2) => (num(v) ? String(round(v, digits)) : '-');
const thousands = (v) => (num(v) ? round(v, 2).toLocaleString('en-US') : '-');

function simple(stats, key, unit = '') {
  const v = stats[key];
  if (!num(v)) return dash;
  return { text: `${thousands(v)}${unit}`, value: v, key: String(round(v, 2)) };
}

/** Handling stats are inherited from 11.16 for most weapons in the 11.17 data: mark them. */
function handling(item, key, ctx) {
  const cell = simple(item.stats, key);
  if (cell === dash) return cell;
  const inherited = ctx.version !== '11.16' && /INHERITED|UNVERIFIED/.test(item.status?.mobility ?? '');
  return inherited ? { ...cell, text: `${cell.text}†`, dagger: true } : cell;
}

function multiplierCell(item, multiplier) {
  const { stats } = item;
  if (!num(multiplier) || !stats.damageGraph.length) return dash;
  const near = stats.damageGraph[0].damage * multiplier * (stats.pellets > 1 ? stats.pellets : 1);
  const far = stats.damageGraph[stats.damageGraph.length - 1].damage * multiplier * (stats.pellets > 1 ? stats.pellets : 1);
  const label = `${round(multiplier, 2)}x`;
  return { text: label, sub: `(${round(near, 1)} → ${round(far, 1)})`, value: multiplier, key: `${label}|${round(near, 1)}|${round(far, 1)}` };
}

export const COLUMNS = {
  rpm: {
    label: '연사력 (RPM)',
    core: true,
    aliases: ['연사력', '연사', 'rpm'],
    cell: ({ stats }) => {
      if (!num(stats.rpm)) return dash;
      const modes = stats.rpmModes?.length > 1 ? stats.rpmModes.join(' / ') : String(stats.rpm);
      return { text: modes, value: stats.rpm, key: modes };
    },
  },
  damage: {
    label: '피해량',
    core: true,
    aliases: ['피해량', '피해', '데미지', 'damage'],
    cell: ({ stats }) => {
      const g = stats.damageGraph;
      if (!g.length) return dash;
      const unit = stats.pellets > 1 ? ` ×${stats.pellets}` : '';
      const text = `${round(g[0].damage, 2)} → ${round(g[g.length - 1].damage, 2)}${unit}`;
      return { text, key: text };
    },
  },
  range: {
    label: '사거리',
    core: true,
    aliases: ['사거리', 'range'],
    cell: ({ stats }) => {
      const { start, end } = rangeOf(stats.damageGraph);
      if (start === null) return dash;
      const text = `${round(start, 1)} → ${round(end, 1)} studs`;
      return { text, key: text };
    },
  },
  ttk: {
    label: 'TTK',
    core: true,
    aliases: ['ttk', '킬타임'],
    dynamicLabel: (ctx) => `TTK @${ctx.distance}`,
    cell: ({ stats }, ctx) => {
      const bullets = bulletsToKill(damagePerShot(stats, ctx.distance, stats.multtorso ?? 1));
      const ms = timeToKillMs(bullets, stats.rpm);
      if (ms === null) return dash;
      const approx = stats.pellets > 1 ? '≈' : '';
      // One bullet kills: there is no "time" to show
      if (bullets === 1) return { text: `${approx}1발 킬`, value: 0, key: `1|${approx}` };
      return { text: `${approx}${Math.round(ms)} ms`, sub: `(${bullets}발)`, value: ms, key: `${Math.round(ms)}|${bullets}` };
    },
  },
  btk: {
    label: 'BTK (몸통)',
    aliases: ['btk', '발수'],
    cell: ({ stats }, ctx) => {
      const bullets = bulletsToKill(damagePerShot(stats, ctx.distance, stats.multtorso ?? 1));
      return bullets === null ? dash : { text: `${bullets}발`, value: bullets, key: String(bullets) };
    },
  },
  mag: {
    label: '탄창',
    core: true,
    aliases: ['탄창', '탄', 'mag'],
    cell: ({ stats }) => {
      if (!num(stats.magsize)) return dash;
      const text = `${stats.magsize}${stats.chamber ? '+1' : ''}${num(stats.sparerounds) ? ` / ${stats.sparerounds}` : ''}`;
      return { text, key: text };
    },
  },
  torso: {
    label: '몸통 배율',
    aliases: ['몸통', '몸통배율'],
    cell: (item) => multiplierCell(item, item.stats.multtorso),
  },
  head: {
    label: '머리 배율',
    aliases: ['머리', '헤드', '머리배율', '헤드샷'],
    cell: (item) => multiplierCell(item, item.stats.multhead),
  },
  velocity: {
    label: '탄속',
    aliases: ['탄속', '속도', 'velocity'],
    cell: ({ stats }) => simple(stats, 'bulletspeed', ' studs/s'),
  },
  pen: {
    label: '관통력',
    aliases: ['관통', '관통력', 'pen', 'penetration'],
    cell: ({ stats }) => simple(stats, 'penetration', ' studs'),
  },
  suppression: {
    label: '제압력',
    aliases: ['제압', '제압력'],
    cell: ({ stats }) => simple(stats, 'suppression'),
  },
  recoil: {
    label: '반동',
    variantOnly: true,
    noPct: true, // its text already says the percentage
    aliases: ['반동', '반동페널티', 'recoil'],
    cell: ({ stats }) => {
      const s = stats.recoilScale;
      if (s === null) return { text: '부분 변화', key: 'mixed' };
      if (!num(s) || Math.abs(s - 1) < 1e-9) return { text: '변화 없음', key: '1' };
      const p = round((s - 1) * 100, 1);
      return { text: `모든 반동 ${p > 0 ? '+' : ''}${p}%`, value: s, key: String(s) };
    },
  },
  walk: {
    label: '이동 속도',
    aliases: ['이동', '이동속도', 'walk'],
    cell: (item, ctx) => handling(item, 'walkspeed', ctx),
  },
  aimwalk: {
    label: '조준 중 이동',
    aliases: ['조준중이동', '조준이동', '조준중이동속도'],
    cell: (item, ctx) => handling(item, 'aimwalkspeed', ctx),
  },
  aimspeed: {
    label: '조준 속도',
    aliases: ['조준속도', '조준', 'aim'],
    cell: (item, ctx) => handling(item, 'aimspeed', ctx),
  },
  sprint: {
    label: '달리기',
    aliases: ['달리기', '질주', 'sprint'],
    cell: (item, ctx) => handling(item, 'sprintspeed', ctx),
  },
  equip: {
    label: '장착 속도',
    aliases: ['장착', '장착속도', 'equip'],
    cell: (item, ctx) => handling(item, 'equipspeed', ctx),
  },
  reload: {
    label: '장전 (전술 / 일반)',
    aliases: ['장전', '장전속도', 'reload'],
    cell: ({ stats }) => {
      const r = stats.reload;
      if (!r || r.kind !== 'mag' || (!num(r.tactical) && !num(r.full))) return { text: '-', key: '-', unsupported: r?.kind ?? 'none' };
      const text = num(r.tactical) && num(r.full) && r.tactical !== r.full ? `${fmt(r.tactical)} / ${fmt(r.full)} s` : `${fmt(r.full ?? r.tactical)} s`;
      return { text, value: r.full ?? r.tactical, key: text };
    },
  },
};

/** Rows shown when a block has no `열:` line. Core rows come first, then these in order. */
export const DEFAULT_COLUMNS = ['rpm', 'damage', 'range', 'ttk', 'mag', 'torso', 'head', 'velocity', 'pen', 'walk', 'aimwalk', 'aimspeed', 'reload', 'recoil'];

const ALIAS = new Map();
for (const [id, def] of Object.entries(COLUMNS)) {
  ALIAS.set(foldName(id), id);
  for (const a of def.aliases ?? []) ALIAS.set(foldName(a), id);
}

/** "TTK@30" -> { id: 'ttk', distance: 30 }; plain names -> { id }. Returns null for an unknown name. */
export function resolveColumn(name) {
  const fixed = /^(.*?)\s*@\s*(\d+(?:\.\d+)?)$/.exec(String(name).trim());
  const base = fixed ? fixed[1] : String(name).trim();
  const id = ALIAS.get(foldName(base));
  if (!id) return null;
  return fixed ? { id, distance: Number(fixed[2]) } : { id };
}

export function columnNames() {
  return Object.values(COLUMNS).map((c) => c.aliases?.[0] ?? c.label);
}

export function columnLabel(column, ctx) {
  const def = COLUMNS[column.id];
  if (column.distance !== undefined) return `${def.label} @${column.distance}`;
  return def.dynamicLabel ? def.dynamicLabel(ctx) : def.label;
}

export { percentChange, damageAt };
