// Het Rijland: een grote eigen wereld om rond te rijden en eieren te zoeken.
// In het midden staat de Reuzenboom met jouw ranch (broedhuis en dierenwei).
// Daaromheen ligt een racebaan, en daarbuiten vier gebieden met elk hun eigen
// eieren. Een poort laat je pas door als je dier snel genoeg is.
//
// Alles staat ver weg van het eiland, zodat de rest van het spel er niet zwaarder van wordt.
// Een nieuw gebied, springkussen of klimtoren toevoegen? Pas de lijsten hieronder aan.

import * as THREE from 'three';
import { botserUitBlok, type Botser, type Fysica, type Vec3 } from '../spel/fysica';
import { blok, blokOp, dynamisch, tekstBord, voegStatischSamen, zaadRng } from '../wereld/bouwstenen';
import type { Interactie } from '../avontuur/wereld';
import { RIJDIEREN } from './dieren';
import { RijModel } from './model';

export const RIJLAND = { x: 600, z: 0, half: 130 } as const;
/** Halve breedte van het middengebied (boom, ranch en racebaan). */
export const MIDDEN = 60;
/** De racebaan loopt als een vierkant op deze afstand van de boom. */
export const BAAN = 45;
const MUUR = 8;
const W = RIJLAND.x, Z = RIJLAND.z;

export function inRijland(x: number, z: number, marge = 0): boolean {
  return Math.abs(x - W) <= RIJLAND.half + marge && Math.abs(z - Z) <= RIJLAND.half + marge;
}

export type BiomeId = 'weide' | 'zand' | 'sneeuw' | 'snoep';
export interface Biome {
  id: BiomeId;
  naam: string;
  icoon: string;
  grond: string;
  muur: string;
  /** Zo snel moet je dier minstens zijn om door de poort te mogen. */
  minSnelheid: number;
  /** In welk kwart van het Rijland: richting x en z vanaf het midden. */
  sx: 1 | -1;
  sz: 1 | -1;
}

export const BIOMEN: Biome[] = [
  { id: 'weide', naam: 'Bloemenweide', icoon: '🌼', grond: '#8ee06b', muur: '#3f9a45', minSnelheid: 0, sx: -1, sz: -1 },
  { id: 'zand', naam: 'Zandduinen', icoon: '🏜️', grond: '#f2d59b', muur: '#d9a35b', minSnelheid: 1.3, sx: 1, sz: -1 },
  { id: 'sneeuw', naam: 'Sneeuwland', icoon: '❄️', grond: '#f4fbff', muur: '#9fd8ff', minSnelheid: 1.5, sx: 1, sz: 1 },
  { id: 'snoep', naam: 'Snoepland', icoon: '🍭', grond: '#ffc2dc', muur: '#ff8fbf', minSnelheid: 1.75, sx: -1, sz: 1 },
];

/** In welk gebied ligt dit punt (null = het midden of buiten het Rijland)? */
export function biomeBij(x: number, z: number): Biome | null {
  if (!inRijland(x, z)) return null;
  const dx = x - W, dz = z - Z;
  if (Math.abs(dx) < MIDDEN && Math.abs(dz) < MIDDEN) return null;
  return BIOMEN.find((b) => Math.sign(dx || 1) === b.sx && Math.sign(dz || 1) === b.sz) ?? null;
}

/** Midden van de poort van een gebied (in de noord- of zuidmuur van het middengebied). */
export function poortVan(b: Biome): { x: number; z: number } {
  return { x: W + b.sx * 30, z: Z + b.sz * MIDDEN };
}

/** Plekken in het midden, ten opzichte van de boom. */
export const RANCH = {
  broedhuis: { x: W, z: Z + 18 },
  wei: { x: W + 21, z: Z, b: 16, d: 16 },
  terugPoort: { x: W, z: Z + 32 },
  start: { x: W - BAAN, z: Z },
} as const;
/** De regenboogpoort op het dorpsplein, naar het Rijland. */
export const PORTAAL_DORP = { x: 14, z: -44 } as const;
/** Waar je in het Rijland aankomt. */
export const AANKOMST = { x: W, y: 0, z: Z + 27 } as const;

