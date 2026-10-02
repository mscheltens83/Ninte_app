// De aankleding van het Rijland: veel bomen, struiken en bloemen, een herkenningspunt
// per gebied (windmolen, oase, iglo, chocoladerivier), lantaarns rond de racebaan,
// wolken en een regenboog in de lucht. Zo voelt de wereld vol en vrolijk.
//
// Iets toevoegen? Zet een nieuw soort in de `switch` van een gebied, of een nieuw
// herkenningspunt in `bouwHerkenningspunten`.

import * as THREE from 'three';
import { botserUitBlok, type Fysica } from '../spel/fysica';
import { blok, blokOp, dynamisch, voegStatischSamen, zaadRng } from '../wereld/bouwstenen';
import { BAAN, BIOMEN, HERKENNINGSPUNTEN, KLIMTORENS, MIDDEN, RANCH, RIJLAND, SNELSTROKEN, SPRINGKUSSENS, biomeBij, type Biome } from './rijland';
import { heuvelLagen, opHeuvel, type Heuvel } from '../wereld/heuvels';

const W = RIJLAND.x, Z = RIJLAND.z;

/** Plekken die vrij moeten blijven (eieren, poorten, landmarks), met een straal. */
interface Vrij { x: number; z: number; r: number }

// De herkenningspunten staan in rijland.ts (HERKENNINGSPUNTEN), zodat heuvels er ook omheen gaan.

export class Aankleding {
  /** Vaste dingen (worden samengevoegd tot weinig tekenopdrachten). */
  private g = new THREE.Group();
  /** Dingen die bewegen of een eigen materiaal hebben. */
  private dyn = new THREE.Group();
  private lampen = new Map<string, THREE.MeshStandardMaterial>();
  private wieken = new THREE.Group();
  private wolken: THREE.Group[] = [];
  private eendjes: THREE.Group[] = [];
  private tijd = 0;

  constructor(scene: THREE.Scene, private f: Fysica, vrijeEieren: { x: number; z: number }[] = [], private heuvels: readonly Heuvel[] = []) {
    scene.add(this.g, this.dyn);
    const vrij: Vrij[] = [
      ...HERKENNINGSPUNTEN,
      ...vrijeEieren.map((e) => ({ x: e.x, z: e.z, r: 4 })),
      ...KLIMTORENS.map((t) => ({ x: t.x, z: t.z, r: t.basis / 2 + 4 })),
      ...SPRINGKUSSENS.map((k) => ({ x: k.x, z: k.z, r: 5 })),
      ...SNELSTROKEN.map((s) => ({ x: s.x, z: s.z, r: 5 })),
    ];
    this.bouwBegroeiing(vrij);
    this.bouwTapijt(vrij);
    this.bouwHerkenningspunten();
    this.bouwMidden();
    this.bouwLucht();
    this.bouwHeuveltoppen();
    voegStatischSamen(this.g);
  }

  private vast(b: number, h: number, d: number, kleur: string, x: number, y: number, z: number) {
    this.g.add(blokOp(b, h, d, kleur, x, y, z));
    this.f.voegToe(botserUitBlok(x, y + h / 2, z, b, h, d));
  }

  /** Een willekeurige vrije plek in een gebied (of null). */
  private plekIn(b: Biome, rng: () => number, vrij: Vrij[]): [number, number] | null {
    const x = W + b.sx * (4 + rng() * (RIJLAND.half - 8)), z = Z + b.sz * (4 + rng() * (RIJLAND.half - 8));
    if (Math.abs(x - W) < MIDDEN + 5 && Math.abs(z - Z) < MIDDEN + 5) return null;
    if (Math.abs(x - W) < 3.5 || Math.abs(z - Z) < 3.5) return null; // heggen
    if (vrij.some((v) => Math.hypot(v.x - x, v.z - z) < v.r)) return null;
    if (opHeuvel(this.heuvels, x, z, 1.5)) return null;
    // Het pad van de poort naar binnen blijft vrij.
    const poortX = W + b.sx * 30;
    if (Math.abs(x - poortX) < 5 && Math.abs(z - Z) < MIDDEN + 25) return null;
    return [x, z];
  }

