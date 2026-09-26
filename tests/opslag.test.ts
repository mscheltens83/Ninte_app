import { describe, expect, it } from 'vitest';
import { bewaarStand, laadStand, nieuweStand } from '../src/opslag/opslag';

function nepOpslag() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe('opslag', () => {
  it('begint met een lege stand voor Ninte', () => {
    const stand = laadStand(nepOpslag());
    expect(stand.speler).toBe('Ninte');
    expect(stand.hoefijzers).toBe(0);
    expect(stand.pony).toBeNull();
  });

  it('bewaart en laadt de voortgang', () => {
    const opslag = nepOpslag();
    const stand = nieuweStand();
    stand.hoefijzers = 42;
    stand.pony = { naam: 'Storm', kleur: 'vos' };
    stand.woorden.paard = { bakje: 3, goed: 2, fout: 1, laatst: 5 };
    bewaarStand(stand, opslag);
    const terug = laadStand(opslag);
    expect(terug.hoefijzers).toBe(42);
    expect(terug.pony).toEqual({ naam: 'Storm', kleur: 'vos' });
    expect(terug.woorden.paard.bakje).toBe(3);
  });

  it('overleeft kapotte opslag', () => {
    const opslag = { getItem: () => '{kapot', setItem: () => {} };
    expect(laadStand(opslag).hoefijzers).toBe(0);
    const vol = { setItem: () => { throw new Error('vol'); } };
    expect(() => bewaarStand(nieuweStand(), vol)).not.toThrow();
  });
});
