// Het bouwwerk "lezen": welke kamers zijn dicht, hoe groot zijn ze, waar zitten de
// deuren en hoe hoog is de hoogste toren? De bouwopdrachten gebruiken dit.

import { KAVEL } from './onderdelen';
import { muurOp, type BouwStand, type Richting } from './stand';

const B = KAVEL.breedte;
const D = KAVEL.diepte;

export interface Kamer {
  /** De vakjes van de kamer. */
  vakjes: [number, number][];
  /** Is er een deur naar buiten? */
  deurNaarBuiten: boolean;
}

export interface Plattegrond {
  kamers: Kamer[];
  /** Paren kamers (indexen) met een deur ertussen. */
  deurTussen: [number, number][];
}

/** De rand tussen twee buurvakjes (of tussen een vakje en buiten de kavel). */
function rand(x: number, z: number, dx: number, dz: number): [Richting, number, number] {
  if (dx === 1) return ['v', x + 1, z];
  if (dx === -1) return ['v', x, z];
  if (dz === 1) return ['h', x, z + 1];
  return ['h', x, z];
}

const BUREN = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

/** Kamers zijn ruimtes die helemaal dicht zijn met muren, ramen of deuren. Hekjes tellen niet. */
export function plattegrond(s: BouwStand): Plattegrond {
  const dicht = (r: Richting, x: number, z: number) => {
    const m = muurOp(s, r, x, z);
    return !!m && m.soort !== 'hek';
  };
  const deur = (r: Richting, x: number, z: number) => muurOp(s, r, x, z)?.soort === 'deur';
  const buiten: boolean[][] = Array.from({ length: B }, () => Array(D).fill(false));
  const rij: [number, number][] = [];
  // Begin bij elk randvakje waar je zonder muur van buitenaf in kunt lopen.
  for (let x = 0; x < B; x++) {
    for (let z = 0; z < D; z++) {
      const open = BUREN.some(([dx, dz]) => {
        const nx = x + dx, nz = z + dz;
        return (nx < 0 || nx >= B || nz < 0 || nz >= D) && !dicht(...rand(x, z, dx, dz));
      });
      if (open) { buiten[x][z] = true; rij.push([x, z]); }
    }
  }
  while (rij.length) {
    const [x, z] = rij.pop()!;
    for (const [dx, dz] of BUREN) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nx >= B || nz < 0 || nz >= D || buiten[nx][nz] || dicht(...rand(x, z, dx, dz))) continue;
      buiten[nx][nz] = true;
      rij.push([nx, nz]);
    }
  }
  // Wat overblijft, zijn kamers.
  const kamerVan: number[][] = Array.from({ length: B }, () => Array(D).fill(-1));
  const kamers: Kamer[] = [];
  for (let x = 0; x < B; x++) {
    for (let z = 0; z < D; z++) {
      if (buiten[x][z] || kamerVan[x][z] >= 0) continue;
      const nr = kamers.length;
      const kamer: Kamer = { vakjes: [], deurNaarBuiten: false };
      kamers.push(kamer);
      const stapel: [number, number][] = [[x, z]];
      kamerVan[x][z] = nr;
      while (stapel.length) {
        const [cx, cz] = stapel.pop()!;
        kamer.vakjes.push([cx, cz]);
        for (const [dx, dz] of BUREN) {
          const nx = cx + dx, nz = cz + dz;
          const r = rand(cx, cz, dx, dz);
          const buitenKavel = nx < 0 || nx >= B || nz < 0 || nz >= D;
          if (deur(...r) && (buitenKavel || buiten[nx][nz])) kamer.deurNaarBuiten = true;
          if (buitenKavel || buiten[nx][nz] || kamerVan[nx][nz] >= 0 || dicht(...r)) continue;
          kamerVan[nx][nz] = nr;
          stapel.push([nx, nz]);
        }
      }
    }
  }
  const deurTussen: [number, number][] = [];
  for (const m of s.muren) {
    if (m.soort !== 'deur') continue;
    const [a, b] = m.r === 'v' ? [[m.x - 1, m.z], [m.x, m.z]] : [[m.x, m.z - 1], [m.x, m.z]];
    const ka = a[0] >= 0 && a[0] < B && a[1] >= 0 && a[1] < D ? kamerVan[a[0]][a[1]] : -1;
    const kb = b[0] >= 0 && b[0] < B && b[1] >= 0 && b[1] < D ? kamerVan[b[0]][b[1]] : -1;
    if (ka >= 0 && kb >= 0 && ka !== kb) deurTussen.push([Math.min(ka, kb), Math.max(ka, kb)]);
  }
  return { kamers, deurTussen };
}

/** Is deze kamer een rechthoek van b bij d vakjes (in een van beide richtingen)? */
export function isRechthoek(vakjes: [number, number][], b: number, d: number): boolean {
  if (vakjes.length !== b * d) return false;
  const xs = vakjes.map(([x]) => x), zs = vakjes.map(([, z]) => z);
  const w = Math.max(...xs) - Math.min(...xs) + 1, h = Math.max(...zs) - Math.min(...zs) + 1;
  return (w === b && h === d) || (w === d && h === b);
}

/** Een vorm zonder plek: schuif naar 0,0 en sorteer. */
function normaal(vakjes: readonly (readonly [number, number])[]): string {
  const mx = Math.min(...vakjes.map(([x]) => x)), mz = Math.min(...vakjes.map(([, z]) => z));
  return vakjes.map(([x, z]) => `${x - mx},${z - mz}`).sort().join(' ');
}

/** Heeft de kamer dezelfde vorm als de tekening? Draaien mag. */
export function zelfdeVorm(vakjes: readonly (readonly [number, number])[], tekening: readonly (readonly [number, number])[]): boolean {
  if (vakjes.length !== tekening.length) return false;
  const doel = normaal(vakjes);
  let vorm = tekening.map(([x, z]) => [x, z] as [number, number]);
  for (let i = 0; i < 4; i++) {
    if (normaal(vorm) === doel) return true;
    vorm = vorm.map(([x, z]) => [-z, x]);
  }
  return false;
}

/** De hoogste stapel blokken. */
export function hoogsteToren(s: BouwStand): number {
  const hoogtes = new Map<string, number>();
  for (const b of s.blokken) hoogtes.set(`${b.x},${b.z}`, Math.max(hoogtes.get(`${b.x},${b.z}`) ?? 0, b.y + 1));
  return Math.max(0, ...hoogtes.values());
}

/** Het aantal muurstukken (muren, ramen, deuren) rond een kamer: de omtrek in vakjes. */
export function omtrek(vakjes: [number, number][]): number {
  const set = new Set(vakjes.map(([x, z]) => `${x},${z}`));
  let n = 0;
  for (const [x, z] of vakjes) for (const [dx, dz] of BUREN) if (!set.has(`${x + dx},${z + dz}`)) n++;
  return n;
}