  private bouwBegroeiing(vrij: Vrij[]) {
    const rng = zaadRng(2027);
    const g = this.g;
    for (const b of BIOMEN) {
      // Een gekleurd pad van de poort het gebied in.
      const poortX = W + b.sx * 30;
      g.add(blokOp(6, 0.05, 24, b.muur, poortX, 0.02, Z + b.sz * (MIDDEN + 12), false));
      for (let i = 0; i < 140; i++) {
        const p = this.plekIn(b, rng, vrij);
        if (!p) continue;
        const [x, z] = p;
        const k = Math.floor(rng() * 10);
        switch (b.id) {
          case 'weide':
            if (k < 3) { this.vast(0.7, 3, 0.7, '#85613b', x, 0, z); g.add(blokOp(3.2, 2.6, 3.2, ['#4fb35a', '#62c46a', '#3f9a45'][k], x, 2.6, z)); if (k === 0) g.add(blokOp(0.35, 0.35, 0.1, '#ff4f6d', x + 0.8, 3.6, z + 1.62)); }
            else if (k < 6) g.add(blokOp(1.6, 1, 1.6, '#5fc06d', x, 0, z), blokOp(0.4, 0.3, 0.4, ['#ff5fa2', '#ffd23f', '#ffffff'][k % 3], x + 0.4, 1, z + 0.3));
            else if (k < 8) g.add(blokOp(0.25, 0.5, 0.25, '#f6f1e4', x, 0, z), blokOp(0.8, 0.35, 0.8, '#ff4f6d', x, 0.5, z), blokOp(0.15, 0.1, 0.15, '#ffffff', x + 0.2, 0.86, z));
            else g.add(blokOp(3, 0.9, 0.2, '#c68b59', x, 0, z), blokOp(0.2, 1.1, 0.2, '#a87242', x - 1.4, 0, z), blokOp(0.2, 1.1, 0.2, '#a87242', x + 1.4, 0, z));
            break;
          case 'zand':
            if (k < 3) { this.vast(0.7, 3, 0.7, '#4f9e4a', x, 0, z); g.add(blokOp(1.6, 0.5, 0.5, '#4f9e4a', x, 1.4, z), blokOp(0.5, 1, 0.5, '#4f9e4a', x + 0.55, 1.8, z), blokOp(0.5, 0.8, 0.5, '#4f9e4a', x - 0.55, 1.5, z)); if (k === 0) g.add(blokOp(0.3, 0.3, 0.3, '#ff5fa2', x, 3, z)); }
            else if (k < 6) g.add(blokOp(5 + k, 0.6, 3 + k * 0.3, '#e8c27a', x, 0, z), blokOp(3 + k * 0.5, 0.5, 2, '#f0d08e', x, 0.6, z));
            else if (k < 8) this.vast(1.6 + k * 0.1, 1.2, 1.4, '#b69a7a', x, 0, z);
            else this.palm(x, z, rng);
            break;
          case 'sneeuw':
            if (k < 4) this.den(x, z);
            else if (k < 6) g.add(blokOp(1.4, 1.4, 1.4, '#ffffff', x, 0, z), blokOp(1, 1, 1, '#ffffff', x, 1.4, z), blokOp(0.2, 0.2, 0.4, '#ff8a3d', x, 1.85, z + 0.6), blokOp(0.12, 0.12, 0.05, '#2b2340', x - 0.2, 2.05, z + 0.51), blokOp(0.12, 0.12, 0.05, '#2b2340', x + 0.2, 2.05, z + 0.51), blokOp(1.1, 0.2, 1.1, '#e0405f', x, 2.4, z));
            else if (k < 8) g.add(blokOp(0.5, 1.6, 0.5, '#bfe9ff', x, 0, z), blokOp(0.4, 1.1, 0.4, '#d9f3ff', x + 0.5, 0, z + 0.2), blokOp(0.35, 0.8, 0.35, '#9fd8ff', x - 0.4, 0, z - 0.3));
            else g.add(blokOp(4, 0.4, 3, '#ffffff', x, 0, z), blokOp(2.5, 0.4, 2, '#ffffff', x, 0.4, z));
            break;
          case 'snoep':
            if (k < 3) this.lolly(x, z, rng);
            else if (k < 5) this.zuurstok(x, z);
            else if (k < 8) g.add(blokOp(2, 1.2, 2, ['#ff5fa2', '#46d17a', '#ffd23f', '#a36bff', '#4fb8ff'][k % 5], x, 0, z), blokOp(1.4, 0.4, 1.4, '#ffffff', x, 1.2, z));
            else g.add(blokOp(2.4, 1.2, 2.4, '#c68b59', x, 0, z), blokOp(2.6, 0.5, 2.6, '#ffc2dc', x, 1.2, z), blokOp(0.6, 0.6, 0.6, '#e0405f', x, 1.7, z));
            break;
        }
      }
    }
  }

