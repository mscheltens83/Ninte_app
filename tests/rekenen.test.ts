import { describe, expect, it } from 'vitest';
import {
  TAFELSOMMEN,
  deelSom,
  kiesSommen,
  minSom,
  nulSom,
  plusSom,
  rekenVraag,
  somTip,
  somVoorlezen,
  tafelSom,
} from '../src/leren/rekenen';
import { zaadRng } from '../src/wereld/bouwstenen';

describe('rekensommen', () => {
  it.each(TAFELSOMMEN)('%i × %i: goed antwoord, fout antwoord is anders en het trucje klopt', (a, b) => {
    const s = tafelSom(a, b, zaadRng(a * 100 + b));
    expect(s.antwoord).toBe(a * b);
    expect(s.fout).not.toBe(s.antwoord);
    expect(s.fout).toBeGreaterThan(0);
    const tip = somTip(s);
    expect(tip).toContain(String(a * b));
    expect(tip).toContain(`Tafel van ${b}`);
  });

  it('deelsommen komen uit de tafels', () => {
    const s = deelSom(6, 7);
    expect(s.a).toBe(42);
    expect(s.b).toBe(6);
    expect(s.antwoord).toBe(7);
    expect(somTip(s)).toBe('42 : 6 = 7, want 7 × 6 = 42. Denk aan de tafel van 6.');
    expect(somVoorlezen(s)).toBe('Hoeveel is 42 gedeeld door 6?');
  });

  it('plus- en minsommen blijven tussen 0 en 1000, met ronde tientallen', () => {
    const rng = zaadRng(7);
    for (let i = 0; i < 300; i++) {
      for (const s of [plusSom(rng), minSom(rng)]) {
        expect(s.antwoord).toBeGreaterThan(0);
        expect(s.antwoord).toBeLessThanOrEqual(1000);
        expect(s.antwoord % 10).toBe(0);
        expect(s.fout).not.toBe(s.antwoord);
        expect(somTip(s)).toContain(`${s.antwoord}.`);
      }
    }
  });

  it('keersommen met een nul hebben een fout antwoord met een nul te veel of te weinig', () => {
    const rng = zaadRng(3);
    for (let i = 0; i < 100; i++) {
      const s = nulSom(rng);
      expect(s.antwoord).toBe(s.a * s.b);
      expect([s.antwoord / 10, s.antwoord * 10]).toContain(s.fout);
      expect(somTip(s)).toContain('Zet er dan een nul achter');
    }
  });

  it('kiest 6 sommen per ronde: 3 tafels, 1 deelsom, 1 plus/min en 1 met een nul', () => {
    const sommen = kiesSommen({}, zaadRng(11));
    expect(sommen).toHaveLength(6);
    const soorten = sommen.map((s) => s.soort);
    expect(soorten.filter((s) => s === 'keer')).toHaveLength(3);
    expect(soorten.filter((s) => s === 'deel')).toHaveLength(1);
    expect(soorten.filter((s) => s === 'plus' || s === 'min')).toHaveLength(1);
    expect(soorten.filter((s) => s === 'nul')).toHaveLength(1);
    expect(new Set(sommen.map((s) => s.sleutel)).size).toBe(6);
  });

  it('kiest lastige tafels vaker', () => {
    const stats = { '7x8': { bakje: 1, goed: 0, fout: 4, laatst: 0 } } as Record<string, { bakje: number; goed: number; fout: number; laatst: number }>;
    for (const [a, b] of TAFELSOMMEN) if (`${a}x${b}` !== '7x8') stats[`${a}x${b}`] = { bakje: 5, goed: 5, fout: 0, laatst: 0 };
    const rng = zaadRng(5);
    let keer = 0;
    for (let i = 0; i < 100; i++) if (kiesSommen(stats, rng).some((s) => s.sleutel === '7x8')) keer++;
    expect(keer).toBeGreaterThan(20);
  });

  it('maakt er een vraag voor de obby van', () => {
    const v = rekenVraag(tafelSom(6, 7, zaadRng(1)));
    expect(v.tekst).toBe('6 × 7 = ___');
    expect(v.goed).toBe('42');
    expect(v.voorlezen).toBe('Hoeveel is 6 keer 7?');
    expect(v.soort).toBe('rekenen');
  });
});
