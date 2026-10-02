// De feestelijke kant van de muziek in de 3D-wereld: lampjesslingers boven de paden,
// dansende bloemen en het discopodium op het dorpsplein. Alles beweegt op de maat.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { botserUitBlok, type Fysica, type Vec3 } from '../spel/fysica';
import { blokOp, dynamisch, tekstBord, voegStatischSamen, zaadRng } from '../wereld/bouwstenen';
import { GEBIEDEN, MATERIAALPLEKKEN, TOREN, VLIEG_ONDERDELEN, WERELD } from '../avontuur/inhoud';
import { terreinHoogte } from '../avontuur/landschap';
import type { Interactie } from '../avontuur/wereld';
import { Dansvloer, puls } from './dansen';
import { opKavel } from '../bouwen/onderdelen';
import { PORTAAL_DORP } from '../rijden/rijland';

/** Het discopodium staat aan de oostkant van het dorpsplein. */
export const PODIUM = { x: 20, z: -70 } as const;
/** De dansvloer voor het podium (x/z = midden, b = breedte in x, d = diepte in z). */
export const DANSVLOER = { x: 13.5, z: -70, b: 6, d: 8 } as const;

/** De regenboogkleuren van de lampjes, in volgorde van de lichtjesketting. */
export const LICHT_KLEUREN = ['#ff4f8b', '#ffb13b', '#ffe34d', '#4fdc7a', '#4fb8ff', '#b57bff'] as const;

/**
 * Hoe fel een kleurkanaal van de lampjes is (0..1). Nooit helemaal uit en geen
 * harde flitsen: bij meer energie lopen de kleuren sneller rond.
 */
export function lichtSterkte(kanaal: number, stap: number, niveau: number, rustig: boolean): number {
  if (rustig) return 0.9;
  const p = puls(stap / 4);
  const s = Math.floor(stap);
  const n = LICHT_KLEUREN.length;
  if (niveau <= 1) return 0.75 + 0.25 * p;
  if (niveau === 2) return kanaal === Math.floor(stap / 4) % n ? 1 : 0.55 + 0.2 * p;
  if (niveau === 3) return kanaal === Math.floor(stap / 2) % n ? 1 : 0.5 + 0.25 * p;
  return kanaal === s % n || kanaal === (s + 3) % n ? 1 : 0.45 + 0.35 * p;
}

/** Staat dit punt op de dansvloer? */
export function opDansvloer(p: Vec3): boolean {
  return Math.abs(p.x - DANSVLOER.x) <= DANSVLOER.b / 2 && Math.abs(p.z - DANSVLOER.z) <= DANSVLOER.d / 2 && p.y < 1;
}

/** Dichtbij genoeg om de discomuziek te horen. */
export function bijPodium(p: Vec3): boolean {
  return Math.hypot(p.x - (PODIUM.x - 4), p.z - PODIUM.z) < 13 && p.y < 4;
}

interface Bloem {
  x: number;
  y: number;
  z: number;
  hoogte: number;
  fase: number;
  schaal: number;
}

/** Plekken waar geen bloemen mogen staan: paden, gebouwen, bewoners en speciale plekken. */
function vrijVoorBloem(x: number, z: number): boolean {
  if (Math.abs(x) < 4.5) return false; // het hoofdpad
  if (GEBIEDEN.some((g) => Math.hypot(g.x - x, g.z - z) < 14)) return false;
  if (Math.abs(x - PODIUM.x + 4) < 14 && Math.abs(z - PODIUM.z) < 12) return false;
  if (Math.abs(x - TOREN.x) < 18 && Math.abs(z - TOREN.z) < 13) return false;
  if (Math.hypot(x - TOREN.landing.x, z - TOREN.landing.z) < 12) return false;
  if ([...MATERIAALPLEKKEN, ...VLIEG_ONDERDELEN].some((p) => Math.hypot(p.x - x, p.z - z) < 4)) return false;
  if (Math.hypot(x - 107, z + 115) < 5) return false; // vleugelrek
  if (opKavel(x, z, 4)) return false; // Ninte haar bouwkavel blijft vrij
  if (Math.hypot(x - PORTAAL_DORP.x, z - PORTAAL_DORP.z) < 7) return false; // de regenboogpoort
  // Niet half op een trap of een terrasrand.
  const h = terreinHoogte(x, z);
  return [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].every(([dx, dz]) => terreinHoogte(x + dx, z + dz) === h);
}

