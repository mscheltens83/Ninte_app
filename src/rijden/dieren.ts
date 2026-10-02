// Alle rijdieren, eieren en kansen. Dit is gewoon een lijst gegevens:
// een nieuw dier toevoegen = een regel in RIJDIEREN (het model wordt vanzelf gebouwd
// uit het bouwplan; zie model.ts).

export const ZELDZAAMHEDEN = [
  { id: 'gewoon', naam: 'Gewoon', kleur: '#8fd07a' },
  { id: 'zeldzaam', naam: 'Zeldzaam', kleur: '#4fb8ff' },
  { id: 'episch', naam: 'Episch', kleur: '#a36bff' },
  { id: 'legendarisch', naam: 'Legendarisch', kleur: '#ffb000' },
] as const;
export type Zeldzaamheid = (typeof ZELDZAAMHEDEN)[number]['id'];

export const VARIANTEN = [
  { id: 'normaal', naam: '', icoon: '', bonus: 1 },
  { id: 'glitter', naam: 'Glitter', icoon: '✨', bonus: 1.05 },
  { id: 'goud', naam: 'Goud', icoon: '🌟', bonus: 1.1 },
  { id: 'regenboog', naam: 'Regenboog', icoon: '🌈', bonus: 1.15 },
] as const;
export type Variant = (typeof VARIANTEN)[number]['id'];

/** Hoe het dier eruitziet. Het model wordt hieruit opgebouwd. */
export interface Bouwplan {
  vorm: 'paard' | 'kat' | 'vogel' | 'draak' | 'schildpad';
  lijf: string;
  accent: string;
  /** Kleur van buik, snuit of vlekken. */
  licht?: string;
  oren?: 'punt' | 'lang' | 'rond' | 'geen';
  staart?: 'pluim' | 'dun' | 'kort' | 'geen';
  hoorn?: boolean;
  gewei?: boolean;
  vleugels?: boolean;
  strepen?: string;
  vlekken?: string;
  sterren?: boolean;
  /** Groter of kleiner dan normaal. */
  schaal?: number;
}

export interface Rijdier {
  id: string;
  naam: string;
  icoon: string;
  zeldzaamheid: Zeldzaamheid;
  /** Hoeveel sneller dan lopen. */
  snelheid: number;
  /** Hoeveel hoger dan gewoon springen. */
  sprong: number;
  plan: Bouwplan;
}

export const RIJDIEREN: Rijdier[] = [
  { id: 'vos', naam: 'Vos', icoon: '🦊', zeldzaamheid: 'gewoon', snelheid: 1.2, sprong: 1.1, plan: { vorm: 'kat', lijf: '#e8772e', accent: '#2b2340', licht: '#fff3e6', oren: 'punt', staart: 'pluim' } },
  { id: 'panda', naam: 'Panda', icoon: '🐼', zeldzaamheid: 'gewoon', snelheid: 1.1, sprong: 1.05, plan: { vorm: 'kat', lijf: '#f6f4f0', accent: '#24212b', licht: '#24212b', oren: 'rond', staart: 'kort', schaal: 1.1 } },
  { id: 'konijn', naam: 'Konijn', icoon: '🐰', zeldzaamheid: 'gewoon', snelheid: 1.15, sprong: 1.4, plan: { vorm: 'kat', lijf: '#e9dccb', accent: '#ffb3c7', licht: '#ffffff', oren: 'lang', staart: 'kort' } },
  { id: 'schildpad', naam: 'Schildpad', icoon: '🐢', zeldzaamheid: 'gewoon', snelheid: 1.0, sprong: 1.0, plan: { vorm: 'schildpad', lijf: '#7bc96f', accent: '#5b8c3a', licht: '#c8a36a' } },
  { id: 'luipaard', naam: 'Luipaard', icoon: '🐆', zeldzaamheid: 'zeldzaam', snelheid: 1.5, sprong: 1.2, plan: { vorm: 'kat', lijf: '#f2c45a', accent: '#3b2a1e', licht: '#fff3d6', oren: 'rond', staart: 'dun', vlekken: '#3b2a1e' } },
  { id: 'hert', naam: 'Hert', icoon: '🦌', zeldzaamheid: 'zeldzaam', snelheid: 1.45, sprong: 1.35, plan: { vorm: 'paard', lijf: '#b07a48', accent: '#5b3b22', licht: '#fff1dc', oren: 'punt', staart: 'kort', gewei: true, vlekken: '#fff1dc' } },
  { id: 'flamingo', naam: 'Flamingo', icoon: '🦩', zeldzaamheid: 'zeldzaam', snelheid: 1.4, sprong: 1.3, plan: { vorm: 'vogel', lijf: '#ff8fbf', accent: '#2b2340', licht: '#ffd23f' } },
  { id: 'zebra', naam: 'Zebra', icoon: '🦓', zeldzaamheid: 'zeldzaam', snelheid: 1.45, sprong: 1.15, plan: { vorm: 'paard', lijf: '#f7f5f0', accent: '#1f1c24', oren: 'punt', staart: 'pluim', strepen: '#1f1c24' } },
  { id: 'eenhoorn', naam: 'Eenhoorn', icoon: '🦄', zeldzaamheid: 'episch', snelheid: 1.75, sprong: 1.35, plan: { vorm: 'paard', lijf: '#fff7fb', accent: '#c79cff', licht: '#ffd6ec', oren: 'punt', staart: 'pluim', hoorn: true } },
  { id: 'draakje', naam: 'Draakje', icoon: '🐉', zeldzaamheid: 'episch', snelheid: 1.75, sprong: 1.45, plan: { vorm: 'draak', lijf: '#46c37b', accent: '#ffd23f', licht: '#c9f5d7', vleugels: true, staart: 'dun' } },
  { id: 'ijsbeer', naam: 'IJsbeer', icoon: '🐻‍❄️', zeldzaamheid: 'episch', snelheid: 1.65, sprong: 1.2, plan: { vorm: 'kat', lijf: '#f4fbff', accent: '#2b2340', licht: '#dff2ff', oren: 'rond', staart: 'kort', schaal: 1.25 } },
  { id: 'sterrenpaard', naam: 'Sterrenpaard', icoon: '⭐', zeldzaamheid: 'legendarisch', snelheid: 2.0, sprong: 1.6, plan: { vorm: 'paard', lijf: '#2b2a6b', accent: '#9fe7ff', licht: '#ffe680', oren: 'punt', staart: 'pluim', hoorn: true, vleugels: true, sterren: true } },
  { id: 'regenboogdraak', naam: 'Regenboogdraak', icoon: '🌈', zeldzaamheid: 'legendarisch', snelheid: 2.05, sprong: 1.6, plan: { vorm: 'draak', lijf: '#ff6fb1', accent: '#ffffff', licht: '#ffe680', vleugels: true, staart: 'dun', strepen: 'regenboog', schaal: 1.1 } },
];

