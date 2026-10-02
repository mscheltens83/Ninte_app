// Wat er op de bouwkavel staat, en de regels om iets te plaatsen of weg te halen.
// Alles hier is gewone logica zonder 3D, zodat het makkelijk te testen is.
//
// Vakjes hebben coördinaten x (0..breedte-1) en z (0..diepte-1).
// Muren staan op de randen tussen vakjes:
//   'h' (x, z): een liggende rand langs x, boven vakje (x, z)   — z loopt van 0 t/m diepte
//   'v' (x, z): een staande rand langs z, links van vakje (x, z) — x loopt van 0 t/m breedte

import { KAVEL, KLEUR_IDS, MAX_BLOK_HOOGTE, isMeubel, isMuurSoort, onderdeel, type KleurId, type MeubelId, type MuurSoort } from './onderdelen';

export type Richting = 'h' | 'v';
export interface Muur { r: Richting; x: number; z: number; soort: MuurSoort; kleur: KleurId }
export interface Vloer { x: number; z: number; kleur: KleurId }
export interface Meubel { id: MeubelId; x: number; z: number; draai: number; kleur: KleurId }
export interface Blok { x: number; z: number; y: number; kleur: KleurId }

export interface BouwStand {
  muren: Muur[];
  vloer: Vloer[];
  meubels: Meubel[];
  blokken: Blok[];
  dak: boolean;
  dakKleur: KleurId;
  /** Voltooide bouwopdrachten. */
  voltooid: string[];
  /** Goede antwoorden op de rekenvragen van opdrachten. */
  antwoorden: Record<string, number>;
}

export const MAX = { muren: 500, meubels: 150, blokken: 700 } as const;
const B = KAVEL.breedte;
const D = KAVEL.diepte;

export function nieuweBouw(): BouwStand {
  return { muren: [], vloer: [], meubels: [], blokken: [], dak: false, dakKleur: 'roze', voltooid: [], antwoorden: {} };
}

export function geldigeRand(r: Richting, x: number, z: number): boolean {
  if (!Number.isInteger(x) || !Number.isInteger(z)) return false;
  return r === 'h' ? x >= 0 && x < B && z >= 0 && z <= D : x >= 0 && x <= B && z >= 0 && z < D;
}

export function inRaster(x: number, z: number): boolean {
  return Number.isInteger(x) && Number.isInteger(z) && x >= 0 && x < B && z >= 0 && z < D;
}

export function muurOp(s: BouwStand, r: Richting, x: number, z: number): Muur | undefined {
  return s.muren.find((m) => m.r === r && m.x === x && m.z === z);
}

/** Zet een muur (of deur, raam, hek) op een rand. Een bestaande muur wordt vervangen. */
export function plaatsMuur(s: BouwStand, r: Richting, x: number, z: number, soort: MuurSoort, kleur: KleurId): boolean {
  if (!geldigeRand(r, x, z)) return false;
  const oud = muurOp(s, r, x, z);
  if (oud) {
    if (oud.soort === soort && oud.kleur === kleur) return false;
    oud.soort = soort;
    oud.kleur = kleur;
    return true;
  }
  if (s.muren.length >= MAX.muren) return false;
  s.muren.push({ r, x, z, soort, kleur });
  return true;
}

export function haalMuurWeg(s: BouwStand, r: Richting, x: number, z: number): boolean {
  const i = s.muren.findIndex((m) => m.r === r && m.x === x && m.z === z);
  if (i < 0) return false;
  s.muren.splice(i, 1);
  return true;
}

export function vloerOp(s: BouwStand, x: number, z: number): Vloer | undefined {
  return s.vloer.find((v) => v.x === x && v.z === z);
}

export function plaatsVloer(s: BouwStand, x: number, z: number, kleur: KleurId): boolean {
  if (!inRaster(x, z)) return false;
  const oud = vloerOp(s, x, z);
  if (oud) {
    if (oud.kleur === kleur) return false;
    oud.kleur = kleur;
    return true;
  }
  s.vloer.push({ x, z, kleur });
  return true;
}

