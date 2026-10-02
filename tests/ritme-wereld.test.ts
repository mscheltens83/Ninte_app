// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Fysica, botserUitBlok, type Lichaam } from '../src/spel/fysica';
import { GEBIEDEN } from '../src/avontuur/inhoud';
import { terreinHoogte } from '../src/avontuur/landschap';
import { STARTPUNT } from '../src/wereld/eiland';
import { Feestwereld, DANSVLOER, PODIUM, bijPodium, bloemPlekken, lichtSterkte, opDansvloer, slingerPlekken } from '../src/ritme/feestwereld';
import { Dansvloer, DANSSTIJLEN, puls } from '../src/ritme/dansen';
import { kiesMuziekPlek } from '../src/ritme/plek';
import { Muziekregie, mp3Plek } from '../src/ritme/regie';
import { nieuwRitme } from '../src/ritme/stand';
import { beatScherm, verrasBeat } from '../src/ritme/beatScherm';
import { UITDAGINGEN, aanIn, legeBeat, type Beat } from '../src/ritme/beat';
import { Muziekmeter } from '../src/ritme/meter';
import { leesBackUp, nieuweStand, valideerStand, exporteerStand } from '../src/opslag/opslag';
import { KAST, itemStatus, slotTekst } from '../src/figuren/uiterlijk';
import type { Geluid } from '../src/geluid/geluid';
import type { Muziek } from '../src/geluid/muziek';

vi.mock('../src/wereld/bouwstenen', async (origineel) => {
  const actual = await origineel<typeof import('../src/wereld/bouwstenen')>();
  return { ...actual, tekstBord: () => ({ mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1)), zetTekst: vi.fn() }) };
});

beforeEach(() => {
  document.body.innerHTML = '<div id="schermen"></div><div id="hud"><div id="hoefijzers"></div></div>';
});

describe('feestwereld', () => {
  it('zet bloemen alleen op vrije, vlakke plekken', () => {
    const bloemen = bloemPlekken(300);
    expect(bloemen.length).toBeGreaterThan(200);
    for (const b of bloemen) {
      expect(Math.abs(b.x)).toBeGreaterThanOrEqual(4.5);
      expect(GEBIEDEN.every((g) => Math.hypot(g.x - b.x, g.z - b.z) >= 14)).toBe(true);
      expect(b.y).toBe(terreinHoogte(b.x, b.z));
      expect(opDansvloer(b)).toBe(false);
    }
    expect(bloemPlekken(50)).toEqual(bloemPlekken(50)); // elke keer dezelfde wereld
  });
  it('hangt slingers over het pad, maar niet op het plein of de tuinheuvel', () => {
    const plekken = slingerPlekken();
    expect(plekken.length).toBeGreaterThan(8);
    for (const z of plekken) {
      expect(z > -47 || z < -73).toBe(true);
      expect(terreinHoogte(3.6, z)).toBe(0);
    }
  });
  it('laat lampjes nooit helemaal uitgaan en flitst niet bij rustige effecten', () => {
    for (let niveau = 0; niveau <= 4; niveau++) {
      for (let stap = 0; stap < 64; stap += 0.37) {
        for (let k = 0; k < 6; k++) {
          const s = lichtSterkte(k, stap, niveau, false);
          expect(s).toBeGreaterThanOrEqual(0.45);
          expect(s).toBeLessThanOrEqual(1);
          expect(lichtSterkte(k, stap, niveau, true)).toBe(0.9);
        }
      }
    }
  });
  it('bouwt een podium waar je gewoon op kunt lopen, met een beatmaker-knop', () => {
    const f = new Fysica();
    f.voegToe(botserUitBlok(0, -1.5, -70, 200, 3, 200)); // de grond
    const feest = new Feestwereld(new THREE.Scene(), f);
    expect(feest.aantalBloemen).toBeGreaterThan(200);
    expect(feest.interacties.map((i) => i.id)).toEqual(['podium-beat']);
    // Lopen vanaf de dansvloer, het podium op.
    const speler: Lichaam = { pos: { x: DANSVLOER.x, y: 0, z: DANSVLOER.z - 1 }, snelheid: { x: 6, y: 0, z: 0 }, straal: 0.4, hoogte: 2.5, opGrond: true, grond: null };
    for (let i = 0; i < 60; i++) {
      speler.snelheid.x = 6;
      speler.snelheid.y -= 28 / 60;
      f.beweeg(speler, 1 / 60);
    }
    expect(speler.pos.x).toBeGreaterThan(PODIUM.x - 3);
    expect(speler.pos.y).toBeCloseTo(0.5, 1);
    const knop = feest.interacties[0];
    expect(Math.hypot(knop.x - (DANSVLOER.x + DANSVLOER.b / 2), knop.z - DANSVLOER.z)).toBeLessThan(3.8);
    expect(() => {
      for (let niveau = 0; niveau <= 4; niveau++) feest.update(0.016, niveau * 7.3, niveau, speler.pos, niveau === 2);
    }).not.toThrow();
  });
  it('weet wanneer je op de dansvloer of bij het podium bent', () => {
    expect(opDansvloer({ x: DANSVLOER.x, y: 0, z: DANSVLOER.z })).toBe(true);
    expect(opDansvloer({ x: DANSVLOER.x, y: 3, z: DANSVLOER.z })).toBe(false);
    expect(bijPodium({ x: DANSVLOER.x, y: 0, z: DANSVLOER.z })).toBe(true);
    expect(bijPodium(STARTPUNT)).toBe(false);
  });
});

