// Alle meespeelliedjes. Elk liedje is gewoon een lijstje gegevens:
//
//  - bpm         tempo in tellen per minuut
//  - grondtoon   MIDI-nummer van de grondtoon (60 = C, 62 = D, 55 = G, ...)
//  - toonladder  majeur, mineur, mixolydisch, dorisch of lydisch
//  - akkoorden   per maat de trap van het akkoord (0 = I, 3 = IV, 4 = V, 5 = vi, ...)
//  - basis       met hoeveel energie (0..4) het liedje begint
//  - lagen       de instrumenten. Een laag speelt pas mee vanaf een bepaalde energie.
//
// Energie groeit als Ninte dingen goed doet: 0 rustig · 1 · 2 · 3 · 4 feest!
// Hoe je patronen schrijft, staat in patroon.ts. Een nieuw liedje toevoegen kan
// zonder andere code aan te passen: zet het in LIEDJES en koppel het in PLEK_LIED.

import type { InstrumentId } from './instrumenten';
import type { Toonladder } from './theorie';

export type LaagGroep = 'drums' | 'bas' | 'akkoord' | 'melodie' | 'extra';

export interface Laag {
  instrument: InstrumentId;
  patroon: string;
  /** Hoeveel 16e-stappen één teken duurt (1 = 16e, 2 = 8e, 4 = kwart, 16 = hele maat). */
  stap?: number;
  /** Speelt mee vanaf deze energie (standaard 0) ... */
  vanaf?: number;
  /** ... tot en met deze energie (standaard 4). */
  tot?: number;
  volume?: number;
  octaaf?: number;
  /** Tonen tellen vanaf het akkoord van de maat (standaard) of vanaf de grondtoon. */
  volgt?: 'akkoord' | 'toonsoort';
  /** Speel een drieklank in plaats van één toon. */
  akkoord?: boolean;
  /** Zo kan een eigen beat bijvoorbeeld de drums vervangen. */
  groep?: LaagGroep;
}

export interface Lied {
  id: string;
  naam: string;
  bpm: number;
  grondtoon: number;
  toonladder: Toonladder;
  akkoorden: number[];
  /** 0..0.5: schuif de 'en'-tellen iets op voor een huppelend gevoel. */
  swing?: number;
  basis: number;
  lagen: Laag[];
}

export const ENERGIE_NAMEN = ['Rustig', 'Lekker', 'Vrolijk', 'Swingend', 'Feest!'] as const;

/** Veelgebruikte popritmes, zodat liedjes kort en leesbaar blijven. */
export const RITMES = {
  /** Boem op tel 1 en 3 (rustig) */
  half: 'x-------x-------',
  /** Boem op elke tel: de motor van bijna alle popmuziek */
  vier: 'x---x---x---x---',
  /** Snare of klap op tel 2 en 4 */
  tweeVier: '----x-------x---',
  achtsten: 'x-x-x-x-x-x-x-x-',
  zestienden: 'xoxoxoxoxoxoxoxo',
  /** Open hihat tussen de tellen: het disco-gevoel */
  tussen: '--x---x---x---x-',
  /** Reggaeton-snare */
  dembow: '---x--x----x--x-',
  /** Drie maten gewoon, dan een roffel naar de volgende ronde (64 stappen) */
  roffel: '----x-------x---'.repeat(3) + '----x---x-xxxxxx',
  /** Met stap 16: één slag per vier maten (voor het bekken) */
  elkeVierMaten: 'x---',
  /** Bas in het 3-3-2-ritme van veel hits */
  tresillo: '0 . . 0 . . 0 . 0 . . 0 . . 0 .',
} as const;

