import { describe, expect, it } from 'vitest';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseCompareBlock } from './parseCompare';
import { findWeapon, indexWeapons } from './resolve';
import { bulletsToKill, damageAt, foldName, timeToKillMs } from './calc';
import { buildComparison, buildGraphData, neededVariantWeapons } from './build';
import { resolveColumn } from './columns';

// The tests read the real exported data (public/data/compare, written by RecoilSim's export_compare_stats.ts)
const dataDir = fileURLToPath(new URL('../../../public/data/compare/11.17/', import.meta.url));
const index = indexWeapons(JSON.parse(fs.readFileSync(`${dataDir}weapons.json`, 'utf8')).weapons);
const variantFiles = (ids) => new Map(ids.map((id) => [id, JSON.parse(fs.readFileSync(`${dataDir}variants/${id}.json`, 'utf8'))]));

function build(text, distance) {
  const config = parseCompareBlock(text);
  expect(config.valid, config.error).toBe(true);
  const files = variantFiles(neededVariantWeapons(index, config));
  return buildComparison({ index, variantFiles: files, config, version: '11.17', distance: distance ?? config.options.distance });
}

const row = (table, id) => table.rows.find((r) => r.id === id);
const texts = (table, id) => row(table, id).cells.map((c) => c.text);

describe('parseCompareBlock', () => {
  it('reads guns separated by commas or lines, and ignores blank lines', () => {
    const r = parseCompareBlock('SPEAR LT, VZ. 808\n\nAK-12');
    expect(r.items.map((i) => i.weapon)).toEqual(['SPEAR LT', 'VZ. 808', 'AK-12']);
    expect(r.options.distance).toBe(50);
  });

  it('reads "gun + variant" and a note after |', () => {
    const r = parseCompareBlock('UAR A3\nUAR A3 + .300 BLK | 근거리 특화, 소음기');
    expect(r.items[1]).toMatchObject({ weapon: 'UAR A3', variants: ['.300 BLK'], note: '근거리 특화, 소음기' });
    expect(r.items).toHaveLength(2); // the comma sits inside the note, it does not split the item
  });

  it('reads options in Korean and English', () => {
    const r = parseCompareBlock('M4\n거리: 80\n열: 탄속, TTK@30\n배치: 행\n그래프: 끄기\n버전: 11.16');
    expect(r.options).toMatchObject({ distance: 80, layout: 'row', version: '11.16', graph: { mode: 'off' } });
    expect(r.options.columns).toEqual([{ id: 'velocity' }, { id: 'ttk', distance: 30 }]);
    expect(parseCompareBlock('M4\ndistance: 30').options.distance).toBe(30);
  });

  it('reads the variants shortcut', () => {
    expect(parseCompareBlock('UAR A3\n변형: 탄약 전체').options.variants).toEqual({ all: 'Ammo' });
    expect(parseCompareBlock('UAR A3\n변형: 7.62x39mm, .300 BLK').options.variants).toEqual({ names: ['7.62x39mm', '.300 BLK'] });
  });

  it.each([
    ['', '비교할 무기'],
    ['M4\n거리: 9999', '거리는 1~400'],
    ['M4\n열: 없는열', '알 수 없는 열'],
    ['M4\n배치: 대각선', '배치는'],
    ['M4, AK-12\n변형: 탄약 전체', '무기가 하나일 때'],
  ])('rejects %j', (text, message) => {
    const r = parseCompareBlock(text);
    expect(r.valid).toBe(false);
    expect(r.error).toContain(message);
  });

  it('knows column aliases', () => {
    expect(resolveColumn('연사력')).toEqual({ id: 'rpm' });
    expect(resolveColumn('조준 중 이동')).toEqual({ id: 'aimwalk' });
    expect(resolveColumn('nope')).toBeNull();
  });
});

describe('findWeapon', () => {
  it('ignores case, spaces and punctuation, and knows the in-game and internal names', () => {
    expect(findWeapon(index, 'vz.808').weapon.id).toBe(findWeapon(index, 'VZ. 808').weapon.id);
    expect(findWeapon(index, 'UAR A3').weapon.id).toBe('aug_a3'); // in-game name
    expect(findWeapon(index, 'AUG A3').weapon.id).toBe('aug_a3'); // internal name
  });

  it('refuses an ambiguous name and lets the id settle it', () => {
    // "E-GUN" is one gun's in-game name and the other's internal name
    const r = findWeapon(index, 'E-GUN');
    expect(r.error).toContain('여럿');
    expect(r.candidates.map((w) => w.id).sort()).toEqual(['e_gun', 'e_shotgun']);
    expect(findWeapon(index, 'e_gun').weapon.id).toBe('e_gun');
    expect(findWeapon(index, 'e_shotgun').weapon.id).toBe('e_shotgun');
  });

  it('an exact id wins even when another gun has that name', () => {
    // "FAMAS" is the id of FAMAS G2 and also (minus the ?) the name of the UNBULLPUP model
    expect(findWeapon(index, 'FAMAS').weapon.id).toBe('famas');
    expect(findWeapon(index, 'famas_unbullpup').weapon.id).toBe('famas_unbullpup');
  });

  it('suggests close names for a miss', () => {
    expect(findWeapon(index, 'SPEAR L').error).toContain('SPEAR LT');
    expect(findWeapon(index, 'zzzzzz').error).toContain('찾을 수 없습니다');
  });
});

