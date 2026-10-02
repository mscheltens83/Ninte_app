// Alles wat Ninte op haar bouwkavel kan zetten. Dit is gewoon een lijst gegevens:
// een nieuw meubel toevoegen = een regel in ONDERDELEN plus (optioneel) een model in
// modellen.ts. Zonder model krijgt het vanzelf een gekleurd blok.

/** De bouwkavel: een raster van vakjes naast het dorpsplein. */
export const KAVEL = { x0: -42, z0: -56, breedte: 14, diepte: 12, cel: 1.5 } as const;
export const MUUR_HOOGTE = 3;
export const MAX_BLOK_HOOGTE = 10;

export const KAVEL_RAND = {
  x1: KAVEL.x0 + KAVEL.breedte * KAVEL.cel,
  z1: KAVEL.z0 + KAVEL.diepte * KAVEL.cel,
} as const;

/** Ligt dit punt op (of vlak bij) de bouwkavel? */
export function opKavel(x: number, z: number, marge = 0): boolean {
  return x >= KAVEL.x0 - marge && x <= KAVEL_RAND.x1 + marge && z >= KAVEL.z0 - marge && z <= KAVEL_RAND.z1 + marge;
}

/** Felle kleuren, want Ninte houdt van kleur. */
export const KLEUREN = [
  { id: 'roze', naam: 'Roze', hex: '#ff5fa2' },
  { id: 'oranje', naam: 'Oranje', hex: '#ff8a3d' },
  { id: 'geel', naam: 'Geel', hex: '#ffd23f' },
  { id: 'groen', naam: 'Groen', hex: '#46d17a' },
  { id: 'blauw', naam: 'Blauw', hex: '#4fb8ff' },
  { id: 'paars', naam: 'Paars', hex: '#a36bff' },
  { id: 'lichtroze', naam: 'Lichtroze', hex: '#ffc2dc' },
  { id: 'lichtblauw', naam: 'Lichtblauw', hex: '#b5e8ff' },
  { id: 'mint', naam: 'Mint', hex: '#bff5d2' },
  { id: 'wit', naam: 'Wit', hex: '#fbf8ff' },
  { id: 'hout', naam: 'Hout', hex: '#c68b59' },
  { id: 'nacht', naam: 'Nachtblauw', hex: '#33295a' },
] as const;
export type KleurId = (typeof KLEUREN)[number]['id'];
export const KLEUR_IDS: KleurId[] = KLEUREN.map((k) => k.id);

export function kleurHex(id: string): string {
  return KLEUREN.find((k) => k.id === id)?.hex ?? '#ffffff';
}

export type Categorie = 'muren' | 'vloer' | 'binnen' | 'buiten' | 'blokken' | 'gum';
export const CATEGORIEEN: { id: Categorie; naam: string; icoon: string }[] = [
  { id: 'muren', naam: 'Muren', icoon: '🧱' },
  { id: 'vloer', naam: 'Vloer', icoon: '🟪' },
  { id: 'binnen', naam: 'Binnen', icoon: '🛋️' },
  { id: 'buiten', naam: 'Buiten', icoon: '🌳' },
  { id: 'blokken', naam: 'Blokken', icoon: '🧊' },
  { id: 'gum', naam: 'Gum', icoon: '🧽' },
];

/** Hoe een meubel botst: niet, als een blok tot een hoogte, of alleen een smal paaltje in het midden. */
export type Botsing = 'geen' | { hoogte: number } | { smal: number };

export interface Onderdeel {
  id: string;
  naam: string;
  icoon: string;
  categorie: Exclude<Categorie, 'gum'>;
  soort: 'muur' | 'vloer' | 'meubel' | 'blok';
  /** Breedte en diepte in vakjes (alleen meubels). */
  maat?: readonly [number, number];
  /** Kan Ninte de kleur kiezen? */
  kleurbaar: boolean;
  /** Kleur als je niets kiest of als het niet kleurbaar is. */
  standaardKleur: KleurId;
  botsing?: Botsing;
  /** Heb je meteen, zonder opdracht. */
  start?: boolean;
}

