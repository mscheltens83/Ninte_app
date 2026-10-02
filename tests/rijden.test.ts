// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Fysica, type Lichaam } from '../src/spel/fysica';
import { EIEREN, PONY_ID, RIJDIEREN, ZELDZAAMHEDEN, snelheidVan, sprongVan, trekDier, type Zeldzaamheid } from '../src/rijden/dieren';
import { MAX_EIEREN, PONY_NR, dierMetNr, gebruikEi, nieuwRijden, pakEi, valideerRijden, voegDierToe } from '../src/rijden/stand';
import { RijModel, eiModel } from '../src/rijden/model';
import { AANKOMST, BIOMEN, MIDDEN, RANCH, RIJLAND, RINGEN, Rijland, biomeBij, inRijland, poortVan } from '../src/rijden/rijland';
import { EI_PLEKKEN, EiWereld, NIEUW_EI_NA } from '../src/rijden/eieren';
import { MEDAILLES, Race, baanLengte, medailleTijden, medailleVoor } from '../src/rijden/race';
import { broedhuisScherm, dierLabel, dierenboekScherm } from '../src/rijden/schermen';
import { kiesMuziekPlek } from '../src/ritme/plek';
import { exporteerStand, leesBackUp, nieuweStand, valideerStand } from '../src/opslag/opslag';
import type { Vraag } from '../src/leren/vragen';

vi.mock('../src/wereld/bouwstenen', async (origineel) => {
  const actual = await origineel<typeof import('../src/wereld/bouwstenen')>();
  return { ...actual, tekstBord: () => ({ mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1)), zetTekst: vi.fn() }) };
});

beforeEach(() => {
  document.body.innerHTML = '<div id="schermen"></div>';
});

