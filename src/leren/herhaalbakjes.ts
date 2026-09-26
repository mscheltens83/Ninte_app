// Herhaalbakjes (Leitner-systeem): goed gespeld schuift een bakje op,
// fout gaat terug naar bakje 1. Lage bakjes komen vaker terug.

import type { Categorie, Woordkaart } from './woorden';

export const AANTAL_BAKJES = 5;

export interface WoordStat {
  bakje: number;
  goed: number;
  fout: number;
  laatst: number;
}

export type WoordStats = Record<string, WoordStat>;

export function verwerkAntwoord(stat: WoordStat | undefined, goed: boolean, nu: number): WoordStat {
  const huidig = stat ?? { bakje: 1, goed: 0, fout: 0, laatst: 0 };
  return {
    bakje: goed ? Math.min(AANTAL_BAKJES, huidig.bakje + 1) : 1,
    goed: huidig.goed + (goed ? 1 : 0),
    fout: huidig.fout + (goed ? 0 : 1),
    laatst: nu,
  };
}

const GEWICHT_PER_BAKJE = [8, 5, 3, 2, 1];
const GEWICHT_NIEUW = 4;

/** Hoe groot de kans is dat een woord gekozen wordt. */
export function gewicht(stat: WoordStat | undefined): number {
  if (!stat) return GEWICHT_NIEUW;
  return GEWICHT_PER_BAKJE[stat.bakje - 1] ?? 1;
}

/**
 * Kiest `aantal` verschillende woorden. Woorden uit lage bakjes (vaak fout)
 * hebben meer kans, maar makkelijke woorden komen ook langs.
 */
export function kiesWoorden(
  kaarten: Woordkaart[],
  stats: WoordStats,
  aantal: number,
  categorieen?: Categorie[],
  rng: () => number = Math.random,
): Woordkaart[] {
  const pool = kaarten.filter((k) => !categorieen || categorieen.includes(k.categorie));
  const gekozen: Woordkaart[] = [];
  while (gekozen.length < aantal && pool.length > 0) {
    const gewichten = pool.map((k) => gewicht(stats[k.woord]));
    const totaal = gewichten.reduce((a, b) => a + b, 0);
    let r = rng() * totaal;
    let index = 0;
    while (index < pool.length - 1 && r >= gewichten[index]) {
      r -= gewichten[index];
      index++;
    }
    gekozen.push(pool.splice(index, 1)[0]);
  }
  return gekozen;
}
