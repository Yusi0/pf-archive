// Adds the Weapon Labs guns that RecoilSim's export does not know about (MSBS-B / MSBS-C with the 7.62x39mm
// conversion, transcribed from in-game screenshots) to public/data/compare/11.17/weapons.json.
// Run it again after every `export_compare_stats` run, because the export rewrites that file.
//
//   node scripts/add_weapon_labs.mjs [path to RecoilSim]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const recoilSim = path.resolve(process.argv[2] || path.join(here, '..', '..', 'RecoilSim'));
const dataDir = path.join(here, '..', 'public', 'data', 'compare');
const target = path.join(dataDir, '11.17', 'weapons.json');

const GUNS = [
  { id: 'msbs_b_7_62x39', name: 'MSBS-B 7.62x39mm', gameName: 'MSBS-B', category: 'ASSAULT RIFLE', dir: 'msbs-b_7.62x39mm', aliases: ['MSBS-B', 'MSBS B'] },
  { id: 'msbs_c_7_62x39', name: 'MSBS-C 7.62x39mm', gameName: 'MSBS-C', category: 'CARBINE', dir: 'msbs-c_7.62x39mm', aliases: ['MSBS-C', 'MSBS C'] },
];

const data = JSON.parse(fs.readFileSync(target, 'utf8'));
for (const gun of GUNS) {
  const s = JSON.parse(fs.readFileSync(path.join(recoilSim, 'data', 'reference', gun.dir, 'stats.json'), 'utf8'));
  data.weapons[gun.id] = {
    id: gun.id,
    name: gun.name,
    gameName: gun.gameName,
    category: gun.category,
    status: { base: 'WEAPON_LABS_SCREENSHOT', mobility: 'WEAPON_LABS_SCREENSHOT' },
    stats: {
      damageGraph: s.basic.damageGraph,
      multhead: s.basic.multhead,
      multtorso: s.basic.multtorso,
      rpm: s.basic.firerate,
      rpmModes: [s.basic.firerate],
      magsize: s.basic.magsize,
      chamber: s.misc.chamber === 1,
      sparerounds: s.basic.sparerounds,
      pellets: null,
      bulletspeed: s.ballistics.bulletspeed,
      penetration: s.ballistics.penetrationdepth,
      suppression: s.ballistics.suppression,
      walkspeed: s.misc.walkspeed,
      aimwalkspeed: s.misc.aimwalkspeed,
      aimspeed: s.handling.aimspeed,
      sprintspeed: s.handling.sprintspeed,
      equipspeed: s.handling.equipspeed,
      reload: { kind: 'mag', tactical: s.handling.reloadTime, full: s.handling.emptyReloadTime },
      recoilScale: 1,
    },
    aliases: gun.aliases,
  };
}
data.note = `${data.note.replace(/ \+ Weapon Labs.*$/, '')} + Weapon Labs MSBS-B / MSBS-C (screenshots)`;
fs.writeFileSync(target, JSON.stringify(data));

const versionsPath = path.join(dataDir, 'versions.json');
const versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8'));
const entry = versions.versions.find((v) => v.label === '11.17');
if (entry) entry.weapons = Object.keys(data.weapons).length;
fs.writeFileSync(versionsPath, JSON.stringify(versions));
console.log(`weapons: ${Object.keys(data.weapons).length}`);