/** Klimtorens met een ei bovenop: piramide, sneeuwberg en cupcake. */
export const KLIMTORENS = [
  { id: 'piramide', x: W + 95, z: Z - 95, treden: 8, basis: 16, top: 2, kleuren: ['#e8c27a', '#d9a35b'] },
  { id: 'berg', x: W + 95, z: Z + 95, treden: 10, basis: 24, top: 4, kleuren: ['#ffffff', '#cfeaff'] },
  { id: 'cupcake', x: W - 95, z: Z + 95, treden: 8, basis: 12, top: 3, kleuren: ['#8a5a3c', '#ff8fbf', '#ffffff', '#ffd23f'] },
] as const;
const TREDE = 0.5;

/** Hoogte van de top van een klimtoren. */
export function torenTop(id: (typeof KLIMTORENS)[number]['id']): number {
  return KLIMTORENS.find((t) => t.id === id)!.treden * TREDE;
}

export const SPRINGKUSSENS = [
  { x: W - 50, z: Z - 75 }, { x: W - 95, z: Z - 50 },
  { x: W + 55, z: Z - 75 }, { x: W + 85, z: Z - 82 },
  { x: W + 55, z: Z + 75 }, { x: W + 80, z: Z + 82 },
  { x: W - 55, z: Z + 75 }, { x: W - 80, z: Z + 82 },
] as const;

/** Snelheidsstroken: even extra snel als je eroverheen rijdt. */
export const SNELSTROKEN = [
  { x: W, z: Z - BAAN, richting: 'x' }, { x: W + BAAN, z: Z, richting: 'z' },
  { x: W, z: Z + BAAN, richting: 'x' }, { x: W - BAAN, z: Z - 22, richting: 'z' },
  { x: W - 70, z: Z - 95, richting: 'x' }, { x: W + 110, z: Z - 75, richting: 'z' },
  { x: W + 70, z: Z + 110, richting: 'x' }, { x: W - 110, z: Z + 60, richting: 'z' },
] as const;

/** De ringen van de racebaan, met de klok mee. De laatste is ook de finish (= start). */
export const RINGEN: { x: number; z: number }[] = [
  { x: W - BAAN, z: Z - BAAN }, { x: W, z: Z - BAAN }, { x: W + BAAN, z: Z - BAAN }, { x: W + BAAN, z: Z },
  { x: W + BAAN, z: Z + BAAN }, { x: W, z: Z + BAAN }, { x: W - BAAN, z: Z + BAAN }, { x: W - BAAN, z: Z },
];
export const RING_HOOGTE = 2.6;

export class Rijland {
  readonly groep = new THREE.Group();
  readonly interacties: Interactie[] = [];
  private barrieres: { biome: Biome; botser: Botser; scherm: THREE.Mesh }[] = [];
  private kussens: THREE.Mesh[] = [];
  private ringen: THREE.Mesh[] = [];
  private weiDieren: { model: RijModel; hoek: number; straal: number; snel: number }[] = [];
  private weiSleutel = '';
  private tijd = 0;

  constructor(scene: THREE.Scene, private f: Fysica) {
    scene.add(this.groep);
    const vast = new THREE.Group();
    this.bouwGrond(vast);
    this.bouwMuren(vast);
    this.bouwBoom(vast);
    this.bouwRanch(vast);
    this.bouwBaan(vast);
    this.bouwGebieden(vast);
    this.groep.add(vast);
    voegStatischSamen(vast);
  }

  private vast(g: THREE.Object3D, b: number, h: number, d: number, kleur: string, x: number, y: number, z: number): Botser {
    g.add(blokOp(b, h, d, kleur, x, y, z));
    return this.f.voegToe(botserUitBlok(x, y + h / 2, z, b, h, d));
  }

