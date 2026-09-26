import { describe, expect, it } from 'vitest';
import { WOORDEN } from '../src/leren/woorden';
import { maakFouteVariant, tipVoor, voorleesTekst, zinMetGat } from '../src/leren/spelling';

describe('woordkaarten', () => {
  it('heeft geen dubbele woorden', () => {
    const woorden = WOORDEN.map((k) => k.woord);
    expect(new Set(woorden).size).toBe(woorden.length);
  });

  it.each(WOORDEN)('$woord staat letterlijk in de zin', (kaart) => {
    expect(zinMetGat(kaart)).toContain('___');
    expect(zinMetGat(kaart)).not.toBe(kaart.zin);
  });

  it.each(WOORDEN)('$woord heeft een foute variant die anders is', (kaart) => {
    const fout = maakFouteVariant(kaart);
    expect(fout).not.toBe(kaart.woord);
    expect(fout.length).toBe(kaart.woord.length);
  });

  it.each(WOORDEN.filter((k) => k.categorie === 'langermaakwoord'))(
    '$woord: langermaakwoord eindigt op d of t en de langere vorm bevat die letter',
    (kaart) => {
      const letter = kaart.woord.slice(-1);
      expect(['d', 't']).toContain(letter);
      expect(kaart.langer).toBeDefined();
      // Langer = een klankgroep erbij: paarden, rode, kinderen.
      expect(kaart.langer).toMatch(/e(n|ren)?$/);
      expect(kaart.langer).toContain(letter);
    },
  );

  it.each(WOORDEN.filter((k) => k.categorie === 'ei-ij'))('$woord bevat ei of ij', (kaart) => {
    expect(/ei|ij/.test(kaart.woord)).toBe(true);
  });

  it.each(WOORDEN.filter((k) => k.categorie === 'au-ou'))('$woord bevat au of ou', (kaart) => {
    expect(/au|ou/.test(kaart.woord)).toBe(true);
  });
});

describe('spelling', () => {
  const paard = WOORDEN.find((k) => k.woord === 'paard')!;
  const ei = WOORDEN.find((k) => k.woord === 'ei')!;
  const touw = WOORDEN.find((k) => k.woord === 'touw')!;
  const blij = WOORDEN.find((k) => k.woord === 'blij')!;

  it('maakt de d van een langermaakwoord een t', () => {
    expect(maakFouteVariant(paard)).toBe('paart');
  });

  it('wisselt ei en ij, en au en ou', () => {
    expect(maakFouteVariant(blij)).toBe('blei');
    expect(maakFouteVariant(ei)).toBe('ij');
    expect(maakFouteVariant(touw)).toBe('tauw');
  });

  it('vervangt alleen het hele woord door een gat', () => {
    // "ei" mag niet in "meisje" of "hooi" worden vervangen.
    expect(zinMetGat(ei)).toBe('De kip legt een ___ in het hooi.');
    expect(zinMetGat(paard)).toBe('Het ___ staat in de stal.');
  });

  it('geeft het Staal-trucje', () => {
    expect(tipVoor(paard)).toContain('paarden');
    expect(tipVoor(paard)).toContain('Dan hoor je een d');
    expect(tipVoor(blij)).toContain('lange ij');
    expect(tipVoor(ei)).toContain('korte ei');
  });

  it.each(WOORDEN)('tip bij $woord: elke zin begint met een hoofdletter', (kaart) => {
    for (const zin of tipVoor(kaart).split(/(?<=[.!?])\s+/)) {
      expect(zin[0]).toBe(zin[0].toUpperCase());
    }
  });

  it('leest voor als een dictee: woord, zin, woord', () => {
    expect(voorleesTekst(paard)).toBe('paard. Het paard staat in de stal. paard.');
  });
});
