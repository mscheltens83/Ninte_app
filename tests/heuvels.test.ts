// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Fysica, botserUitBlok, type Lichaam } from '../src/spel/fysica';
import { HEUVEL_TREDE, bouwHeuvels, heuvelLagen, hoogteOp, voetafdruk, type Heuvel } from '../src/wereld/heuvels';
import { VASTELAND_HEUVELS, terreinHoogte } from '../src/avontuur/landschap';
import { GEBIEDEN, MATERIAALPLEKKEN, TOREN, VLIEG_ONDERDELEN, WERELD } from '../src/avontuur/inhoud';
import { KAVEL, KAVEL_RAND } from '../src/bouwen/onderdelen';
import { DANSVLOER, PODIUM } from '../src/ritme/feestwereld';
import { BIOMEN, HERKENNINGSPUNTEN, KLIMTORENS, MIDDEN, RIJLAND, Rijland, biomeBij, inRijland, poortVan, rijlandHeuvels } from '../src/rijden/rijland';
import { PORTAAL_DORP } from '../src/rijden/rijland';
import { EI_PLEKKEN } from '../src/rijden/eieren';
import { WildeDieren } from '../src/rijden/wild';
import { Aankleding } from '../src/rijden/aankleding';
import { STARTPUNT } from '../src/wereld/eiland';

vi.mock('../src/wereld/bouwstenen', async (origineel) => {
  const actual = await origineel<typeof import('../src/wereld/bouwstenen')>();
  return { ...actual, tekstBord: () => ({ mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1)), zetTekst: vi.fn() }) };
});

const afstandTotLijn = (px: number, pz: number, x1: number, z1: number, x2: number, z2: number) => {
  const dx = x2 - x1, dz = z2 - z1, l = dx * dx + dz * dz;
  const t = l ? Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / l)) : 0;
  return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
};

describe('heuvels', () => {
  it('bestaan uit lagen van een halve meter, binnen hun voetafdruk', () => {
    const h: Heuvel = { x: 0, z: 0, straal: 8, hoogte: 4, kleuren: ['#7cc35a'] };
    const lagen = heuvelLagen(h);
    const toppen = [...new Set(lagen.map((l) => l.top))];
    expect(toppen).toEqual(Array.from({ length: 8 }, (_, i) => (i + 1) * HEUVEL_TREDE));
    for (const l of lagen) {
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) expect(Math.hypot(l.x + (sx * l.b) / 2, l.z + (sz * l.d) / 2)).toBeLessThan(voetafdruk(h) * 1.15);
    }
    expect(hoogteOp(lagen, 0, 0)).toBe(4);
    expect(hoogteOp(lagen, 50, 0)).toBe(0);
    const berg = heuvelLagen({ ...h, hoogte: 16, steil: true, top: '#ffffff' });
    expect(Math.max(...berg.map((l) => l.top))).toBe(16);
    expect(berg.at(-1)!.kleur).toBe('#ffffff');
  });
  it('kun je oplopen tot de top', () => {
    const f = new Fysica();
    f.voegToe(botserUitBlok(0, -1.5, 0, 200, 3, 200));
    bouwHeuvels(new THREE.Group(), f, [{ x: 0, z: 0, straal: 8, hoogte: 3, kleuren: ['#7cc35a'] }]);
    const l: Lichaam = { pos: { x: -20, y: 0.05, z: 0 }, snelheid: { x: 0, y: 0, z: 0 }, straal: 0.4, hoogte: 2.5, opGrond: true, grond: null };
    for (let t = 0; t < 3; t += 1 / 60) {
      l.snelheid.x = l.pos.x < 0 ? 8 : 0;
      l.snelheid.y = Math.max(l.snelheid.y - 28 / 60, -32);
      f.beweeg(l, 1 / 60);
    }
    expect(l.pos.y).toBeGreaterThan(2.9);
  });
});