  private bord(tekst: string, x: number, y: number, z: number, rand: string, draai = 0, b = 6) {
    const t = tekstBord(tekst, b, 1.3, { breedte: 640, achtergrond: '#fff9e9', rand });
    t.mesh.position.set(x, y, z);
    t.mesh.rotation.y = draai;
    this.groep.add(dynamisch(t.mesh));
  }

  private bouwGrond(g: THREE.Group) {
    const h = RIJLAND.half;
    this.vast(g, h * 2, 3, h * 2, '#7a5a3a', W, -3, Z);
    for (const b of BIOMEN) g.add(blokOp(h, 0.04, h, b.grond, W + (b.sx * h) / 2, 0, Z + (b.sz * h) / 2, false));
    g.add(blokOp(MIDDEN * 2, 0.05, MIDDEN * 2, '#9be27d', W, 0.005, Z, false));
    const water = new THREE.Mesh(new THREE.PlaneGeometry(h * 6, h * 6), new THREE.MeshStandardMaterial({ color: '#4fb3e8', roughness: 0.3 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(W, -0.7, Z);
    this.groep.add(dynamisch(water));
  }

  private bouwMuren(g: THREE.Group) {
    for (const b of BIOMEN) {
      // De muur tussen het midden en dit gebied, met een poort erin.
      const zMuur = Z + b.sz * MIDDEN, xMuur = W + b.sx * MIDDEN;
      const poort = poortVan(b);
      const links = Math.min(W, W + b.sx * MIDDEN), rechts = Math.max(W, W + b.sx * MIDDEN);
      const p1 = poort.x - 5, p2 = poort.x + 5;
      this.vast(g, p1 - links, MUUR, 1, b.muur, (links + p1) / 2, 0, zMuur);
      this.vast(g, rechts - p2, MUUR, 1, b.muur, (p2 + rechts) / 2, 0, zMuur);
      this.vast(g, 1, MUUR, MIDDEN, b.muur, xMuur, 0, Z + (b.sz * MIDDEN) / 2);
      // Poortboog
      for (const x of [p1, p2]) this.vast(g, 1.4, MUUR + 2, 1.4, '#ffffff', x, 0, zMuur);
      g.add(blokOp(11.4, 1.2, 1.4, b.muur, poort.x, MUUR + 2, zMuur));
      this.bord(`${b.icoon} ${b.naam}${b.minSnelheid ? ` · ⚡${String(b.minSnelheid).replace('.', ',')}` : ''}`, poort.x, MUUR + 4, zMuur - b.sz * 0.8, b.muur, b.sz < 0 ? 0 : Math.PI);
      if (b.minSnelheid > 0) {
        const botser = this.f.voegToe(botserUitBlok(poort.x, MUUR / 2, zMuur, 10, MUUR, 1));
        const scherm = new THREE.Mesh(new THREE.BoxGeometry(10, MUUR, 0.2), new THREE.MeshBasicMaterial({ color: b.muur, transparent: true, opacity: 0.35, depthWrite: false }));
        scherm.position.set(poort.x, MUUR / 2, zMuur);
        this.groep.add(dynamisch(scherm));
        this.barrieres.push({ biome: b, botser, scherm });
      }
    }
    // Heggen tussen de gebieden, van het midden tot de rand.
    const lang = RIJLAND.half - MIDDEN;
    for (const s of [-1, 1]) {
      this.vast(g, 1.2, MUUR, lang, '#3f9a45', W, 0, Z + s * (MIDDEN + lang / 2));
      this.vast(g, lang, MUUR, 1.2, '#3f9a45', W + s * (MIDDEN + lang / 2), 0, Z);
    }
  }

  private bouwBoom(g: THREE.Group) {
    this.vast(g, 8, 24, 8, '#8a5a34', W, 0, Z);
    for (const [dx, dz, b, d] of [[5, 0, 2, 3], [-5, 0, 2, 3], [0, 5, 3, 2], [0, -5, 3, 2]]) g.add(blokOp(b, 0.5, d, '#7a4e2c', W + dx, 0, Z + dz));
    g.add(blokOp(2.2, 3, 0.3, '#5b3a22', W, 0, Z + 4.05), blokOp(0.3, 0.3, 0.1, '#ffd23f', W + 0.6, 1.5, Z + 4.25));
    g.add(blokOp(30, 7, 30, '#3f9a45', W, 21, Z), blokOp(22, 6, 22, '#4fb35a', W, 27, Z), blokOp(14, 5, 14, '#62c46a', W, 32, Z));
    const rng = zaadRng(7);
    const kleuren = ['#ff5fa2', '#ffd23f', '#4fb8ff', '#a36bff', '#ff8a3d'];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2, r = 13 + rng() * 2;
      const lamp = blokOp(0.7, 0.7, 0.7, new THREE.MeshStandardMaterial({ color: kleuren[i % 5], emissive: kleuren[i % 5], emissiveIntensity: 0.6 }), W + Math.cos(a) * r, 19.2, Z + Math.sin(a) * r);
      this.groep.add(dynamisch(lamp), dynamisch(blokOp(0.06, 1.2, 0.06, '#5b3a22', W + Math.cos(a) * r, 19.9, Z + Math.sin(a) * r)));
    }
    this.bord('🌳 De Reuzenboom', W, 6, Z + 4.3, '#3f9a45');
  }

  private bouwRanch(g: THREE.Group) {
    // Broedhuis: een open paviljoen met een groot nest.
    const { x, z } = RANCH.broedhuis;
    for (const [dx, dz] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) this.vast(g, 0.5, 4, 0.5, '#ffffff', x + dx, 0, z + dz);
    g.add(blokOp(10, 0.5, 8, '#ff8fbf', x, 4, z), blokOp(7, 0.6, 5, '#ffc2dc', x, 4.5, z), blokOp(4, 0.6, 2.5, '#ff5fa2', x, 5.1, z));
    for (const [dx, dz, b, d] of [[0, -1.6, 3.6, 0.6], [0, 1.6, 3.6, 0.6], [-1.6, 0, 0.6, 2.6], [1.6, 0, 0.6, 2.6]]) g.add(blokOp(b, 0.6, d, '#b98345', x + dx, 0, z + dz));
    g.add(blokOp(2.8, 0.25, 2.8, '#f2d59b', x, 0, z));
    this.bord('🥚 Broedhuis', x, 3.3, z + 3.3, '#ff5fa2', 0, 4.5);
    this.interacties.push({ id: 'broedhuis', naam: '🥚 Eieren uitbroeden', x, y: 0, z, soort: 'actie', straal: 5 });
    // Dierenwei: hier lopen je dieren rond.
    const w = RANCH.wei;
    const hek = '#ffffff';
    this.vast(g, w.b, 1, 0.2, hek, w.x, 0, w.z - w.d / 2);
    this.vast(g, w.b, 1, 0.2, hek, w.x, 0, w.z + w.d / 2);
    this.vast(g, 0.2, 1, w.d, hek, w.x + w.b / 2, 0, w.z);
    this.vast(g, 0.2, 1, (w.d - 4) / 2, hek, w.x - w.b / 2, 0, w.z - w.d / 4 - 1);
    this.vast(g, 0.2, 1, (w.d - 4) / 2, hek, w.x - w.b / 2, 0, w.z + w.d / 4 + 1);
    g.add(blokOp(w.b - 0.4, 0.03, w.d - 0.4, '#b6ec8f', w.x, 0.01, w.z, false));
    this.bord('🐾 Mijn dierenwei', w.x - w.b / 2, 2.4, w.z - 3.5, '#46d17a', -Math.PI / 2, 4.5);
    // Poort terug naar het dorp
    const t = RANCH.terugPoort;
    this.regenboogPoort(g, t.x, t.z);
    this.bord('🌈 Terug naar het dorp', t.x, 7.6, t.z, '#a36bff', 0, 5);
    this.interacties.push({ id: 'rijland-terug', naam: '🌈 Terug naar het dorp', x: t.x, y: 0, z: t.z, soort: 'actie', straal: 4.5 });
  }

  /** Een regenboogboog met een glinsterend vlak: een poort naar een andere wereld. */
  regenboogPoort(g: THREE.Group, x: number, z: number, draai = 0) {
    const boog = new THREE.Group();
    boog.position.set(x, 0, z);
    boog.rotation.y = draai;
    const kleuren = ['#ff4d6d', '#ff9a3d', '#ffd93d', '#5cd65c', '#4da6ff', '#a36bff'];
    kleuren.forEach((k, i) => {
      const r = 4.2 - i * 0.35;
      for (let s = 0; s <= 10; s++) {
        const a = (s / 10) * Math.PI;
        boog.add(blok(0.5, 0.5, 0.5, k, Math.cos(a) * r, Math.sin(a) * r + 0.3, 0));
      }
    });
    g.add(boog);
    const vlak = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#e6d6ff', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    vlak.position.set(x, 0.3, z);
    vlak.rotation.y = draai;
    this.groep.add(dynamisch(vlak));
  }

  private bouwBaan(g: THREE.Group) {
    for (const s of [-1, 1]) {
      g.add(blokOp(BAAN * 2 + 8, 0.06, 8, '#f6e3b8', W, 0.01, Z + s * BAAN, false));
      g.add(blokOp(8, 0.06, BAAN * 2 + 8, '#f6e3b8', W + s * BAAN, 0.01, Z, false));
    }
    const kleuren = ['#ff4d6d', '#ff9a3d', '#ffd93d', '#5cd65c', '#4da6ff', '#a36bff', '#ff5fa2', '#46d17a'];
    RINGEN.forEach((r, i) => {
      const volgende = RINGEN[(i + 1) % RINGEN.length], vorige = RINGEN[(i + RINGEN.length - 1) % RINGEN.length];
      const ring = dynamisch(new THREE.Mesh(new THREE.TorusGeometry(RING_HOOGTE, 0.28, 10, 32),
        new THREE.MeshStandardMaterial({ color: kleuren[i], emissive: kleuren[i], emissiveIntensity: 0.15 })));
      ring.position.set(r.x, RING_HOOGTE + 0.3, r.z);
      ring.rotation.y = Math.atan2(volgende.x - vorige.x, volgende.z - vorige.z);
      this.groep.add(ring);
      this.ringen.push(ring);
    });
    const s = RANCH.start;
    g.add(blokOp(8, 0.08, 1, '#ffffff', s.x, 0.02, s.z + 1.5, false));
    this.bord('🏁 Racebaan · start', s.x - 6, 2.6, s.z + 1, '#2b2340', Math.PI / 2, 4.5);
    g.add(blokOp(0.2, 2.2, 0.2, '#c9c3dd', s.x - 6, 0, s.z + 1));
    this.interacties.push({ id: 'race-start', naam: '🏁 Race starten', x: s.x, y: 0, z: s.z + 3, soort: 'actie', straal: 4.5 });
    for (const st of SNELSTROKEN) {
      const b = st.richting === 'x' ? 6 : 3, d = st.richting === 'x' ? 3 : 6;
      g.add(blokOp(b, 0.07, d, '#4fb8ff', st.x, 0.02, st.z, false));
      for (let i = -1; i <= 1; i++) g.add(blokOp(st.richting === 'x' ? 0.5 : 1.6, 0.08, st.richting === 'x' ? 1.6 : 0.5, '#ffffff', st.x + (st.richting === 'x' ? i * 1.6 : 0), 0.03, st.z + (st.richting === 'x' ? 0 : i * 1.6), false));
    }
  }

  private bouwGebieden(g: THREE.Group) {
    const rng = zaadRng(424);
    const plek = (b: Biome): [number, number] | null => {
      const x = W + b.sx * (8 + rng() * (RIJLAND.half - 14)), z = Z + b.sz * (8 + rng() * (RIJLAND.half - 14));
      if (Math.abs(x - W) < MIDDEN + 6 && Math.abs(z - Z) < MIDDEN + 6) return null;
      if (KLIMTORENS.some((t) => Math.abs(x - t.x) < t.basis / 2 + 3 && Math.abs(z - t.z) < t.basis / 2 + 3)) return null;
      if ([...SPRINGKUSSENS, ...SNELSTROKEN].some((p) => Math.hypot(p.x - x, p.z - z) < 5)) return null;
      if (Math.abs(x - W) < 3 || Math.abs(z - Z) < 3) return null;
      return [x, z];
    };
    for (const b of BIOMEN) {
      for (let i = 0; i < 26; i++) {
        const p = plek(b);
        if (!p) continue;
        const [x, z] = p;
        const k = i % 5;
        switch (b.id) {
          case 'weide':
            if (k < 2) this.boom(g, x, z, '#4fb35a');
            else g.add(blokOp(1.6, 1, 1.6, '#5fc06d', x, 0, z), blokOp(0.4, 0.3, 0.4, ['#ff5fa2', '#ffd23f', '#ffffff'][k % 3], x + 0.4, 1, z + 0.3));
            break;
          case 'zand':
            if (k < 2) { this.vast(g, 0.7, 3, 0.7, '#4f9e4a', x, 0, z); g.add(blokOp(1.6, 0.5, 0.5, '#4f9e4a', x, 1.4, z), blokOp(0.5, 1, 0.5, '#4f9e4a', x + 0.55, 1.8, z)); }
            else g.add(blokOp(4 + k, 0.6, 3, '#e8c27a', x, 0, z), blokOp(2 + k, 0.5, 2, '#f0d08e', x, 0.6, z));
            break;
          case 'sneeuw':
            if (k < 3) this.den(g, x, z);
            else g.add(blokOp(1.4, 1.4, 1.4, '#ffffff', x, 0, z), blokOp(1, 1, 1, '#ffffff', x, 1.4, z), blokOp(0.2, 0.2, 0.4, '#ff8a3d', x, 1.85, z + 0.6));
            break;
          case 'snoep':
            if (k < 2) this.lolly(g, x, z, rng);
            else g.add(blokOp(2, 1.2, 2, ['#ff5fa2', '#46d17a', '#ffd23f', '#a36bff'][k % 4], x, 0, z), blokOp(1.4, 0.4, 1.4, '#ffffff', x, 1.2, z));
            break;
        }
      }
    }
    for (const t of KLIMTORENS) {
      for (let i = 0; i < t.treden; i++) {
        const maat = t.basis - ((t.basis - t.top) * i) / (t.treden - 1);
        this.vast(g, maat, TREDE, maat, t.kleuren[i % t.kleuren.length], t.x, i * TREDE, t.z);
      }
      if (t.id === 'cupcake') g.add(blokOp(1, 1, 1, '#e0405f', t.x, t.treden * TREDE, t.z - 0.8));
    }
    for (const k of SPRINGKUSSENS) {
      const kussen = dynamisch(blokOp(3, 0.25, 3, new THREE.MeshStandardMaterial({ color: '#ff5fa2', emissive: '#ff5fa2', emissiveIntensity: 0.3 }), k.x, 0, k.z));
      this.groep.add(kussen);
      this.kussens.push(kussen);
      g.add(blokOp(3.4, 0.15, 3.4, '#ffffff', k.x, 0, k.z));
    }
  }

  private boom(g: THREE.Group, x: number, z: number, kleur: string) {
    this.vast(g, 0.7, 3, 0.7, '#85613b', x, 0, z);
    g.add(blokOp(3, 2.6, 3, kleur, x, 2.6, z));
  }

  private den(g: THREE.Group, x: number, z: number) {
    this.vast(g, 0.6, 1.6, 0.6, '#85613b', x, 0, z);
    g.add(blokOp(3.2, 1.4, 3.2, '#2f7d4a', x, 1.5, z), blokOp(2.3, 1.3, 2.3, '#3a9257', x, 2.8, z), blokOp(1.3, 1.1, 1.3, '#ffffff', x, 4, z));
  }

  private lolly(g: THREE.Group, x: number, z: number, rng: () => number) {
    this.vast(g, 0.35, 4, 0.35, '#ffffff', x, 0, z);
    const kleur = ['#ff5fa2', '#4fb8ff', '#ffd23f', '#a36bff'][Math.floor(rng() * 4)];
    g.add(blokOp(2.6, 2.6, 0.5, kleur, x, 4, z), blokOp(1.6, 1.6, 0.55, '#ffffff', x, 4.5, z), blokOp(0.8, 0.8, 0.6, kleur, x, 4.9, z));
  }

  /** De barrière van een poort staat open als je dier snel genoeg is. */
  isOpen(b: Biome, snelheid: number): boolean {
    return snelheid + 1e-9 >= b.minSnelheid;
  }

  /** Staat Ninte vlak voor een dichte poort? Dan geeft dit dat gebied terug. */
  dichtePoortBij(p: Vec3, snelheid: number): Biome | null {
    for (const { biome } of this.barrieres) {
      const q = poortVan(biome);
      if (!this.isOpen(biome, snelheid) && Math.abs(p.x - q.x) < 6 && Math.abs(p.z - q.z) < 3) return biome;
    }
    return null;
  }

  /** Staat Ninte op een springkussen? */
  opSpringkussen(p: Vec3): boolean {
    return p.y < 0.6 && SPRINGKUSSENS.some((k) => Math.abs(p.x - k.x) < 1.6 && Math.abs(p.z - k.z) < 1.6);
  }

  /** Rijdt Ninte over een snelheidsstrook? */
  opSnelstrook(p: Vec3): boolean {
    return p.y < 0.6 && SNELSTROKEN.some((s) => Math.abs(p.x - s.x) < (s.richting === 'x' ? 3 : 1.6) && Math.abs(p.z - s.z) < (s.richting === 'x' ? 1.6 : 3));
  }

  /** Laat de ring zien die je nu moet hebben (of geen, als er geen race is). */
  markeerRing(i: number | null) {
    this.ringen.forEach((r, n) => {
      const m = r.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = i === n ? 1 : 0.15;
      r.scale.setScalar(i === n ? 1.15 : 1);
    });
  }

  /** Je dieren lopen rond in de wei (de nieuwste soorten, maximaal 8). */
  zetWeiDieren(dieren: { soort: string; variant: string }[]) {
    const sleutel = JSON.stringify(dieren);
    if (sleutel === this.weiSleutel) return;
    this.weiSleutel = sleutel;
    for (const d of this.weiDieren) this.groep.remove(d.model.groep);
    this.weiDieren = [];
    dieren.slice(0, 8).forEach((d, i) => {
      const r = RIJDIEREN.find((x) => x.id === d.soort);
      if (!r) return;
      const model = new RijModel(r.plan, d.variant as never);
      model.groep.scale.setScalar(0.75);
      this.groep.add(model.groep);
      this.weiDieren.push({ model, hoek: (i / 8) * Math.PI * 2, straal: 2.5 + (i % 3) * 1.6, snel: 0.25 + (i % 4) * 0.08 });
    });
  }

  update(dt: number, snelheid: number) {
    this.tijd += dt;
    for (const b of this.barrieres) {
      const open = this.isOpen(b.biome, snelheid);
      b.botser.actief = !open;
      b.scherm.visible = !open;
    }
    for (const k of this.kussens) k.scale.y = 1 + Math.sin(this.tijd * 6) * 0.15;
    const w = RANCH.wei;
    for (const d of this.weiDieren) {
      d.hoek += dt * d.snel;
      const x = w.x + Math.cos(d.hoek) * d.straal, z = w.z + Math.sin(d.hoek) * d.straal;
      d.model.groep.position.set(x, 0, z);
      d.model.groep.rotation.y = Math.atan2(-Math.sin(d.hoek), Math.cos(d.hoek));
      d.model.update(dt, 0.35, false);
    }
  }
}