/** Ninte haar eigen pony: die heeft ze altijd. De kleuren komen van haar keuze. */
export const PONY_ID = 'pony';
export const PONY_SNELHEID = 1.3;

interface EiType {
  id: string;
  naam: string;
  icoon: string;
  kleur: string;
  stip: string;
  /** Moet je eerst een leervraag goed doen? */
  vraag: boolean;
  /** Kans (in procenten) op elke zeldzaamheid. */
  kansen: Record<Zeldzaamheid, number>;
}

export const EIEREN = [
  { id: 'gewoon', naam: 'Wit ei', icoon: '🥚', kleur: '#fff8ec', stip: '#ffb3c7', vraag: false,
    kansen: { gewoon: 75, zeldzaam: 22, episch: 3, legendarisch: 0 } },
  { id: 'zeldzaam', naam: 'Blauw ei', icoon: '🔵', kleur: '#8fd6ff', stip: '#ffffff', vraag: true,
    kansen: { gewoon: 30, zeldzaam: 50, episch: 17, legendarisch: 3 } },
  { id: 'goud', naam: 'Gouden ei', icoon: '🟡', kleur: '#ffcf33', stip: '#fff6c2', vraag: true,
    kansen: { gewoon: 0, zeldzaam: 35, episch: 45, legendarisch: 20 } },
] as const satisfies readonly EiType[];
export type EiSoort = (typeof EIEREN)[number]['id'];
export const EI_SOORTEN: EiSoort[] = EIEREN.map((e) => e.id);

/** Kans op een bijzondere kleur, in procenten (bij een gouden ei twee keer zo groot). */
export const VARIANT_KANSEN: Record<Exclude<Variant, 'normaal'>, number> = { regenboog: 3, goud: 6, glitter: 8 };

export function rijdier(id: string): Rijdier | undefined {
  return RIJDIEREN.find((d) => d.id === id);
}

export function varianteVan(id: string) {
  return VARIANTEN.find((v) => v.id === id) ?? VARIANTEN[0];
}

/** Kies iets uit een lijst met gewichten. `rng` geeft 0..1. */
function kiesGewogen<T extends string>(kansen: Record<T, number>, rng: () => number): T {
  const items = Object.entries(kansen) as [T, number][];
  const totaal = items.reduce((s, [, k]) => s + k, 0);
  let r = rng() * totaal;
  for (const [id, k] of items) {
    if (k <= 0) continue;
    if ((r -= k) < 0) return id;
  }
  return items.filter(([, k]) => k > 0).at(-1)![0];
}

/** Wat komt er uit dit ei? */
export function trekDier(ei: EiSoort, rng: () => number = Math.random): { soort: string; variant: Variant } {
  const e = EIEREN.find((x) => x.id === ei)!;
  const zeldzaamheid = kiesGewogen(e.kansen, rng);
  const keuze = RIJDIEREN.filter((d) => d.zeldzaamheid === zeldzaamheid);
  const soort = keuze[Math.min(keuze.length - 1, Math.floor(rng() * keuze.length))].id;
  const keer = ei === 'goud' ? 2 : 1;
  const r = rng() * 100;
  let grens = 0;
  let variant: Variant = 'normaal';
  for (const [v, k] of Object.entries(VARIANT_KANSEN) as [Exclude<Variant, 'normaal'>, number][]) {
    grens += k * keer;
    if (r < grens) { variant = v; break; }
  }
  return { soort, variant };
}

/** Hoe snel een dier echt is (met de bonus van zijn kleur). */
export function snelheidVan(soort: string, variant: string): number {
  const basis = soort === PONY_ID ? PONY_SNELHEID : rijdier(soort)?.snelheid ?? 1;
  return Math.round(basis * varianteVan(variant).bonus * 100) / 100;
}

export function sprongVan(soort: string): number {
  return soort === PONY_ID ? 1.2 : rijdier(soort)?.sprong ?? 1.1;
}
