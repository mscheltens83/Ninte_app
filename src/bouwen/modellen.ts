// De 3D-modellen van muren, blokken en meubels, gemaakt van blokjes.
// Een nieuw meubel? Zet een functie in MEUBEL_MODELLEN met dezelfde id als in
// onderdelen.ts. Het model staat midden op zijn vakjes, met de voorkant naar +z.

import * as THREE from 'three';
import { blokOp } from '../wereld/bouwstenen';
import { KAVEL, MUUR_HOOGTE, kleurHex, type MuurSoort } from './onderdelen';

const C = KAVEL.cel;
const DIK = 0.2;

const glas = new THREE.MeshStandardMaterial({ color: '#bfe9ff', transparent: true, opacity: 0.45, roughness: 0.1 });
const water = new THREE.MeshStandardMaterial({ color: '#4fc3ff', transparent: true, opacity: 0.75, roughness: 0.15, emissive: '#0b5c8a', emissiveIntensity: 0.25 });
const lampLicht = new Map<string, THREE.MeshStandardMaterial>();
function gloei(hex: string): THREE.MeshStandardMaterial {
  let m = lampLicht.get(hex);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.6, roughness: 0.4 });
    lampLicht.set(hex, m);
  }
  return m;
}

/** Een muurstuk langs x, gecentreerd op de rand. Draai 90° voor een staande rand. */
export function muurModel(soort: MuurSoort, kleur: string): THREE.Group {
  const g = new THREE.Group();
  const k = kleurHex(kleur);
  const L = C + DIK;
  const H = MUUR_HOOGTE;
  switch (soort) {
    case 'muur':
      g.add(blokOp(L, H, DIK, k, 0, 0, 0));
      g.add(blokOp(L + 0.02, 0.12, DIK + 0.04, '#ffffff', 0, H - 0.12, 0, false));
      break;
    case 'raam':
      g.add(blokOp(L, 1, DIK, k, 0, 0, 0));
      g.add(blokOp(L, H - 2.2, DIK, k, 0, 2.2, 0));
      for (const x of [-L / 2 + 0.15, L / 2 - 0.15]) g.add(blokOp(0.3, 1.2, DIK, k, x, 1, 0));
      g.add(blokOp(L - 0.6, 1.2, 0.05, glas, 0, 1, 0, false));
      g.add(blokOp(L - 0.5, 0.08, DIK + 0.12, '#ffffff', 0, 1, 0, false));
      break;
    case 'deur':
      for (const x of [-L / 2 + 0.1, L / 2 - 0.1]) g.add(blokOp(0.2, H, DIK, k, x, 0, 0));
      g.add(blokOp(L, H - 2.5, DIK, k, 0, 2.5, 0));
      g.add(blokOp(L - 0.4, 0.04, 0.6, '#f4d36b', 0, 0, 0.35, false)); // welkomstmatje
      break;
    case 'hek':
      for (const x of [-L / 2 + 0.08, 0, L / 2 - 0.08]) g.add(blokOp(0.14, 1.05, 0.14, k, x, 0, 0));
      for (const y of [0.35, 0.8]) g.add(blokOp(L, 0.1, 0.08, k, 0, y, 0));
      break;
  }
  return g;
}

/** Welke botsblokken een muurstuk heeft (lokaal: x langs de muur), als [x, y, b, h]. */
export function muurBotsing(soort: MuurSoort): [number, number, number, number][] {
  const L = C + DIK;
  switch (soort) {
    case 'muur': case 'raam': return [[0, 0, L, MUUR_HOOGTE]];
    case 'hek': return [[0, 0, L, 1.05]];
    case 'deur': return [[-L / 2 + 0.1, 0, 0.2, MUUR_HOOGTE], [L / 2 - 0.1, 0, 0.2, MUUR_HOOGTE], [0, 2.5, L, MUUR_HOOGTE - 2.5]];
  }
}

type Bouwer = (k: string, b: number, d: number) => THREE.Object3D[];