export const LIEDJES: Lied[] = [
  {
    id: 'dorp', naam: 'Dorpsfeest', bpm: 116, grondtoon: 60, toonladder: 'majeur', akkoorden: [0, 4, 5, 3], basis: 1,
    lagen: [
      { instrument: 'supersaw', patroon: '0', stap: 16, octaaf: -1, volume: 0.8, groep: 'akkoord' },
      { instrument: 'subbas', patroon: '0', stap: 16, octaaf: -2, tot: 0 },
      { instrument: 'boem', patroon: RITMES.half, tot: 0 },
      { instrument: 'boem', patroon: RITMES.vier, vanaf: 1 },
      { instrument: 'tik', patroon: RITMES.achtsten, vanaf: 1, tot: 2, volume: 0.8 },
      { instrument: 'bas', patroon: RITMES.tresillo, octaaf: -2, vanaf: 1 },
      { instrument: 'popPluk', patroon: '0 2 4 7 4 2 4 2', stap: 2, vanaf: 1, volume: 0.6 },
      { instrument: 'klap', patroon: RITMES.tweeVier, vanaf: 2 },
      { instrument: 'popPluk', patroon: '4 . 4 5 4 2 0 2 | 1 . 1 2 1 -1 4 . | 2 . 2 4 5 4 2 0 | 3 . 2 1 0 - - .', stap: 2, octaaf: 1, volgt: 'toonsoort', vanaf: 2, groep: 'melodie' },
      { instrument: 'tik', patroon: RITMES.zestienden, vanaf: 3, volume: 0.8 },
      { instrument: 'tsss', patroon: RITMES.tussen, vanaf: 3 },
      { instrument: 'stab', patroon: '. 0 . 0 . 0 . 0', stap: 2, vanaf: 3, volume: 0.7 },
      { instrument: 'trom', patroon: RITMES.roffel, vanaf: 3, volume: 0.7 },
      { instrument: 'bel', patroon: '7 . 9 . | 8 . 6 . | 7 . 9 . | 7 - - .', stap: 4, octaaf: 1, volgt: 'toonsoort', vanaf: 4 },
      { instrument: 'piep', patroon: '0 4 7 4', octaaf: 1, vanaf: 4, volume: 0.4 },
      { instrument: 'bekken', patroon: RITMES.elkeVierMaten, stap: 16, vanaf: 4 },
    ],
  },
  {
    id: 'eiland', naam: 'Ponygalop', bpm: 104, grondtoon: 55, toonladder: 'majeur', akkoorden: [0, 3, 4, 0], swing: 0.18, basis: 1,
    lagen: [
      { instrument: 'pad', patroon: '0', stap: 16 },
      { instrument: 'diepbas', patroon: '0 . 4 .', stap: 4, octaaf: -1, tot: 0 },
      { instrument: 'boem', patroon: RITMES.half, tot: 0 },
      { instrument: 'boem', patroon: RITMES.vier, vanaf: 1, volume: 0.9 },
      { instrument: 'shaker', patroon: 'x-xxx-xxx-xxx-xx', vanaf: 1, volume: 0.8 },
      { instrument: 'bas', patroon: '0 . . 0 4 . . 0', stap: 2, octaaf: -1, vanaf: 1 },
      { instrument: 'pluk', patroon: '. 0 . 0 . 0 . 0', stap: 2, akkoord: true, vanaf: 1, volume: 0.6 },
      { instrument: 'trom', patroon: RITMES.tweeVier, vanaf: 2 },
      { instrument: 'popPluk', patroon: '0 2 4 2 0 2 4 . | 3 5 7 5 3 5 7 . | 4 6 8 6 4 . 1 . | 2 1 0 - - . . .', stap: 2, octaaf: 1, volgt: 'toonsoort', vanaf: 2, groep: 'melodie' },
      { instrument: 'tik', patroon: RITMES.achtsten, vanaf: 3, volume: 0.7 },
      { instrument: 'fluit', patroon: '4 - 7 - | 5 - 7 - | 4 - 6 - | 7 - - -', stap: 4, octaaf: 1, volgt: 'toonsoort', vanaf: 3 },
      { instrument: 'supersaw', patroon: '0', stap: 16, octaaf: -1, vanaf: 3, volume: 0.6 },
      { instrument: 'bel', patroon: '7 . . 9 . . 11 .', stap: 2, vanaf: 4 },
      { instrument: 'bekken', patroon: RITMES.elkeVierMaten, stap: 16, vanaf: 4 },
    ],
  },
  {
    id: 'obby', naam: 'Deurenrace', bpm: 128, grondtoon: 62, toonladder: 'majeur', akkoorden: [0, 5, 3, 4], basis: 2,
    lagen: [
      { instrument: 'supersaw', patroon: '0', stap: 16, octaaf: -1, volume: 0.8 },
      { instrument: 'subbas', patroon: '0', stap: 16, octaaf: -2, tot: 1 },
      { instrument: 'boem', patroon: RITMES.half, tot: 0 },
      { instrument: 'boem', patroon: RITMES.vier, vanaf: 1 },
      { instrument: 'tsss', patroon: RITMES.tussen, vanaf: 1 },
      { instrument: 'piep', patroon: '0 2 4 7 4 2 0 2 4 7 9 7 4 2 4 7', octaaf: 1, vanaf: 1, volume: 0.5 },
      { instrument: 'klap', patroon: RITMES.tweeVier, vanaf: 2 },
      { instrument: 'bas', patroon: '0 7 0 7 0 7 0 7', stap: 2, octaaf: -2, vanaf: 2 },
      { instrument: 'lead', patroon: '0 . 2 . 4 . 2 4 | 5 . 4 . 2 . 1 2 | 3 . 4 . 5 . 7 5 | 4 . 6 . 8 - - .', stap: 2, octaaf: 1, volgt: 'toonsoort', vanaf: 2, groep: 'melodie' },
      { instrument: 'tik', patroon: RITMES.zestienden, vanaf: 3, volume: 0.8 },
      { instrument: 'stab', patroon: '. 0 . 0 . 0 . 0', stap: 2, vanaf: 3, volume: 0.7 },
      { instrument: 'trom', patroon: RITMES.roffel, vanaf: 3, volume: 0.7 },
      { instrument: 'bel', patroon: '0 2 4 7', stap: 4, octaaf: 1, vanaf: 4 },
      { instrument: 'bekken', patroon: RITMES.elkeVierMaten, stap: 16, vanaf: 4 },
    ],
  },
  {
    id: 'geheim', naam: 'Wolkendroom', bpm: 90, grondtoon: 65, toonladder: 'lydisch', akkoorden: [0, 1, 0, 4], basis: 1,
    lagen: [
      { instrument: 'pad', patroon: '0', stap: 16, octaaf: -1 },
      { instrument: 'bel', patroon: '0 . . 4 . . 7 .', stap: 2, volume: 0.7 },
      { instrument: 'boem', patroon: 'x-----x---x-----', vanaf: 1, volume: 0.9 },
      { instrument: 'diepbas', patroon: '0 4', stap: 8, octaaf: -2, vanaf: 1 },
      { instrument: 'shaker', patroon: RITMES.tussen, vanaf: 1, volume: 0.7 },
      { instrument: 'trom', patroon: RITMES.tweeVier, vanaf: 2, volume: 0.7 },
      { instrument: 'fluit', patroon: '4 - - 6 | 5 - - 3 | 2 - 4 - | 4 - - -', stap: 4, octaaf: 1, volgt: 'toonsoort', vanaf: 2, groep: 'melodie' },
      { instrument: 'popPluk', patroon: '0 . 4 . 7 . 4 . 9 . 7 . 4 . 2 .', octaaf: 1, vanaf: 2, volume: 0.5 },
      { instrument: 'tik', patroon: RITMES.achtsten, vanaf: 3, volume: 0.6 },
      { instrument: 'supersaw', patroon: '0', stap: 16, octaaf: -1, vanaf: 3, volume: 0.5 },
      { instrument: 'bel', patroon: '7 9 11 14', stap: 4, octaaf: 1, vanaf: 4, volume: 0.7 },
      { instrument: 'tsss', patroon: '------x-------x-', vanaf: 4, volume: 0.7 },
    ],
  },
  {
    id: 'winkel', naam: 'Kassa-cha-cha', bpm: 96, grondtoon: 60, toonladder: 'mixolydisch', akkoorden: [0, 6, 3, 0], basis: 1,
    lagen: [
      { instrument: 'pad', patroon: '0', stap: 16, octaaf: -1, volume: 0.8 },
      { instrument: 'subbas', patroon: '0 . . 0 . . 0 .', stap: 2, octaaf: -2, tot: 0 },
      { instrument: 'boem', patroon: RITMES.half, tot: 0 },
      { instrument: 'boem', patroon: RITMES.vier, vanaf: 1 },
      { instrument: 'trom', patroon: RITMES.dembow, vanaf: 1, volume: 0.7 },
      { instrument: 'bas', patroon: RITMES.tresillo, octaaf: -2, vanaf: 1 },
      { instrument: 'marimba', patroon: '0 . 4 . 2 . 4 .', stap: 2, vanaf: 1, volume: 0.6 },
      { instrument: 'popPluk', patroon: '4 . 2 4 . 2 0 . | 6 . 8 6 . 3 1 . | 3 . 5 7 . 5 3 . | 4 2 0 - - . . .', stap: 2, octaaf: 1, volgt: 'toonsoort', vanaf: 2, groep: 'melodie' },
      { instrument: 'shaker', patroon: 'x-o-x-o-x-o-x-o-', vanaf: 2 },
      { instrument: 'koe', patroon: 'x--x--x---x-x---', vanaf: 3, volume: 0.6 },
      { instrument: 'tik', patroon: RITMES.achtsten, vanaf: 3, volume: 0.6 },
      { instrument: 'stab', patroon: '. 0 . 0 . 0 . 0', stap: 2, vanaf: 3, volume: 0.6 },
      { instrument: 'bel', patroon: '4 . 2 .', stap: 4, octaaf: 1, vanaf: 4 },
      { instrument: 'bekken', patroon: RITMES.elkeVierMaten, stap: 16, vanaf: 4 },
    ],
  },
  {
    id: 'bos', naam: 'Bosgeheim', bpm: 100, grondtoon: 62, toonladder: 'dorisch', akkoorden: [0, 3, 0, 6], basis: 1,
    lagen: [
      { instrument: 'pad', patroon: '0', stap: 16, octaaf: -1 },
      { instrument: 'diepbas', patroon: '0 4', stap: 8, octaaf: -2, tot: 1 },
      { instrument: 'boem', patroon: RITMES.half, tot: 0 },
      { instrument: 'boem', patroon: RITMES.vier, vanaf: 1 },
      { instrument: 'klap', patroon: RITMES.tweeVier, vanaf: 1 },
      { instrument: 'pluk', patroon: '0 4 7 4 2 4 7 4', stap: 2, vanaf: 1, volume: 0.7 },
      { instrument: 'bas', patroon: RITMES.tresillo, octaaf: -2, vanaf: 2 },
      { instrument: 'trom', patroon: RITMES.tweeVier, vanaf: 2, volume: 0.6 },
      { instrument: 'fluit', patroon: '0 . 2 4 . 2 0 . | 3 . 5 7 . 5 3 . | 4 . 2 0 . 1 2 . | 6 - 8 - 6 - - .', stap: 2, octaaf: 1, volgt: 'toonsoort', vanaf: 2, groep: 'melodie' },
      { instrument: 'tik', patroon: RITMES.achtsten, vanaf: 3, volume: 0.7 },
      { instrument: 'supersaw', patroon: '0', stap: 16, octaaf: -1, vanaf: 3, volume: 0.6 },
      { instrument: 'marimba', patroon: '0 2 4 2', stap: 4, octaaf: 1, vanaf: 3, volume: 0.7 },
      { instrument: 'bel', patroon: '7 . 9 . 11 . 9 .', stap: 2, vanaf: 4, volume: 0.8 },
      { instrument: 'trom', patroon: RITMES.roffel, vanaf: 4, volume: 0.5 },
      { instrument: 'bekken', patroon: RITMES.elkeVierMaten, stap: 16, vanaf: 4 },
    ],
  },
  {
    id: 'pizza', naam: 'Pizzapolka', bpm: 132, grondtoon: 65, toonladder: 'majeur', akkoorden: [0, 4, 4, 0], basis: 2,
    lagen: [
      { instrument: 'diepbas', patroon: '0 . 4 .', stap: 4, octaaf: -2, tot: 2 },
      { instrument: 'orgel', patroon: '. 0 . 0', stap: 4, octaaf: -1 },
      { instrument: 'boem', patroon: RITMES.half, tot: 1 },
      { instrument: 'trom', patroon: RITMES.tweeVier, vanaf: 1, volume: 0.7 },
      { instrument: 'tik', patroon: RITMES.achtsten, vanaf: 1, volume: 0.6 },
      { instrument: 'boem', patroon: RITMES.vier, vanaf: 2 },
      { instrument: 'popPluk', patroon: '7 7 9 9 11 . 9 7 | 6 6 8 8 11 . 8 6 | 4 . 6 . 8 . 11 . | 9 7 5 2 0 - . .', stap: 2, volgt: 'toonsoort', vanaf: 2, groep: 'melodie' },
      { instrument: 'klap', patroon: RITMES.tweeVier, vanaf: 3 },
      { instrument: 'bas', patroon: '0 . 4 . 0 . 4 .', stap: 2, octaaf: -2, vanaf: 3 },
      { instrument: 'marimba', patroon: '0 . 2 . 4 . 2 . 0 . 2 . 4 . 7 .', octaaf: 1, vanaf: 3, volume: 0.5 },
      { instrument: 'bel', patroon: '4 . 7 .', stap: 4, octaaf: 1, vanaf: 4 },
      { instrument: 'bekken', patroon: RITMES.elkeVierMaten, stap: 16, vanaf: 4 },
    ],
  },
  {
    id: 'lab', naam: 'Robotboogie', bpm: 118, grondtoon: 55, toonladder: 'mixolydisch', akkoorden: [0, 0, 3, 6], basis: 1,
    lagen: [
      { instrument: 'piep', patroon: '0 4 7 4 0 4 7 9', volume: 0.6 },
      { instrument: 'diepbas', patroon: '0 . 0 . 4 . 0 .', stap: 2, octaaf: -1, tot: 0 },
      { instrument: 'boem', patroon: RITMES.half, tot: 0 },
      { instrument: 'boem', patroon: RITMES.vier, vanaf: 1 },
      { instrument: 'tik', patroon: '-x-x-x-x-x-x-x-x', vanaf: 1, volume: 0.6 },
      { instrument: 'bas', patroon: '0 . 0 0 . . 7 . 0 . 0 . 4 . 6 .', octaaf: -1, vanaf: 1 },
      { instrument: 'klap', patroon: RITMES.tweeVier, vanaf: 2 },
      { instrument: 'lead', patroon: '0 . 0 2 4 . 2 0 | 4 . 4 5 6 . 5 4 | 3 . 3 5 7 . 5 3 | 6 . 5 . 3 - - .', stap: 2, octaaf: 1, volgt: 'toonsoort', vanaf: 2, groep: 'melodie' },
      { instrument: 'koe', patroon: 'x---x---x---x-x-', vanaf: 3, volume: 0.6 },
      { instrument: 'stab', patroon: '. 0 . 0 . 0 . 0', stap: 2, vanaf: 3, volume: 0.7 },
      { instrument: 'supersaw', patroon: '0', stap: 16, octaaf: -1, vanaf: 3, volume: 0.5 },
      { instrument: 'bel', patroon: '7 . 4 . 9 . 4 .', stap: 2, octaaf: 1, vanaf: 4, volume: 0.8 },
      { instrument: 'tsss', patroon: RITMES.tussen, vanaf: 4 },
      { instrument: 'bekken', patroon: RITMES.elkeVierMaten, stap: 16, vanaf: 4 },
    ],
  },
  {
    id: 'tuin', naam: 'Zonnebloemen', bpm: 100, grondtoon: 57, toonladder: 'majeur', akkoorden: [0, 3, 5, 4], basis: 1,
    lagen: [
      { instrument: 'pad', patroon: '0', stap: 16 },
      { instrument: 'diepbas', patroon: '0 4', stap: 8, octaaf: -2, tot: 0 },
      { instrument: 'boem', patroon: RITMES.half, tot: 0 },
      { instrument: 'boem', patroon: RITMES.vier, vanaf: 1, volume: 0.9 },
      { instrument: 'shaker', patroon: 'x-o-x-o-x-o-x-o-', vanaf: 1 },
      { instrument: 'popPluk', patroon: '0 4 2 4 7 4 2 4', stap: 2, octaaf: 1, vanaf: 1, volume: 0.6 },
      { instrument: 'bas', patroon: RITMES.tresillo, octaaf: -2, vanaf: 1 },
      { instrument: 'klap', patroon: RITMES.tweeVier, vanaf: 2 },
      { instrument: 'marimba', patroon: '4 . 2 . 0 2 4 . | 5 . 3 . 5 7 5 . | 5 . 7 . 9 - 7 . | 4 - 6 - 4 - - .', stap: 2, octaaf: 1, volgt: 'toonsoort', vanaf: 2, groep: 'melodie' },
      { instrument: 'tik', patroon: RITMES.achtsten, vanaf: 3, volume: 0.7 },
      { instrument: 'tsss', patroon: RITMES.tussen, vanaf: 3 },
      { instrument: 'supersaw', patroon: '0', stap: 16, vanaf: 3, volume: 0.5 },
      { instrument: 'bel', patroon: '4 2 0 2', stap: 4, octaaf: 1, vanaf: 4 },
      { instrument: 'bekken', patroon: RITMES.elkeVierMaten, stap: 16, vanaf: 4 },
    ],
  },
  {
    id: 'boomhut', naam: 'Boomhutchill', bpm: 88, grondtoon: 58, toonladder: 'majeur', akkoorden: [0, 5, 3, 4], basis: 1,
    lagen: [
      { instrument: 'pad', patroon: '0', stap: 16, octaaf: -1 },
      { instrument: 'diepbas', patroon: '0 . . 4', stap: 4, octaaf: -2, tot: 1 },
      { instrument: 'pluk', patroon: '0 2 4 2 7 4 2 4', stap: 2, volume: 0.7 },
      { instrument: 'boem', patroon: 'x-------x-x-----', vanaf: 1, volume: 0.9 },
      { instrument: 'trom', patroon: RITMES.tweeVier, vanaf: 1, volume: 0.55 },
      { instrument: 'tik', patroon: RITMES.achtsten, vanaf: 1, volume: 0.45 },
      { instrument: 'marimba', patroon: '2 . 4 . 2 0 . . | 5 . 4 . 2 . . . | 3 . 5 . 7 . 5 . | 4 . 6 . 8 - - .', stap: 2, octaaf: 1, volgt: 'toonsoort', vanaf: 2, groep: 'melodie' },
      { instrument: 'bas', patroon: '0 . . 0 . . 4 .', stap: 2, octaaf: -2, vanaf: 2 },
      { instrument: 'bel', patroon: '4 . 2 .', stap: 4, octaaf: 1, vanaf: 3, volume: 0.8 },
      { instrument: 'shaker', patroon: 'o-x-o-x-o-x-o-x-', vanaf: 3 },
      { instrument: 'orgel', patroon: '. 0 . 0', stap: 4, vanaf: 4 },
      { instrument: 'tsss', patroon: RITMES.tussen, vanaf: 4, volume: 0.6 },
    ],
  },
  {
    id: 'toren', naam: 'Windkracht', bpm: 124, grondtoon: 64, toonladder: 'majeur', akkoorden: [0, 4, 5, 3], basis: 2,
    lagen: [
      { instrument: 'supersaw', patroon: '0', stap: 16, octaaf: -1, volume: 0.8 },
      { instrument: 'bel', patroon: '0 4 7 4 9 7 4 7', stap: 2, volume: 0.5 },
      { instrument: 'subbas', patroon: '0', stap: 16, octaaf: -2, tot: 1 },
      { instrument: 'boem', patroon: RITMES.half, tot: 0 },
      { instrument: 'boem', patroon: RITMES.vier, vanaf: 1 },
      { instrument: 'tsss', patroon: RITMES.tussen, vanaf: 1 },
      { instrument: 'klap', patroon: RITMES.tweeVier, vanaf: 2 },
      { instrument: 'bas', patroon: '0 . 0 . 0 . 4 .', stap: 2, octaaf: -2, vanaf: 2 },
      { instrument: 'lead', patroon: '4 - 7 - | 4 - 6 - | 5 - 7 - | 5 - 3 -', stap: 4, octaaf: 1, volgt: 'toonsoort', vanaf: 2, groep: 'melodie' },
      { instrument: 'piep', patroon: '0 2 4 7', octaaf: 1, vanaf: 3, volume: 0.5 },
      { instrument: 'tik', patroon: RITMES.zestienden, vanaf: 3, volume: 0.7 },
      { instrument: 'stab', patroon: '. 0 . 0 . 0 . 0', stap: 2, vanaf: 3, volume: 0.6 },
      { instrument: 'trom', patroon: RITMES.roffel, vanaf: 4, volume: 0.7 },
      { instrument: 'bekken', patroon: RITMES.elkeVierMaten, stap: 16, vanaf: 4 },
    ],
  },
  {
    id: 'podium', naam: 'Discofeest', bpm: 122, grondtoon: 60, toonladder: 'majeur', akkoorden: [0, 5, 1, 4], basis: 2,
    lagen: [
      { instrument: 'boem', patroon: RITMES.vier, groep: 'drums' },
      { instrument: 'bas', patroon: '0 7 0 7 0 7 0 7', stap: 2, octaaf: -2, groep: 'bas' },
      { instrument: 'supersaw', patroon: '0', stap: 16, octaaf: -1, groep: 'akkoord', volume: 0.7 },
      { instrument: 'tsss', patroon: RITMES.tussen, vanaf: 1, groep: 'drums' },
      { instrument: 'klap', patroon: RITMES.tweeVier, vanaf: 1, groep: 'drums' },
      { instrument: 'stab', patroon: '. 0 . 0 . 0 . 0', stap: 2, vanaf: 2, groep: 'akkoord', volume: 0.7 },
      { instrument: 'tik', patroon: RITMES.achtsten, vanaf: 2, groep: 'drums', volume: 0.7 },
      { instrument: 'lead', patroon: '4 . 4 . 7 . 4 2 | 5 . 5 . 7 . 9 7 | 8 . 8 . 5 . 3 1 | 4 . 6 . 8 - - .', stap: 2, octaaf: 1, volgt: 'toonsoort', vanaf: 3, groep: 'melodie' },
      { instrument: 'bel', patroon: '4 7 4 2', stap: 4, octaaf: 1, vanaf: 4, groep: 'melodie' },
      { instrument: 'piep', patroon: '0 4 7 4', octaaf: 1, vanaf: 4, volume: 0.4, groep: 'extra' },
      { instrument: 'trom', patroon: RITMES.roffel, vanaf: 4, groep: 'drums', volume: 0.6 },
      { instrument: 'bekken', patroon: RITMES.elkeVierMaten, stap: 16, vanaf: 4, groep: 'drums' },
    ],
  },
];


/** Waar in de wereld je bent. Gebieden van de avonturenwereld hebben hun eigen naam. */
export type MuziekPlek =
  | 'eiland' | 'obby' | 'geheim' | 'podium' | 'wereld'
  | 'dorp' | 'brug' | 'winkel' | 'bos' | 'pizza' | 'lab' | 'tuin' | 'boomhut' | 'toren' | 'kavel';

/** Welk liedje er op welke plek speelt. */
export const PLEK_LIED: Record<MuziekPlek, string> = {
  eiland: 'eiland',
  obby: 'obby',
  geheim: 'geheim',
  podium: 'podium',
  wereld: 'dorp',
  dorp: 'dorp',
  brug: 'boomhut',
  winkel: 'winkel',
  bos: 'bos',
  pizza: 'pizza',
  lab: 'lab',
  tuin: 'tuin',
  boomhut: 'boomhut',
  toren: 'toren',
  kavel: 'boomhut',
};

export function liedVoor(plek: MuziekPlek): Lied {
  const id = PLEK_LIED[plek];
  return LIEDJES.find((l) => l.id === id) ?? LIEDJES[0];
}

export function liedMetId(id: string): Lied | undefined {
  return LIEDJES.find((l) => l.id === id);
}
