// Rekensommen voor groep 6: tafels, deelsommen, plus en min tot 1000,
// en keersommen met een nul. Met de trucjes die kinderen in de klas leren.

import { gewicht, type WoordStats } from './herhaalbakjes';
import type { Vraag } from './vragen';

export type SomSoort = 'keer' | 'deel' | 'plus' | 'min' | 'nul';

export interface Som {
  soort: SomSoort;
  a: number;
  b: number;
  antwoord: number;
  fout: number;
  /** Voor de herhaalbakjes (alleen tafel- en deelsommen worden onthouden). */
  sleutel: string;
}

type Rng = () => number;

function geheel(rng: Rng, van: number, tot: number): number {
  return van + Math.floor(rng() * (tot - van + 1));
}

function kies<T>(rng: Rng, lijst: T[]): T {
  return lijst[Math.floor(rng() * lijst.length)];
}

/** Een fout antwoord dat er echt op lijkt (maar nooit het goede). */
function foutUit(rng: Rng, goed: number, kandidaten: number[]): number {
  const bruikbaar = [...new Set(kandidaten)].filter((k) => k > 0 && k !== goed);
  return bruikbaar.length ? kies(rng, bruikbaar) : goed + 1;
}

export function tafelSom(a: number, b: number, rng: Rng = Math.random): Som {
  const goed = a * b;
  const omgedraaid = goed >= 10 && goed < 100 ? Number(String(goed).split('').reverse().join('')) : 0;
  const kandidaten = [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, omgedraaid];
  if (goed >= 20) kandidaten.push(goed + 10, goed - 10); // bij kleine sommen is +10 geen echte vergissing
  const fout = foutUit(rng, goed, kandidaten);
  return { soort: 'keer', a, b, antwoord: goed, fout, sleutel: `${a}x${b}` };
}

export function deelSom(a: number, b: number, rng: Rng = Math.random): Som {
  // (a × b) : a = b
  const fout = foutUit(rng, b, [b + 1, b - 1, b + 2]);
  return { soort: 'deel', a: a * b, b: a, antwoord: b, fout, sleutel: `${a * b}:${a}` };
}

export function plusSom(rng: Rng = Math.random): Som {
  const aH = geheel(rng, 1, 6);
  const a = aH * 100 + geheel(rng, 1, 9) * 10;
  const b = geheel(rng, 1, Math.min(3, 8 - aH)) * 100 + geheel(rng, 1, 9) * 10; // samen onder de 1000
  const goed = a + b;
  return { soort: 'plus', a, b, antwoord: goed, fout: foutUit(rng, goed, [goed + 10, goed - 10, goed + 100, goed - 100]), sleutel: `${a}+${b}` };
}

export function minSom(rng: Rng = Math.random): Som {
  const a = geheel(rng, 4, 9) * 100 + geheel(rng, 1, 9) * 10;
  const b = geheel(rng, 1, Math.floor(a / 100) - 2) * 100 + geheel(rng, 1, 9) * 10;
  const goed = a - b;
  return { soort: 'min', a, b, antwoord: goed, fout: foutUit(rng, goed, [goed + 10, goed - 10, goed + 100, goed - 100]), sleutel: `${a}-${b}` };
}

export function nulSom(rng: Rng = Math.random): Som {
  const a = geheel(rng, 2, 9) * 10;
  const b = geheel(rng, 2, 9);
  const goed = a * b;
  return { soort: 'nul', a, b, antwoord: goed, fout: foutUit(rng, goed, [goed / 10, goed * 10]), sleutel: `${a}x${b}` };
}

const TEKEN: Record<SomSoort, string> = { keer: '×', nul: '×', deel: ':', plus: '+', min: '-' };
const WOORD: Record<SomSoort, string> = { keer: 'keer', nul: 'keer', deel: 'gedeeld door', plus: 'plus', min: 'min' };

export function somTekst(s: Som): string {
  return `${s.a} ${TEKEN[s.soort]} ${s.b} = ___`;
}

export function somVoorlezen(s: Som): string {
  return `Hoeveel is ${s.a} ${WOORD[s.soort]} ${s.b}?`;
}