export function haalVloerWeg(s: BouwStand, x: number, z: number): boolean {
  const i = s.vloer.findIndex((v) => v.x === x && v.z === z);
  if (i < 0) return false;
  s.vloer.splice(i, 1);
  return true;
}

/** Breedte en diepte van een meubel na draaien. */
export function meubelMaat(id: MeubelId, draai: number): [number, number] {
  const [b, d] = onderdeel(id)?.maat ?? [1, 1];
  return draai % 2 === 0 ? [b, d] : [d, b];
}

/** De vakjes waar een meubel op staat. */
export function meubelVakjes(m: Pick<Meubel, 'id' | 'x' | 'z' | 'draai'>): [number, number][] {
  const [b, d] = meubelMaat(m.id, m.draai);
  const uit: [number, number][] = [];
  for (let dx = 0; dx < b; dx++) for (let dz = 0; dz < d; dz++) uit.push([m.x + dx, m.z + dz]);
  return uit;
}

export function meubelOp(s: BouwStand, x: number, z: number): Meubel | undefined {
  return s.meubels.find((m) => meubelVakjes(m).some(([a, b]) => a === x && b === z));
}

export function blokHoogte(s: BouwStand, x: number, z: number): number {
  return s.blokken.filter((b) => b.x === x && b.z === z).length;
}

function vrijVoorMeubel(s: BouwStand, m: Pick<Meubel, 'id' | 'x' | 'z' | 'draai'>, behalve?: Meubel): boolean {
  return meubelVakjes(m).every(([x, z]) =>
    inRaster(x, z) && blokHoogte(s, x, z) === 0 && s.meubels.every((o) => o === behalve || !meubelVakjes(o).some(([a, b]) => a === x && b === z)));
}

/**
 * Zet een meubel met zijn hoek op vakje (x, z). Past het niet tegen de rand,
 * dan schuift het vanzelf naar binnen. Geeft het geplaatste meubel terug.
 */
export function plaatsMeubel(s: BouwStand, id: MeubelId, x: number, z: number, draai: number, kleur: KleurId): Meubel | null {
  if (!inRaster(x, z) || s.meubels.length >= MAX.meubels) return null;
  const [b, d] = meubelMaat(id, draai);
  const m: Meubel = { id, x: Math.min(x, B - b), z: Math.min(z, D - d), draai: ((draai % 4) + 4) % 4, kleur };
  if (!vrijVoorMeubel(s, m)) return null;
  s.meubels.push(m);
  return m;
}

/** Een kwartslag draaien, als er plek is. */
export function draaiMeubel(s: BouwStand, m: Meubel): boolean {
  const nieuw = { ...m, draai: (m.draai + 1) % 4 };
  const [b, d] = meubelMaat(m.id, nieuw.draai);
  nieuw.x = Math.min(nieuw.x, B - b);
  nieuw.z = Math.min(nieuw.z, D - d);
  if (!vrijVoorMeubel(s, nieuw, m)) return false;
  Object.assign(m, nieuw);
  return true;
}

export function haalMeubelWeg(s: BouwStand, m: Meubel): boolean {
  const i = s.meubels.indexOf(m);
  if (i < 0) return false;
  s.meubels.splice(i, 1);
  return true;
}

/** Een blok bovenop de stapel van dit vakje. */
export function plaatsBlok(s: BouwStand, x: number, z: number, kleur: KleurId): boolean {
  if (!inRaster(x, z) || s.blokken.length >= MAX.blokken || meubelOp(s, x, z)) return false;
  const y = blokHoogte(s, x, z);
  if (y >= MAX_BLOK_HOOGTE) return false;
  s.blokken.push({ x, z, y, kleur });
  return true;
}