/** Een eenvoudige, voorspelbare willekeur. */
function rngVan(zaad: number) {
  let s = zaad;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

describe('rijdieren en eieren', () => {
  it('heeft unieke dieren in elke zeldzaamheid', () => {
    expect(new Set(RIJDIEREN.map((d) => d.id)).size).toBe(RIJDIEREN.length);
    for (const z of ZELDZAAMHEDEN) expect(RIJDIEREN.some((d) => d.zeldzaamheid === z.id), z.id).toBe(true);
    expect(RIJDIEREN.some((d) => d.id === PONY_ID)).toBe(false);
  });
  it('houdt zich aan de kansen van elk ei', () => {
    const rng = rngVan(5);
    const telling: Record<string, Record<Zeldzaamheid, number>> = {};
    for (const e of EIEREN) {
      telling[e.id] = { gewoon: 0, zeldzaam: 0, episch: 0, legendarisch: 0 };
      for (let i = 0; i < 3000; i++) {
        const { soort } = trekDier(e.id, rng);
        telling[e.id][RIJDIEREN.find((d) => d.id === soort)!.zeldzaamheid]++;
      }
    }
    expect(telling.gewoon.legendarisch).toBe(0);
    expect(telling.goud.gewoon).toBe(0);
    expect(telling.gewoon.gewoon / 3000).toBeGreaterThan(0.68);
    expect(telling.goud.legendarisch / 3000).toBeGreaterThan(0.14);
    expect(telling.zeldzaam.zeldzaam).toBeGreaterThan(telling.zeldzaam.gewoon);
  });
  it('maakt bijzondere kleuren soms, en vaker uit een gouden ei', () => {
    const rng = rngVan(11);
    const bijzonder = (ei: 'gewoon' | 'goud') => Array.from({ length: 4000 }, () => trekDier(ei, rng)).filter((d) => d.variant !== 'normaal').length / 4000;
    const wit = bijzonder('gewoon'), goud = bijzonder('goud');
    expect(wit).toBeGreaterThan(0.12);
    expect(wit).toBeLessThan(0.22);
    expect(goud).toBeGreaterThan(wit * 1.6);
  });
  it('maakt dieren met een kleurbonus sneller', () => {
    expect(snelheidVan('vos', 'normaal')).toBe(1.2);
    expect(snelheidVan('vos', 'regenboog')).toBeCloseTo(1.38);
    expect(snelheidVan(PONY_ID, 'normaal')).toBe(1.3);
    expect(sprongVan('konijn')).toBeGreaterThan(sprongVan('vos'));
  });
});

describe('rijopslag', () => {
  it('bewaart dieren, eieren en de pony', () => {
    const s = nieuwRijden();
    const a = voegDierToe(s, 'vos', 'glitter')!;
    const b = voegDierToe(s, 'vos', 'normaal')!;
    expect(a.nr).not.toBe(b.nr);
    expect(voegDierToe(s, 'raket', 'normaal')).toBeNull();
    expect(dierMetNr(s, PONY_NR)?.soort).toBe(PONY_ID);
    for (let i = 0; i < 12; i++) pakEi(s, 'gewoon');
    expect(s.eieren.gewoon).toBe(MAX_EIEREN);
    expect(gebruikEi(s, 'goud')).toBe(false);
    expect(gebruikEi(s, 'gewoon')).toBe(true);
  });
  it('leest bewaarde gegevens veilig terug', () => {
    const s = nieuwRijden();
    voegDierToe(s, 'eenhoorn', 'goud');
    s.rijdt = s.dieren[0].nr;
    s.record = 21.5;
    s.medaille = 2;
    s.eiPlekken = { piramide: 123 };
    expect(valideerRijden(JSON.parse(JSON.stringify(s)))).toEqual({ stand: s, aangepast: false });
    const kapot = valideerRijden({ dieren: [{ nr: 1, soort: 'vos', variant: 'paars' }, { nr: 2, soort: 'vos', variant: 'normaal' }], rijdt: 99, eieren: { gewoon: 50 } });
    expect(kapot.aangepast).toBe(true);
    expect(kapot.stand.dieren).toHaveLength(1);
    expect(kapot.stand.rijdt).toBeNull();
    expect(kapot.stand.volgendNr).toBe(3);
    expect(valideerRijden(undefined).aangepast).toBe(false);
  });
  it('zit in de back-up en werkt met oude standen', () => {
    const stand = nieuweStand();
    voegDierToe(stand.rijden, 'draakje', 'regenboog');
    stand.rijden.eieren.zeldzaam = 2;
    expect(leesBackUp(exporteerStand(stand)).rijden).toEqual(stand.rijden);
    const oud = nieuweStand() as unknown as Record<string, unknown>;
    delete oud.rijden;
    expect(valideerStand(oud).aangepast).toBe(false);
  });
});

describe('modellen', () => {
  it('bouwt elk dier en elk ei, met een zadel op een fijne hoogte', () => {
    for (const d of RIJDIEREN) {
      for (const v of ['normaal', 'goud', 'regenboog', 'glitter'] as const) {
        const m = new RijModel(d.plan, v);
        expect(m.zadel, d.id).toBeGreaterThan(1.2);
        expect(m.zadel, d.id).toBeLessThan(3.2);
        expect(() => { m.update(0.016, 1, false); m.update(0.016, 0.3, true); }).not.toThrow();
      }
    }
    for (const e of EIEREN) expect(eiModel(e.id).children.length).toBeGreaterThan(3);
  });
});

describe('het Rijland', () => {
  function wereld() {
    const f = new Fysica();
    const land = new Rijland(new THREE.Scene(), f);
    return { f, land };
  }
  function rijd(f: Fysica, l: Lichaam, vx: number, vz: number, seconden: number) {
    for (let t = 0; t < seconden; t += 1 / 60) {
      l.snelheid.x = vx;
      l.snelheid.z = vz;
      l.snelheid.y = Math.max(l.snelheid.y - 28 / 60, -32);
      f.beweeg(l, 1 / 60);
    }
  }
  const lichaam = (x: number, z: number): Lichaam => ({ pos: { x, y: 0.05, z }, snelheid: { x: 0, y: 0, z: 0 }, straal: 0.4, hoogte: 2.5, opGrond: true, grond: null });

  it('verdeelt het land in een midden en vier gebieden', () => {
    expect(biomeBij(RIJLAND.x, RIJLAND.z)).toBeNull();
    expect(biomeBij(RIJLAND.x - 90, RIJLAND.z - 90)?.id).toBe('weide');
    expect(biomeBij(RIJLAND.x + 90, RIJLAND.z - 90)?.id).toBe('zand');
    expect(biomeBij(RIJLAND.x + 90, RIJLAND.z + 90)?.id).toBe('sneeuw');
    expect(biomeBij(RIJLAND.x - 90, RIJLAND.z + 90)?.id).toBe('snoep');
    expect(inRijland(0, 0)).toBe(false);
    expect(kiesMuziekPlek({ pos: AANKOMST, opWolken: false, inObby: false })).toBe('rijland');
  });
  it('laat je pas door een poort als je dier snel genoeg is', () => {
    const { f, land } = wereld();
    const sneeuw = BIOMEN.find((b) => b.id === 'sneeuw')!;
    const poort = poortVan(sneeuw);
    for (const [snelheid, erdoor] of [[1, false], [1.45, false], [1.5, true]] as const) {
      land.update(0.016, snelheid);
      const l = lichaam(poort.x, poort.z - 4);
      rijd(f, l, 0, 8, 1.5);
      expect(l.pos.z > poort.z + 1, `snelheid ${snelheid}`).toBe(erdoor);
      expect(!!land.dichtePoortBij({ x: poort.x, y: 0, z: poort.z - 1 }, snelheid)).toBe(!erdoor);
    }
    const weide = poortVan(BIOMEN[0]);
    land.update(0.016, 1);
    const l = lichaam(weide.x, weide.z + 4);
    rijd(f, l, 0, -8, 1.5);
    expect(l.pos.z).toBeLessThan(weide.z - 1);
  });
  it('legt elk ei op de grond of op een klimtoren, in het goede gebied', () => {
    const { f } = wereld();
    const rijlandEieren = EI_PLEKKEN.filter((p) => inRijland(p.x, p.z));
    expect(rijlandEieren.length).toBeGreaterThanOrEqual(12);
    for (const p of rijlandEieren) {
      const afstand = f.straal({ x: p.x, y: 40, z: p.z }, { x: 0, y: -1, z: 0 }, 60);
      expect(40 - afstand, p.id).toBeCloseTo(p.y, 1);
      const b = biomeBij(p.x, p.z);
      if (p.soort === 'goud') expect(b?.id, p.id).toBe('snoep');
      if (b?.id === 'weide') expect(p.soort).toBe('gewoon');
    }
    expect(EI_PLEKKEN.filter((p) => p.soort === 'goud').length).toBeGreaterThanOrEqual(3);
    expect(new Set(EI_PLEKKEN.map((p) => p.id)).size).toBe(EI_PLEKKEN.length);
  });
  it('kent springkussens, snelstroken en een broedhuis bij de boom', () => {
    const { land } = wereld();
    expect(land.opSpringkussen({ x: RIJLAND.x - 50, y: 0.1, z: RIJLAND.z - 75 })).toBe(true);
    expect(land.opSpringkussen({ x: RIJLAND.x - 50, y: 3, z: RIJLAND.z - 75 })).toBe(false);
    expect(land.opSnelstrook({ x: RIJLAND.x, y: 0, z: RIJLAND.z - 45 })).toBe(true);
    expect(land.interacties.map((i) => i.id).sort()).toEqual(['broedhuis', 'race-start', 'rijland-terug']);
    expect(Math.abs(RANCH.broedhuis.z - RIJLAND.z)).toBeLessThan(MIDDEN);
    land.zetWeiDieren([{ soort: 'vos', variant: 'normaal' }, { soort: 'eenhoorn', variant: 'goud' }]);
    expect(() => land.update(0.5, 1)).not.toThrow();
  });
});

describe('eierplekken', () => {
  it('geeft een ei als je erlangs rijdt en legt er later een nieuw', () => {
    const plekken: Record<string, number> = {};
    const w = new EiWereld(new THREE.Scene(), plekken);
    const p = EI_PLEKKEN.find((x) => x.id === 'weide-1')!;
    const nu = 1_000_000;
    expect(w.update(0.016, { x: p.x + 5, y: 0, z: p.z }, nu)).toBeNull();
    const gepakt = w.update(0.016, { x: p.x + 0.5, y: 0, z: p.z }, nu)!;
    expect(gepakt.id).toBe('weide-1');
    w.gepakt(gepakt, nu);
    expect(w.ligtEr('weide-1', nu + 1000)).toBe(false);
    expect(w.ligtEr('weide-1', nu + NIEUW_EI_NA.gewoon * 1000)).toBe(true);
    expect(plekken['weide-1']).toBe(nu + NIEUW_EI_NA.gewoon * 1000);
  });
});

describe('de race', () => {
  it('telt af, telt de ringen op volgorde en geeft een tijd', () => {
    const race = new Race();
    race.start();
    const tellen: number[] = [];
    let gestart = false;
    for (let t = 0; t < 3.2; t += 0.1) for (const g of race.update(0.1, { ...RANCH.start, y: 0 })) {
      if (g.soort === 'tel') tellen.push(g.getal);
      if (g.soort === 'start') gestart = true;
    }
    expect(tellen).toEqual([3, 2, 1]);
    expect(gestart).toBe(true);
    // De ringen overslaan telt niet.
    expect(race.update(1, { ...RINGEN[3], y: 0 })).toEqual([]);
    let finish: number | null = null;
    for (const r of RINGEN) {
      for (const g of race.update(2, { x: r.x, y: 0, z: r.z })) if (g.soort === 'finish') finish = g.tijd;
    }
    expect(finish).toBeCloseTo(17, 0);
    expect(race.bezig).toBe(false);
  });
  it('geeft medailles van brons tot goud', () => {
    const [brons, zilver, goud] = medailleTijden();
    expect(baanLengte()).toBeCloseTo(45 * 8, 0);
    expect(goud).toBeLessThan(zilver);
    expect(zilver).toBeLessThan(brons);
    expect(medailleVoor(goud - 1)).toBe(3);
    expect(medailleVoor(zilver - 0.1)).toBe(2);
    expect(medailleVoor(brons - 0.1)).toBe(1);
    expect(medailleVoor(brons + 5)).toBe(0);
    expect(MEDAILLES[3]).toContain('Goud');
  });
});

describe('broedhuis en dierenboek', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const vraag: Vraag = { soort: 'spelling', sleutel: 'paard', tekst: 'Het ___ rent.', goed: 'paard', fout: 'paart', voorlezen: 'paard', tip: 'Maak het woord langer: paarden.', tipTitel: 'De goede spelling is:' };
  const geluid = () => ({ klik: vi.fn(), goed: vi.fn(), fout: vi.fn(), magie: vi.fn() });
  it('broedt een wit ei meteen uit en laat je erop rijden', () => {
    const stand = nieuwRijden();
    stand.eieren.gewoon = 1;
    const uitgebroed: string[] = [];
    const rijden = vi.fn();
    broedhuisScherm({ stand, ponyNaam: 'Bliksem', vraag: () => vraag, opAntwoord: vi.fn(), opUitgebroed: (d) => uitgebroed.push(d.soort), opRijden: rijden, spreek: vi.fn(), geluid: geluid(), opSluit: vi.fn() });
    document.querySelector<HTMLButtonElement>('[data-broed="gewoon"]')!.click();
    expect(document.querySelector('.wiebel')).not.toBeNull();
    vi.advanceTimersByTime(1600);
    expect(stand.eieren.gewoon).toBe(0);
    expect(uitgebroed).toHaveLength(1);
    expect(stand.dieren).toHaveLength(1);
    document.querySelector<HTMLButtonElement>('[data-rij]')!.click();
    expect(rijden).toHaveBeenCalledWith(stand.dieren[0].nr);
  });
  it('vraagt eerst een leervraag bij een blauw ei, met een tip bij een fout', () => {
    const stand = nieuwRijden();
    stand.eieren.zeldzaam = 1;
    const antwoorden: [boolean, boolean][] = [];
    broedhuisScherm({ stand, ponyNaam: 'Bliksem', vraag: () => vraag, opAntwoord: (_v, g, e) => antwoorden.push([g, e]), opUitgebroed: vi.fn(), opRijden: vi.fn(), spreek: vi.fn(), geluid: geluid(), opSluit: vi.fn() });
    document.querySelector<HTMLButtonElement>('[data-broed="zeldzaam"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-keuze="paart"]')!.click();
    expect(document.querySelector('.tip')!.textContent).toContain('paarden');
    expect(stand.eieren.zeldzaam).toBe(1);
    document.querySelector<HTMLButtonElement>('[data-keuze="paard"]')!.click();
    vi.advanceTimersByTime(1600);
    expect(antwoorden).toEqual([[false, true], [true, false]]);
    expect(stand.eieren.zeldzaam).toBe(0);
    expect(stand.dieren).toHaveLength(1);
  });
  it('toont je dieren, de pony en de dieren die je nog moet vinden', () => {
    const stand = nieuwRijden();
    voegDierToe(stand, 'vos', 'glitter');
    const rijden = vi.fn();
    dierenboekScherm({ stand, ponyNaam: 'Bliksem', heeftPony: true, inRijland: false, eiTip: 'Het dichtstbijzijnde ei ligt hier.', opRijden: rijden, opAfstappen: vi.fn(), opReis: vi.fn(), klik: vi.fn(), opSluit: vi.fn() });
    expect(document.body.textContent).toContain('Bliksem');
    expect(document.body.textContent).toContain('Glitter-vos');
    expect(document.querySelectorAll('.dier-kaart.onbekend').length).toBe(RIJDIEREN.length - 1);
    document.querySelector<HTMLButtonElement>(`[data-rij="${stand.dieren[0].nr}"]`)!.click();
    expect(rijden).toHaveBeenCalledWith(stand.dieren[0].nr);
    expect(dierLabel({ nr: 0, soort: PONY_ID, variant: 'normaal' }, 'Bliksem').naam).toBe('Bliksem');
  });
});

