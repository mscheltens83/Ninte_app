// Voortgang bewaren op het apparaat zelf. Er gaat niets naar internet.

import { KAST, STANDAARD_UITERLIJK, type Uiterlijk } from '../figuren/uiterlijk';
import type { WoordStats } from '../leren/herhaalbakjes';
import { CATEGORIEEN, MAX_WEEKWOORDEN, geldigeWoordkaart, oefenWoorden } from '../leren/schoolwoorden';
import type { Categorie, Woordkaart } from '../leren/woorden';
import { nieuwAvontuur, valideerAvontuur, type AvontuurStand } from '../avontuur/logica';
import { nieuwRitme, valideerRitme, type RitmeStand } from '../ritme/stand';
import { nieuweBouw, valideerBouw, type BouwStand } from '../bouwen/stand';
import { nieuwRijden, valideerRijden, type RijStand } from '../rijden/stand';

export type DierenTaak = 'voeren' | 'borstelen' | 'apporteren';
export interface DagVoortgang {
  datum: string;
  dieren: Record<DierenTaak, number>;
  woordenGoed: number;
  woordenFout: number;
  verbeterd: number;
  sommenGoed: number;
  sommenFout: number;
  hoefijzers: number;
  speelSeconden: number;
  klaar: boolean;
}

export function legeDag(datum = ''): DagVoortgang {
  return { datum, dieren: { voeren: 0, borstelen: 0, apporteren: 0 }, woordenGoed: 0, woordenFout: 0,
    verbeterd: 0, sommenGoed: 0, sommenFout: 0, hoefijzers: 0, speelSeconden: 0, klaar: false };
}

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
  /** Zelfstandig getypte woorden, apart van de herkenningsvragen bij deuren. */
  dictee: WoordStats;
  weekwoorden: Woordkaart[];
  alleenWeekwoorden: boolean;
  categorieen: Categorie[];
  speeltijdMinuten: number;
  beeldkwaliteit: 'mooi' | 'zuinig';
  minderEffecten: boolean;
  introStap: number;
  dag: DagVoortgang;
  /** Avonturen hebben een eigen opslagversie; oude spelstanden blijven bruikbaar. */
  avontuur: AvontuurStand;
  /** Meespeelmuziek, eigen beat en beat-uitdagingen (ook een eigen, los gecontroleerd veld). */
  ritme: RitmeStand;
  /** Alles wat op de bouwkavel staat, en de gehaalde bouwopdrachten. */
  bouwen: BouwStand;
  /** Rijdieren, eieren en de racetijd. */
  rijden: RijStand;
}

const SLEUTEL = 'nintes-wereld';
const RESERVE = `${SLEUTEL}-reserve`;
export interface OpslagMelding { soort: 'ok' | 'hersteld' | 'aangepast' | 'fout'; tekst: string }
let melding: OpslagMelding = { soort: 'ok', tekst: '' };
let eldersGewijzigd = false;
const luisteraars = new Set<(m: OpslagMelding) => void>();

function meld(soort: OpslagMelding['soort'], tekst = '') {
  melding = { soort, tekst };
  for (const luister of luisteraars) luister(melding);
}

export function opslagMelding(): OpslagMelding { return melding; }
export function opOpslagMelding(luister: (m: OpslagMelding) => void): () => void {
  luisteraars.add(luister);
  luister(melding);
  return () => { luisteraars.delete(luister); };
}

if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
  if (event.key !== SLEUTEL && event.key !== null) return;
  eldersGewijzigd = true;
  meld('fout', 'De voortgang is gewijzigd in een ander tabblad. Download eventueel deze voortgang en vernieuw daarna de pagina om veilig verder te spelen.');
});

export function nieuweStand(): Spelstand {
  return {
    versie: 1,
    speler: 'Ninte',
    pony: null,
    puppy: null,
    hoefijzers: 0,
    woorden: Object.create(null) as WoordStats,
    sommen: Object.create(null) as WoordStats,
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
    dictee: Object.create(null) as WoordStats,
    weekwoorden: [],
    alleenWeekwoorden: true,
    categorieen: [...CATEGORIEEN],
    speeltijdMinuten: 20,
    beeldkwaliteit: 'mooi',
    minderEffecten: false,
    introStap: 0,
    dag: legeDag(),
    avontuur: nieuwAvontuur(),
    ritme: nieuwRitme(),
    bouwen: nieuweBouw(),
    rijden: nieuwRijden(),
  };
}