  /** Duizenden kleine details over de grond: bloemetjes, schelpjes, ijskristallen en hagelslag. */
  private bouwTapijt(vrij: Vrij[]) {
    const rng = zaadRng(31);
    const kleuren: Record<string, string[]> = {
      weide: ['#ff5fa2', '#ffd23f', '#ffffff', '#a36bff', '#ff8a3d', '#4fb8ff'],
      zand: ['#fff3e0', '#ffc2a8', '#d9a35b', '#ffffff'],
      sneeuw: ['#bfe9ff', '#ffffff', '#9fd8ff', '#e6d6ff'],
      snoep: ['#ff4f6d', '#46d17a', '#ffd23f', '#4fb8ff', '#ffffff', '#a36bff'],
    };
    const doos = new THREE.BoxGeometry(0.28, 0.22, 0.28);
    const hulp = new THREE.Object3D();
    const kleur = new THREE.Color();
    for (const b of BIOMEN) {
      const aantal = 700;
      const mesh = dynamisch(new THREE.InstancedMesh(doos, new THREE.MeshLambertMaterial({ color: '#ffffff' }), aantal));
      let n = 0;
      for (let i = 0; i < aantal * 2 && n < aantal; i++) {
        const p = this.plekIn(b, rng, vrij);
        if (!p) continue;
        hulp.position.set(p[0], 0.12, p[1]);
        hulp.rotation.y = rng() * Math.PI;
        hulp.updateMatrix();
        mesh.setMatrixAt(n, hulp.matrix);
        mesh.setColorAt(n, kleur.set(kleuren[b.id][n % kleuren[b.id].length]));
        n++;
      }
      mesh.count = n;
      mesh.computeBoundingSphere();
      this.dyn.add(mesh);
    }
  }

