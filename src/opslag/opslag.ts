// Voortgang bewaren op het apparaat zelf. Er gaat niets naar internet.

import type { WoordStats } from '../leren/herhaalbakjes';

export interface DierKeuze {
  naam: string;
  kleur: string;
}

export interface Spelstand {
  versie: 1;
  speler: string;
  pony: DierKeuze | null;
  puppy: DierKeuze | null;
  hoefijzers: number;
  woorden: WoordStats;
  obbyGehaald: number;
  geluidAan: boolean;
  muziekAan: boolean;
  /** Naam van de gekozen voorleesstem, of null voor automatisch. */
  stemNaam: string | null;
  stemTempo: number;
  uitlegGezien: boolean;
  /** Gevonden geheimen (easter eggs). */
  geheimen: string[];
  /** Welke gouden hoefijzers al gevonden zijn. */
  goudenHoefijzers: string[];
}

const SLEUTEL = 'nintes-wereld';

export function nieuweStand(): Spelstand {
  return {
    versie: 1,
    speler: 'Ninte',
    pony: null,
    puppy: null,
    hoefijzers: 0,
    woorden: {},
    obbyGehaald: 0,
    geluidAan: true,
    muziekAan: true,
    stemNaam: null,
    stemTempo: 0.9,
    uitlegGezien: false,
    geheimen: [],
    goudenHoefijzers: [],
  };
}

export function laadStand(opslag: Pick<Storage, 'getItem'> | null = veiligeOpslag()): Spelstand {
  try {
    const tekst = opslag?.getItem(SLEUTEL);
    if (!tekst) return nieuweStand();
    const data = JSON.parse(tekst) as Partial<Spelstand>;
    if (data.versie !== 1) return nieuweStand();
    return { ...nieuweStand(), ...data };
  } catch {
    return nieuweStand();
  }
}

export function bewaarStand(stand: Spelstand, opslag: Pick<Storage, 'setItem'> | null = veiligeOpslag()) {
  try {
    opslag?.setItem(SLEUTEL, JSON.stringify(stand));
  } catch {
    // Opslag vol of geblokkeerd: het spel gaat gewoon door.
  }
}

function veiligeOpslag(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
