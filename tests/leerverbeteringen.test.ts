import { describe, expect, it } from 'vitest';
import { aanHerhalingToe, DAG, kiesWoorden, verwerkAntwoord, volgendeHerhaling, type WoordStats } from '../src/leren/herhaalbakjes';
import { kiesSommen, TAFELSOMMEN } from '../src/leren/rekenen';
import { geldigeWoordkaart, leesWeekwoorden, oefenWoorden } from '../src/leren/schoolwoorden';
import { maakFouteVariant, zinMetGat } from '../src/leren/spelling';
import { dagDatum, nieuweDag, telSpeeltijd } from '../src/leren/dag';
import { nieuweStand } from '../src/opslag/opslag';

describe('herhaling over meerdere dagen', () => {
  it('herhaalt op 1, 3, 7 en 14 dagen en schuift niet op door direct herhalen', () => {
    let stat = verwerkAntwoord(undefined, true, 100);
    for (const dagen of [1, 3, 7, 14]) {
      const gepland = stat.laatst + dagen * DAG;
      expect(volgendeHerhaling(stat)).toBe(gepland);
      const extra = verwerkAntwoord(stat, true, stat.laatst + 20);
      expect(extra.bakje).toBe(stat.bakje);
      expect(volgendeHerhaling(extra)).toBe(gepland);
      expect(aanHerhalingToe(stat, gepland - 1)).toBe(false);
      expect(aanHerhalingToe(stat, gepland)).toBe(true);
      stat = verwerkAntwoord(stat, true, gepland);
    }
    expect(stat.bakje).toBe(5);
    const fout = verwerkAntwoord(stat, false, stat.laatst + 1);
    expect(fout.bakje).toBe(1);
    expect(aanHerhalingToe(fout, fout.laatst)).toBe(true);
  });
  it('laat een vervallen woord voorgaan boven een nog niet gepland woord', () => {
    const kaarten = leesWeekwoorden('hond\nboot').woorden;
    const stats = { hond: { bakje: 2, goed: 1, fout: 0, laatst: 10 }, boot: { bakje: 2, goed: 1, fout: 0, laatst: 0 } };
    expect(kiesWoorden(kaarten, stats, 1, undefined, () => 0, DAG)[0].woord).toBe('boot');
  });
});

describe('lastige deelsommen', () => {
  it('gebruikt de opgeslagen deelsomsleutel bij de selectie', () => {
    const stats: WoordStats = {};
    for (const [a, b] of TAFELSOMMEN) stats[`${a * b}:${a}`] = { bakje: 5, goed: 5, fout: 0, laatst: 0 };
    let seed = 83;
    const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const tel = (data: WoordStats) => {
      seed = 83; let n = 0;
      for (let i = 0; i < 2000; i++) if (kiesSommen(data, rng).some((s) => s.soort === 'deel' && s.sleutel === '42:6')) n++;
      return n;
    };
    const basis = tel(stats);
    stats['42:6'] = { bakje: 1, goed: 0, fout: 4, laatst: 0 };
    expect(tel(stats)).toBeGreaterThan(basis * 3);
  });
});

describe('weekwoorden', () => {
  it('herkent categorieën, behoudt voorbeeldzinnen en verwijdert dubbele woorden', () => {
    const lijst = leesWeekwoorden('HOND | De hond rent. | honden\nhond\nblij\npauw\nrobot');
    expect(lijst.fouten).toEqual([]);
    expect(lijst.woorden.map((w) => w.categorie)).toEqual(['langermaakwoord', 'ei-ij', 'au-ou', 'schoolwoord']);
    for (const kaart of lijst.woorden) {
      expect(maakFouteVariant(kaart)).not.toBe(kaart.woord);
      expect(zinMetGat(kaart)).not.toContain(kaart.woord);
    }
    expect(oefenWoorden(lijst.woorden, true, ['schoolwoord']).map((w) => w.woord)).toEqual(['robot']);
  });
  it('weigert onbruikbare woorden, regels en zinnen die het antwoord niet kunnen verbergen', () => {
    expect(leesWeekwoorden('a\nhond | De honden rennen.\npaard | Een andere zin.\n<script>').fouten).toHaveLength(4);
    expect(geldigeWoordkaart({ woord: 'robot', zin: 'De robot rent.', categorie: 'ei-ij' })).toBe(false);
    expect(geldigeWoordkaart({ woord: 'robot', zin: 'De robot rent.', categorie: 'langermaakwoord', langer: 'robots' })).toBe(false);
  });
  it('verbergt ook woorden met accenten en leest lange vormen', () => {
    const kaart = leesWeekwoorden('café | Het café is open.').woorden[0];
    expect(zinMetGat(kaart)).toBe('Het ___ is open.');
  });
});

describe('dagelijkse speelgrens', () => {
  it('behoudt de dag over herladen en begint op de volgende lokale dag opnieuw', () => {
    const stand = nieuweStand(), maandag = new Date(2026, 8, 28, 20);
    expect(dagDatum(maandag)).toBe('2026-09-28');
    nieuweDag(stand, maandag); stand.dag.dieren.voeren = 2; stand.dag.klaar = true;
    expect(nieuweDag(stand, maandag)).toBe(false);
    expect(stand.dag.dieren.voeren).toBe(2);
    nieuweDag(stand, new Date(2026, 8, 29));
    expect(stand.dag.dieren.voeren).toBe(0);
    expect(stand.dag.klaar).toBe(false);
  });
  it('telt alleen actieve tijd en stopt bij de grens', () => {
    const stand = nieuweStand(); stand.speeltijdMinuten = 5; stand.dag.speelSeconden = 299;
    expect(telSpeeltijd(stand, 1, false)).toBe(false);
    expect(telSpeeltijd(stand, 1, true)).toBe(true);
    stand.dag.klaar = true; telSpeeltijd(stand, 1, true);
    expect(stand.dag.speelSeconden).toBe(300);
    stand.speeltijdMinuten = 0;
    expect(telSpeeltijd(stand, 1, true)).toBe(false);
  });
});