describe('dansen', () => {
  it('beweegt op de tel en drijft nooit weg', () => {
    const v = new Dansvloer();
    const kast = new THREE.Object3D();
    kast.scale.setScalar(0.85);
    kast.position.y = 2;
    const stop1 = v.voegToe(kast, 'veer');
    const stop2 = v.voegToe(kast, 'wieg');
    const stop3 = v.voegToe(kast, 'wip');
    v.update(4, 4);
    expect(kast.scale.y).toBeLessThan(0.85);
    expect(kast.position.y).toBeGreaterThan(2);
    for (let t = 0; t < 200; t += 0.13) v.update(t, 3);
    v.update(7.99, 2);
    expect(kast.scale.y).toBeCloseTo(0.85, 2);
    stop1(); stop2(); stop3();
    expect(kast.scale.toArray()).toEqual([0.85, 0.85, 0.85]);
    expect(kast.rotation.z).toBe(0);
    expect(kast.position.y).toBe(2);
    expect(v.aantal).toBe(0);
  });
  it('beweegt veel minder bij rustige effecten', () => {
    const vrij = new Dansvloer();
    const rustig = new Dansvloer();
    rustig.rustig = true;
    const a = new THREE.Object3D();
    const b = new THREE.Object3D();
    vrij.voegToe(a, 'pomp');
    rustig.voegToe(b, 'pomp');
    vrij.update(1, 4);
    rustig.update(1, 4);
    expect(b.scale.x - 1).toBeLessThan((a.scale.x - 1) / 3);
    expect(puls(3)).toBe(1);
    expect(puls(3.5)).toBeLessThan(0.1);
    expect(Object.keys(DANSSTIJLEN).length).toBeGreaterThanOrEqual(6);
  });
});

describe('muziek bij elke plek', () => {
  const p = (x: number, z: number, y = 0) => ({ pos: { x, y, z }, opWolken: false, inObby: false });
  it('kiest het liedje van het gebied waar je bent', () => {
    expect(kiesMuziekPlek(p(STARTPUNT.x, STARTPUNT.z))).toBe('dorp');
    expect(kiesMuziekPlek(p(0, 0))).toBe('eiland');
    expect(kiesMuziekPlek(p(DANSVLOER.x, DANSVLOER.z))).toBe('podium');
    expect(kiesMuziekPlek(p(-72, -163, 4))).toBe('bos');
    expect(kiesMuziekPlek(p(60, -82, 2))).toBe('pizza');
    expect(kiesMuziekPlek(p(-100, -200))).toBe('wereld');
    expect(kiesMuziekPlek({ ...p(0, 0), inObby: true })).toBe('obby');
    expect(kiesMuziekPlek({ ...p(0, 0), opWolken: true, inObby: true })).toBe('geheim');
    expect(mp3Plek('bos')).toBe('eiland');
    expect(mp3Plek('obby')).toBe('obby');
  });
});