export const ONDERDELEN = [
  { id: 'muur', naam: 'Muur', icoon: '🧱', categorie: 'muren', soort: 'muur', kleurbaar: true, standaardKleur: 'lichtroze', start: true },
  { id: 'deur', naam: 'Deur', icoon: '🚪', categorie: 'muren', soort: 'muur', kleurbaar: true, standaardKleur: 'hout', start: true },
  { id: 'raam', naam: 'Raam', icoon: '🪟', categorie: 'muren', soort: 'muur', kleurbaar: true, standaardKleur: 'wit' },
  { id: 'hek', naam: 'Hekje', icoon: '🚧', categorie: 'muren', soort: 'muur', kleurbaar: true, standaardKleur: 'wit', start: true },
  { id: 'vloer', naam: 'Vloer', icoon: '🟪', categorie: 'vloer', soort: 'vloer', kleurbaar: true, standaardKleur: 'hout', start: true },
  { id: 'blok', naam: 'Blok', icoon: '🧊', categorie: 'blokken', soort: 'blok', kleurbaar: true, standaardKleur: 'blauw', start: true },
  { id: 'tafel', naam: 'Tafel', icoon: '🍽️', categorie: 'binnen', soort: 'meubel', maat: [1, 1], kleurbaar: true, standaardKleur: 'hout', botsing: { hoogte: 0.8 }, start: true },
  { id: 'stoel', naam: 'Stoel', icoon: '🪑', categorie: 'binnen', soort: 'meubel', maat: [1, 1], kleurbaar: true, standaardKleur: 'roze', botsing: { hoogte: 0.5 }, start: true },
  { id: 'bed', naam: 'Bed', icoon: '🛏️', categorie: 'binnen', soort: 'meubel', maat: [1, 2], kleurbaar: true, standaardKleur: 'paars', botsing: { hoogte: 0.6 }, start: true },
  { id: 'lamp', naam: 'Lamp', icoon: '💡', categorie: 'binnen', soort: 'meubel', maat: [1, 1], kleurbaar: true, standaardKleur: 'geel', botsing: { smal: 1.6 }, start: true },
  { id: 'plant', naam: 'Plant', icoon: '🪴', categorie: 'binnen', soort: 'meubel', maat: [1, 1], kleurbaar: false, standaardKleur: 'groen', botsing: { hoogte: 0.5 }, start: true },
  { id: 'kleed', naam: 'Kleed', icoon: '🟫', categorie: 'binnen', soort: 'meubel', maat: [2, 2], kleurbaar: true, standaardKleur: 'lichtblauw', botsing: 'geen' },
  { id: 'bank', naam: 'Bank', icoon: '🛋️', categorie: 'binnen', soort: 'meubel', maat: [2, 1], kleurbaar: true, standaardKleur: 'blauw', botsing: { hoogte: 0.5 } },
  { id: 'tv', naam: 'Televisie', icoon: '📺', categorie: 'binnen', soort: 'meubel', maat: [1, 1], kleurbaar: false, standaardKleur: 'nacht', botsing: { hoogte: 1.4 } },
  { id: 'kast', naam: 'Kast', icoon: '🗄️', categorie: 'binnen', soort: 'meubel', maat: [1, 1], kleurbaar: true, standaardKleur: 'wit', botsing: { hoogte: 2.2 } },
  { id: 'bad', naam: 'Bad', icoon: '🛁', categorie: 'binnen', soort: 'meubel', maat: [1, 2], kleurbaar: false, standaardKleur: 'wit', botsing: { hoogte: 0.6 } },
  { id: 'bloembak', naam: 'Bloembak', icoon: '🌷', categorie: 'buiten', soort: 'meubel', maat: [1, 1], kleurbaar: true, standaardKleur: 'hout', botsing: { hoogte: 0.5 } },
  { id: 'boom', naam: 'Boom', icoon: '🌳', categorie: 'buiten', soort: 'meubel', maat: [1, 1], kleurbaar: false, standaardKleur: 'groen', botsing: { smal: 3 } },
  { id: 'schommel', naam: 'Schommel', icoon: '🎠', categorie: 'buiten', soort: 'meubel', maat: [2, 1], kleurbaar: true, standaardKleur: 'roze', botsing: 'geen' },
  { id: 'zwembad', naam: 'Zwembad', icoon: '🏊', categorie: 'buiten', soort: 'meubel', maat: [3, 2], kleurbaar: false, standaardKleur: 'lichtblauw', botsing: 'geen' },
] as const satisfies readonly Onderdeel[];

export type OnderdeelId = (typeof ONDERDELEN)[number]['id'];
export type MuurSoort = 'muur' | 'deur' | 'raam' | 'hek';
export type MeubelId = Extract<(typeof ONDERDELEN)[number], { soort: 'meubel' }>['id'];

export function onderdeel(id: string): Onderdeel | undefined {
  return (ONDERDELEN as readonly Onderdeel[]).find((o) => o.id === id);
}

export function isMeubel(id: string): id is MeubelId {
  return onderdeel(id)?.soort === 'meubel';
}

export function isMuurSoort(id: string): id is MuurSoort {
  return onderdeel(id)?.soort === 'muur';
}
