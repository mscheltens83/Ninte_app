// De race rond de Reuzenboom: na het aftellen rijd je zo snel mogelijk door alle
// ringen. Sneller dier = betere tijd. Brons, zilver en goud hangen af van de lengte
// van de baan.

import type { Vec3 } from '../spel/fysica';
import { RANCH, RINGEN, RING_HOOGTE } from './rijland';

const LOOPSNELHEID = 8;
const AFTELLEN = 3;
/** Na zoveel seconden stopt een race vanzelf. */
const MAX_TIJD = 180;

export function baanLengte(): number {
  let lengte = 0;
  let vorige: { x: number; z: number } = RANCH.start;
  for (const r of RINGEN) {
    lengte += Math.hypot(r.x - vorige.x, r.z - vorige.z);
    vorige = r;
  }
  return lengte;
}

/** Tijden voor brons, zilver en goud (seconden). Lopen haalt brons, een snel dier goud. */
export function medailleTijden(): [number, number, number] {
  const l = baanLengte();
  return [l / (LOOPSNELHEID * 0.85), l / (LOOPSNELHEID * 1.2), l / (LOOPSNELHEID * 1.6)];
}

/** 0 = geen medaille, 1 brons, 2 zilver, 3 goud. */
export function medailleVoor(tijd: number): number {
  const [brons, zilver, goud] = medailleTijden();
  return tijd <= goud ? 3 : tijd <= zilver ? 2 : tijd <= brons ? 1 : 0;
}

export const MEDAILLES = ['', '🥉 Brons', '🥈 Zilver', '🥇 Goud'] as const;

export type RaceGebeurtenis =
  | { soort: 'tel'; getal: number }
  | { soort: 'start' }
  | { soort: 'ring'; nr: number; van: number }
  | { soort: 'finish'; tijd: number }
  | { soort: 'gestopt' };

export class Race {
  private fase: 'uit' | 'aftellen' | 'rijden' = 'uit';
  private klok = 0;
  private volgende = 0;
  private laatsteTel = 0;

  get bezig(): boolean {
    return this.fase !== 'uit';
  }

  /** De ring waar je nu doorheen moet (of null). */
  get doelRing(): number | null {
    return this.fase === 'rijden' ? this.volgende : null;
  }

  get tijd(): number {
    return this.fase === 'rijden' ? this.klok : 0;
  }

  start() {
    this.fase = 'aftellen';
    this.klok = AFTELLEN;
    this.volgende = 0;
    this.laatsteTel = AFTELLEN + 1;
  }

  stop(): RaceGebeurtenis[] {
    const was = this.bezig;
    this.fase = 'uit';
    return was ? [{ soort: 'gestopt' }] : [];
  }

  update(dt: number, p: Vec3): RaceGebeurtenis[] {
    const uit: RaceGebeurtenis[] = [];
    if (this.fase === 'aftellen') {
      this.klok -= dt;
      const tel = Math.ceil(this.klok);
      if (tel < this.laatsteTel && tel > 0) uit.push({ soort: 'tel', getal: tel });
      this.laatsteTel = tel;
      if (this.klok <= 0) {
        this.fase = 'rijden';
        this.klok = 0;
        uit.push({ soort: 'start' });
      }
      return uit;
    }
    if (this.fase !== 'rijden') return uit;
    this.klok += dt;
    if (this.klok > MAX_TIJD) return this.stop();
    const r = RINGEN[this.volgende];
    if (Math.hypot(p.x - r.x, p.z - r.z) < RING_HOOGTE + 0.6 && p.y < RING_HOOGTE * 2 + 1) {
      this.volgende++;
      if (this.volgende >= RINGEN.length) {
        this.fase = 'uit';
        uit.push({ soort: 'finish', tijd: Math.round(this.klok * 100) / 100 });
      } else {
        uit.push({ soort: 'ring', nr: this.volgende, van: RINGEN.length });
      }
    }
    return uit;
  }
}
