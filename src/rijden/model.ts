// De 3D-modellen van rijdieren en eieren, gebouwd uit blokjes zoals de rest van
// het spel. Elk dier wordt opgebouwd uit zijn bouwplan (dieren.ts): een vorm
// (paard, kat, vogel, draak, schildpad) plus oren, staart, hoorn, vleugels, ...

import * as THREE from 'three';
import { blok } from '../wereld/bouwstenen';
import { EIEREN, type Bouwplan, type EiSoort, type Variant } from './dieren';

const REGENBOOG = ['#ff4d6d', '#ff9a3d', '#ffd93d', '#5cd65c', '#4da6ff', '#a36bff'];
const goudMat = new THREE.MeshStandardMaterial({ color: '#ffcc33', metalness: 0.65, roughness: 0.3, emissive: '#6b4a00', emissiveIntensity: 0.35 });
const parelMat = new THREE.MeshStandardMaterial({ color: '#fff6d6', emissive: '#ffd6f5', emissiveIntensity: 0.5, roughness: 0.3 });
const sterMat = new THREE.MeshStandardMaterial({ color: '#ffe680', emissive: '#ffe680', emissiveIntensity: 0.8 });
const glitterMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffd6f5', emissiveIntensity: 0.9 });
const oog = '#1b1512';

interface Poot { groep: THREE.Group; fase: number }

export class RijModel {
  readonly groep = new THREE.Group();
  /** Hoogte van het zadel: daar zit Ninte. */
  readonly zadel: number;
  private lijf = new THREE.Group();
  private poten: Poot[] = [];
  private vleugels: THREE.Group[] = [];
  private staart = new THREE.Group();
  private tijd = 0;
  private stap = 0;
  private lijfKleur: string | THREE.Material;

  constructor(private plan: Bouwplan, readonly variant: Variant = 'normaal') {
    this.lijfKleur = variant === 'goud' ? goudMat : plan.lijf;
    this.groep.add(this.lijf);
    const s = plan.schaal ?? 1;
    switch (plan.vorm) {
      case 'paard': this.zadel = this.paard(); break;
      case 'kat': this.zadel = this.kat(); break;
      case 'vogel': this.zadel = this.vogel(); break;
      case 'draak': this.zadel = this.draak(); break;
      case 'schildpad': this.zadel = this.schildpad(); break;
    }
    this.lijf.scale.setScalar(s);
    this.zadel *= s;
    this.groep.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  }

  private add(...o: THREE.Object3D[]) { this.lijf.add(...o); }

