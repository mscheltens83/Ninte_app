import { describe, expect, it } from 'vitest';
import { KAST, beschikbareItems, itemStatus, koop, type KastStand } from '../src/figuren/uiterlijk';

function stand(extra: Partial<KastStand> = {}): KastStand {
  return { bezit: [], gehaald: [], drieSterren: false, geheimen: [], hoefijzers: 0, ...extra };
}
const item = (id: string) => KAST.find((i) => i.id === id)!;

describe('kledingkast', () => {
  it('heeft unieke items en van elke soort iets gratis', () => {
    expect(new Set(KAST.map((i) => i.id)).size).toBe(KAST.length);
    for (const soort of ['kapsel', 'hoed', 'extra'] as const) {
      expect(KAST.some((i) => i.soort === soort && i.voorwaarde.soort === 'gratis')).toBe(true);
    }
  });

  it('gratis spullen zijn meteen beschikbaar, gekochte pas na het kopen', () => {
    expect(itemStatus(item('kapsel-staart'), stand())).toBe('beschikbaar');
    expect(itemStatus(item('hoed-strik'), stand())).toBe('kopen');
    expect(itemStatus(item('hoed-strik'), stand({ bezit: ['hoed-strik'] }))).toBe('beschikbaar');
  });

  it('kopen kost hoefijzers en lukt niet zonder genoeg', () => {
    const arm = stand({ hoefijzers: 5 });
    expect(koop(item('hoed-strik'), arm)).toBe(false);
    expect(arm.bezit).toEqual([]);
    const rijk = stand({ hoefijzers: 30 });
    expect(koop(item('hoed-strik'), rijk)).toBe(true);
    expect(rijk.hoefijzers).toBe(20);
    expect(rijk.bezit).toContain('hoed-strik');
    expect(koop(item('hoed-strik'), rijk)).toBe(false); // niet twee keer
  });

  it('speelt kleding vrij na een obby, alle sterren of een geheim', () => {
    expect(itemStatus(item('hoed-rijcap'), stand())).toBe('op-slot');
    expect(itemStatus(item('hoed-rijcap'), stand({ gehaald: ['spelling'] }))).toBe('beschikbaar');
    expect(itemStatus(item('hoed-cowboy'), stand({ gehaald: ['rekenen'] }))).toBe('beschikbaar');
    expect(itemStatus(item('hoed-kroon'), stand({ drieSterren: true }))).toBe('beschikbaar');
    expect(itemStatus(item('extra-vleugels'), stand({ geheimen: ['wolkeneiland'] }))).toBe('beschikbaar');
  });

  it('ziet welke kleding er nieuw bij komt', () => {
    const s = stand();
    const voor = beschikbareItems(s);
    s.gehaald.push('spelling');
    const na = beschikbareItems(s);
    expect([...na].filter((id) => !voor.has(id))).toEqual(['hoed-rijcap']);
  });
});
