// Wat er van het rijden bewaard wordt: je dieren, je eieren, welke eierplekken net
// leeg zijn, op welk dier je rijdt en je beste racetijd.

import { EI_SOORTEN, PONY_ID, rijdier, VARIANTEN, type EiSoort, type Variant } from './dieren';

export interface MijnDier {
  /** Uniek nummer, zodat je twee dezelfde dieren kunt hebben. */
  nr: number;
  soort: string;
  variant: Variant;
}

export interface RijStand {
  dieren: MijnDier[];
  eieren: Record<EiSoort, number>;
  /** Per eierplek: wanneer (ms sinds 1970) hij weer een ei heeft. */
  eiPlekken: Record<string, number>;
  /** Nummer van het dier waarop je rijdt (0 = je pony), of null als je loopt. */
  rijdt: number | null;
  /** Beste racetijd in seconden. */
  record: number | null;
  /** 0 = geen, 1 brons, 2 zilver, 3 goud. */
  medaille: number;
  volgendNr: number;
}

export const MAX_DIEREN = 80;
export const MAX_EIEREN = 9;
/** Het nummer van je eigen pony. */
export const PONY_NR = 0;

export function nieuwRijden(): RijStand {
  return { dieren: [], eieren: { gewoon: 0, zeldzaam: 0, goud: 0 }, eiPlekken: {}, rijdt: null, record: null, medaille: 0, volgendNr: 1 };
}

export function voegDierToe(s: RijStand, soort: string, variant: Variant): MijnDier | null {
  if (s.dieren.length >= MAX_DIEREN || !rijdier(soort)) return null;
  const dier = { nr: s.volgendNr++, soort, variant };
  s.dieren.push(dier);
  return dier;
}

export function dierMetNr(s: RijStand, nr: number): MijnDier | undefined {
  return nr === PONY_NR ? { nr: PONY_NR, soort: PONY_ID, variant: 'normaal' } : s.dieren.find((d) => d.nr === nr);
}

export function pakEi(s: RijStand, soort: EiSoort): boolean {
  if (s.eieren[soort] >= MAX_EIEREN) return false;
  s.eieren[soort]++;
  return true;
}

export function gebruikEi(s: RijStand, soort: EiSoort): boolean {
  if (s.eieren[soort] <= 0) return false;
  s.eieren[soort]--;
  return true;
}

/** Hoeveel verschillende soorten je al hebt gevonden. */
export function gevondenSoorten(s: RijStand): Set<string> {
  return new Set(s.dieren.map((d) => d.soort));
}

export function valideerRijden(data: unknown): { stand: RijStand; aangepast: boolean } {
  const stand = nieuwRijden();
  if (data === undefined) return { stand, aangepast: false };
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { stand, aangepast: true };
  const r = data as Record<string, unknown>;
  let aangepast = false;
  const heel = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
  if (Array.isArray(r.dieren)) {
    const nummers = new Set<number>();
    for (const d of r.dieren.slice(0, MAX_DIEREN)) {
      const x = d as Record<string, unknown> | null;
      if (x && heel(x.nr, 1, 1e9) && !nummers.has(x.nr as number) && typeof x.soort === 'string' && rijdier(x.soort)
        && VARIANTEN.some((v) => v.id === x.variant)) {
        nummers.add(x.nr as number);
        stand.dieren.push({ nr: x.nr as number, soort: x.soort, variant: x.variant as Variant });
      } else aangepast = true;
    }
    if (r.dieren.length > MAX_DIEREN) aangepast = true;
  } else if (r.dieren !== undefined) aangepast = true;
  const eieren = r.eieren as Record<string, unknown> | undefined;
  if (eieren && typeof eieren === 'object' && !Array.isArray(eieren)) {
    for (const s of EI_SOORTEN) {
      if (eieren[s] === undefined) continue;
      if (heel(eieren[s], 0, MAX_EIEREN)) stand.eieren[s] = eieren[s] as number;
      else aangepast = true;
    }
  } else if (r.eieren !== undefined) aangepast = true;
  const plekken = r.eiPlekken as Record<string, unknown> | undefined;
  if (plekken && typeof plekken === 'object' && !Array.isArray(plekken)) {
    for (const [k, v] of Object.entries(plekken)) {
      if (/^[a-z0-9-]{1,40}$/.test(k) && typeof v === 'number' && Number.isFinite(v) && v >= 0) stand.eiPlekken[k] = v;
      else aangepast = true;
    }
  } else if (r.eiPlekken !== undefined) aangepast = true;
  if (r.rijdt === null || r.rijdt === undefined) stand.rijdt = null;
  else if (heel(r.rijdt, 0, 1e9) && (r.rijdt === PONY_NR || stand.dieren.some((d) => d.nr === r.rijdt))) stand.rijdt = r.rijdt as number;
  else aangepast = true;
  if (r.record === null || r.record === undefined) stand.record = null;
  else if (typeof r.record === 'number' && Number.isFinite(r.record) && r.record > 0 && r.record < 3600) stand.record = r.record;
  else aangepast = true;
  if (heel(r.medaille, 0, 3)) stand.medaille = r.medaille as number;
  else if (r.medaille !== undefined) aangepast = true;
  const hoogste = Math.max(0, ...stand.dieren.map((d) => d.nr));
  stand.volgendNr = heel(r.volgendNr, 1, 1e9) ? Math.max(r.volgendNr as number, hoogste + 1) : hoogste + 1;
  return { stand, aangepast };
}
