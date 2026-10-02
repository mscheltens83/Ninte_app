// De bouwopdrachten van Bas de bouwer. Elke opdracht kijkt naar wat er echt op de
// kavel staat. Sommige hebben ook een rekenvraag. Een opdracht geeft hoefijzers en
// nieuwe onderdelen om mee te bouwen.
//
// Een nieuwe opdracht toevoegen? Zet een regel in BOUW_OPDRACHTEN. De volgorde is de
// volgorde waarin Ninte ze krijgt.

import { hoogsteToren, isRechthoek, plattegrond, zelfdeVorm } from './analyse';
import { ONDERDELEN, type OnderdeelId } from './onderdelen';
import type { BouwStand } from './stand';

export interface BouwOpdracht {
  id: string;
  titel: string;
  /** Wat Ninte moet bouwen. */
  opdracht: string;
  tip: string;
  /** Een rekenvraag die er ook bij hoort. */
  vraag?: { tekst: string; antwoord: number; eenheid?: string };
  /** Een tekening om na te bouwen (vakjes). */
  tekening?: readonly (readonly [number, number])[];
  klopt: (s: BouwStand) => boolean;
  beloning: { hoefijzers: number; onderdelen: OnderdeelId[] };
}

/** Een L-vormige kamer: 4 vakjes breed, 3 diep, met een hoekje eruit. */
export const L_TEKENING = [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2]] as const;

export const BOUW_OPDRACHTEN: BouwOpdracht[] = [
  {
    id: 'kamer-4-3', titel: 'Een kamer van 4 bij 3',
    opdracht: 'Bouw een dichte kamer die van binnen 4 vakjes lang en 3 vakjes breed is. Een deur of raam telt ook als muur.',
    tip: 'Zet eerst 4 muren op een rij, dan 3 omlaag, weer 4 terug en 3 omhoog. Zo loop je één keer rond: dat is de omtrek.',
    vraag: { tekst: 'Hoeveel muurstukken staan er rond je kamer (muren, deuren en ramen samen)?', antwoord: 14, eenheid: 'muurstukken' },
    klopt: (s) => plattegrond(s).kamers.some((k) => isRechthoek(k.vakjes, 4, 3)),
    beloning: { hoefijzers: 10, onderdelen: ['raam', 'kleed'] },
  },
  {
    id: 'kamer-16', titel: 'Een kamer van 16 tegels',
    opdracht: 'Bouw een dichte kamer met een oppervlakte van precies 16 vakjes. De vorm mag je zelf kiezen!',
    tip: '4 rijen van 4 vakjes is 16. Maar 2 rijen van 8 kan ook. Leg gerust vloer neer om de vakjes te tellen.',
    klopt: (s) => plattegrond(s).kamers.some((k) => k.vakjes.length === 16),
    beloning: { hoefijzers: 10, onderdelen: ['bank', 'tv'] },
  },
  {
    id: 'twee-kamers', titel: 'Een huis met twee kamers',
    opdracht: 'Bouw een huis met twee dichte kamers naast elkaar. Zet een deur tussen de kamers en een deur naar buiten.',
    tip: 'Bouw één grote kamer en zet er een muur dwars doorheen. Vervang één stukje van die muur door een deur.',
    klopt: (s) => {
      const p = plattegrond(s);
      return p.deurTussen.some(([a, b]) => p.kamers[a].deurNaarBuiten || p.kamers[b].deurNaarBuiten);
    },
    beloning: { hoefijzers: 12, onderdelen: ['bad', 'kast'] },
  },
  {
    id: 'plattegrond', titel: 'Bouw de tekening na',
    opdracht: 'Dit is een plattegrond: je kijkt van bovenaf. Bouw een dichte kamer met precies deze vorm. Draaien mag.',
    tip: 'Tel de vakjes op de tekening: bovenaan 4, in het midden 4, onderaan 2. Bouw de muren om de buitenkant heen.',
    tekening: L_TEKENING,
    klopt: (s) => plattegrond(s).kamers.some((k) => zelfdeVorm(k.vakjes, L_TEKENING)),
    beloning: { hoefijzers: 12, onderdelen: ['bloembak', 'boom', 'schommel'] },
  },
  {
    id: 'toren', titel: 'Een toren van 8 blokken',
    opdracht: 'Stapel een toren van precies 8 blokken hoog. Klim er daarna eens op!',
    tip: 'Tik steeds op hetzelfde vakje om blokken op elkaar te stapelen. Eén blok is 1,5 meter: tel 1,5 er 8 keer bij op, of reken 8 × 1,5.',
    vraag: { tekst: 'Eén blok is 1,5 meter hoog. Hoeveel meter hoog is jouw toren van 8 blokken?', antwoord: 12, eenheid: 'meter' },
    klopt: (s) => hoogsteToren(s) === 8,
    beloning: { hoefijzers: 12, onderdelen: ['zwembad'] },
  },
  {
    id: 'zwembad', titel: 'Het zwembad vullen',
    opdracht: 'Zet een zwembad in je tuin. Het is 3 vakjes lang, 2 vakjes breed en 2 blokken diep.',
    tip: 'Eén laag water is 3 × 2 blokken. Er gaan 2 lagen in.',
    vraag: { tekst: 'Hoeveel blokken water passen er in het zwembad?', antwoord: 12, eenheid: 'blokken' },
    klopt: (s) => s.meubels.some((m) => m.id === 'zwembad'),
    beloning: { hoefijzers: 15, onderdelen: [] },
  },
];

export function opdrachtMetId(id: string): BouwOpdracht | undefined {
  return BOUW_OPDRACHTEN.find((o) => o.id === id);
}

/** Mag Ninte dit onderdeel al gebruiken? */
export function heeftOnderdeel(s: BouwStand, id: OnderdeelId): boolean {
  const o = ONDERDELEN.find((x) => x.id === id);
  if (!o) return false;
  if ('start' in o && o.start) return true;
  return BOUW_OPDRACHTEN.some((op) => s.voltooid.includes(op.id) && op.beloning.onderdelen.includes(id));
}

/** Bij welke opdracht krijg je dit onderdeel? */
export function opdrachtVoor(id: OnderdeelId): BouwOpdracht | undefined {
  return BOUW_OPDRACHTEN.find((o) => o.beloning.onderdelen.includes(id));
}

/** De eerste opdracht die nog niet gehaald is. */
export function volgendeOpdracht(s: BouwStand): BouwOpdracht | null {
  return BOUW_OPDRACHTEN.find((o) => !s.voltooid.includes(o.id)) ?? null;
}

/** Een opdracht is beschikbaar als alle eerdere gehaald zijn (of hij al gehaald is). */
export function opdrachtOpen(s: BouwStand, o: BouwOpdracht): boolean {
  const i = BOUW_OPDRACHTEN.indexOf(o);
  return BOUW_OPDRACHTEN.slice(0, i).every((v) => s.voltooid.includes(v.id));
}

/** Is de opdracht nu helemaal goed: het bouwwerk klopt en de vraag is goed beantwoord? */
export function opdrachtKlaar(s: BouwStand, o: BouwOpdracht): boolean {
  return o.klopt(s) && (!o.vraag || s.antwoorden[o.id] === o.vraag.antwoord);
}

/** Lees een antwoord zoals een kind het typt: "12", "12 meter", "1,5". */
export function leesAntwoord(tekst: string): number | null {
  const m = tekst.replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}