/** Het bovenste blok van dit vakje weghalen. */
export function haalBlokWeg(s: BouwStand, x: number, z: number): boolean {
  const y = blokHoogte(s, x, z) - 1;
  if (y < 0) return false;
  s.blokken.splice(s.blokken.findIndex((b) => b.x === x && b.z === z && b.y === y), 1);
  return true;
}

export function kopieBouw(s: BouwStand): BouwStand {
  return JSON.parse(JSON.stringify(s)) as BouwStand;
}

/** Alleen geldige, bekende gegevens overnemen. Oude spelstanden zonder bouwkavel blijven werken. */
export function valideerBouw(data: unknown): { stand: BouwStand; aangepast: boolean } {
  const stand = nieuweBouw();
  if (data === undefined) return { stand, aangepast: false };
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { stand, aangepast: true };
  const r = data as Record<string, unknown>;
  let aangepast = false;
  const kleur = (v: unknown): v is KleurId => typeof v === 'string' && (KLEUR_IDS as string[]).includes(v);
  const lijst = (k: string): Record<string, unknown>[] => {
    const v = r[k];
    if (v === undefined) return [];
    if (!Array.isArray(v)) { aangepast = true; return []; }
    return v.filter((x): x is Record<string, unknown> => {
      const ok = !!x && typeof x === 'object' && !Array.isArray(x);
      if (!ok) aangepast = true;
      return ok;
    });
  };
  for (const m of lijst('muren')) {
    if ((m.r === 'h' || m.r === 'v') && typeof m.soort === 'string' && isMuurSoort(m.soort) && kleur(m.kleur)
      && plaatsMuur(stand, m.r, m.x as number, m.z as number, m.soort, m.kleur)) continue;
    aangepast = true;
  }
  for (const v of lijst('vloer')) {
    if (kleur(v.kleur) && plaatsVloer(stand, v.x as number, v.z as number, v.kleur)) continue;
    aangepast = true;
  }
  for (const m of lijst('meubels')) {
    const draai = m.draai;
    if (typeof m.id === 'string' && isMeubel(m.id) && kleur(m.kleur) && Number.isInteger(draai) && (draai as number) >= 0 && (draai as number) <= 3) {
      const geplaatst = plaatsMeubel(stand, m.id, m.x as number, m.z as number, draai as number, m.kleur);
      if (geplaatst && geplaatst.x === m.x && geplaatst.z === m.z) continue;
      if (geplaatst) haalMeubelWeg(stand, geplaatst);
    }
    aangepast = true;
  }
  // Blokken van onder naar boven, zodat elke stapel weer klopt.
  for (const b of lijst('blokken').sort((a, c) => Number(a.y) - Number(c.y))) {
    if (kleur(b.kleur) && Number.isInteger(b.y) && blokHoogte(stand, b.x as number, b.z as number) === b.y
      && plaatsBlok(stand, b.x as number, b.z as number, b.kleur)) continue;
    aangepast = true;
  }
  if (typeof r.dak === 'boolean') stand.dak = r.dak;
  else if (r.dak !== undefined) aangepast = true;
  if (kleur(r.dakKleur)) stand.dakKleur = r.dakKleur;
  else if (r.dakKleur !== undefined) aangepast = true;
  if (Array.isArray(r.voltooid)) {
    const netjes = r.voltooid.filter((v): v is string => typeof v === 'string' && /^[a-z0-9-]{1,40}$/.test(v));
    if (netjes.length !== r.voltooid.length) aangepast = true;
    stand.voltooid = [...new Set(netjes)].slice(0, 100);
  } else if (r.voltooid !== undefined) aangepast = true;
  if (r.antwoorden && typeof r.antwoorden === 'object' && !Array.isArray(r.antwoorden)) {
    for (const [k, v] of Object.entries(r.antwoorden as Record<string, unknown>)) {
      if (/^[a-z0-9-]{1,40}$/.test(k) && typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e6) stand.antwoorden[k] = v;
      else aangepast = true;
    }
  } else if (r.antwoorden !== undefined) aangepast = true;
  return { stand, aangepast };
}