  /** Bovenop elke heuvel waar je op kunt lopen staat iets leuks. */
  private bouwHeuveltoppen() {
    const rng = zaadRng(99);
    for (const h of this.heuvels) {
      if (h.steil) continue;
      const lagen = heuvelLagen(h);
      const top = lagen[lagen.length - 1];
      const y = top.top;
      const b = biomeBij(top.x, top.z);
      const [x, z] = [top.x, top.z];
      const g = this.g;
      switch (b?.id) {
        case 'zand': g.add(blokOp(0.7, 2.6, 0.7, '#4f9e4a', x, y, z), blokOp(1.6, 0.5, 0.5, '#4f9e4a', x, y + 1.2, z), blokOp(0.3, 0.3, 0.3, '#ff5fa2', x, y + 2.6, z)); break;
        case 'sneeuw': g.add(blokOp(0.6, 1.4, 0.6, '#85613b', x, y, z), blokOp(3, 1.3, 3, '#2f7d4a', x, y + 1.3, z), blokOp(2.1, 1.2, 2.1, '#3a9257', x, y + 2.5, z), blokOp(1.2, 1, 1.2, '#ffffff', x, y + 3.6, z)); break;
        case 'snoep': {
          const kleur = ['#ff5fa2', '#4fb8ff', '#ffd23f'][Math.floor(rng() * 3)];
          g.add(blokOp(0.3, 3, 0.3, '#ffffff', x, y, z), blokOp(2.2, 2.2, 0.45, kleur, x, y + 3, z), blokOp(1.2, 1.2, 0.5, '#ffffff', x, y + 3.5, z));
          break;
        }
        default: g.add(blokOp(0.6, 2.4, 0.6, '#85613b', x, y, z), blokOp(2.8, 2.2, 2.8, '#4fb35a', x, y + 2.2, z), blokOp(0.35, 0.35, 0.1, '#ff4f6d', x + 0.6, y + 3.2, z + 1.42));
      }
    }
  }

  private palm(x: number, z: number, rng: () => number) {
    this.vast(0.5, 4.5, 0.5, '#a87242', x, 0, z);
    const leeg = rng() * Math.PI;
    for (let i = 0; i < 4; i++) {
      const a = leeg + (i * Math.PI) / 2;
      const blad = blok(2.6, 0.15, 0.7, '#3fae4a', x + Math.cos(a) * 1.2, 4.4, z + Math.sin(a) * 1.2);
      blad.rotation.y = -a;
      blad.rotation.z = 0.25;
      this.g.add(blad);
    }
    this.g.add(blokOp(0.4, 0.4, 0.4, '#7a4e2c', x + 0.3, 4.1, z));
  }

  private den(x: number, z: number) {
    this.vast(0.6, 1.6, 0.6, '#85613b', x, 0, z);
    this.g.add(blokOp(3.2, 1.4, 3.2, '#2f7d4a', x, 1.5, z), blokOp(2.3, 1.3, 2.3, '#3a9257', x, 2.8, z), blokOp(1.3, 1.1, 1.3, '#ffffff', x, 4, z));
  }

  private lolly(x: number, z: number, rng: () => number) {
    this.vast(0.35, 4, 0.35, '#ffffff', x, 0, z);
    const kleur = ['#ff5fa2', '#4fb8ff', '#ffd23f', '#a36bff'][Math.floor(rng() * 4)];
    this.g.add(blokOp(2.6, 2.6, 0.5, kleur, x, 4, z), blokOp(1.6, 1.6, 0.55, '#ffffff', x, 4.5, z), blokOp(0.8, 0.8, 0.6, kleur, x, 4.9, z));
  }

  private zuurstok(x: number, z: number) {
    for (let i = 0; i < 8; i++) this.g.add(blokOp(0.45, 0.5, 0.45, i % 2 ? '#ffffff' : '#e0405f', x, i * 0.5, z));
    for (let i = 0; i < 3; i++) this.g.add(blokOp(0.45, 0.45, 0.45, i % 2 ? '#ffffff' : '#e0405f', x + 0.45 * (i + 1), 4 + (i === 2 ? -0.45 : 0), z));
    this.f.voegToe(botserUitBlok(x, 2, z, 0.45, 4, 0.45));
  }

