// Muziektheorie in een paar regels: toonladders, akkoorden en toonhoogtes.
// Alles werkt met MIDI-nummers (60 = de C in het midden van de piano).

export const TOONLADDERS = {
  majeur: [0, 2, 4, 5, 7, 9, 11],
  mineur: [0, 2, 3, 5, 7, 8, 10],
  mixolydisch: [0, 2, 4, 5, 7, 9, 10],
  dorisch: [0, 2, 3, 5, 7, 9, 10],
  lydisch: [0, 2, 4, 6, 7, 9, 11],
} as const;
export type Toonladder = keyof typeof TOONLADDERS;

/** MIDI-nummer naar frequentie in Hz. */
export function frequentie(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Frequentie naar (niet afgerond) MIDI-nummer. */
export function midiVan(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

/**
 * De toon op trap `trap` van een toonladder (0 = grondtoon, 7 = een octaaf hoger,
 * -1 = de toon onder de grondtoon). Werkt ook voor negatieve en grote trappen.
 */
export function trapNaarMidi(grondtoon: number, ladder: Toonladder, trap: number): number {
  const l = TOONLADDERS[ladder];
  const octaaf = Math.floor(trap / l.length);
  const rest = trap - octaaf * l.length;
  return grondtoon + octaaf * 12 + l[rest];
}

/** Een drieklank op een trap van de toonladder: trap, trap+2 en trap+4. */
export function drieklank(grondtoon: number, ladder: Toonladder, trap: number): number[] {
  return [0, 2, 4].map((d) => trapNaarMidi(grondtoon, ladder, trap + d));
}

/**
 * De dichtstbijzijnde toon die goed klinkt bij deze toonsoort (de vijf tonen van de
 * pentatonische toonladder). Zo passen alle geluidjes in het spel bij de muziek.
 */
export function inToonsoort(freq: number, grondtoon: number, ladder: Toonladder): number {
  if (!(freq > 0)) return freq;
  const l = TOONLADDERS[ladder];
  // Pentatonisch: laat de 4e en 7e trap weg, die botsen het snelst.
  const veilig = [l[0], l[1], l[2], l[4], l[5]];
  const m = midiVan(freq);
  let beste = m;
  let afstand = Infinity;
  const basis = Math.floor((m - grondtoon) / 12) * 12 + grondtoon;
  for (const oct of [-12, 0, 12]) {
    for (const s of veilig) {
      const kandidaat = basis + oct + s;
      const d = Math.abs(kandidaat - m);
      if (d < afstand) { afstand = d; beste = kandidaat; }
    }
  }
  return frequentie(beste);
}