/** Het trucje bij een som, zoals kinderen het in groep 6 leren. */
export function somTip(s: Som): string {
  const { a, b, antwoord: c } = s;
  switch (s.soort) {
    case 'keer': {
      const kop = `Tafel van ${b}! `;
      switch (a) {
        case 2: return `${kop}2 × ${b} is het dubbele van ${b}: ${b} + ${b} = ${c}.`;
        case 3: return `${kop}Eerst 2 × ${b} = ${2 * b}, en dan nog ${b} erbij: ${c}.`;
        case 4: return `${kop}4 × ${b} is het dubbele van 2 × ${b}: ${2 * b} + ${2 * b} = ${c}.`;
        case 5: return `${kop}5 × ${b} is de helft van 10 × ${b}: de helft van ${10 * b} is ${c}.`;
        case 6: return `${kop}Eerst 5 × ${b} = ${5 * b}, en dan nog ${b} erbij: ${c}.`;
        case 7: return `${kop}Eerst 5 × ${b} = ${5 * b}, en dan 2 × ${b} = ${2 * b} erbij: ${c}.`;
        case 8: return `${kop}8 × ${b} is het dubbele van 4 × ${b}: ${4 * b} + ${4 * b} = ${c}.`;
        case 9: return `${kop}Eerst 10 × ${b} = ${10 * b}, en dan ${b} eraf: ${c}.`;
        case 10: return `${kop}10 × ${b}: zet een nul achter de ${b}. Dat is ${c}.`;
        default: return `${kop}${a} × ${b} = ${c}.`;
      }
    }
    case 'deel':
      return `${a} : ${b} = ${c}, want ${c} × ${b} = ${a}. Denk aan de tafel van ${b}.`;
    case 'plus': {
      const h = Math.floor(a / 100) * 100 + Math.floor(b / 100) * 100;
      const t = (a % 100) + (b % 100);
      return `Eerst de honderdtallen: ${Math.floor(a / 100) * 100} + ${Math.floor(b / 100) * 100} = ${h}. Dan de tientallen: ${a % 100} + ${b % 100} = ${t}. Samen is dat ${c}.`;
    }
    case 'min': {
      const tussen = a - Math.floor(b / 100) * 100;
      return `Haal eerst de honderdtallen eraf: ${a} - ${Math.floor(b / 100) * 100} = ${tussen}. Dan de tientallen: ${tussen} - ${b % 100} = ${c}.`;
    }
    case 'nul':
      return `Reken eerst ${a / 10} × ${b} = ${(a / 10) * b}. Zet er dan een nul achter: ${c}.`;
  }
}

export function rekenVraag(s: Som): Vraag {
  return {
    soort: 'rekenen',
    sleutel: s.sleutel,
    tekst: somTekst(s),
    goed: String(s.antwoord),
    fout: String(s.fout),
    voorlezen: somVoorlezen(s),
    tip: somTip(s),
    tipTitel: 'Het goede antwoord is:',
  };
}

/** Alle tafelsommen van 2 × 2 tot en met 10 × 10. */
export const TAFELSOMMEN: [number, number][] = [];
for (let a = 2; a <= 10; a++) for (let b = 2; b <= 10; b++) TAFELSOMMEN.push([a, b]);

/** Kies een tafelsom; sommen die vaak fout gaan komen vaker langs. */
function kiesTafel(stats: WoordStats, rng: Rng, al: Set<string>): [number, number] {
  const pool = TAFELSOMMEN.filter(([a, b]) => !al.has(`${a}x${b}`));
  const gewichten = pool.map(([a, b]) => gewicht(stats[`${a}x${b}`]));
  let r = rng() * gewichten.reduce((x, y) => x + y, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= gewichten[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/**
 * Sommen voor één ronde van de Reken-obby:
 * 3 tafelsommen, 1 deelsom, 1 plus- of minsom en 1 keersom met een nul.
 */
export function kiesSommen(stats: WoordStats, rng: Rng = Math.random): Som[] {
  const al = new Set<string>();
  const sommen: Som[] = [];
  for (let i = 0; i < 3; i++) {
    const [a, b] = kiesTafel(stats, rng, al);
    al.add(`${a}x${b}`);
    sommen.push(tafelSom(a, b, rng));
  }
  const [da, db] = kiesTafel(stats, rng, al);
  sommen.push(deelSom(da, db, rng));
  sommen.push(rng() < 0.5 ? plusSom(rng) : minSom(rng));
  sommen.push(nulSom(rng));
  for (let i = sommen.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [sommen[i], sommen[j]] = [sommen[j], sommen[i]];
  }
  return sommen;
}