import { WILDE_DIEREN, WildeDieren, TERUG_NA } from '../src/rijden/wild';
import { Aankleding } from '../src/rijden/aankleding';
import { temScherm } from '../src/rijden/schermen';

describe('wilde dieren en een vollere wereld', () => {
  it('laat wilde dieren rondlopen in hun eigen gebied, zonder door muren te gaan', () => {
    const w = new WildeDieren(new THREE.Scene());
    expect(w.dieren.length).toBe(WILDE_DIEREN.reduce((s, d) => s + d.aantal, 0));
    w.dieren.forEach((d, i) => {
      const gebied = WILDE_DIEREN.flatMap((x) => Array(x.aantal).fill(x.gebied))[i];
      for (let a = 0; a < 8; a++) {
        const x = d.anker.x + Math.cos((a / 8) * Math.PI * 2) * d.straal, z = d.anker.z + Math.sin((a / 8) * Math.PI * 2) * d.straal;
        if (gebied === 'midden') {
          expect(biomeBij(x, z)).toBeNull();
          expect(Math.hypot(x - RIJLAND.x, z - RIJLAND.z)).toBeGreaterThan(6);
        } else {
          expect(biomeBij(x, z)?.id, `${d.soort} ${i}`).toBe(gebied);
          expect(Math.abs(x - RIJLAND.x)).toBeGreaterThan(4);
          expect(Math.abs(z - RIJLAND.z)).toBeGreaterThan(4);
        }
      }
    });
  });
  it('blijft staan als je ernaast staat, en komt na het temmen later terug', () => {
    const w = new WildeDieren(new THREE.Scene());
    const d = w.dieren[0];
    const p = d.model.groep.position.clone();
    w.update(1, { x: p.x + 1, y: 0, z: p.z });
    expect(d.model.groep.position.distanceTo(p)).toBeLessThan(0.01);
    w.update(1, { x: p.x + 60, y: 0, z: p.z });
    expect(d.model.groep.position.distanceTo(p)).toBeGreaterThan(0.01);
    w.getemd(0);
    expect(d.model.groep.visible).toBe(false);
    expect(d.interactie.y).toBe(-999);
    w.update(TERUG_NA - 1, { x: p.x + 60, y: 0, z: p.z });
    expect(d.model.groep.visible).toBe(false);
    w.update(2, { x: p.x + 60, y: 0, z: p.z });
    expect(d.model.groep.visible).toBe(true);
    expect(d.interactie.y).toBe(0);
    expect(w.interacties[0].naam).toContain('Tem de');
  });
  it('kleedt het Rijland aan met veel meer dingen, zonder eieren te blokkeren', () => {
    const scene = new THREE.Scene();
    const f = new Fysica();
    const voor = scene.children.length;
    const a = new Aankleding(scene, f, EI_PLEKKEN);
    expect(scene.children.length).toBe(voor + 2);
    let meshes = 0, tapijt = 0;
    scene.traverse((o) => { if (o instanceof THREE.InstancedMesh) tapijt += o.count; else if (o instanceof THREE.Mesh) meshes++; });
    expect(tapijt).toBeGreaterThan(2000);
    expect(meshes).toBeGreaterThan(20);
    expect(f.botsers.length).toBeGreaterThan(100);
    // Geen botsblok op een eierplek in het Rijland.
    for (const p of EI_PLEKKEN.filter((e) => inRijland(e.x, e.z) && e.y === 0)) {
      expect(f.botsers.some((b) => p.x > b.min.x - 0.4 && p.x < b.max.x + 0.4 && p.z > b.min.z - 0.4 && p.z < b.max.z + 0.4 && b.max.y > 0.6), p.id).toBe(false);
    }
    expect(() => a.update(0.5)).not.toThrow();
  });
  it('tem je met een goed antwoord, met een tip bij een fout', () => {
    const vraag: Vraag = { soort: 'rekenen', sleutel: '6x7', tekst: '6 × 7 = ___', goed: '42', fout: '48', voorlezen: '6 keer 7', tip: 'Eerst 5 × 7 = 35, dan nog 7 erbij.', tipTitel: 'Het goede antwoord is:' };
    const antwoorden: [boolean, boolean][] = [];
    const getemd = vi.fn();
    temScherm({ soort: 'zebra', variant: 'normaal', vraag, opAntwoord: (g, e) => antwoorden.push([g, e]), opGetemd: getemd, spreek: vi.fn(), geluid: { klik: vi.fn(), goed: vi.fn(), fout: vi.fn() }, opSluit: vi.fn() });
    expect(document.body.textContent).toContain('zebra');
    document.querySelector<HTMLButtonElement>('[data-keuze="48"]')!.click();
    expect(getemd).not.toHaveBeenCalled();
    expect(document.querySelector('.tip')!.textContent).toContain('35');
    document.querySelector<HTMLButtonElement>('[data-keuze="42"]')!.click();
    expect(getemd).toHaveBeenCalledOnce();
    expect(antwoorden).toEqual([[false, true], [true, false]]);
  });
});