describe('muziekregie', () => {
  function maak(soort: 'meespeel' | 'nummers' = 'meespeel') {
    const geluid = { context: null, stemming: null } as unknown as Geluid;
    const mp3 = { speel: vi.fn(), stop: vi.fn(), zetAan: vi.fn(), demp: vi.fn(), huidigNummer: { naam: 'Carefree' } } as unknown as Muziek & Record<string, ReturnType<typeof vi.fn>>;
    const stand = { ...nieuwRitme(), soort };
    const regie = new Muziekregie(geluid, mp3, stand);
    return { geluid, mp3, stand, regie };
  }
  it('gebruikt meespeelmuziek en stemt de geluidjes mee', () => {
    const { geluid, mp3, regie } = maak();
    regie.zetAan(true);
    regie.speel('dorp');
    expect(mp3.stop).toHaveBeenCalled();
    expect(mp3.speel).not.toHaveBeenCalled();
    expect(geluid.stemming).toBeTypeOf('function');
    expect(regie.huidigeNaam).toBe('Dorpsfeest');
  });
  it('wisselt pas van liedje als je even op een nieuwe plek bent', () => {
    const { regie } = maak();
    regie.zetAan(true);
    regie.speel('dorp');
    regie.speel('bos');
    regie.update(0.5);
    expect(regie.huidigeNaam).toBe('Dorpsfeest');
    regie.speel('bos');
    regie.update(1);
    expect(regie.huidigeNaam).toBe('Bosgeheim');
    regie.speel('dorp');
    regie.update(0.5);
    regie.speel('bos'); // even terug: geen wissel
    regie.update(2);
    expect(regie.huidigeNaam).toBe('Bosgeheim');
  });
  it('speelt MP3-nummers als die gekozen zijn, behalve tijdens de beatmaker', () => {
    const { geluid, mp3, regie, stand } = maak('nummers');
    regie.zetAan(false);
    regie.speel('bos');
    expect(mp3.speel).toHaveBeenLastCalledWith('eiland');
    expect(geluid.stemming).toBeNull();
    expect(regie.huidigeNaam).toBe('Carefree');
    regie.openBeatmaker(legeBeat());
    expect(regie.meespeel).toBe(true);
    expect(regie.beatmakerOpen).toBe(true);
    expect(regie.huidigeNaam).toBe('Discofeest');
    regie.sluitBeatmaker();
    expect(regie.meespeel).toBe(false);
    regie.zetSoort('meespeel');
    expect(stand.soort).toBe('meespeel');
  });
});

describe('beatmakerscherm', () => {
  function open(voltooid: string[] = [], beat: Beat = legeBeat(116)) {
    const wijzigingen: Beat[] = [];
    const gehaald: string[] = [];
    let bewaard: Beat | null = null;
    beatScherm({
      beat, voltooid, stap: () => 5,
      opWijzig: (b) => wijzigingen.push(structuredClone(b)),
      opVoltooid: (u) => gehaald.push(u.id),
      opSpreek: vi.fn(), opKlik: vi.fn(),
      opKlaar: (b) => { bewaard = b; },
    });
    const klik = (rij: string, stap: number) => document.querySelector<HTMLButtonElement>(`.vakje[data-rij="${rij}"][data-stap="${stap}"]`)!.click();
    return { wijzigingen, gehaald, klik, bewaard: () => bewaard };
  }
  it('toont 6 instrumenten met 16 vakjes en laat je beat meteen horen', () => {
    const s = open();
    expect(document.querySelectorAll('.vakje').length).toBe(96);
    s.klik('klap', 3);
    const laatste = s.wijzigingen.at(-1)!;
    expect(aanIn(laatste, 'klap')).toEqual([3]);
    expect(document.querySelector('.vakje[data-rij="klap"][data-stap="3"]')!.getAttribute('aria-pressed')).toBe('true');
  });
  it('beloont de eerste uitdaging één keer en gaat door naar de volgende', () => {
    const s = open();
    expect(document.querySelector('.beat-uitdaging h3')!.textContent).toContain(UITDAGINGEN[0].titel);
    for (const stap of [0, 4, 8]) s.klik('boem', stap);
    expect(s.gehaald).toEqual([]);
    s.klik('boem', 12);
    expect(s.gehaald).toEqual(['vier-tellen']);
    expect(document.querySelector('.beat-goed')!.textContent).toContain('+5');
    expect(document.querySelector('.beat-uitdaging h3')!.textContent).toContain(UITDAGINGEN[1].titel);
  });
  it('geeft geen beloning voor "Verras me" zonder zelf iets te doen', () => {
    const s = open(['vier-tellen']);
    document.querySelector<HTMLButtonElement>('[data-verras]')!.click();
    expect(aanIn(s.wijzigingen.at(-1)!, 'klap')).toEqual([4, 12]);
    s.klik('boem', 1); // een andere rij aanpassen telt niet voor de klap-uitdaging
    expect(s.gehaald).toEqual([]);
    s.klik('klap', 0);
    s.klik('klap', 0);
    expect(s.gehaald).toEqual(['klap-twee-vier']);
  });
  it('rekent het tempo als uitdaging en bewaart de beat bij Klaar', () => {
    const s = open(UITDAGINGEN.slice(0, -1).map((u) => u.id));
    expect(document.querySelector('.beat-uitdaging h3')!.textContent).toContain('Twee tellen per seconde');
    document.querySelector<HTMLButtonElement>('[data-tempo="2"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-tempo="2"]')!.click();
    expect(s.gehaald).toEqual(['tempo']);
    expect(document.querySelector('.beat-uitdaging h3')!.textContent).toContain('Alle uitdagingen');
    document.querySelector<HTMLButtonElement>('[data-klaar]')!.click();
    expect(s.bewaard()!.bpm).toBe(120);
  });
  it('maakt met "Verras me" altijd een beat die klinkt', () => {
    let i = 0;
    const rng = () => [0.9, 0.1, 0.5, 0.05][i++ % 4];
    const b = verrasBeat(110, rng);
    expect(aanIn(b, 'boem')).toContain(0);
    expect(aanIn(b, 'klap')).toEqual([4, 12]);
    expect(b.rijen.bas).toBe(b.rijen.bas.slice(0, 4).repeat(4));
  });
});