describe('heuvels op het vasteland', () => {
  const vrij = (h: Heuvel) => voetafdruk(h);
  it('liggen nooit op paden, gebouwen, eieren of speciale plekken', () => {
    const paden: [number, number, number, number][] = [[0, -36, 0, -230]];
    for (const g of GEBIEDEN.filter((g) => !['dorp', 'boomhut', 'brug', 'tuin'].includes(g.id))) {
      const n = Math.round(g.y / 0.4), zp = g.z + 18 + n * 0.95 + 3;
      paden.push([0, zp, g.x, zp], [g.x, zp, g.x, g.z]);
    }
    for (const h of VASTELAND_HEUVELS) {
      const r = vrij(h);
      for (const [x1, z1, x2, z2] of paden) expect(afstandTotLijn(h.x, h.z, x1, z1, x2, z2), `pad bij ${h.x},${h.z}`).toBeGreaterThan(r + 2.5);
      for (const g of GEBIEDEN) expect(Math.hypot(h.x - g.x, h.z - g.z), `${g.id} bij ${h.x},${h.z}`).toBeGreaterThan(r + 20);
      for (const p of [...MATERIAALPLEKKEN, ...VLIEG_ONDERDELEN, { x: 107, z: -115 }, PORTAAL_DORP, STARTPUNT, PODIUM, DANSVLOER, TOREN.landing]) {
        expect(Math.hypot(h.x - p.x, h.z - p.z), `plek ${p.x},${p.z}`).toBeGreaterThan(r + 6);
      }
      for (const e of EI_PLEKKEN.filter((e) => !inRijland(e.x, e.z))) expect(Math.hypot(h.x - e.x, h.z - e.z)).toBeGreaterThan(r + 3);
      // Niet op de bouwkavel en niet op de toren.
      expect(h.x + r < KAVEL.x0 - 3 || h.x - r > KAVEL_RAND.x1 + 3 || h.z + r < KAVEL.z0 - 3 || h.z - r > KAVEL_RAND.z1 + 3).toBe(true);
      expect(Math.abs(h.x - TOREN.x) > r + 14 || Math.abs(h.z - TOREN.z) > r + 10).toBe(true);
      expect(h.z - r).toBeLessThan(WERELD.zuid);
    }
  });
  it('tellen mee voor de grondhoogte (bomen, bloemen en dieren staan erop)', () => {
    const h = VASTELAND_HEUVELS[0];
    expect(terreinHoogte(h.x, h.z)).toBeGreaterThan(2);
    expect(terreinHoogte(STARTPUNT.x, STARTPUNT.z)).toBe(0);
    expect(VASTELAND_HEUVELS.filter((h) => h.steil).length).toBeGreaterThanOrEqual(10);
  });
});

describe('heuvels in het Rijland', () => {
  const eiVrij = EI_PLEKKEN.map((e) => ({ x: e.x, z: e.z, r: 3 }));
  const heuvels = rijlandHeuvels(eiVrij);
  it('geeft elk gebied heuvels om op te lopen en bergen langs de rand', () => {
    for (const b of BIOMEN) {
      const hier = heuvels.filter((h) => biomeBij(h.x, h.z)?.id === b.id || (Math.sign(h.x - RIJLAND.x) === b.sx && Math.sign(h.z - RIJLAND.z) === b.sz));
      expect(hier.filter((h) => !h.steil).length, b.id).toBeGreaterThanOrEqual(4);
      expect(hier.filter((h) => h.steil).length, b.id).toBeGreaterThanOrEqual(5);
    }
    expect(rijlandHeuvels(eiVrij)).toEqual(heuvels); // elke keer dezelfde wereld
  });
  it('houdt eieren, torens, herkenningspunten, poorten en het midden vrij', () => {
    for (const h of heuvels) {
      const r = voetafdruk(h);
      for (const e of EI_PLEKKEN.filter((e) => inRijland(e.x, e.z))) expect(Math.hypot(h.x - e.x, h.z - e.z), e.id).toBeGreaterThan(r + 3);
      for (const t of KLIMTORENS) expect(Math.hypot(h.x - t.x, h.z - t.z)).toBeGreaterThan(r + t.basis * 0.7);
      for (const p of HERKENNINGSPUNTEN) expect(Math.hypot(h.x - p.x, h.z - p.z)).toBeGreaterThan(r + p.r);
      expect(Math.abs(h.x - RIJLAND.x) > MIDDEN + r || Math.abs(h.z - RIJLAND.z) > MIDDEN + r).toBe(true);
      for (const b of BIOMEN) {
        const p = poortVan(b);
        const opPad = Math.abs(h.x - p.x) < r + 3 && Math.sign(h.z - RIJLAND.z) === b.sz && Math.abs(h.z - RIJLAND.z) < MIDDEN + 25 + r;
        expect(opPad, `poort ${b.id}`).toBe(false);
      }
    }
  });
  it('laat eieren op de grond liggen en wilde dieren en versiering buiten de heuvels', () => {
    const f = new Fysica();
    const scene = new THREE.Scene();
    new Rijland(scene, f, heuvels);
    for (const p of EI_PLEKKEN.filter((e) => inRijland(e.x, e.z))) {
      const afstand = f.straal({ x: p.x, y: 40, z: p.z }, { x: 0, y: -1, z: 0 }, 60);
      expect(40 - afstand, p.id).toBeCloseTo(p.y, 1);
    }
    const wilde = new WildeDieren(scene, heuvels);
    for (const d of wilde.dieren) {
      for (const h of heuvels) expect(Math.hypot(d.anker.x - h.x, d.anker.z - h.z) - d.straal, d.soort).toBeGreaterThan(voetafdruk(h));
    }
    const f2 = new Fysica();
    new Aankleding(new THREE.Scene(), f2, EI_PLEKKEN, heuvels);
    // Elk botsblok van de versiering staat op vlak land of hoog op een heuvel (de toppers), niet half erin.
    expect(f2.botsers.length).toBeGreaterThan(50);
  });
});