describe('damage and time to kill', () => {
  const graph = [{ distance: 0, damage: 34 }, { distance: 40, damage: 34 }, { distance: 150, damage: 21 }];

  it('interpolates the damage curve and stays flat outside it', () => {
    expect(damageAt(graph, 10)).toBe(34);
    expect(damageAt(graph, 40)).toBe(34);
    expect(damageAt(graph, 95)).toBeCloseTo(27.5, 5);
    expect(damageAt(graph, 400)).toBe(21);
  });

  it('bullets to kill rounds up, with a tolerance for exact thirds', () => {
    expect(bulletsToKill(34)).toBe(3);
    expect(bulletsToKill(100 / 3)).toBe(3);
    expect(bulletsToKill(25)).toBe(4);
    expect(bulletsToKill(50)).toBe(2);
  });

  it('TTK is the time between the first and last bullet (same numbers as RecoilSim\'s 11.17 report)', () => {
    expect(timeToKillMs(3, 750)).toBeCloseTo(160, 2); // K2
    expect(timeToKillMs(3, 560)).toBeCloseTo(214.29, 2); // HARDBALLER
    expect(timeToKillMs(2, 360)).toBeCloseTo(166.67, 2); // JURY
  });

  it('table TTK agrees with RecoilSim for SPEAR LT and REGULATOR at close range', () => {
    const t = build('SPEAR LT, REGULATOR', 20);
    expect(row(t, 'ttk').cells.map((c) => Math.round(c.value * 100) / 100)).toEqual([141.18, 184.62]);
  });

  it('uses the damage curve: SPEAR LT does 33 at 50 studs, so three torso hits are not enough', () => {
    const t = build('SPEAR LT', 50);
    expect(row(t, 'ttk').cells[0].sub).toBe('(4발)');
    expect(row(t, 'ttk').cells[0].value).toBeCloseTo(211.76, 2);
  });
});

describe('gun vs gun', () => {
  const t = build('SPEAR LT, VZ. 808, AK-12');

  it('is gun mode, with guns as columns, and always shows the core rows', () => {
    expect(t.mode).toBe('gun');
    expect(t.layout).toBe('column');
    for (const id of ['rpm', 'damage', 'range', 'ttk', 'mag']) expect(row(t, id)).toBeDefined();
    expect(row(t, 'rpm').hidden).toBe(false);
    expect(t.rows.every((r) => r.cells.every((c) => !c.changed))).toBe(true); // no baseline highlighting between guns
  });

  it('does not show the variant-only recoil row', () => {
    expect(row(t, 'recoil')).toBeUndefined();
  });

  it('switches to rows for more than four guns', () => {
    expect(build('M4, AK-12, SPEAR LT, VZ. 808, REGULATOR').layout).toBe('row');
    expect(build('M4, AK-12, SPEAR LT, VZ. 808, REGULATOR\n배치: 열').layout).toBe('column');
  });

  it('shows RPM even when every gun has the same one', () => {
    const same = build('SPEAR LT, SPEAR LT');
    expect(same.mode).toBe('variant');
    expect(row(same, 'rpm').hidden).toBe(false);
  });

  it('reports unknown guns without dropping the rest', () => {
    const e = build('SPEAR LT, NOT A GUN');
    expect(e.errors).toHaveLength(1);
    expect(e.items).toHaveLength(1);
  });
});

