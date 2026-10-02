// Heuvels en bergen in blokjesstijl. Een heuvel bestaat uit lagen van een halve meter:
// daar loop je gewoon tegenop. Een berg (steil) heeft hoge treden; die beklim je springend.
// Elke laag is een paar rechthoeken over elkaar, zodat de vorm rond oogt.
//
// Een nieuwe heuvel? Zet een regel in de lijst van de wereld (landschap.ts voor het
// vasteland, rijland.ts voor het Rijland).

import { botserUitBlok, type Fysica } from '../spel/fysica';
import { blokOp, zaadRng } from './bouwstenen';
import type * as THREE from 'three';

export interface Heuvel {
  x: number;
  z: number;
  /** Straal van de onderste laag. */
  straal: number;
  hoogte: number;
  /** Kleuren van de lagen (om en om). */
  kleuren: readonly string[];
  /** Kleur van de bovenste lagen (bijv. sneeuw). */
  top?: string;
  /** Steil = een berg met hoge treden. */
  steil?: boolean;
}

export interface Laag { x: number; z: number; b: number; d: number; top: number; kleur: string }

/** Zo hoog is één laag: een heuvel loop je op, een berg spring je op. */
export const HEUVEL_TREDE = 0.5;
export const BERG_TREDE = 2;

/** De rechthoeken waaruit een heuvel bestaat. */
export function heuvelLagen(h: Heuvel): Laag[] {
  const stap = h.steil ? BERG_TREDE : HEUVEL_TREDE;
  const n = Math.max(1, Math.round(h.hoogte / stap));
  const rng = zaadRng(Math.round(h.x * 31 + h.z * 17 + h.straal * 7));
  const lagen: Laag[] = [];
  for (let i = 0; i < n; i++) {
    const f = 1 - i / n;
    const r = Math.max(0.8, h.straal * f ** (h.steil ? 1 : 0.75));
    const verschuif = h.straal * 0.12 * (i / n);
    const cx = h.x + (rng() - 0.5) * verschuif, cz = h.z + (rng() - 0.5) * verschuif;
    const top = (i + 1) * stap;
    const kleur = h.top && i >= n - 2 ? h.top : h.kleuren[i % h.kleuren.length];
    lagen.push({ x: cx, z: cz, b: 2 * r, d: 1.25 * r, top, kleur });
    lagen.push({ x: cx, z: cz, b: 1.25 * r, d: 2 * r, top, kleur });
    lagen.push({ x: cx, z: cz, b: 1.7 * r, d: 1.7 * r, top, kleur });
  }
  return lagen;
}

/** Hoe ver een heuvel ongeveer reikt vanaf het midden (veilige straal). */
export function voetafdruk(h: Heuvel): number {
  return h.straal * 1.3;
}

/** De hoogte van de heuvels op dit punt (0 als er geen heuvel is). */
export function hoogteOp(lagen: readonly Laag[], x: number, z: number): number {
  let hoogste = 0;
  for (const l of lagen) if (l.top > hoogste && Math.abs(x - l.x) <= l.b / 2 && Math.abs(z - l.z) <= l.d / 2) hoogste = l.top;
  return hoogste;
}

/** Ligt dit punt binnen (of vlak bij) een heuvel? */
export function opHeuvel(heuvels: readonly Heuvel[], x: number, z: number, marge = 0): boolean {
  return heuvels.some((h) => Math.hypot(x - h.x, z - h.z) < voetafdruk(h) + marge);
}

/** Bouw de heuvels: blokken om te zien en botsblokken om op te lopen. Geeft de lagen terug. */
export function bouwHeuvels(g: THREE.Group, f: Fysica, heuvels: readonly Heuvel[]): Laag[] {
  const alle = heuvels.flatMap(heuvelLagen);
  for (const l of alle) {
    g.add(blokOp(l.b, l.top, l.d, l.kleur, l.x, 0, l.z));
    f.voegToe(botserUitBlok(l.x, l.top / 2, l.z, l.b, l.top, l.d));
  }
  return alle;
}
