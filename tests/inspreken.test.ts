import { describe, expect, it } from 'vitest';
import { INSPREEK_ZINNEN, knipStilte, microfoonHulp } from '../src/leren/inspreken';
import { WOORDEN } from '../src/leren/woorden';

function nepBuffer(samples: number[], sampleRate = 100) {
  const data = Float32Array.from(samples);
  return { sampleRate, length: data.length, getChannelData: () => data };
}

describe('inspreken', () => {
  it('heeft voor elk woord alleen het woord zelf, en unieke sleutels', () => {
    for (const k of WOORDEN) {
      const zin = INSPREEK_ZINNEN.find((z) => z.sleutel === `woord-${k.woord}`);
      expect(zin?.tekst).toBe(k.woord);
    }
    expect(new Set(INSPREEK_ZINNEN.map((z) => z.sleutel)).size).toBe(INSPREEK_ZINNEN.length);
  });

  it('heeft universele zinnen die niet over één woord of som gaan', () => {
    const universeel = INSPREEK_ZINNEN.filter((z) => z.groep !== 'Woorden voor het dictee');
    expect(universeel.length).toBeGreaterThanOrEqual(15);
    for (const z of universeel) {
      // Geen sommen, en geen dictee-woord of -zin op zichzelf
      expect(z.tekst).not.toMatch(/\d/);
      for (const k of WOORDEN) {
        expect(z.tekst).not.toBe(k.zin);
        expect(z.tekst.toLowerCase()).not.toBe(k.woord);
      }
    }
    expect(universeel.filter((z) => z.sleutel.startsWith('goed-')).length).toBeGreaterThanOrEqual(3);
    expect(universeel.filter((z) => z.sleutel.startsWith('fout-')).length).toBeGreaterThanOrEqual(2);
  });

  it('geeft microfoon-uitleg die past bij het apparaat', () => {
    expect(microfoonHulp('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120')).toContain('Chrome');
    expect(microfoonHulp('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari')).toContain('Safari');
    expect(microfoonHulp('Mozilla/5.0 (Windows NT 10.0) Firefox')).toContain('browser');
  });

  it('knipt stilte aan het begin en eind weg', () => {
    // 1 seconde stilte, 1 seconde geluid, 1 seconde stilte (100 samples per seconde)
    const samples = [...Array(100).fill(0), ...Array(100).fill(0.5), ...Array(100).fill(0.001)];
    const k = knipStilte(nepBuffer(samples));
    expect(k.start).toBeCloseTo(0.92, 2);
    expect(k.start + k.duur).toBeCloseTo(2.19, 2);
    expect(k.versterking).toBeCloseTo(1.8, 2); // 0.9 / 0.5
  });

  it('zet een zachte opname harder, maar niet te hard', () => {
    const k = knipStilte(nepBuffer([0, 0.03, 0.05, 0.03, 0]));
    expect(k.versterking).toBe(4);
  });

  it('laat een stille opname heel', () => {
    const k = knipStilte(nepBuffer([0, 0, 0]));
    expect(k.start).toBe(0);
    expect(k.versterking).toBe(1);
  });
});