describe('UAR A3 and its ammo conversions (numbers players quote)', () => {
  const t = build('UAR A3\nUAR A3 + 7.62x39mm\nUAR A3 + .300 BLK');

  it('is variant mode with the plain gun as the baseline', () => {
    expect(t.mode).toBe('variant');
    expect(t.items.map((i) => i.title)).toEqual(['기본', '7.62x39mm', '.300 BLK']);
  });

  it('damage, range, torso multiplier, bullet speed and penetration', () => {
    expect(texts(t, 'damage')).toEqual(['34 → 21', '37 → 24', '36 → 19']);
    expect(texts(t, 'range')).toEqual(['40 → 150 studs', '40 → 150 studs', '45 → 125 studs']);
    expect(texts(t, 'torso')).toEqual(['1x', '1x', '1.1x']);
    expect(row(t, 'torso').cells[2].sub).toBe('(39.6 → 20.9)');
    expect(texts(t, 'velocity')).toEqual(['3,050 studs/s', '2,350 studs/s', '2,250 studs/s']);
    expect(texts(t, 'pen')).toEqual(['1 studs', '1.4 studs', '1.15 studs']);
  });

  it('recoil and reload', () => {
    expect(texts(t, 'recoil')).toEqual(['변화 없음', '모든 반동 +25%', '모든 반동 +10%']);
    expect(texts(t, 'reload')).toEqual(['2.48 / 3.61 s', '2.68 / 3.9 s', '2.48 / 3.61 s']);
  });

  it('marks what changed against the baseline, with a percentage for single numbers', () => {
    const velocity = row(t, 'velocity');
    expect(velocity.cells.map((c) => c.changed)).toEqual([false, true, true]);
    expect(velocity.cells[1].pct).toBeCloseTo(-23, 1);
    expect(row(t, 'damage').cells.map((c) => c.changed)).toEqual([false, true, true]);
    expect(row(t, 'rpm').cells.map((c) => c.changed)).toEqual([false, false, false]);
  });

  it('hides non-core rows that are identical, keeps core rows, and counts the hidden ones', () => {
    expect(row(t, 'walk').hidden).toBe(true);
    expect(row(t, 'aimspeed').hidden).toBe(true);
    expect(row(t, 'rpm').hidden).toBe(false);
    expect(row(t, 'mag').hidden).toBe(false);
    expect(t.hiddenCount).toBeGreaterThan(0);
  });

  it('an explicit column list is shown as written', () => {
    const e = build('UAR A3\nUAR A3 + .300 BLK\n열: 이동, 탄속');
    expect(row(e, 'walk').hidden).toBe(false);
  });

  it('the variants shortcut expands every ammo type after the base gun', () => {
    const all = build('UAR A3\n변형: 탄약 전체');
    expect(all.items[0].variant).toBeNull();
    expect(all.items.length).toBeGreaterThan(5);
    const some = build('UAR A3\n변형: 7.62x39mm, .300 BLK');
    expect(some.items.map((i) => i.title)).toEqual(['기본', '7.62x39mm', '.300 BLK']);
  });

  it('says which variants exist when one is missing', () => {
    const e = build('UAR A3 + 9mm');
    expect(e.errors[0]).toContain('7.62x39mm');
  });

  it('refuses two attachments on one gun for now', () => {
    expect(build('UAR A3 + .300 BLK + 7.62x39mm').errors[0]).toContain('하나만');
  });
});

describe('handling and reload notes', () => {
  it('marks inherited 11.17 handling stats and explains reload gaps', () => {
    const t = build('UAR A3, MODEL 870');
    expect(row(t, 'walk').cells.every((c) => c.text.endsWith('†'))).toBe(true);
    expect(t.footnotes.some((f) => f.startsWith('†'))).toBe(true);
    expect(row(t, 'reload').cells[1].text).toBe('-'); // a tube shotgun: not computed
    expect(t.footnotes.some((f) => f.includes('탄창식'))).toBe(true);
  });
});

describe('graph data', () => {
  it('builds one series per item, at most four', () => {
    const g = buildGraphData(build('M4, AK-12, SPEAR LT, VZ. 808, REGULATOR').items, { options: { graph: { mode: 'on', names: null } } });
    expect(g.series).toHaveLength(4);
    expect(g.series[0].points[0]).toMatchObject({ range: 0 });
    expect(g.series[0].multipliers.limb).toBe(1);
  });

  it('can be turned off or limited to named items, and gives shotguns pellets', () => {
    const items = build('SPEAR LT, MODEL 870').items;
    expect(buildGraphData(items, { options: { graph: { mode: 'off' } } })).toBeNull();
    expect(buildGraphData(items, { options: { graph: { mode: 'on', names: ['MODEL 870'] } } }).series.map((s) => s.name)).toEqual(['MODEL 870']);
    const shotgun = buildGraphData(items, { options: { graph: { mode: 'on', names: null } } }).series[1];
    expect(shotgun.isShotgun).toBe(true);
    expect(shotgun.points[0].damage).toBe(shotgun.points[0].pelletDmg * shotgun.pelletCount);
  });
});

describe('foldName', () => {
  it('ignores case and punctuation and keeps Hangul', () => {
    expect(foldName('AK-12/76')).toBe('ak1276');
    expect(foldName('조준 중 이동')).toBe('조준중이동');
    expect(foldName('')).toBe('');
  });
});

describe('percentages', () => {
  it('does not print 0% when only the bracketed numbers of a multiplier cell changed', () => {
    const t = build('UAR A3\nUAR A3 + 7.62x39mm');
    const torso = row(t, 'torso');
    expect(torso.cells[1].changed).toBe(true);
    expect(torso.cells[1].pct).toBeNull();
  });
});

describe('one-shot kills', () => {
  it('shows "1발 킬" instead of 0 ms when one trigger pull is enough', () => {
    const t = build('MODEL 870', 20);
    expect(row(t, 'ttk').cells[0].text).toBe('≈1발 킬');
    expect(row(t, 'ttk').cells[0].value).toBe(0);
  });
});
