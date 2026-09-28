// Herhaalbakjes (Leitner-systeem): goed gespeld schuift een bakje op,
// fout gaat terug naar bakje 1. Lage bakjes komen vaker terug.

import type { Categorie, Woordkaart } from './woorden';

export const AANTAL_BAKJES = 5;
export const DAG = 24 * 60 * 60 * 1000;
const HERHAALDAGEN = [0, 1, 3, 7, 14];

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
    // Extra oefenen op dezelfde dag is fijn, maar bewijst nog geen langdurige beheersing.
    bakje: goed ? (stat && nu < volgendeHerhaling(stat) ? huidig.bakje : Math.min(AANTAL_BAKJES, huidig.bakje + 1)) : 1,
    goed: huidig.goed + (goed ? 1 : 0),
    fout: huidig.fout + (goed ? 0 : 1),
    laatst: goed && stat && nu < volgendeHerhaling(stat) ? huidig.laatst : nu,
  };
}

const GEWICHT_PER_BAKJE = [8, 5, 3, 2, 1];
const GEWICHT_NIEUW = 4;

/** Hoe groot de kans is dat een woord gekozen wordt. */
export function volgendeHerhaling(stat: WoordStat): number {
  return stat.laatst + (HERHAALDAGEN[stat.bakje - 1] ?? 0) * DAG;
}

export function aanHerhalingToe(stat: WoordStat | undefined, nu = Date.now()): boolean {
  return !stat || nu >= volgendeHerhaling(stat);
}

export function gewicht(stat: WoordStat | undefined, nu = Date.now()): number {
  if (!stat) return GEWICHT_NIEUW;
  const basis = GEWICHT_PER_BAKJE[stat.bakje - 1] ?? 1;
  return aanHerhalingToe(stat, nu) ? basis : basis * 0.05;
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
  nu = Date.now(),
): Woordkaart[] {
  const pool = kaarten.filter((k) => !categorieen || categorieen.includes(k.categorie));
  const gekozen: Woordkaart[] = [];
  while (gekozen.length < aantal && pool.length > 0) {
    // Eerst nieuwe woorden en woorden waarvan de herhaaldag is aangebroken.
    const kandidaten = pool.filter((k) => aanHerhalingToe(stats[k.woord], nu));
    const selectie = kandidaten.length ? kandidaten : pool;
    const gewichten = selectie.map((k) => gewicht(stats[k.woord], nu));
    const totaal = gewichten.reduce((a, b) => a + b, 0);
    let r = rng() * totaal;
    let index = 0;
    while (index < selectie.length - 1 && r >= gewichten[index]) {
      r -= gewichten[index];
      index++;
    }
    const kaart = selectie[index];
    gekozen.push(kaart);
    pool.splice(pool.indexOf(kaart), 1);
  }
  return gekozen;
}
