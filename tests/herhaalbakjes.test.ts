import { describe, expect, it } from 'vitest';
import { gewicht, kiesWoorden, verwerkAntwoord } from '../src/leren/herhaalbakjes';
import { WOORDEN } from '../src/leren/woorden';

function vasteRng(waarden: number[]): () => number {
  let i = 0;
  return () => waarden[i++ % waarden.length];
}

describe('verwerkAntwoord', () => {
  it('begint een nieuw woord in bakje 1 en schuift op bij goed', () => {
    const s = verwerkAntwoord(undefined, true, 1);
    expect(s).toEqual({ bakje: 2, goed: 1, fout: 0, laatst: 1 });
  });

  it('gaat terug naar bakje 1 bij fout', () => {
    const s = verwerkAntwoord({ bakje: 4, goed: 3, fout: 0, laatst: 0 }, false, 5);
    expect(s).toEqual({ bakje: 1, goed: 3, fout: 1, laatst: 5 });
  });

  it('komt niet hoger dan bakje 5', () => {
    const s = verwerkAntwoord({ bakje: 5, goed: 9, fout: 0, laatst: 0 }, true, 1);
    expect(s.bakje).toBe(5);
  });
});

describe('kiesWoorden', () => {
  it('kiest het gevraagde aantal verschillende woorden', () => {
    const gekozen = kiesWoorden(WOORDEN, {}, 6);
    expect(gekozen).toHaveLength(6);
    expect(new Set(gekozen.map((k) => k.woord)).size).toBe(6);
  });

  it('kiest alleen uit de gevraagde categorieën', () => {
    const gekozen = kiesWoorden(WOORDEN, {}, 8, ['au-ou']);
    expect(gekozen.every((k) => k.categorie === 'au-ou')).toBe(true);
  });

  it('geeft niet meer woorden dan er zijn', () => {
    const drie = WOORDEN.slice(0, 3);
    expect(kiesWoorden(drie, {}, 10)).toHaveLength(3);
  });

  it('kiest lastige woorden (bakje 1) vaker dan beheerste woorden (bakje 5)', () => {
    const kaarten = WOORDEN.slice(0, 2);
    const stats = {
      [kaarten[0].woord]: { bakje: 1, goed: 0, fout: 3, laatst: 0 },
      [kaarten[1].woord]: { bakje: 5, goed: 6, fout: 0, laatst: 0 },
    };
    let lastigEerst = 0;
    const rng = vasteRng([0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95]);
    for (let i = 0; i < 100; i++) {
      if (kiesWoorden(kaarten, stats, 1, undefined, rng)[0] === kaarten[0]) lastigEerst++;
    }
    expect(gewicht(stats[kaarten[0].woord])).toBeGreaterThan(gewicht(stats[kaarten[1].woord]));
    expect(lastigEerst).toBeGreaterThan(80);
  });
});