describe('muziekmeter', () => {
  it('toont de energie en het liedje', () => {
    const klik = vi.fn();
    const m = new Muziekmeter(document.getElementById('hoefijzers')!, klik);
    m.zet(3, 'Dorpsfeest');
    expect(document.querySelectorAll('#muziekmeter span.aan').length).toBe(3);
    expect(m.knop.getAttribute('aria-label')).toBe('Muziek: Dorpsfeest · Swingend');
    m.zet(4, 'Dorpsfeest');
    expect(m.knop.classList.contains('feest')).toBe(true);
    m.knop.click();
    expect(klik).toHaveBeenCalled();
  });
});

describe('opslag en kledingkast', () => {
  it('opent oude spelstanden en back-ups zonder muziekveld', () => {
    const oud = nieuweStand() as unknown as Record<string, unknown>;
    delete oud.ritme;
    const r = valideerStand(oud);
    expect(r.aangepast).toBe(false);
    expect(r.stand.ritme.soort).toBe('nummers');
    const backup = JSON.parse(exporteerStand(nieuweStand()));
    delete backup.stand.ritme;
    expect(leesBackUp(JSON.stringify(backup)).ritme.uitdagingen).toEqual([]);
  });
  it('bewaart de eigen beat en uitdagingen in een back-up', () => {
    const stand = nieuweStand();
    stand.ritme = { soort: 'nummers', beat: { ...legeBeat(124), rijen: { ...legeBeat().rijen, boem: 'x---x---x---x---' } }, uitdagingen: ['vier-tellen'] };
    const terug = leesBackUp(exporteerStand(stand));
    expect(terug.ritme).toEqual(stand.ritme);
  });
  it('heeft een DJ-koptelefoon voor wie alle uitdagingen haalt', () => {
    const item = KAST.find((i) => i.id === 'hoed-koptelefoon')!;
    const basis = { bezit: [], gehaald: [], drieSterren: false, hoefijzers: 0 };
    expect(itemStatus(item, { ...basis, geheimen: [] })).toBe('op-slot');
    expect(slotTekst(item)).toContain('beat-uitdagingen');
    expect(itemStatus(item, { ...basis, geheimen: ['dj-meester'] })).toBe('beschikbaar');
    const stand = nieuweStand();
    stand.uiterlijk.hoed = 'koptelefoon';
    expect(valideerStand(JSON.parse(JSON.stringify(stand))).aangepast).toBe(false);
  });
});
