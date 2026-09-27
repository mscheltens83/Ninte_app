import { describe, expect, it } from 'vitest';
import { INSPREEK_ZINNEN, knipStilte } from '../src/leren/inspreken';
import { WOORDEN } from '../src/leren/woorden';

function nepBuffer(samples: number[], sampleRate = 100) {
  const data = Float32Array.from(samples);
  return { sampleRate, length: data.length, getChannelData: () => data };
}

describe('inspreken', () => {
  it('heeft een dictee-zin voor elk woord, en unieke sleutels', () => {
    for (const k of WOORDEN) expect(INSPREEK_ZINNEN.some((z) => z.sleutel === `dictee-${k.woord}`)).toBe(true);
    expect(new Set(INSPREEK_ZINNEN.map((z) => z.sleutel)).size).toBe(INSPREEK_ZINNEN.length);
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
