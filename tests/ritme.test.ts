import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { drieklank, frequentie, inToonsoort, midiVan, trapNaarMidi, TOONLADDERS } from '../src/ritme/theorie';
import { leesPatroon, isSlagPatroon } from '../src/ritme/patroon';
import { LIEDJES, PLEK_LIED, liedVoor, liedMetId, type MuziekPlek } from '../src/ritme/liedjes';
import { INSTRUMENTEN, isInstrument, type Mixer } from '../src/ritme/instrumenten';
import { Energie, DREMPELS, ENERGIE_MAX } from '../src/ritme/energie';
import { Klok } from '../src/ritme/klok';
import { Meespeelmuziek, bereidLied } from '../src/ritme/motor';
import { BEAT_RIJEN, UITDAGINGEN, aanIn, beatLagen, isLeeg, kopieBeat, legeBeat, valideerBeat, voorbeeldBeat, zetBpm, zetVakje, type Beat } from '../src/ritme/beat';
import { nieuwRitme, valideerRitme } from '../src/ritme/stand';
import { nepContext } from './nep-audio';

describe('muziektheorie', () => {
  it('rekent toonhoogtes en trappen goed uit', () => {
    expect(frequentie(69)).toBeCloseTo(440);
    expect(frequentie(81)).toBeCloseTo(880);
    expect(midiVan(261.6256)).toBeCloseTo(60, 3);
    expect(trapNaarMidi(60, 'majeur', 0)).toBe(60);
    expect(trapNaarMidi(60, 'majeur', 4)).toBe(67); // G
    expect(trapNaarMidi(60, 'majeur', 7)).toBe(72); // octaaf hoger
    expect(trapNaarMidi(60, 'majeur', -1)).toBe(59); // B eronder
    expect(trapNaarMidi(60, 'majeur', -8)).toBe(47);
    expect(drieklank(60, 'majeur', 5)).toEqual([69, 72, 76]); // a-mineur
    expect(drieklank(62, 'dorisch', 3)).toEqual([67, 71, 74]); // G-groot in D-dorisch
  });
  it('brengt elk geluidje naar een veilige toon van de toonsoort', () => {
    for (const ladder of Object.keys(TOONLADDERS) as (keyof typeof TOONLADDERS)[]) {
      const l = TOONLADDERS[ladder];
      const veilig = new Set<number>([l[0], l[1], l[2], l[4], l[5]]);
      for (let f = 120; f < 3000; f *= 1.13) {
        const m = Math.round(midiVan(inToonsoort(f, 62, ladder)));
        expect(veilig.has((((m - 62) % 12) + 12) % 12)).toBe(true);
        expect(Math.abs(m - midiVan(f))).toBeLessThanOrEqual(2.5);
      }
    }
    expect(inToonsoort(0, 60, 'majeur')).toBe(0);
  });
});

describe('patronen', () => {
  it('leest slagwerk met zachte en harde slagen', () => {
    const p = leesPatroon('x-o- X--- | ----');
    expect(p.lengte).toBe(12);
    expect(p.perStap[0][0]).toMatchObject({ trap: null, sterkte: 1 });
    expect(p.perStap[2][0].sterkte).toBeLessThan(1);
    expect(p.perStap[4][0].sterkte).toBeGreaterThan(1);
    expect(p.perStap[1]).toEqual([]);
  });
  it('leest tonen met rust, aanhouden en negatieve trappen', () => {
    const p = leesPatroon('0 - . -1 | 4 - - .', 2);
    expect(p.lengte).toBe(16);
    expect(p.perStap[0][0]).toMatchObject({ trap: 0, duur: 4 });
    expect(p.perStap[6][0]).toMatchObject({ trap: -1, duur: 2 });
    expect(p.perStap[8][0]).toMatchObject({ trap: 4, duur: 6 });
    expect(isSlagPatroon('0 2 4')).toBe(false);
    expect(isSlagPatroon('x--x')).toBe(true);
  });
  it('geeft een duidelijke fout bij tikfouten', () => {
    expect(() => leesPatroon('0 a 2')).toThrow(/Onbekend teken/);
    expect(() => leesPatroon('')).toThrow();
    expect(() => leesPatroon('x---', 0)).toThrow();
  });
});

