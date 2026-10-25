import { foldName } from './calc';

// Turning what the author typed into a weapon / variant of the exported data.

/** Lookup tables over { id: weapon }. A name matches on the in-game name, the internal name or the id. */
export function indexWeapons(weapons) {
  const byName = new Map();
  const add = (key, id) => {
    if (!key) return;
    const list = byName.get(key);
    if (!list) byName.set(key, [id]);
    else if (!list.includes(id)) list.push(id);
  };
  for (const w of Object.values(weapons)) {
    add(foldName(w.name), w.id);
    add(foldName(w.gameName), w.id);
    add(foldName(w.id), w.id);
  }
  return { weapons, byName };
}

const label = (w) => `${w.name} (${w.id})`;

function suggestions(index, key) {
  if (key.length < 2) return [];
  return Object.values(index.weapons)
    .filter((w) => [w.name, w.gameName, w.id].some((n) => foldName(n).includes(key) || key.includes(foldName(n))))
    .slice(0, 5);
}

/** { weapon } | { error, candidates? }. An exact id always wins, so an ambiguous name can be disambiguated by it. */
export function findWeapon(index, query) {
  const text = String(query ?? '').trim();
  if (!text) return { error: '무기 이름이 비어 있습니다.' };

  const exactId = index.weapons[text.toLowerCase()];
  if (exactId) return { weapon: exactId };

  const key = foldName(text);
  const ids = index.byName.get(key);
  if (ids && ids.length === 1) return { weapon: index.weapons[ids[0]] };
  if (ids && ids.length > 1) {
    const candidates = ids.map((id) => index.weapons[id]);
    return { error: `"${text}"에 해당하는 무기가 여럿입니다: ${candidates.map(label).join(', ')}. 괄호 안 이름(id)으로 적어 주세요.`, candidates };
  }

  const near = suggestions(index, key);
  const hint = near.length ? ` 혹시: ${near.map((w) => w.name).join(', ')}` : '';
  return { error: `"${text}" 무기를 찾을 수 없습니다.${hint}` };
}

/** { variant } | { error }, matching the variant's display name or internal name. */
export function findVariant(file, query, weaponName) {
  const variants = file?.variants ?? [];
  const key = foldName(query);
  const hits = variants.filter((v) => foldName(v.name) === key || foldName(v.gameName) === key);
  if (hits.length === 1) return { variant: hits[0] };
  const options = variants.map((v) => v.name).join(', ') || '없음';
  return { error: `${weaponName}에 "${query}" 변형이 없습니다. 있는 것: ${options}` };
}