const poten = (b: number, d: number, h: number, kleur: string, inspring = 0.15) =>
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => blokOp(0.12, h, 0.12, kleur, sx * (b / 2 - inspring), 0, sz * (d / 2 - inspring)));

export const MEUBEL_MODELLEN: Record<string, Bouwer> = {
  tafel: (k) => [blokOp(1.25, 0.12, 1.25, k, 0, 0.72, 0), ...poten(1.25, 1.25, 0.72, k)],
  stoel: (k) => [blokOp(0.7, 0.12, 0.7, k, 0, 0.42, 0), blokOp(0.7, 0.75, 0.12, k, 0, 0.54, -0.3), ...poten(0.7, 0.7, 0.42, '#8a5a3c', 0.08)],
  bed: (k, _b, d) => [
    blokOp(1.3, 0.3, d - 0.2, '#c68b59', 0, 0, 0),
    blokOp(1.2, 0.2, d - 0.3, '#ffffff', 0, 0.3, 0),
    blokOp(1.22, 0.12, d * 0.6, k, 0, 0.5, d * 0.15),
    blokOp(0.8, 0.15, 0.4, '#fff3fa', 0, 0.5, -d / 2 + 0.45),
    blokOp(1.3, 0.8, 0.12, '#c68b59', 0, 0, -d / 2 + 0.16),
  ],
  lamp: (k) => [blokOp(0.4, 0.06, 0.4, '#5b4a3d', 0, 0, 0), blokOp(0.08, 1.3, 0.08, '#5b4a3d', 0, 0.06, 0), blokOp(0.55, 0.45, 0.55, gloei(kleurHex(k)), 0, 1.3, 0)],
  plant: () => [blokOp(0.5, 0.45, 0.5, '#d9774a', 0, 0, 0), blokOp(0.15, 0.4, 0.15, '#3d8b37', 0, 0.45, 0), blokOp(0.6, 0.4, 0.6, '#46b45a', 0, 0.75, 0), blokOp(0.35, 0.3, 0.35, '#5fd06d', 0.1, 1.1, 0.05)],
  kleed: (k, b, d) => [blokOp(b - 0.3, 0.03, d - 0.3, '#ffffff', 0, 0, 0, false), blokOp(b - 0.5, 0.035, d - 0.5, k, 0, 0.002, 0, false)],
  bank: (k, b) => [
    blokOp(b - 0.2, 0.45, 1.1, k, 0, 0, 0.05),
    blokOp(b - 0.2, 0.6, 0.25, k, 0, 0.45, -0.38),
    blokOp(0.25, 0.3, 1.1, k, -b / 2 + 0.22, 0.45, 0.05),
    blokOp(0.25, 0.3, 1.1, k, b / 2 - 0.22, 0.45, 0.05),
    blokOp((b - 0.7) / 2, 0.12, 0.7, '#ffffff', -(b - 0.7) / 4 - 0.05, 0.45, 0.12),
    blokOp((b - 0.7) / 2, 0.12, 0.7, '#ffffff', (b - 0.7) / 4 + 0.05, 0.45, 0.12),
  ],
  tv: () => [blokOp(1.1, 0.5, 0.5, '#8a5a3c', 0, 0, -0.2), blokOp(1.3, 0.8, 0.08, '#1d1830', 0, 0.55, -0.25), blokOp(1.18, 0.68, 0.02, gloei('#5fd3ff'), 0, 0.61, -0.2)],
  kast: (k) => [blokOp(1.2, 2.2, 0.6, k, 0, 0, -0.35), blokOp(0.02, 2, 0.02, '#ffffff', 0, 0.1, -0.04), blokOp(0.06, 0.25, 0.06, '#f4d36b', -0.12, 1.05, -0.03), blokOp(0.06, 0.25, 0.06, '#f4d36b', 0.12, 1.05, -0.03)],
  bad: (_k, _b, d) => [blokOp(1.3, 0.6, d - 0.2, '#ffffff', 0, 0, 0), blokOp(1.0, 0.04, d - 0.5, water, 0, 0.52, 0, false), blokOp(0.12, 0.4, 0.12, '#c8ccd8', 0, 0.6, -d / 2 + 0.25)],
  bloembak: (k) => [
    blokOp(1.2, 0.45, 1.2, k, 0, 0, 0),
    ...[[-0.3, -0.3, '#ff5fa2'], [0.3, -0.3, '#ffd23f'], [-0.3, 0.3, '#a36bff'], [0.3, 0.3, '#ff8a3d'], [0, 0, '#ffffff']].flatMap(([x, z, kleur]) =>
      [blokOp(0.06, 0.35, 0.06, '#3d8b37', x as number, 0.45, z as number), blokOp(0.22, 0.18, 0.22, kleur as string, x as number, 0.78, z as number)]),
  ],
  boom: () => [blokOp(0.4, 2, 0.4, '#85613b', 0, 0, 0), blokOp(1.6, 1.4, 1.6, '#47a35c', 0, 1.8, 0), blokOp(1, 0.8, 1, '#5fc06d', 0, 3.1, 0), blokOp(0.2, 0.2, 0.05, '#ff4f6d', 0.5, 2.3, 0.81), blokOp(0.2, 0.2, 0.05, '#ff4f6d', -0.4, 2.7, 0.81)],
  schommel: (k, b) => [
    ...[-1, 1].flatMap((s) => [blokOp(0.15, 2.4, 0.15, '#c68b59', s * (b / 2 - 0.2), 0, -0.45), blokOp(0.15, 2.4, 0.15, '#c68b59', s * (b / 2 - 0.2), 0, 0.45)]),
    blokOp(b - 0.3, 0.15, 0.15, '#c68b59', 0, 2.4, 0),
    ...[-0.5, 0.5].flatMap((x) => [blokOp(0.04, 1.8, 0.04, '#dddddd', x - 0.25, 0.6, 0), blokOp(0.04, 1.8, 0.04, '#dddddd', x + 0.25, 0.6, 0), blokOp(0.6, 0.08, 0.35, k, x, 0.55, 0)]),
  ],
  zwembad: (_k, b, d) => [
    blokOp(b, 0.5, 0.25, '#f6f1ff', 0, 0, -d / 2 + 0.125),
    blokOp(b, 0.5, 0.25, '#f6f1ff', 0, 0, d / 2 - 0.125),
    blokOp(0.25, 0.5, d, '#f6f1ff', -b / 2 + 0.125, 0, 0),
    blokOp(0.25, 0.5, d, '#f6f1ff', b / 2 - 0.125, 0, 0),
    blokOp(b - 0.5, 0.03, d - 0.5, '#5ad1ff', 0, 0.01, 0, false),
    blokOp(b - 0.5, 0.05, d - 0.5, water, 0, 0.38, 0, false),
    blokOp(0.5, 0.12, 0.5, '#ff5fa2', b / 4, 0.42, 0, false), // een opblaasbeestje
  ],
};

/** Het model van een meubel. Zonder eigen model: een gekleurd blok. */
export function meubelModel(id: string, kleur: string, breedte: number, diepte: number): THREE.Group {
  const g = new THREE.Group();
  const b = breedte * C, d = diepte * C;
  const k = kleurHex(kleur);
  const maak = MEUBEL_MODELLEN[id];
  if (maak) g.add(...maak(k, b, d));
  else g.add(blokOp(b - 0.2, 0.8, d - 0.2, k, 0, 0, 0));
  return g;
}

/** Een stapelblok, met een wit randje bovenop zodat je de blokken goed ziet. */
export function blokModel(kleur: string): THREE.Group {
  const g = new THREE.Group();
  g.add(blokOp(C, C, C, kleurHex(kleur), 0, 0, 0));
  g.add(blokOp(C + 0.02, 0.06, C + 0.02, '#ffffff', 0, C - 0.06, 0, false));
  return g;
}