  private bouwHerkenningspunten() {
    const g = this.g;
    // Windmolen met draaiende wieken
    const [mx, mz] = [W - 75, Z - 112];
    this.vast(4, 9, 4, '#fff3e0', mx, 0, mz);
    g.add(blokOp(4.6, 1.6, 4.6, '#e0405f', mx, 9, mz), blokOp(3.2, 1.2, 3.2, '#e0405f', mx, 10.6, mz), blokOp(1.2, 2, 0.2, '#8a5a3c', mx, 0, mz + 2.05));
    this.wieken.position.set(mx, 8, mz + 2.4);
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = (i * Math.PI) / 2;
      arm.add(blok(0.4, 5, 0.15, '#c68b59', 0, 2.7, 0), blok(1.2, 3.8, 0.1, '#ffffff', 0.7, 3, 0));
      this.wieken.add(arm);
    }
    this.wieken.add(blok(0.7, 0.7, 0.5, '#5b3a22', 0, 0, 0));
    this.dyn.add(dynamisch(this.wieken));
    // Vijver met eendjes en riet
    const [vx, vz] = [W - 105, Z - 78];
    g.add(blokOp(18, 0.06, 12, '#4fb3e8', vx, 0.02, vz, false), blokOp(19, 0.04, 13, '#e8d9b5', vx, 0.01, vz, false));
    for (let i = 0; i < 10; i++) g.add(blokOp(0.12, 1.2 + (i % 3) * 0.3, 0.12, '#4f8a3a', vx - 8.5 + (i % 5) * 0.4, 0, vz - 5.5 + Math.floor(i / 5) * 11));
    for (let i = 0; i < 3; i++) {
      const eend = new THREE.Group();
      eend.add(blokOp(0.6, 0.35, 0.8, '#ffd23f', 0, 0, 0), blokOp(0.35, 0.35, 0.35, '#ffd23f', 0, 0.3, 0.3), blokOp(0.2, 0.1, 0.2, '#ff8a3d', 0, 0.4, 0.55));
      eend.userData.fase = i * 2.1;
      eend.position.set(vx, 0.05, vz);
      this.eendjes.push(eend);
      this.dyn.add(dynamisch(eend));
    }
    // Oase met palmbomen
    const [ox, oz] = [W + 60, Z - 112];
    g.add(blokOp(12, 0.06, 9, '#4fc3ff', ox, 0.02, oz, false), blokOp(14, 0.04, 11, '#8fd07a', ox, 0.01, oz, false));
    const rng = zaadRng(5);
    for (const [dx, dz] of [[-7, -5], [7, -4], [-6, 5], [7, 5], [0, -6]]) this.palm(ox + dx, oz + dz, rng);
    // IJsmeer en iglo
    const [ix, iz] = [W + 45, Z + 110];
    g.add(blokOp(20, 0.06, 12, '#bfe9ff', ix, 0.02, iz, false), blokOp(14, 0.07, 6, '#e6f7ff', ix + 1, 0.03, iz - 1, false));
    const [gx, gz] = [W + 112, Z + 45];
    for (let i = 0; i < 4; i++) this.vast(6 - i * 1.3, 0.9, 6 - i * 1.3, '#ffffff', gx, i * 0.9, gz);
    g.add(blokOp(1.6, 1.5, 1.2, '#2b3a55', gx, 0, gz - 3.1));
    // Chocoladerivier, reuzendonut
    g.add(blokOp(66, 0.06, 5, '#7a4e2c', W - 94, 0.02, Z + 106, false));
    for (let i = 0; i < 12; i++) g.add(blokOp(0.6, 0.1, 0.4, ['#ff5fa2', '#ffffff', '#ffd23f'][i % 3], W - 125 + i * 5.5, 0.08, Z + 105 + (i % 2)));
    const donut = new THREE.Mesh(new THREE.TorusGeometry(3, 1.3, 12, 24), new THREE.MeshStandardMaterial({ color: '#e8b070' }));
    donut.rotation.x = Math.PI / 2;
    donut.position.set(W - 50, 1.3, Z + 110);
    const glazuur = new THREE.Mesh(new THREE.TorusGeometry(3, 1.35, 12, 24, Math.PI * 2), new THREE.MeshStandardMaterial({ color: '#ff8fbf' }));
    glazuur.rotation.x = Math.PI / 2;
    glazuur.position.set(W - 50, 1.6, Z + 110);
    glazuur.scale.z = 0.6;
    this.dyn.add(dynamisch(donut), dynamisch(glazuur));
  }

  private bouwMidden() {
    const g = this.g;
    // Bloemperken rond de boom
    const kleuren = ['#ff5fa2', '#ffd23f', '#a36bff', '#ff8a3d', '#4fb8ff'];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, x = W + Math.cos(a) * 11, z = Z + Math.sin(a) * 11;
      if (Math.abs(x - RANCH.broedhuis.x) < 6 && z > Z + 6) continue;
      if (x > W + 9 && Math.abs(z - Z) < 9) continue; // dierenwei
      g.add(blokOp(2.4, 0.3, 2.4, '#8a5a3c', x, 0, z));
      for (let j = 0; j < 4; j++) g.add(blokOp(0.4, 0.4, 0.4, kleuren[(i + j) % 5], x - 0.6 + (j % 2) * 1.2, 0.3, z - 0.6 + Math.floor(j / 2) * 1.2));
    }
    // Lantaarns langs de racebaan
    for (let n = -BAAN; n <= BAAN; n += 15) {
      for (const s of [-1, 1]) {
        for (const kant of [BAAN - 5, BAAN + 5]) {
          for (const [x, z] of [[W + n, Z + s * kant], [W + s * kant, Z + n]]) {
            if (Math.abs(x - RANCH.start.x) < 3 && Math.abs(z - RANCH.start.z) < 8) continue;
            if (Math.hypot(x - RANCH.terugPoort.x, z - RANCH.terugPoort.z) < 6) continue;
            g.add(blokOp(0.2, 2.6, 0.2, '#2b2340', x, 0, z));
            const kleur = kleuren[Math.abs(n / 15 + 3 + s) % kleuren.length];
            let mat = this.lampen.get(kleur);
            if (!mat) this.lampen.set(kleur, (mat = new THREE.MeshStandardMaterial({ color: kleur, emissive: kleur, emissiveIntensity: 0.5 })));
            this.dyn.add(dynamisch(blokOp(0.55, 0.55, 0.55, mat, x, 2.6, z)));
          }
        }
      }
    }
  }

  private bouwLucht() {
    // Een grote regenboog boven het Rijland
    const banden = ['#ff4d6d', '#ff9a3d', '#ffd93d', '#5cd65c', '#4da6ff', '#a36bff'];
    banden.forEach((k, i) => {
      const boog = new THREE.Mesh(new THREE.TorusGeometry(150 - i * 4, 2, 6, 64, Math.PI), new THREE.MeshBasicMaterial({ color: k, transparent: true, opacity: 0.55, fog: false }));
      boog.position.set(W, -10, Z - 170);
      this.dyn.add(dynamisch(boog));
    });
    // Wolken
    const rng = zaadRng(77);
    for (let i = 0; i < 16; i++) {
      const wolk = new THREE.Group();
      for (let j = 0; j < 4; j++) wolk.add(blok(6 + rng() * 6, 2 + rng() * 2, 4 + rng() * 4, '#ffffff', j * 4 - 6, rng() * 1.5, rng() * 3, false));
      wolk.position.set(W - 160 + rng() * 320, 38 + rng() * 18, Z - 160 + rng() * 320);
      this.wolken.push(wolk);
      this.dyn.add(dynamisch(wolk));
    }
  }

  update(dt: number) {
    this.tijd += dt;
    this.wieken.rotation.z += dt * 0.8;
    for (const w of this.wolken) {
      w.position.x += dt * 1.5;
      if (w.position.x > W + 170) w.position.x = W - 170;
    }
    const [vx, vz] = [W - 105, Z - 78];
    for (const e of this.eendjes) {
      const a = this.tijd * 0.3 + (e.userData.fase as number);
      e.position.set(vx + Math.cos(a) * 6, 0.05 + Math.sin(this.tijd * 3 + a) * 0.04, vz + Math.sin(a) * 3.5);
      e.rotation.y = Math.atan2(-Math.sin(a) * 6, Math.cos(a) * 3.5);
    }
  }
}
