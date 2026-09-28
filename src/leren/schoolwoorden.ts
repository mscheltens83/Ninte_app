import { WOORDEN, type Categorie, type Woordkaart } from './woorden';
import { zinMetGat } from './spelling';

export const CATEGORIEEN: Categorie[] = ['langermaakwoord', 'ei-ij', 'au-ou', 'schoolwoord'];
export const MAX_WEEKWOORDEN = 100;

export function normaalWoord(tekst: string): string {
  return tekst.normalize('NFC').trim().toLocaleLowerCase('nl');
}

export function geldigeWoordkaart(data: unknown): data is Woordkaart {
  if (!data || typeof data !== 'object') return false;
  const k = data as Record<string, unknown>;
  return typeof k.woord === 'string' && /^[\p{L}][\p{L}'’-]{1,29}$/u.test(k.woord)
    && normaalWoord(k.woord) === k.woord
    && typeof k.zin === 'string' && k.zin.length <= 200 && k.zin.toLocaleLowerCase('nl').includes(k.woord.toLocaleLowerCase('nl'))
    && CATEGORIEEN.includes(k.categorie as Categorie)
    && (k.categorie !== 'ei-ij' || /ei|ij/.test(k.woord))
    && (k.categorie !== 'au-ou' || /au|ou/.test(k.woord))
    && (k.categorie !== 'langermaakwoord' || (/[dt]$/.test(k.woord) && typeof k.langer === 'string' && /^[\p{L}'’-]{2,40}$/u.test(k.langer)
      && k.langer.startsWith(k.woord) && /^[dt]?[aeiou]/.test(k.langer.slice(k.woord.length))))
    && (k.fout === undefined || (typeof k.fout === 'string' && /^[\p{L}'’-]{1,40}$/u.test(k.fout) && normaalWoord(k.fout) !== normaalWoord(k.woord)))
    && zinMetGat(k as unknown as Woordkaart) !== k.zin;
}

/** Eén woord per regel, eventueel: woord | voorbeeldzin | langere vorm. */
export function leesWeekwoorden(tekst: string): { woorden: Woordkaart[]; fouten: string[] } {
  const woorden: Woordkaart[] = [];
  const fouten: string[] = [];
  const gezien = new Set<string>();
  for (const [i, regel] of tekst.split(/\r?\n/).entries()) {
    if (!regel.trim()) continue;
    const [ruw, zin, langer] = regel.split('|').map((s) => s.trim());
    const woord = normaalWoord(ruw);
    if (!/^[\p{L}][\p{L}'’-]{1,29}$/u.test(woord)) {
      fouten.push(`Regel ${i + 1}: gebruik één woord van 2 tot 30 letters.`);
      continue;
    }
    if (gezien.has(woord)) continue;
    if (woorden.length >= MAX_WEEKWOORDEN) {
      fouten.push(`Er passen maximaal ${MAX_WEEKWOORDEN} weekwoorden in de lijst.`);
      break;
    }
    const bekend = WOORDEN.find((w) => w.woord === woord);
    const categorie: Categorie = bekend?.categorie ?? (langer && /[dt]$/.test(woord) ? 'langermaakwoord' : /ei|ij/.test(woord) ? 'ei-ij' : /au|ou/.test(woord) ? 'au-ou' : 'schoolwoord');
    const kaart: Woordkaart = { ...(bekend ?? {}), woord, categorie, zin: zin || bekend?.zin || `Het woord is ${woord}.` };
    if (langer) kaart.langer = normaalWoord(langer);
    if (!geldigeWoordkaart(kaart)) {
      fouten.push(`Regel ${i + 1}: de voorbeeldzin moet het woord bevatten; controleer ook de langere vorm.`);
      continue;
    }
    gezien.add(woord);
    woorden.push(kaart);
  }
  return { woorden, fouten };
}

export function oefenWoorden(weekwoorden: Woordkaart[], alleenWeekwoorden: boolean, categorieen: Categorie[]): Woordkaart[] {
  const kaarten = new Map<string, Woordkaart>();
  if (!alleenWeekwoorden || !weekwoorden.length) for (const k of WOORDEN) kaarten.set(k.woord, k);
  for (const k of weekwoorden) kaarten.set(k.woord, k);
  return [...kaarten.values()].filter((k) => categorieen.includes(k.categorie));
}
