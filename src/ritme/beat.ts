// De beatmaker op het discopodium: een rooster van 16 vakjes per instrument,
// plus uitdagingen waarbij Ninte tellen, patronen en breuken oefent.
//
// Een nieuwe uitdaging toevoegen? Zet een regel in UITDAGINGEN met een `klopt`-functie.

import type { InstrumentId } from './instrumenten';
import type { Laag } from './liedjes';

export const BEAT_STAPPEN = 16;
export const BPM_MIN = 80;
export const BPM_MAX = 150;

export interface BeatRij {
  id: string;
  naam: string;
  icoon: string;
  instrument: InstrumentId;
  /** Alleen voor tonen: welke trap van het akkoord. */
  trap?: number;
  octaaf?: number;
}

export const BEAT_RIJEN = [
  { id: 'boem', naam: 'Boem', icoon: '🥁', instrument: 'boem' },
  { id: 'klap', naam: 'Klap', icoon: '👏', instrument: 'klap' },
  { id: 'tik', naam: 'Tsss', icoon: '✨', instrument: 'tik' },
  { id: 'koe', naam: 'Koebel', icoon: '🐮', instrument: 'koe' },
  { id: 'bas', naam: 'Bas', icoon: '🎸', instrument: 'bas', trap: 0, octaaf: -2 },
  { id: 'bel', naam: 'Bel', icoon: '🔔', instrument: 'bel', trap: 4, octaaf: 1 },
] as const satisfies readonly BeatRij[];

export type RijId = (typeof BEAT_RIJEN)[number]['id'];
export const RIJ_IDS: RijId[] = BEAT_RIJEN.map((r) => r.id);

export interface Beat {
  bpm: number;
  /** Per rij 16 tekens: x = aan, - = uit. */
  rijen: Record<RijId, string>;
}

const LEEG = '-'.repeat(BEAT_STAPPEN);

export function legeBeat(bpm = 120): Beat {
  return { bpm, rijen: Object.fromEntries(RIJ_IDS.map((id) => [id, LEEG])) as Record<RijId, string> };
}

/** Een beat om mee te beginnen, zodat er meteen iets klinkt. */
export function voorbeeldBeat(): Beat {
  const b = legeBeat(116);
  b.rijen.boem = 'x---x---x---x---';
  b.rijen.tik = '--x---x---x---x-';
  return b;
}

export function kopieBeat(b: Beat): Beat {
  return { bpm: b.bpm, rijen: { ...b.rijen } };
}

/** De vakjes die aan staan (0..15). */
export function aanIn(b: Beat, rij: RijId): number[] {
  return [...b.rijen[rij]].flatMap((t, i) => (t === 'x' ? [i] : []));
}

export function staatAan(b: Beat, rij: RijId, stap: number): boolean {
  return b.rijen[rij][stap] === 'x';
}

export function zetVakje(b: Beat, rij: RijId, stap: number, aan: boolean) {
  if (stap < 0 || stap >= BEAT_STAPPEN) return;
  const tekens = [...b.rijen[rij]];
  tekens[stap] = aan ? 'x' : '-';
  b.rijen[rij] = tekens.join('');
}

export function zetBpm(b: Beat, bpm: number) {
  b.bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(bpm)));
}

export function isLeeg(b: Beat): boolean {
  return RIJ_IDS.every((id) => !b.rijen[id].includes('x'));
}

/** De beat als lagen voor de muziekmotor. */
export function beatLagen(b: Beat): Laag[] {
  return BEAT_RIJEN.filter((r) => b.rijen[r.id].includes('x')).map((r): Laag => {
    const rij = b.rijen[r.id];
    if ('trap' in r) {
      const tokens = [...rij].map((t) => (t === 'x' ? String(r.trap) : '.'));
      return { instrument: r.instrument, patroon: tokens.join(' '), octaaf: r.octaaf, groep: 'extra' };
    }
    return { instrument: r.instrument, patroon: rij, groep: 'drums' };
  });
}

export function valideerBeat(data: unknown): Beat | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  if (typeof d.bpm !== 'number' || !Number.isInteger(d.bpm) || d.bpm < BPM_MIN || d.bpm > BPM_MAX) return null;
  const rijen = d.rijen;
  if (!rijen || typeof rijen !== 'object' || Array.isArray(rijen)) return null;
  const r = rijen as Record<string, unknown>;
  const beat = legeBeat(d.bpm);
  for (const id of RIJ_IDS) {
    const v = r[id];
    if (v === undefined) continue;
    if (typeof v !== 'string' || !/^[x-]{16}$/.test(v)) return null;
    beat.rijen[id] = v;
  }
  return beat;
}