describe('liedjes', () => {
  it('heeft unieke liedjes met geldige patronen en bestaande instrumenten', () => {
    expect(new Set(LIEDJES.map((l) => l.id)).size).toBe(LIEDJES.length);
    for (const lied of LIEDJES) {
      const b = bereidLied(lied);
      expect(lied.bpm).toBeGreaterThanOrEqual(70);
      expect(lied.bpm).toBeLessThanOrEqual(150);
      expect(lied.akkoorden.length).toBeGreaterThan(0);
      for (const { laag, patroon } of b.lagen) {
        expect(isInstrument(laag.instrument)).toBe(true);
        // Alle patronen lopen gelijk over vier maten.
        expect(64 % patroon.lengte === 0 || patroon.lengte % 64 === 0, `${lied.id} ${laag.instrument}: ${patroon.lengte}`).toBe(true);
      }
    }
  });
  it('speelt op elke energie iets, met drums en een melodie vóór het feest', () => {
    for (const lied of LIEDJES) {
      for (let niveau = 0; niveau <= ENERGIE_MAX; niveau++) {
        const lagen = lied.lagen.filter((l) => niveau >= (l.vanaf ?? 0) && niveau <= (l.tot ?? 4));
        expect(lagen.length, `${lied.id} niveau ${niveau}`).toBeGreaterThan(0);
      }
      expect(lied.lagen.some((l) => (l.vanaf ?? 0) <= 3 && l.volgt === 'toonsoort'), `${lied.id} melodie`).toBe(true);
      expect(lied.lagen.filter((l) => (l.vanaf ?? 0) >= 4).length, `${lied.id} feest`).toBeGreaterThan(0);
      expect(lied.lagen.some((l) => INSTRUMENTEN[l.instrument].soort === 'slag' && (l.vanaf ?? 0) <= 2), `${lied.id} drums`).toBe(true);
    }
  });
  it('heeft voor elke plek een bestaand liedje', () => {
    for (const plek of Object.keys(PLEK_LIED) as MuziekPlek[]) {
      expect(liedMetId(PLEK_LIED[plek]), plek).toBeDefined();
      expect(liedVoor(plek).id).toBe(PLEK_LIED[plek]);
    }
  });
});

describe('instrumenten', () => {
  it('maken alleen geldige Web Audio-aanroepen', () => {
    const ctx = nepContext();
    const m: Mixer = { ctx, ruis: ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate) as unknown as AudioBuffer };
    const uit = ctx.createGain();
    for (const [id, inst] of Object.entries(INSTRUMENTEN)) {
      for (const duur of [0.05, 0.25, 2]) {
        expect(() => inst.speel(m, uit as unknown as AudioNode, 0.5, 220, duur, 1.2), id).not.toThrow();
        expect(() => inst.speel(m, uit as unknown as AudioNode, 0, 55, duur, 0.3), id).not.toThrow();
      }
    }
    for (const bron of ctx.gestart) expect(bron.einde).toBeGreaterThanOrEqual(bron.begin);
  });
});

describe('energie', () => {
  it('groeit met goede acties en zakt pas na een tijdje rust', () => {
    const e = new Energie();
    expect(e.niveau(1)).toBe(1);
    e.goed();
    expect(e.niveau(1)).toBe(2);
    for (let i = 1; i < DREMPELS[3]; i++) e.goed();
    expect(e.niveau(1)).toBe(4);
    expect(e.niveau(0)).toBe(4);
    e.update(40);
    expect(e.niveau(1)).toBe(4);
    for (let i = 0; i < 300; i++) e.update(1);
    expect(e.niveau(1)).toBe(1);
    expect(e.aantalPunten).toBe(0);
  });
  it('wordt nooit hoger dan 4 of lager dan 0', () => {
    const e = new Energie();
    for (let i = 0; i < 100; i++) e.goed(5);
    expect(e.niveau(4)).toBe(4);
    e.reset();
    expect(e.niveau(-3)).toBe(0);
  });
});

describe('maatklok', () => {
  it('plant elke 16e precies op tijd en begint op een maat', () => {
    const gepland: [number, number][] = [];
    const klok = new Klok((stap, tijd) => gepland.push([stap, tijd]), 120);
    klok.start(10);
    klok.tik(10, 0.5);
    expect(gepland[0]).toEqual([0, 10.06]);
    expect(gepland[1][1] - gepland[0][1]).toBeCloseTo(0.125);
    expect(gepland.every(([, t]) => t < 10.5)).toBe(true);
    expect(klok.stapOp(10.06 + 0.125 * 3)).toBeCloseTo(3);
  });
  it('past het tempo aan vanaf de stap waarin het verandert', () => {
    const gepland: [number, number][] = [];
    const klok: Klok = new Klok((stap, tijd) => {
      gepland.push([stap, tijd]);
      if (stap === 4) klok.bpm = 60;
    }, 120);
    klok.start(0);
    klok.tik(0, 2);
    const t4 = gepland[4][1];
    expect(gepland[5][1] - t4).toBeCloseTo(0.25);
    expect(klok.stapOp(t4 + 0.5)).toBeCloseTo(6);
  });
  it('haalt na een pauze niet alles in', () => {
    const gepland: number[] = [];
    const klok = new Klok((stap) => gepland.push(stap), 120);
    klok.start(0);
    klok.tik(0);
    const voor = gepland.length;
    klok.tik(100);
    expect(gepland.length - voor).toBeLessThan(4);
  });
});

