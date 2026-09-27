// Voortgang bewaren op het apparaat zelf. Er gaat niets naar internet.

import { STANDAARD_UITERLIJK, type Uiterlijk } from '../figuren/uiterlijk';
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
  /** Herhaalbakjes voor de rekensommen (tafels en deelsommen). */
  sommen: WoordStats;
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
  /** Hoe het poppetje eruitziet. */
  uiterlijk: Uiterlijk;
  /** Gekochte spullen uit de kledingkast. */
  bezit: string[];
  /** Welke obby's al een keer gehaald zijn ('spelling', 'rekenen'). */
  gehaald: string[];
  /** Ooit een obby gehaald met alle deuren in één keer goed? */
  drieSterren: boolean;
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
    sommen: {},
    obbyGehaald: 0,
    geluidAan: true,
    muziekAan: true,
    stemNaam: null,
    stemTempo: 0.9,
    uitlegGezien: false,
    geheimen: [],
    goudenHoefijzers: [],
    uiterlijk: { ...STANDAARD_UITERLIJK },
    bezit: [],
    gehaald: [],
    drieSterren: false,
  };
}

export function laadStand(opslag: Pick<Storage, 'getItem'> | null = veiligeOpslag()): Spelstand {
  try {
    const tekst = opslag?.getItem(SLEUTEL);
    if (!tekst) return nieuweStand();
    const data = JSON.parse(tekst) as Partial<Spelstand>;
    if (data.versie !== 1) return nieuweStand();
    const basis = nieuweStand();
    return { ...basis, ...data, uiterlijk: { ...basis.uiterlijk, ...data.uiterlijk } };
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