export function bloemPlekken(aantal: number, zaad = 77): Bloem[] {
  const rng = zaadRng(zaad);
  const bloemen: Bloem[] = [];
  for (let poging = 0; poging < aantal * 8 && bloemen.length < aantal; poging++) {
    const x = (rng() - 0.5) * (WERELD.halfBreedte * 2 - 12);
    const z = WERELD.zuid - 6 - rng() * (WERELD.zuid - WERELD.noord - 12);
    if (!vrijVoorBloem(x, z)) continue;
    bloemen.push({ x, y: terreinHoogte(x, z), z, hoogte: 0.8 + rng() * 0.7, fase: rng() * 2, schaal: 0.8 + rng() * 0.6 });
  }
  return bloemen;
}

/** Waar de lampjesslingers over het pad hangen (z-posities). */
export function slingerPlekken(): number[] {
  const plekken: number[] = [];
  for (let z = -12; z > WERELD.noord + 8; z -= 14) {
    if (z < -47 && z > -73) continue; // het dorpsplein blijft open
    if ([-3.6, 3.6].some((x) => terreinHoogte(x, z) > 0)) continue; // niet op de tuinheuvel
    plekken.push(z);
  }
  return plekken;
}

function lampMateriaal(kleur: string): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color: kleur });
  m.userData.kleur = new THREE.Color(kleur);
  return m;
}

export class Feestwereld {
  readonly groep = new THREE.Group();
  readonly dansvloer = new Dansvloer();
  readonly interacties: Interactie[] = [];
  /** Luidsprekers: hier komen de muzieknootjes uit. */
  readonly luidsprekers: THREE.Vector3[] = [];

  private lampen = LICHT_KLEUREN.map(lampMateriaal);
  private tegels: THREE.InstancedMesh;
  private laatsteStap = -1;
  private bloemen: Bloem[] = [];
  private stelen: THREE.InstancedMesh | null = null;
  private koppen: THREE.InstancedMesh | null = null;
  private harten: THREE.InstancedMesh | null = null;
  private draaitafels: THREE.Mesh[] = [];
  private hulp = new THREE.Object3D();
  private kleur = new THREE.Color();
  private zuinig = false;

  constructor(scene: THREE.Scene, private f: Fysica, opties: { zuinig?: boolean } = {}) {
    this.zuinig = !!opties.zuinig;
    scene.add(this.groep);
    this.bouwSlingers();
    this.tegels = this.bouwDansvloer();
    this.bouwPodium();
    this.bouwBloemen(this.zuinig ? 110 : 300);
  }

  private vast(g: THREE.Object3D, b: number, h: number, d: number, kleur: string, x: number, y: number, z: number) {
    g.add(blokOp(b, h, d, kleur, x, y, z));
    this.f.voegToe(botserUitBlok(x, y + h / 2, z, b, h, d));
  }