  private poot(x: number, y: number, z: number, lengte: number, dikte: number, kleur: string | THREE.Material, voet: string | THREE.Material, fase: number) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.add(blok(dikte, lengte, dikte, kleur, 0, -lengte / 2, 0));
    g.add(blok(dikte * 1.1, lengte * 0.16, dikte * 1.1, voet, 0, -lengte + lengte * 0.08, 0));
    this.lijf.add(g);
    this.poten.push({ groep: g, fase });
  }

  /** Strepen, vlekken, sterren en de bijzondere kleuren op een romp. */
  private versier(b: number, h: number, d: number, y: number) {
    const p = this.plan;
    if (p.strepen === 'regenboog' || this.variant === 'regenboog') {
      REGENBOOG.forEach((k, i) => this.add(blok(b + 0.02, h * 0.5, d / 8, k, 0, y + h * 0.2, -d / 2 + d / 12 + (i * d) / 7)));
    } else if (p.strepen) {
      for (let i = 0; i < 4; i++) this.add(blok(b + 0.02, h + 0.02, 0.1, p.strepen, 0, y, -d / 2 + 0.3 + (i * (d - 0.6)) / 3));
    }
    if (p.vlekken) {
      // Vlekken op beide flanken en op de rug.
      for (const [kant, yy, z] of [[1, 0.15, -0.4], [-1, -0.1, 0.2], [1, -0.15, 0.55], [-1, 0.2, -0.7], [0, 0.5, 0.1], [0, 0.5, -0.5]]) {
        this.add(kant ? blok(0.04, 0.2, 0.24, p.vlekken, kant * (b / 2 + 0.01), y + yy * h, z * (d / 2)) : blok(0.24, 0.04, 0.24, p.vlekken, 0.1, y + yy * h + 0.01, z * (d / 2)));
      }
    }
    if (p.sterren) {
      for (const [x, yy, z] of [[0.51, 0.1, 0.3], [-0.51, -0.1, -0.2], [0.51, -0.15, -0.6], [-0.51, 0.2, 0.6], [0, 0.46, -0.3]]) this.add(blok(0.06, 0.14, 0.14, sterMat, x * b, y + yy, z * d / 2));
    }
    if (this.variant === 'glitter') {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        this.add(blok(0.08, 0.08, 0.08, glitterMat, Math.cos(a) * (b / 2 + 0.02), y + Math.sin(a * 2) * h * 0.3, Math.sin(a) * d * 0.4));
      }
    }
  }

  private zadelBlok(y: number, z = 0) {
    this.add(blok(1.05, 0.14, 0.8, '#e0405f', 0, y, z), blok(1.1, 0.06, 0.86, '#ffd23f', 0, y - 0.08, z));
  }

  private vleugelPaar(y: number, z: number, lengte: number, kleur: string) {
    for (const kant of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(kant * 0.5, y, z);
      g.add(blok(lengte, 0.08, 0.9, kleur, kant * lengte / 2, 0, 0));
      g.add(blok(lengte * 0.7, 0.07, 0.5, '#ffffff', kant * lengte * 0.55, 0.02, -0.4));
      g.userData.kant = kant;
      this.add(g);
      this.vleugels.push(g);
    }
  }

  private paard(): number {
    const p = this.plan, L = this.lijfKleur, A = p.accent, licht = p.licht ?? p.lijf;
    this.add(blok(1.0, 0.9, 2.0, L, 0, 1.45, 0));
    this.versier(1.0, 0.9, 2.0, 1.45);
    const voet = '#3a2e28';
    this.poot(-0.32, 1.05, 0.7, 1.05, 0.26, L, voet, 0);
    this.poot(0.32, 1.05, -0.7, 1.05, 0.26, L, voet, 0);
    this.poot(0.32, 1.05, 0.7, 1.05, 0.26, L, voet, Math.PI);
    this.poot(-0.32, 1.05, -0.7, 1.05, 0.26, L, voet, Math.PI);
    const hals = blok(0.5, 1.0, 0.55, L, 0, 2.05, 0.95);
    hals.rotation.x = 0.45;
    const maan = blok(0.18, 1.05, 0.24, this.variant === 'regenboog' ? REGENBOOG[4] : A, 0, 2.15, 0.76);
    maan.rotation.x = 0.45;
    this.add(hals, maan, blok(0.48, 0.48, 0.85, L, 0, 2.55, 1.35), blok(0.42, 0.34, 0.3, licht, 0, 2.45, 1.82), blok(0.5, 0.1, 0.1, oog, 0, 2.66, 1.42));
    if (p.oren !== 'geen') this.add(blok(0.12, 0.24, 0.1, L, -0.16, 2.88, 1.12), blok(0.12, 0.24, 0.1, L, 0.16, 2.88, 1.12));
    if (p.hoorn) {
      const hoorn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.65, 10), parelMat);
      hoorn.position.set(0, 3.05, 1.5);
      hoorn.rotation.x = 0.5;
      this.add(hoorn);
    }
    if (p.gewei) {
      for (const k of [-1, 1]) this.add(blok(0.08, 0.6, 0.08, '#e6d3a8', k * 0.22, 3.05, 1.1), blok(0.32, 0.08, 0.08, '#e6d3a8', k * 0.36, 3.2, 1.1), blok(0.08, 0.3, 0.08, '#e6d3a8', k * 0.48, 3.35, 1.1));
    }
    if (p.vleugels) this.vleugelPaar(1.75, 0.2, 1.4, A);
    this.staart.position.set(0, 1.75, -1.0);
    const s = blok(0.24, 1.0, 0.24, this.variant === 'regenboog' ? REGENBOOG[0] : A, 0, -0.42, -0.12);
    s.rotation.x = -0.3;
    this.staart.add(s);
    this.add(this.staart);
    this.zadelBlok(1.95);
    return 2.0;
  }

  private kat(): number {
    const p = this.plan, L = this.lijfKleur, A = p.accent, licht = p.licht ?? p.lijf;
    const panda = p.licht === p.accent;
    const pootKleur = panda ? A : L;
    this.add(blok(1.0, 0.85, 1.7, L, 0, 1.15, 0), blok(0.86, 0.12, 1.3, panda ? L : licht, 0, 0.72, 0));
    this.versier(1.0, 0.85, 1.7, 1.15);
    this.poot(-0.3, 0.8, 0.55, 0.8, 0.3, pootKleur, panda ? A : licht, 0);
    this.poot(0.3, 0.8, -0.55, 0.8, 0.3, pootKleur, panda ? A : licht, 0);
    this.poot(0.3, 0.8, 0.55, 0.8, 0.3, pootKleur, panda ? A : licht, Math.PI);
    this.poot(-0.3, 0.8, -0.55, 0.8, 0.3, pootKleur, panda ? A : licht, Math.PI);
    this.add(blok(0.82, 0.72, 0.72, L, 0, 1.7, 1.05), blok(0.42, 0.3, 0.26, panda ? L : licht, 0, 1.56, 1.46), blok(0.14, 0.1, 0.06, oog, 0, 1.66, 1.6));
    if (panda) this.add(blok(0.22, 0.2, 0.04, A, -0.2, 1.8, 1.42), blok(0.22, 0.2, 0.04, A, 0.2, 1.8, 1.42));
    this.add(blok(0.1, 0.1, 0.04, oog, -0.2, 1.8, 1.44), blok(0.1, 0.1, 0.04, oog, 0.2, 1.8, 1.44));
    for (const k of [-1, 1]) {
      if (p.oren === 'punt') this.add(blok(0.2, 0.32, 0.12, L, k * 0.26, 2.2, 0.95), blok(0.1, 0.12, 0.13, A, k * 0.26, 2.32, 0.95));
      else if (p.oren === 'rond') this.add(blok(0.24, 0.22, 0.12, panda ? A : L, k * 0.3, 2.12, 0.92));
      else if (p.oren === 'lang') this.add(blok(0.16, 0.7, 0.1, L, k * 0.18, 2.4, 0.95), blok(0.08, 0.5, 0.11, A, k * 0.18, 2.42, 0.96));
    }
    this.staart.position.set(0, 1.35, -0.85);
    if (p.staart === 'pluim') this.staart.add(blok(0.36, 0.36, 0.9, L, 0, 0.1, -0.45), blok(0.38, 0.38, 0.26, licht, 0, 0.12, -0.95));
    else if (p.staart === 'dun') this.staart.add(blok(0.14, 0.14, 1.0, L, 0, 0.2, -0.5), blok(0.16, 0.16, 0.2, A, 0, 0.35, -1.0));
    else if (p.staart === 'kort') this.staart.add(blok(0.3, 0.3, 0.25, panda ? A : licht, 0, 0, -0.1));
    this.staart.rotation.x = -0.3;
    this.add(this.staart);
    this.zadelBlok(1.62, -0.1);
    return 1.66;
  }

  private vogel(): number {
    const p = this.plan, L = this.lijfKleur, A = p.accent, licht = p.licht ?? '#ffd23f';
    this.add(blok(0.9, 0.8, 1.3, L, 0, 2.15, 0));
    this.versier(0.9, 0.8, 1.3, 2.15);
    this.poot(-0.2, 1.8, 0, 1.8, 0.12, licht, A, 0);
    this.poot(0.2, 1.8, 0, 1.8, 0.12, licht, A, Math.PI);
    const hals1 = blok(0.26, 0.8, 0.26, L, 0, 2.75, 0.55);
    hals1.rotation.x = 0.35;
    const hals2 = blok(0.24, 0.6, 0.24, L, 0, 3.25, 0.72);
    this.add(hals1, hals2, blok(0.38, 0.36, 0.48, L, 0, 3.6, 0.82), blok(0.16, 0.14, 0.32, licht, 0, 3.52, 1.18), blok(0.17, 0.15, 0.12, A, 0, 3.47, 1.36), blok(0.4, 0.08, 0.08, oog, 0, 3.66, 0.9));
    for (const k of [-1, 1]) this.add(blok(0.08, 0.5, 1.0, this.variant === 'goud' ? goudMat : '#ff6fa8', k * 0.48, 2.2, -0.05));
    this.staart.position.set(0, 2.3, -0.65);
    this.staart.add(blok(0.4, 0.15, 0.35, L, 0, 0, -0.15));
    this.add(this.staart);
    this.zadelBlok(2.6);
    return 2.65;
  }

  private draak(): number {
    const p = this.plan, L = this.lijfKleur, A = p.accent, licht = p.licht ?? p.lijf;
    this.add(blok(1.1, 0.9, 2.0, L, 0, 1.3, 0), blok(0.9, 0.14, 1.6, licht, 0, 0.84, 0));
    this.versier(1.1, 0.9, 2.0, 1.3);
    this.poot(-0.36, 0.9, 0.7, 0.9, 0.32, L, A, 0);
    this.poot(0.36, 0.9, -0.7, 0.9, 0.32, L, A, 0);
    this.poot(0.36, 0.9, 0.7, 0.9, 0.32, L, A, Math.PI);
    this.poot(-0.36, 0.9, -0.7, 0.9, 0.32, L, A, Math.PI);
    const hals = blok(0.5, 0.8, 0.5, L, 0, 1.85, 1.0);
    hals.rotation.x = 0.6;
    this.add(hals, blok(0.6, 0.5, 0.8, L, 0, 2.3, 1.4), blok(0.5, 0.3, 0.35, licht, 0, 2.2, 1.85), blok(0.62, 0.1, 0.1, oog, 0, 2.42, 1.5));
    for (const k of [-1, 1]) {
      const hoorn = blok(0.1, 0.4, 0.1, A, k * 0.2, 2.68, 1.2);
      hoorn.rotation.x = -0.4;
      this.add(hoorn);
    }
    for (let i = 0; i < 5; i++) this.add(blok(0.12, 0.22, 0.2, A, 0, 1.86, 0.7 - i * 0.38));
    if (p.vleugels) this.vleugelPaar(1.7, 0.1, 1.7, A);
    this.staart.position.set(0, 1.35, -1.0);
    this.staart.add(blok(0.4, 0.35, 0.8, L, 0, -0.05, -0.35), blok(0.28, 0.25, 0.7, L, 0, -0.12, -1.0), blok(0.3, 0.3, 0.12, A, 0, -0.12, -1.4));
    this.add(this.staart);
    this.zadelBlok(1.82, -0.15);
    return 1.86;
  }

  private schildpad(): number {
    const p = this.plan, L = this.lijfKleur, A = p.accent, licht = p.licht ?? p.lijf;
    this.add(blok(1.4, 0.4, 1.6, L, 0, 0.55, 0), blok(1.65, 0.6, 1.85, this.variant === 'goud' ? goudMat : A, 0, 1.0, 0));
    for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [0, 0], [-0.45, 0.45], [0.45, 0.45]]) this.add(blok(0.42, 0.06, 0.42, licht, x, 1.32, z));
    this.versier(1.65, 0.6, 1.85, 1.0);
    for (const [x, z, f] of [[-0.6, 0.6, 0], [0.6, -0.6, 0], [0.6, 0.6, Math.PI], [-0.6, -0.6, Math.PI]]) this.poot(x, 0.5, z, 0.45, 0.36, L, L, f);
    this.add(blok(0.5, 0.45, 0.6, L, 0, 0.85, 1.15), blok(0.52, 0.08, 0.08, oog, 0, 0.98, 1.3));
    this.staart.position.set(0, 0.55, -0.95);
    this.staart.add(blok(0.2, 0.15, 0.3, L, 0, 0, -0.1));
    this.add(this.staart);
    this.zadelBlok(1.37);
    return 1.42;
  }

  /** `tempo` 0 (stil) tot 1 (volle vaart). */
  update(dt: number, tempo: number, inLucht: boolean) {
    this.tijd += dt;
    this.stap += dt * (5 + tempo * 9);
    for (const p of this.poten) p.groep.rotation.x = inLucht ? (p.fase ? -0.6 : 0.6) : Math.sin(this.stap + p.fase) * 0.8 * tempo;
    this.lijf.position.y = inLucht ? 0 : Math.abs(Math.sin(this.stap)) * 0.12 * tempo;
    this.staart.rotation.y = Math.sin(this.tijd * (4 + tempo * 6)) * 0.35;
    const flap = inLucht ? Math.sin(this.tijd * 14) * 0.7 : Math.sin(this.tijd * 3) * 0.15;
    for (const v of this.vleugels) v.rotation.z = (v.userData.kant as number) * (0.25 + flap);
  }
}

/** Een ei uit blokjes en bolletjes. */
export function eiModel(soort: EiSoort): THREE.Group {
  const e = EIEREN.find((x) => x.id === soort)!;
  const g = new THREE.Group();
  const mat = soort === 'goud' ? goudMat : new THREE.MeshStandardMaterial({ color: e.kleur, roughness: 0.5 });
  const ei = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), mat);
  ei.scale.y = 1.3;
  ei.position.y = 0.55;
  ei.castShadow = true;
  g.add(ei);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, h = 0.35 + (i % 3) * 0.22;
    const r = 0.42 * Math.sqrt(1 - ((h - 0.55) / 0.55) ** 2) + 0.01;
    g.add(blok(0.1, 0.1, 0.03, e.stip, Math.sin(a) * r, h, Math.cos(a) * r));
    g.children.at(-1)!.lookAt(0, h, 0);
  }
  return g;
}