function record(data: unknown): Record<string, unknown> | null {
  return data !== null && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : null;
}

/** Alleen bekende, gecontroleerde velden overnemen; oudere standen blijven werken. */
export function valideerStand(data: unknown): { stand: Spelstand; aangepast: boolean } {
  const r = record(data);
  if (!r || r.versie !== 1) throw new Error('Dit is geen ondersteunde spelstand.');
  const stand = nieuweStand();
  let aangepast = false;
  const lees = <T>(o: Record<string, unknown>, k: string, geldig: (v: unknown) => boolean, basis: T): T => {
    const v = o[k];
    if (v === undefined) return basis;
    if (geldig(v)) return v as T;
    aangepast = true;
    return basis;
  };
  const getal = (o: Record<string, unknown>, k: string, basis = 0, max = 10_000_000, min = 0) =>
    lees(o, k, (v) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && Number.isInteger(v), basis);
  const bool = (k: string, basis: boolean) => lees(r, k, (v) => typeof v === 'boolean', basis);
  const lijst = (k: string) => {
    const waarden = lees<unknown[]>(r, k, Array.isArray, []);
    const veilig = waarden.filter((v): v is string => typeof v === 'string' && /^[a-z0-9-]{1,60}$/.test(v));
    if (veilig.length !== waarden.length || veilig.length > 200) aangepast = true;
    return [...new Set(veilig)].slice(0, 200);
  };
  const stats = (k: string): WoordStats => {
    const waarden = lees<Record<string, unknown>>(r, k, (v) => record(v) !== null, {});
    const uit = Object.create(null) as WoordStats;
    const items = Object.entries(waarden);
    if (items.length > 2000) aangepast = true;
    for (const [woord, v] of items.slice(0, 2000)) {
      const stat = record(v);
      if (!stat || !woord || woord.length > 80 || ['__proto__', 'constructor', 'prototype'].includes(woord)) { aangepast = true; continue; }
      uit[woord] = { bakje: getal(stat, 'bakje', 1, 5, 1), goed: getal(stat, 'goed'), fout: getal(stat, 'fout'),
        laatst: getal(stat, 'laatst', 0, 9_000_000_000_000) };
    }
    return uit;
  };
  stand.speler = lees(r, 'speler', (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 30, stand.speler);
  for (const soort of ['pony', 'puppy'] as const) {
    const dier = r[soort];
    if (dier === undefined || dier === null) continue;
    const d = record(dier);
    if (d && typeof d.naam === 'string' && d.naam.trim().length > 0 && d.naam.length <= 14
      && typeof d.kleur === 'string' && /^[a-z-]{1,20}$/.test(d.kleur)) stand[soort] = { naam: d.naam, kleur: d.kleur };
    else aangepast = true;
  }
  stand.hoefijzers = getal(r, 'hoefijzers');
  stand.obbyGehaald = getal(r, 'obbyGehaald');
  stand.woorden = stats('woorden');
  stand.sommen = stats('sommen');
  stand.dictee = stats('dictee');
  for (const k of ['geluidAan', 'muziekAan', 'uitlegGezien', 'drieSterren', 'alleenWeekwoorden', 'minderEffecten'] as const) stand[k] = bool(k, stand[k]);
  stand.stemNaam = lees(r, 'stemNaam', (v) => v === null || (typeof v === 'string' && v.length <= 200), null);
  stand.stemTempo = lees(r, 'stemTempo', (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0.5 && v <= 1.5, stand.stemTempo);
  for (const k of ['geheimen', 'goudenHoefijzers', 'bezit', 'gehaald'] as const) stand[k] = lijst(k);
  const uiterlijk = lees<Record<string, unknown>>(r, 'uiterlijk', (v) => record(v) !== null, {});
  for (const k of ['huid', 'haar', 'shirt', 'broek', 'schoenen'] as const) {
    stand.uiterlijk[k] = lees(uiterlijk, k, (v) => typeof v === 'string' && /^#[\da-f]{6}$/i.test(v), stand.uiterlijk[k]);
  }
  for (const k of ['kapsel', 'hoed', 'extra'] as const) {
    const waarden = new Set(KAST.filter((i) => i.soort === k).map((i) => i.waarde));
    const v = uiterlijk[k];
    if (v !== undefined) {
      if (typeof v === 'string' && waarden.has(v as never)) (stand.uiterlijk as unknown as Record<string, string>)[k] = v;
      else aangepast = true;
    }
  }
  const week = lees<unknown[]>(r, 'weekwoorden', Array.isArray, []);
  if (week.length > MAX_WEEKWOORDEN) aangepast = true;
  const uniek = new Map<string, Woordkaart>();
  for (const k of week.slice(0, MAX_WEEKWOORDEN)) {
    if (!geldigeWoordkaart(k)) { aangepast = true; continue; }
    uniek.set(k.woord, { woord: k.woord, zin: k.zin, categorie: k.categorie,
      ...(k.langer ? { langer: k.langer } : {}), ...(k.fout ? { fout: k.fout } : {}) });
  }
  stand.weekwoorden = [...uniek.values()];
  stand.categorieen = lees(r, 'categorieen', (v) => Array.isArray(v) && v.length > 0 && v.every((c) => CATEGORIEEN.includes(c)), stand.categorieen);
  stand.categorieen = [...new Set(stand.categorieen)];
  if (!oefenWoorden(stand.weekwoorden, stand.alleenWeekwoorden, stand.categorieen).length) {
    stand.categorieen = [...CATEGORIEEN];
    aangepast = true;
  }
  stand.speeltijdMinuten = getal(r, 'speeltijdMinuten', 20, 120);
  stand.beeldkwaliteit = lees(r, 'beeldkwaliteit', (v) => v === 'mooi' || v === 'zuinig', 'mooi');
  stand.introStap = getal(r, 'introStap', stand.uitlegGezien ? 3 : 0, 3);
  const dag = lees<Record<string, unknown>>(r, 'dag', (v) => record(v) !== null, {});
  stand.dag.datum = lees(dag, 'datum', (v) => typeof v === 'string' && (v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v)), '');
  const dieren = lees<Record<string, unknown>>(dag, 'dieren', (v) => record(v) !== null, {});
  for (const k of ['voeren', 'borstelen', 'apporteren'] as const) stand.dag.dieren[k] = getal(dieren, k, 0, 2);
  for (const k of ['woordenGoed', 'woordenFout', 'verbeterd', 'sommenGoed', 'sommenFout', 'hoefijzers'] as const) stand.dag[k] = getal(dag, k);
  stand.dag.speelSeconden = lees(dag, 'speelSeconden', (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 86400, 0);
  stand.dag.klaar = lees(dag, 'klaar', (v) => typeof v === 'boolean', false);
  const avontuur = valideerAvontuur(r.avontuur);
  stand.avontuur = avontuur.stand;
  aangepast ||= avontuur.aangepast;
  const ritme = valideerRitme(r.ritme);
  stand.ritme = ritme.stand;
  aangepast ||= ritme.aangepast;
  const bouwen = valideerBouw(r.bouwen);
  stand.bouwen = bouwen.stand;
  aangepast ||= bouwen.aangepast;
  const rijden = valideerRijden(r.rijden);
  stand.rijden = rijden.stand;
  aangepast ||= rijden.aangepast;
  return { stand, aangepast };
}

export function laadStand(opslag: Pick<Storage, 'getItem'> | null = veiligeOpslag()): Spelstand {
  if (!opslag) { meld('fout', 'Voortgang kan niet worden bewaard op dit apparaat. Maak na het spelen een back-up bij Voor ouders.'); return nieuweStand(); }
  try {
    const tekst = opslag.getItem(SLEUTEL);
    if (!tekst) {
      const reserve = opslag.getItem(RESERVE);
      if (reserve) {
        const herstel = valideerStand(JSON.parse(reserve));
        if (!herstel.aangepast) { meld('hersteld', 'De laatste goede spelstand is hersteld. Maak een back-up bij Voor ouders.'); return herstel.stand; }
      }
      meld('ok'); return nieuweStand();
    }
    const resultaat = valideerStand(JSON.parse(tekst));
    if (!resultaat.aangepast) { meld('ok'); return resultaat.stand; }
    try {
      const reserve = opslag.getItem(RESERVE);
      if (reserve) {
        const herstel = valideerStand(JSON.parse(reserve));
        if (!herstel.aangepast) { meld('hersteld', 'De laatste goede spelstand is hersteld. Controleer je voortgang bij Voor ouders.'); return herstel.stand; }
      }
    } catch { /* Gebruik de gecontroleerde delen van de hoofdstand. */ }
    meld('aangepast', 'Beschadigde gegevens zijn veilig aangevuld. Controleer je voortgang en maak een back-up bij Voor ouders.');
    return resultaat.stand;
  } catch {
    try {
      const reserve = opslag.getItem(RESERVE);
      if (reserve) {
        const herstel = valideerStand(JSON.parse(reserve));
        if (!herstel.aangepast) { meld('hersteld', 'De laatste goede spelstand is hersteld. Maak een back-up bij Voor ouders.'); return herstel.stand; }
      }
    } catch { /* Ook de reserve is niet leesbaar. */ }
    meld('fout', 'De bewaarde spelstand kon niet worden gelezen. Herstel een back-up bij Voor ouders.');
    return nieuweStand();
  }
}

type SchrijfOpslag = Pick<Storage, 'setItem'> & Partial<Pick<Storage, 'getItem'>>;
export function bewaarStand(stand: Spelstand, opslag: SchrijfOpslag | null = veiligeOpslag()): boolean {
  if (eldersGewijzigd) return false;
  if (!opslag) { meld('fout', 'Je voortgang is nog niet bewaard. Maak een back-up bij Voor ouders.'); return false; }
  try {
    const tekst = JSON.stringify(stand);
    try {
      const vorig = opslag.getItem?.(SLEUTEL);
      if (vorig && vorig !== tekst && !valideerStand(JSON.parse(vorig)).aangepast) opslag.setItem(RESERVE, vorig);
    } catch { /* Een reservefout mag het bewaren van de hoofdstand niet blokkeren. */ }
    opslag.setItem(SLEUTEL, tekst);
    if (melding.soort === 'fout') meld('ok');
    return true;
  } catch {
    meld('fout', 'Je laatste voortgang is nog niet bewaard. Maak een back-up bij Voor ouders; je kunt nu wel doorspelen.');
    return false;
  }
}

export function exporteerStand(stand: Spelstand): string {
  return JSON.stringify({ formaat: 'nintes-wereld-voortgang', versie: 1, gemaakt: new Date().toISOString(), stand: valideerStand(stand).stand }, null, 2);
}

export function leesBackUp(tekst: string): Spelstand {
  if (tekst.length > 2_000_000) throw new Error('Deze back-up is te groot. Kies een voortgangsbestand van Nintes Wereld.');
  let data: unknown;
  try { data = JSON.parse(tekst); } catch { throw new Error('Dit bestand is geen leesbare back-up.'); }
  const r = record(data);
  if (!r || r.formaat !== 'nintes-wereld-voortgang' || r.versie !== 1) throw new Error('Kies een back-up van Nintes Wereld.');
  const inhoud = record(r.stand);
  if (!inhoud || !Object.keys(nieuweStand()).filter(k => !['avontuur', 'ritme', 'bouwen', 'rijden'].includes(k)).every((k) => Object.hasOwn(inhoud, k)))
    throw new Error('Deze back-up is onvolledig. Je huidige voortgang is behouden.');
  const resultaat = valideerStand(r.stand);
  if (resultaat.aangepast) throw new Error('Deze back-up bevat ongeldige gegevens. Je huidige voortgang is behouden.');
  return resultaat.stand;
}

function veiligeOpslag(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
