import { indexWeapons } from './resolve';

// The data files are written by RecoilSim (scripts/export_compare_stats.ts) into public/data/compare.
// Each file is fetched once per page; a failed fetch is forgotten so the next block can try again.

const cache = new Map();

function url(path) {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.endsWith('/') ? base : `${base}/`}data/compare/${path}`;
}

function once(key, load) {
  if (!cache.has(key)) {
    const promise = load().catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, promise);
  }
  return cache.get(key);
}

async function getJson(path) {
  const response = await fetch(url(path));
  if (!response.ok) throw new Error(`${path} (${response.status})`);
  return response.json();
}

export function loadVersions() {
  return once('versions', () => getJson('versions.json'));
}

/** { index, note, version } for one data version. */
export function loadWeapons(version) {
  return once(`weapons:${version}`, async () => {
    const data = await getJson(`${version}/weapons.json`);
    return { version: data.version, note: data.note, index: indexWeapons(data.weapons) };
  });
}

/** One weapon's variants file, or null when the weapon has none. */
export function loadVariants(version, weaponId) {
  return once(`variants:${version}:${weaponId}`, async () => {
    const response = await fetch(url(`${version}/variants/${weaponId}.json`));
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`variants/${weaponId} (${response.status})`);
    return response.json();
  });
}
