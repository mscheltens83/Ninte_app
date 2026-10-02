// Patronen lezen. Er zijn twee schrijfwijzen, zodat liedjes makkelijk te maken zijn:
//
//  Slagwerk:  "x---x---x---x---"   x = slag, o = zachte slag, X = harde slag, - of . = stil
//  Tonen:     "0 . 2 - 4 . 2 ."    getal = trap in de toonladder, . = stil, - = toon aanhouden
//
// Een | mag overal staan om maten te scheiden; die telt niet mee.

export interface Noot {
  /** Begin, in 16e-stappen vanaf het begin van het patroon. */
  stap: number;
  /** Trap in de toonladder, of null bij slagwerk. */
  trap: number | null;
  /** Lengte in 16e-stappen. */
  duur: number;
  /** 0..1.2: hoe hard. */
  sterkte: number;
}

export interface Patroon {
  /** Lengte in 16e-stappen. */
  lengte: number;
  /** Per stap de noten die daar beginnen. */
  perStap: Noot[][];
}

const SLAGEN: Record<string, number> = { x: 1, X: 1.2, o: 0.55 };

export function isSlagPatroon(tekst: string): boolean {
  return /^[xXo.\-|]+$/.test(tekst.replace(/\s+/g, ''));
}

/** Lees een patroon. `stap` = hoeveel 16e-stappen één teken duurt. */
export function leesPatroon(tekst: string, stap = 1): Patroon {
  if (!Number.isInteger(stap) || stap < 1) throw new Error(`Ongeldige stapgrootte: ${stap}`);
  const noten: Noot[] = [];
  let lengte = 0;
  if (isSlagPatroon(tekst)) {
    for (const teken of tekst.replace(/[\s|]+/g, '')) {
      if (teken in SLAGEN) noten.push({ stap: lengte, trap: null, duur: stap, sterkte: SLAGEN[teken] });
      lengte += stap;
    }
  } else {
    let vorige: Noot | null = null;
    for (const token of tekst.split(/\s+/).filter((t) => t && t !== '|')) {
      if (token === '-') {
        if (vorige) vorige.duur += stap;
      } else if (token === '.') {
        vorige = null;
      } else {
        const trap = Number(token);
        if (!Number.isInteger(trap)) throw new Error(`Onbekend teken in patroon: "${token}"`);
        vorige = { stap: lengte, trap, duur: stap, sterkte: 1 };
        noten.push(vorige);
      }
      lengte += stap;
    }
  }
  if (lengte === 0) throw new Error('Leeg patroon');
  const perStap: Noot[][] = Array.from({ length: lengte }, () => []);
  for (const n of noten) perStap[n.stap].push(n);
  return { lengte, perStap };
}
