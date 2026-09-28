import { describe, expect, it } from 'vitest';
import { bewaarStand, exporteerStand, laadStand, leesBackUp, nieuweStand, opslagMelding, valideerStand } from '../src/opslag/opslag';

function nepOpslag() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe('opslag', () => {
  it('herstelt een onbruikbare combinatie van categorieën en woorden', () => {
    const data = { ...nieuweStand(), weekwoorden: [{ woord: 'robot', zin: 'De robot rent.', categorie: 'schoolwoord' }], categorieen: ['ei-ij'] };
    const resultaat = valideerStand(data);
    expect(resultaat.aangepast).toBe(true);
    expect(resultaat.stand.categorieen).toContain('schoolwoord');
    expect(() => leesBackUp(JSON.stringify({ formaat: 'nintes-wereld-voortgang', versie: 1, stand: { versie: 1 } }))).toThrow('onvolledig');
  });
  it('herstelt een vorige goede stand bij beschadiging en een ontbrekende hoofdstand', () => {
    const opslag = nepOpslag(), stand = nieuweStand();
    stand.hoefijzers = 42; bewaarStand(stand, opslag);
    stand.hoefijzers = 50; bewaarStand(stand, opslag);
    opslag.setItem('nintes-wereld', '{kapot');
    expect(laadStand(opslag).hoefijzers).toBe(42);
    expect(opslagMelding().soort).toBe('hersteld');
    opslag.setItem('nintes-wereld', '');
    expect(laadStand(opslag).hoefijzers).toBe(42);
  });
  it('controleert geneste velden, vreemde typen en ongeldige getallen', () => {
    const data = { ...nieuweStand(), hoefijzers: -4, geheimen: null, uiterlijk: { huid: 'javascript:', hoed: 'onbekend' },
      woorden: { hond: { bakje: 99, goed: -1, fout: '2', laatst: Infinity } }, dag: { dieren: { voeren: 80 }, speelSeconden: -1 } };
    const { stand, aangepast } = valideerStand(data);
    expect(aangepast).toBe(true);
    expect(stand.geheimen).toEqual([]);
    expect(stand.woorden.hond).toEqual({ bakje: 1, goed: 0, fout: 0, laatst: 0 });
    expect(stand.dag.dieren.voeren).toBe(0);
    expect(stand.uiterlijk.huid).toMatch(/^#/);
    expect(stand.hoefijzers).toBe(0);
  });
  it('meldt opslagfalen en bewaart de nog niet opgeslagen voortgang in de back-up', () => {
    const stand = nieuweStand(); stand.hoefijzers = 123;
    expect(bewaarStand(stand, { setItem: () => { throw new Error('QuotaExceededError'); } })).toBe(false);
    expect(opslagMelding().soort).toBe('fout');
    expect(leesBackUp(exporteerStand(stand)).hoefijzers).toBe(123);
  });
  it('bewaart alle nieuwe leergegevens in een gecontroleerde back-up', () => {
    const stand = nieuweStand(); stand.dictee.hond = { bakje: 2, goed: 1, fout: 0, laatst: 100 };
    stand.weekwoorden = [{ woord: 'robot', zin: 'De robot rent.', categorie: 'schoolwoord' }];
    stand.dag.dieren.borstelen = 1; stand.beeldkwaliteit = 'zuinig';
    expect(leesBackUp(exporteerStand(stand))).toEqual(stand);
    expect(() => leesBackUp('{kapot')).toThrow('leesbare back-up');
    expect(() => leesBackUp(JSON.stringify({ formaat: 'nintes-wereld-voortgang', versie: 1, stand: { ...stand, geheimen: null } }))).toThrow('ongeldige gegevens');
    expect(() => leesBackUp('{}')).toThrow('Kies een back-up');
  });
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

  it('vult nieuwe velden aan bij een oude opgeslagen stand', () => {
    const oud = { versie: 1, speler: 'Ninte', hoefijzers: 7, woorden: {}, pony: null, puppy: null, obbyGehaald: 1, geluidAan: false, uitlegGezien: true };
    const opslag = { getItem: () => JSON.stringify(oud), setItem: () => {} };
    const stand = laadStand(opslag);
    expect(stand.hoefijzers).toBe(7);
    expect(stand.geluidAan).toBe(false);
    expect(stand.muziekAan).toBe(true);
    expect(stand.geheimen).toEqual([]);
    expect(stand.goudenHoefijzers).toEqual([]);
    expect(stand.stemTempo).toBe(0.9);
  });
});