export interface Uitdaging {
  id: string;
  titel: string;
  /** Wat Ninte moet doen. */
  opdracht: string;
  /** Hulp als het niet lukt. */
  tip: string;
  /** Welke rij hoort erbij (wordt gemarkeerd). */
  rij?: RijId;
  klopt: (b: Beat) => boolean;
  beloning: number;
}

const precies = (b: Beat, rij: RijId, vakjes: number[]) => {
  const aan = aanIn(b, rij);
  return aan.length === vakjes.length && aan.every((v, i) => v === vakjes[i]);
};

export const UITDAGINGEN: Uitdaging[] = [
  {
    id: 'vier-tellen', titel: 'Op elke tel een boem', rij: 'boem', beloning: 5,
    opdracht: 'Een maat heeft 4 tellen. Zet bij Boem een slag op tel 1, 2, 3 en 4. Niets ertussen!',
    tip: 'De cijfers 1, 2, 3 en 4 staan boven de vakjes. Elke tel is 4 vakjes breed.',
    klopt: (b) => precies(b, 'boem', [0, 4, 8, 12]),
  },
  {
    id: 'klap-twee-vier', titel: 'Klap op 2 en 4', rij: 'klap', beloning: 5,
    opdracht: 'Zet bij Klap alleen een klap op tel 2 en op tel 4. Zo klinkt bijna elk popliedje!',
    tip: 'Zoek de cijfers 2 en 4 boven de vakjes. Zet de klap in het eerste vakje onder dat cijfer.',
    klopt: (b) => precies(b, 'klap', [4, 12]),
  },
  {
    id: 'helft', titel: 'De helft', rij: 'tik', beloning: 5,
    opdracht: 'De Tsss-rij heeft 16 vakjes. Zet er precies de helft aan, om en om: aan, uit, aan, uit ...',
    tip: 'De helft van 16 is 8. Om en om betekent: steeds één vakje overslaan.',
    klopt: (b) => {
      const aan = aanIn(b, 'tik');
      return aan.length === 8 && aan.every((v) => v % 2 === aan[0] % 2);
    },
  },
  {
    id: 'kwart', titel: 'Een kwart', rij: 'bel', beloning: 5,
    opdracht: 'Zet precies 1/4 (een kwart) van de vakjes bij Bel aan. Waar je ze zet, mag je zelf kiezen.',
    tip: 'Een kwart van 16: verdeel 16 vakjes in 4 gelijke groepjes. Eén groepje is een kwart.',
    klopt: (b) => aanIn(b, 'bel').length === 4,
  },
  {
    id: 'drie-achtste', titel: 'Drie achtste', rij: 'koe', beloning: 8,
    opdracht: 'Zet precies 3/8 van de vakjes bij Koebel aan.',
    tip: 'Verdeel 16 vakjes in 8 gelijke groepjes. Dan zitten er 2 vakjes in elk groepje. Je hebt er 3 groepjes nodig.',
    klopt: (b) => aanIn(b, 'koe').length === 6,
  },
  {
    id: 'herhaal', titel: 'Patroon herhalen', rij: 'bas', beloning: 8,
    opdracht: 'Maak bij Bas een patroontje van 4 vakjes en herhaal het, zodat het 4 keer precies hetzelfde is.',
    tip: 'Maak eerst de vakjes 1 tot en met 4. Doe daarna hetzelfde bij 5–8, 9–12 en 13–16.',
    klopt: (b) => {
      const rij = b.rijen.bas;
      const aantal = aanIn(b, 'bas').length;
      return aantal > 0 && aantal < BEAT_STAPPEN && [...rij].every((t, i) => t === rij[i % 4]);
    },
  },
  {
    id: 'tempo', titel: 'Twee tellen per seconde', beloning: 8,
    opdracht: 'Het tempo is het aantal tellen per minuut. Zet het tempo op precies 2 tellen per seconde.',
    tip: 'Een minuut heeft 60 seconden. Hoeveel tellen zijn 60 keer 2 tellen?',
    klopt: (b) => b.bpm === 120,
  },
];

export function uitdagingMetId(id: string): Uitdaging | undefined {
  return UITDAGINGEN.find((u) => u.id === id);
}