describe('meespeelmuziek', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function speel(ctx: ReturnType<typeof nepContext>, seconden: number) {
    for (let t = 0; t < seconden; t += 0.025) {
      ctx.currentTime += 0.025;
      vi.advanceTimersByTime(25);
    }
  }

  it('speelt elk liedje op elke energie zonder fouten, en wordt drukker', () => {
    for (const lied of LIEDJES) {
      const ctx = nepContext();
      const m = new Meespeelmuziek(() => ctx, lied);
      m.zetActief(true);
      m.zetAan(true);
      const maat = (60 / lied.bpm) * 4;
      speel(ctx, maat * 2);
      const rustig = ctx.gestart.length;
      for (let i = 0; i < DREMPELS[3]; i++) {
        m.moment('goed');
        m.update(0.01);
        speel(ctx, maat);
      }
      expect(m.niveau).toBe(4);
      const voor = ctx.gestart.length;
      speel(ctx, maat * 2);
      expect(ctx.gestart.length - voor, lied.id).toBeGreaterThan(rustig);
      m.moment('feest');
      expect(() => speel(ctx, maat)).not.toThrow();
      m.zetActief(false);
    }
  });

  it('wisselt van liedje aan het begin van een maat en kiest het juiste tempo', () => {
    const ctx = nepContext();
    const dorp = liedMetId('dorp')!;
    const bos = liedMetId('bos')!;
    const m = new Meespeelmuziek(() => ctx, dorp);
    m.zetActief(true);
    speel(ctx, 0.3);
    m.kies(bos);
    expect(m.lied.id).toBe('dorp');
    speel(ctx, (60 / dorp.bpm) * 4 + 0.2);
    expect(m.lied.id).toBe('bos');
    expect(m.bpm).toBe(bos.bpm);
  });

  it('gebruikt de eigen beat alleen op het podium, in het tempo van de beat', () => {
    const ctx = nepContext();
    const podium = liedMetId('podium')!;
    const m = new Meespeelmuziek(() => ctx, podium);
    const beat = voorbeeldBeat();
    zetBpm(beat, 100);
    m.zetEigenBeat(beat);
    m.zetActief(true);
    speel(ctx, 1);
    expect(m.bpm).toBe(100);
    m.kies(liedMetId('dorp')!);
    speel(ctx, 3);
    expect(m.bpm).toBe(liedMetId('dorp')!.bpm);
  });

  it('stemt geluidjes naar de toonsoort en geeft een tel, ook zonder geluid', () => {
    const m = new Meespeelmuziek(() => null, liedMetId('dorp')!);
    m.zetActief(true);
    m.update(0.5);
    expect(m.speelt).toBe(false);
    expect(m.tel).toBeCloseTo((0.5 * 112) / 60, 1);
    const f = m.stemming(300);
    expect([0, 2, 4, 7, 9]).toContain(((Math.round(midiVan(f)) - 60) % 12 + 12) % 12);
  });

  it('meldt een nieuwe energie aan het spel', () => {
    const ctx = nepContext();
    const m = new Meespeelmuziek(() => ctx, liedMetId('dorp')!);
    const meldingen: [number, number][] = [];
    m.opNiveau = (n, v) => meldingen.push([n, v]);
    m.update(0.01);
    m.moment('feest');
    m.update(0.01);
    expect(meldingen).toEqual([[3, 1]]);
  });
});