  private bouwSlingers() {
    const vast = new THREE.Group();
    const bol = new THREE.SphereGeometry(0.17, 8, 6);
    const perKleur: THREE.Vector3[][] = LICHT_KLEUREN.map(() => []);
    let n = 0;
    for (const z of slingerPlekken()) {
      for (const x of [-3.6, 3.6]) {
        this.vast(vast, 0.18, 4.7, 0.18, '#f6f1ff', x, 0, z);
        vast.add(blokOp(0.34, 0.22, 0.34, '#b57bff', x, 4.7, z));
      }
      for (let i = 0; i <= 10; i++) {
        const x = -3.4 + (6.8 * i) / 10;
        const t = x / 3.4;
        perKleur[n++ % LICHT_KLEUREN.length].push(new THREE.Vector3(x, 4.5 - 0.85 * (1 - t * t), z));
      }
    }
    perKleur.forEach((punten, k) => {
      if (!punten.length) return;
      const mesh = dynamisch(new THREE.InstancedMesh(bol, this.lampen[k], punten.length));
      punten.forEach((p, i) => mesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
      mesh.computeBoundingSphere();
      this.groep.add(mesh);
    });
    voegStatischSamen(vast);
    this.groep.add(vast);
  }

  private bouwDansvloer(): THREE.InstancedMesh {
    const { x, z, b, d } = DANSVLOER;
    const tegels = dynamisch(new THREE.InstancedMesh(new THREE.BoxGeometry(0.96, 0.06, 0.96), new THREE.MeshBasicMaterial({ color: '#ffffff' }), b * d));
    let i = 0;
    for (let ix = 0; ix < b; ix++) {
      for (let iz = 0; iz < d; iz++) {
        tegels.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x - b / 2 + 0.5 + ix, 0.04, z - d / 2 + 0.5 + iz));
        tegels.setColorAt(i, this.kleur.set(LICHT_KLEUREN[(ix + iz) % LICHT_KLEUREN.length]));
        i++;
      }
    }
    tegels.receiveShadow = true;
    this.groep.add(tegels);
    return tegels;
  }

  private bouwPodium() {
    const podium = new THREE.Group();
    podium.position.set(PODIUM.x, 0, PODIUM.z);
    const vast = new THREE.Group();
    podium.add(vast);
    const wx = (lx: number) => PODIUM.x + lx;
    const wz = (lz: number) => PODIUM.z + lz;
    // Het podium zelf: 0,5 m hoog, dus je loopt er gewoon op.
    vast.add(blokOp(6, 0.5, 12, '#3b2a63', 0, 0, 0));
    this.f.voegToe(botserUitBlok(wx(0), 0.25, wz(0), 6, 0.5, 12));
    // Achterwand en stellage
    vast.add(blokOp(0.4, 5.4, 12.4, '#251a40', 3.1, 0, 0));
    this.f.voegToe(botserUitBlok(wx(3.1), 2.7, wz(0), 0.4, 5.4, 12.4));
    for (const lz of [-6.3, 6.3]) {
      vast.add(blokOp(0.35, 6.6, 0.35, '#c9c3dd', -2.6, 0, lz));
      this.f.voegToe(botserUitBlok(wx(-2.6), 3.3, wz(lz), 0.35, 6.6, 0.35));
    }
    vast.add(blokOp(0.4, 0.4, 13, '#c9c3dd', -2.6, 6.6, 0));
    // Sterren op de achterwand
    for (let i = 0; i < 14; i++) {
      const lz = -5.4 + (i % 7) * 1.8;
      const ly = 1.6 + Math.floor(i / 7) * 1.9 + (i % 2) * 0.4;
      const ster = dynamisch(blokOp(0.06, 0.32, 0.32, this.lampen[i % this.lampen.length], 2.88, ly, lz));
      ster.rotation.x = Math.PI / 4;
      podium.add(ster);
      this.dansvloer.voegToe(ster, 'pomp', { fase: i * 0.25, sterkte: 1.4 });
    }
    // Lampen aan de stellage en een lichtrand langs het podium
    for (let i = 0; i < 12; i++) {
      const lamp = dynamisch(blokOp(0.42, 0.42, 0.42, this.lampen[i % this.lampen.length], -2.6, 6.1, -5.5 + i));
      podium.add(lamp);
    }
    for (let i = 0; i < 12; i++) podium.add(dynamisch(blokOp(0.1, 0.12, 0.92, this.lampen[(i + 3) % this.lampen.length], -3.02, 0.2, -5.5 + i, false)));
    // Lichtbundels die heen en weer zwaaien
    const bundelMat = new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    for (const [lz, kleur] of [[-4.5, '#ff7fbf'], [-1.5, '#7fd6ff'], [1.5, '#ffe37f'], [4.5, '#b48cff']] as const) {
      const anker = dynamisch(new THREE.Group());
      anker.position.set(-2.6, 6.3, lz);
      const mat = bundelMat.clone();
      mat.color.set(kleur);
      const bundel = new THREE.Mesh(new THREE.ConeGeometry(1.5, 6.2, 16, 1, true), mat);
      bundel.position.y = -3.1;
      anker.add(bundel);
      anker.rotation.x = lz > 0 ? 0.25 : -0.25;
      podium.add(anker);
      this.dansvloer.voegToe(anker, 'wieg', { fase: lz > 0 ? 0 : 1, sterkte: 2.2 });
    }
    // Luidsprekers (ze veren mee op de boem)
    for (const lz of [-4.6, 4.6]) {
      const kast = dynamisch(new THREE.Group());
      kast.position.set(0.6, 0.5, lz);
      kast.add(blokOp(1.7, 2.8, 1.7, '#1d1830', 0, 0, 0));
      for (const [ly, r] of [[0.75, 0.55], [2.05, 0.35]] as const) {
        const conus = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.08, 20), new THREE.MeshStandardMaterial({ color: '#4a4166', roughness: 0.5 }));
        conus.rotation.z = Math.PI / 2;
        conus.position.set(-0.86, ly, 0);
        kast.add(conus);
      }
      podium.add(kast);
      this.f.voegToe(botserUitBlok(wx(0.6), 1.9, wz(lz), 1.7, 2.8, 1.7));
      this.dansvloer.voegToe(kast, 'veer', { sterkte: 1.3 });
      this.luidsprekers.push(new THREE.Vector3(wx(0.6), 3.6, wz(lz)));
    }
    // De DJ-tafel met twee draaitafels
    const tafel = new THREE.Group();
    tafel.position.set(-0.4, 0.5, 0);
    tafel.add(blokOp(1.3, 1.05, 3.2, '#7046d6', 0, 0, 0));
    tafel.add(blokOp(1.32, 0.12, 3.22, '#ff4f8b', 0, 1.05, 0));
    vast.add(tafel);
    this.f.voegToe(botserUitBlok(wx(-0.4), 1.05, wz(0), 1.3, 1.05, 3.2));
    for (const lz of [-0.8, 0.8]) {
      const plaat = dynamisch(new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.06, 24), new THREE.MeshStandardMaterial({ color: '#15121f', roughness: 0.35 })));
      plaat.position.set(-0.4, 1.7, lz);
      plaat.add(blokOp(0.12, 0.02, 0.5, '#ffe34d', 0, 0.03, 0.12, false));
      podium.add(plaat);
      this.draaitafels.push(plaat);
    }
    // Discobal
    const bal = dynamisch(new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 1), new THREE.MeshStandardMaterial({ color: '#e9e6f5', metalness: 0.9, roughness: 0.15, flatShading: true, emissive: '#3a3150' })));
    bal.position.set(-4.2, 5.4, 0);
    podium.add(bal, blokOp(0.04, 1.2, 0.04, '#c9c3dd', -4.2, 6.0, 0, false));
    vast.add(blokOp(1.8, 0.2, 0.2, '#c9c3dd', -3.5, 6.75, 0));
    this.dansvloer.voegToe(bal, 'draai');
    // Bord
    const bord = tekstBord('🎵 Discopodium 🎵', 7, 1.4, { breedte: 640, achtergrond: '#2b1f4d', rand: '#ff4f8b', kleur: '#ffffff' });
    bord.mesh.position.set(-2.8, 7.6, 0);
    bord.mesh.rotation.y = -Math.PI / 2;
    dynamisch(bord.mesh);
    podium.add(bord.mesh);
    this.dansvloer.voegToe(bord.mesh, 'pomp', { sterkte: 0.4 });
    const uitleg = tekstBord('🎧 Maak je eigen beat!', 3.4, 0.8, { breedte: 512, achtergrond: '#fff9e9', rand: '#7046d6' });
    uitleg.mesh.position.set(-1.1, 2.3, 0);
    uitleg.mesh.rotation.y = -Math.PI / 2;
    dynamisch(uitleg.mesh);
    podium.add(uitleg.mesh);

    this.interacties.push({ id: 'podium-beat', naam: '🎧 Maak je eigen beat', x: wx(-1.6), y: 0.5, z: wz(0), soort: 'actie' });
    this.groep.add(podium);
    voegStatischSamen(vast);
  }

  private bouwBloemen(aantal: number) {
    this.bloemen = bloemPlekken(aantal);
    const n = this.bloemen.length;
    if (!n) return;
    // Twee blaadjes in een kruis: één vorm, één tekenopdracht.
    const blad = new THREE.BoxGeometry(0.75, 0.16, 0.28);
    const samen = mergeGeometries([blad, blad.clone().rotateY(Math.PI / 2)], false)!;
    this.stelen = dynamisch(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: '#3f9a45' }), n));
    this.koppen = dynamisch(new THREE.InstancedMesh(samen, new THREE.MeshLambertMaterial({ color: '#ffffff' }), n));
    this.harten = dynamisch(new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.2, 0.26), new THREE.MeshLambertMaterial({ color: '#ffe066' }), n));
    const kleuren = ['#ff5fa2', '#ff8a3d', '#b57bff', '#4fb8ff', '#ff4f6d', '#ffd23f', '#ffffff', '#5fe0c0'];
    this.bloemen.forEach((_, i) => this.koppen!.setColorAt(i, this.kleur.set(kleuren[i % kleuren.length])));
    for (const m of [this.stelen, this.koppen, this.harten]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.castShadow = false;
      this.groep.add(m);
    }
    this.zetBloemen(0, 0, { x: 0, y: 0, z: 0 }, Infinity);
  }

  private zetBloemen(tel: number, sterkte: number, speler: Vec3, bereik: number) {
    if (!this.stelen || !this.koppen || !this.harten) return;
    const h = this.hulp;
    for (let i = 0; i < this.bloemen.length; i++) {
      const b = this.bloemen[i];
      if (Math.abs(b.x - speler.x) > bereik || Math.abs(b.z - speler.z) > bereik) continue;
      const t = tel + b.fase;
      const zwaai = Math.sin(t * Math.PI) * 0.22 * sterkte;
      const wip = puls(t) * 0.18 * sterkte;
      const hoogte = b.hoogte * b.schaal;
      h.position.set(b.x, b.y, b.z);
      h.rotation.set(0, b.fase * 3, zwaai);
      h.scale.set(1, 1, 1);
      h.updateMatrix();
      const basis = h.matrix.clone();
      h.position.set(0, hoogte / 2, 0);
      h.rotation.set(0, 0, 0);
      h.scale.set(0.12, hoogte + wip, 0.12);
      h.updateMatrix();
      this.stelen.setMatrixAt(i, basis.clone().multiply(h.matrix));
      h.position.set(0, hoogte + wip, 0);
      h.scale.setScalar(b.schaal * (1 + wip * 0.6));
      h.updateMatrix();
      this.koppen.setMatrixAt(i, basis.clone().multiply(h.matrix));
      h.position.y += 0.06 * b.schaal;
      h.updateMatrix();
      this.harten.setMatrixAt(i, basis.clone().multiply(h.matrix));
    }
    this.stelen.instanceMatrix.needsUpdate = true;
    this.koppen.instanceMatrix.needsUpdate = true;
    this.harten.instanceMatrix.needsUpdate = true;
  }

  get aantalBloemen(): number {
    return this.bloemen.length;
  }

  update(dt: number, stap: number, niveau: number, speler: Vec3, rustig: boolean) {
    const tel = stap / 4;
    this.dansvloer.rustig = rustig;
    this.dansvloer.update(tel, niveau);
    this.lampen.forEach((m, k) => {
      m.color.copy(m.userData.kleur as THREE.Color).multiplyScalar(lichtSterkte(k, stap, niveau, rustig));
    });
    for (const plaat of this.draaitafels) plaat.rotation.y += dt * (rustig ? 1 : 3.5);
    const heel = Math.floor(stap);
    if (heel !== this.laatsteStap) {
      this.laatsteStap = heel;
      const { b, d } = DANSVLOER;
      const schuif = rustig ? 0 : niveau >= 3 ? heel : Math.floor(heel / 4);
      let i = 0;
      for (let ix = 0; ix < b; ix++) {
        for (let iz = 0; iz < d; iz++) {
          const k = (ix + iz + schuif) % LICHT_KLEUREN.length;
          const fel = rustig || niveau < 2 ? 0.85 : (ix + iz + Math.floor(heel / 4)) % 2 === 0 ? 1 : 0.55;
          this.tegels.setColorAt(i++, this.kleur.set(LICHT_KLEUREN[k]).multiplyScalar(fel));
        }
      }
      if (this.tegels.instanceColor) this.tegels.instanceColor.needsUpdate = true;
    }
    const sterkte = rustig ? 0.2 : 0.5 + niveau * 0.15;
    this.zetBloemen(tel, sterkte, speler, this.zuinig ? 40 : 70);
  }
}