describe('beatmaker en uitdagingen', () => {
  const met = (rijen: Partial<Beat['rijen']>, bpm = 116): Beat => ({ bpm, rijen: { ...legeBeat().rijen, ...rijen } });
  it('zet vakjes aan en uit en houdt het tempo binnen de grenzen', () => {
    const b = legeBeat();
    expect(isLeeg(b)).toBe(true);
    zetVakje(b, 'boem', 0, true);
    zetVakje(b, 'boem', 4, true);
    zetVakje(b, 'boem', 4, false);
    zetVakje(b, 'boem', 99, true);
    expect(aanIn(b, 'boem')).toEqual([0]);
    zetBpm(b, 999);
    expect(b.bpm).toBe(150);
    zetBpm(b, 3);
    expect(b.bpm).toBe(80);
    const k = kopieBeat(b);
    zetVakje(k, 'klap', 1, true);
    expect(aanIn(b, 'klap')).toEqual([]);
  });
  it('controleert elke uitdaging precies', () => {
    const u = Object.fromEntries(UITDAGINGEN.map((x) => [x.id, x]));
    expect(u['vier-tellen'].klopt(met({ boem: 'x---x---x---x---' }))).toBe(true);
    expect(u['vier-tellen'].klopt(met({ boem: 'x---x---x---x--x' }))).toBe(false);
    expect(u['klap-twee-vier'].klopt(met({ klap: '----x-------x---' }))).toBe(true);
    expect(u['klap-twee-vier'].klopt(met({ klap: 'x---x-------x---' }))).toBe(false);
    expect(u.helft.klopt(met({ tik: 'x-x-x-x-x-x-x-x-' }))).toBe(true);
    expect(u.helft.klopt(met({ tik: '-x-x-x-x-x-x-x-x' }))).toBe(true);
    expect(u.helft.klopt(met({ tik: 'xx-x-x-x-x-x-x--' }))).toBe(false);
    expect(u.kwart.klopt(met({ bel: 'x--x--x--x------' }))).toBe(true);
    expect(u.kwart.klopt(met({ bel: 'x--x--x---------' }))).toBe(false);
    expect(u['drie-achtste'].klopt(met({ koe: 'xxxxxx----------' }))).toBe(true);
    expect(u['drie-achtste'].klopt(met({ koe: 'xxxxx-----------' }))).toBe(false);
    expect(u.herhaal.klopt(met({ bas: 'x-x-x-x-x-x-x-x-' }))).toBe(true);
    expect(u.herhaal.klopt(met({ bas: 'xx--xx--xx--xx--' }))).toBe(true);
    expect(u.herhaal.klopt(met({ bas: 'x---x---x---x-x-' }))).toBe(false);
    expect(u.herhaal.klopt(met({ bas: 'xxxxxxxxxxxxxxxx' }))).toBe(false);
    expect(u.tempo.klopt(met({}, 120))).toBe(true);
    expect(u.tempo.klopt(met({}, 118))).toBe(false);
    for (const x of UITDAGINGEN) expect(x.klopt(legeBeat(116)), x.id).toBe(false);
  });
  it('maakt van een beat lagen die de motor kan spelen', () => {
    const b = met({ boem: 'x---x---x---x---', bel: 'x-------x-------' });
    const lagen = beatLagen(b);
    expect(lagen.map((l) => l.instrument)).toEqual(['boem', 'bel']);
    expect(lagen[0].groep).toBe('drums');
    expect(() => bereidLied({ ...liedMetId('podium')!, id: 'test-beat', lagen })).not.toThrow();
    expect(BEAT_RIJEN.every((r) => isInstrument(r.instrument))).toBe(true);
  });
  it('accepteert alleen geldige beats', () => {
    expect(valideerBeat(voorbeeldBeat())).toEqual(voorbeeldBeat());
    expect(valideerBeat({ bpm: 120, rijen: { boem: 'x---' } })).toBeNull();
    expect(valideerBeat({ bpm: 400, rijen: {} })).toBeNull();
    expect(valideerBeat({ bpm: 120, rijen: { boem: 'x'.repeat(16), onbekend: 1 } })?.rijen.boem).toBe('x'.repeat(16));
    expect(valideerBeat('beat')).toBeNull();
  });
});

describe('muziekopslag', () => {
  it('werkt met oude standen zonder muziekveld', () => {
    expect(valideerRitme(undefined)).toEqual({ stand: nieuwRitme(), aangepast: false });
  });
  it('bewaart soort, beat en uitdagingen, en laat verdwenen uitdagingen stil weg', () => {
    const r = valideerRitme({ soort: 'nummers', beat: voorbeeldBeat(), uitdagingen: ['kwart', 'oude-uitdaging', 'kwart'] });
    expect(r.aangepast).toBe(false);
    expect(r.stand).toEqual({ soort: 'nummers', beat: voorbeeldBeat(), uitdagingen: ['kwart'] });
  });
  it('herstelt beschadigde gegevens veilig', () => {
    expect(valideerRitme({ soort: 'hard', beat: { bpm: 'snel' }, uitdagingen: [3] })).toEqual({ stand: nieuwRitme(), aangepast: true });
    expect(valideerRitme('kapot').aangepast).toBe(true);
  });
});
