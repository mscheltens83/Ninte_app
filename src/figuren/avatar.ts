// Het blokjespoppetje van de speler, in Roblox-stijl. Met kledingkast:
// kapsels, kleuren, hoeden en extra's (cape, vleugels, ...).

import * as THREE from 'three';
import { blok } from '../wereld/bouwstenen';
import { STANDAARD_UITERLIJK, type Uiterlijk } from './uiterlijk';

function gezichtTextuur(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#2b2340';
  ctx.beginPath();
  ctx.ellipse(42, 54, 9, 13, 0, 0, Math.PI * 2);
  ctx.ellipse(86, 54, 9, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(45, 49, 3.5, 0, Math.PI * 2);
  ctx.arc(89, 49, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2340';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(64, 78, 18, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,140,0.45)';
  ctx.beginPath();
  ctx.ellipse(28, 80, 9, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(100, 80, 9, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let gezicht: THREE.MeshBasicMaterial | null = null;

export class Avatar {
  readonly groep = new THREE.Group();
  /** Waar een hoedje of kroontje op het hoofd komt. */
  readonly hoofdAnker = new THREE.Vector3(0, 2.58, 0);
  /** Een hoedje van het seizoen (kerstmuts, kroontje), als er geen andere hoed op is. */
  seizoenHoed: THREE.Object3D | null = null;
  uiterlijk: Uiterlijk;

  private linkerBeen = new THREE.Group();
  private rechterBeen = new THREE.Group();
  private linkerArm = new THREE.Group();
  private rechterArm = new THREE.Group();
  private flapper: THREE.Group | null = null; // cape of vleugels
  private fase = 0;
  private tijd = 0;
  /** Zit ze op een rijdier? Dan zit ze in het zadel. */
  rijdt = false;

  constructor(uiterlijk: Uiterlijk = STANDAARD_UITERLIJK) {
    this.uiterlijk = { ...uiterlijk };
    this.kleed(this.uiterlijk);
  }

  /** Het poppetje (opnieuw) opbouwen met dit uiterlijk. */
  kleed(u: Uiterlijk) {
    this.uiterlijk = { ...u };
    const g = this.groep;
    g.clear();
    this.linkerBeen = new THREE.Group();
    this.rechterBeen = new THREE.Group();
    this.linkerArm = new THREE.Group();
    this.rechterArm = new THREE.Group();
    this.flapper = null;

    // Benen (draaipunt bij de heup)
    for (const [been, x] of [[this.linkerBeen, -0.24], [this.rechterBeen, 0.24]] as const) {
      been.position.set(x, 0.9, 0);
      been.add(blok(0.46, 0.75, 0.48, u.broek, 0, -0.375, 0));
      been.add(blok(0.48, 0.16, 0.54, u.schoenen, 0, -0.82, 0.02));
      g.add(been);
    }
    g.add(blok(0.96, 0.95, 0.5, u.shirt, 0, 1.375, 0));
    for (const [arm, x] of [[this.linkerArm, -0.7], [this.rechterArm, 0.7]] as const) {
      arm.position.set(x, 1.78, 0);
      arm.add(blok(0.42, 0.45, 0.46, u.shirt, 0, -0.2, 0));
      arm.add(blok(0.4, 0.5, 0.44, u.huid, 0, -0.66, 0));
      g.add(arm);
    }

    // Hoofd met gezicht
    g.add(blok(0.62, 0.6, 0.6, u.huid, 0, 2.16, 0));
    gezicht ??= new THREE.MeshBasicMaterial({ map: gezichtTextuur(), transparent: true });
    const vlak = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.58), gezicht);
    vlak.position.set(0, 2.14, 0.305);
    g.add(vlak);

    this.bouwKapsel(u);
    this.bouwHoed(u);
    this.bouwExtra(u);
    if (u.hoed === 'geen' && this.seizoenHoed) {
      this.seizoenHoed.position.copy(this.hoofdAnker);
      g.add(this.seizoenHoed);
    }
  }

  private bouwKapsel(u: Uiterlijk) {
    const g = this.groep;
    const h = u.haar;
    // Basis: bovenkant, achterkant en zijkanten
    g.add(blok(0.68, 0.2, 0.66, h, 0, 2.5, -0.01));
    const kort = u.kapsel === 'kort';
    g.add(blok(0.68, kort ? 0.35 : 0.55, 0.16, h, 0, kort ? 2.32 : 2.2, -0.3));
    if (!kort) {
      g.add(blok(0.12, 0.4, 0.62, h, -0.33, 2.28, -0.02));
      g.add(blok(0.12, 0.4, 0.62, h, 0.33, 2.28, -0.02));
    }
    switch (u.kapsel) {
      case 'staart':
        g.add(blok(0.22, 0.5, 0.2, h, 0, 2.2, -0.45));
        g.add(blok(0.24, 0.12, 0.24, '#ff5fa2', 0, 2.42, -0.42)); // haarelastiekje
        break;
      case 'lang':
        g.add(blok(0.72, 0.85, 0.18, h, 0, 1.85, -0.33));
        g.add(blok(0.14, 0.7, 0.3, h, -0.35, 1.95, -0.12));
        g.add(blok(0.14, 0.7, 0.3, h, 0.35, 1.95, -0.12));
        break;
      case 'vlechten':
        for (const x of [-0.26, 0.26]) {
          g.add(blok(0.16, 0.75, 0.16, h, x, 1.85, -0.34));
          g.add(blok(0.18, 0.1, 0.18, '#ff5fa2', x, 1.45, -0.34));
        }
        break;
      case 'knot':
        g.add(blok(0.34, 0.28, 0.34, h, 0, 2.72, -0.08));
        g.add(blok(0.36, 0.08, 0.36, '#ff5fa2', 0, 2.6, -0.08));
        break;
      case 'kort':
        break;
    }
  }

  private bouwHoed(u: Uiterlijk) {
    const g = this.groep;
    const y = this.hoofdAnker.y;
    switch (u.hoed) {
      case 'strik': {
        g.add(blok(0.2, 0.2, 0.14, '#ff4f8b', 0.28, y + 0.02, 0.05));
        const links = blok(0.24, 0.2, 0.1, '#ff6fa2', 0.15, y + 0.04, 0.05);
        links.rotation.z = 0.5;
        const rechts = blok(0.24, 0.2, 0.1, '#ff6fa2', 0.41, y + 0.04, 0.05);
        rechts.rotation.z = -0.5;
        g.add(links, rechts);
        break;
      }
      case 'bloemen': {
        const kleuren = ['#ff6fa8', '#ffd23f', '#ffffff', '#b57bff', '#ff8a3d'];
        for (let i = 0; i < 10; i++) {
          const hoek = (i / 10) * Math.PI * 2;
          g.add(blok(0.14, 0.12, 0.14, kleuren[i % kleuren.length], Math.sin(hoek) * 0.36, y - 0.02, Math.cos(hoek) * 0.35));
        }
        break;
      }
      case 'oren':
        for (const x of [-0.17, 0.17]) {
          g.add(blok(0.13, 0.55, 0.07, '#ffffff', x, y + 0.3, 0));
          g.add(blok(0.07, 0.4, 0.02, '#ffb3c7', x, y + 0.3, 0.045));
        }
        break;
      case 'rijcap':
        g.add(blok(0.72, 0.28, 0.72, '#2b2340', 0, y + 0.05, -0.02));
        g.add(blok(0.56, 0.05, 0.26, '#2b2340', 0, y - 0.05, 0.44));
        g.add(blok(0.1, 0.1, 0.1, '#6b6480', 0, y + 0.22, -0.02));
        break;
      case 'cowboy':
        g.add(blok(1.15, 0.06, 1.15, '#a0703d', 0, y, 0));
        g.add(blok(0.66, 0.36, 0.64, '#a0703d', 0, y + 0.2, 0));
        g.add(blok(0.68, 0.08, 0.66, '#5b3a2e', 0, y + 0.08, 0));
        break;
      case 'kroon': {
        const goud = new THREE.MeshStandardMaterial({ color: '#ffc933', metalness: 0.55, roughness: 0.3, emissive: '#6b4a00', emissiveIntensity: 0.3 });
        g.add(blok(0.66, 0.16, 0.66, goud, 0, y + 0.02, 0));
        for (const [x, z] of [[-0.27, -0.27], [0.27, -0.27], [-0.27, 0.27], [0.27, 0.27], [0, 0.3], [0, -0.3], [0.3, 0], [-0.3, 0]]) {
          g.add(blok(0.1, 0.22, 0.1, goud, x, y + 0.2, z));
        }
        g.add(blok(0.1, 0.1, 0.04, '#ff4f8b', 0, y + 0.03, 0.34));
        break;
      }
      case 'hoorn': {
        const parel = new THREE.MeshStandardMaterial({ color: '#fff6d6', emissive: '#ffd6f5', emissiveIntensity: 0.5, roughness: 0.3 });
        const hoorn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.55, 10), parel);
        hoorn.position.set(0, y + 0.18, 0.12);
        hoorn.rotation.x = 0.35;
        g.add(hoorn);
        break;
      }
      case 'bouwhelm':
        // Een gele bouwhelm met een klep, zoals die van Bas
        g.add(blok(0.72, 0.26, 0.72, '#ffd23f', 0, y + 0.08, 0));
        g.add(blok(0.78, 0.05, 0.86, '#ffd23f', 0, y - 0.04, 0.06));
        g.add(blok(0.1, 0.3, 0.74, '#ffb000', 0, y + 0.1, 0));
        break;
      case 'koptelefoon': {
        // Een regenboog-koptelefoon voor echte DJ's
        g.add(blok(0.84, 0.1, 0.14, '#2b2340', 0, y + 0.06, 0));
        for (const kant of [-1, 1]) {
          g.add(blok(0.08, 0.32, 0.12, '#2b2340', kant * 0.4, y - 0.1, 0));
          g.add(blok(0.14, 0.32, 0.32, '#ff4f8b', kant * 0.43, y - 0.36, 0));
          g.add(blok(0.06, 0.18, 0.18, '#ffe34d', kant * 0.51, y - 0.36, 0));
        }
        break;
      }
      case 'geen':
        break;
    }
  }

  private bouwExtra(u: Uiterlijk) {
    const g = this.groep;
    switch (u.extra) {
      case 'rugzak':
        g.add(blok(0.62, 0.62, 0.26, '#ff8a3d', 0, 1.42, -0.38));
        g.add(blok(0.4, 0.2, 0.06, '#ffc75f', 0, 1.3, -0.52));
        break;
      case 'zonnebril':
        g.add(blok(0.22, 0.14, 0.04, '#1b1b24', -0.15, 2.2, 0.32));
        g.add(blok(0.22, 0.14, 0.04, '#1b1b24', 0.15, 2.2, 0.32));
        g.add(blok(0.66, 0.04, 0.04, '#1b1b24', 0, 2.25, 0.32));
        break;
      case 'cape': {
        const cape = new THREE.Group();
        cape.position.set(0, 1.82, -0.28);
        cape.add(blok(0.92, 1.25, 0.05, '#d62839', 0, -0.62, 0));
        cape.add(blok(0.96, 0.1, 0.1, '#ffc933', 0, 0, 0.03));
        g.add(cape);
        this.flapper = cape;
        break;
      }
      case 'vleugels': {
        const vleugels = new THREE.Group();
        vleugels.position.set(0, 1.6, -0.3);
        const veer = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#dff3ff', emissiveIntensity: 0.4, transparent: true, opacity: 0.92 });
        for (const kant of [-1, 1]) {
          const v = new THREE.Group();
          v.add(blok(0.9, 0.55, 0.05, veer, kant * 0.5, 0.15, 0));
          v.add(blok(0.6, 0.35, 0.05, veer, kant * 0.45, -0.25, 0));
          v.rotation.y = kant * 0.35;
          v.userData.kant = kant;
          vleugels.add(v);
        }
        g.add(vleugels);
        this.flapper = vleugels;
        break;
      }
      case 'geen':
        break;
    }
  }

  /**
   * Loop-, spring- en dansanimatie. `tempo` is 0 (stil) tot 1 (rennen).
   * Geeft terug hoeveel het poppetje omhoog wipt (bij het dansen).
   */
  animeer(dt: number, tempo: number, inDeLucht: boolean, dansen = false, tel?: number): number {
    this.tijd += dt;
    this.animeerFlapper(tempo, inDeLucht);
    if (this.rijdt) {
      // In het zadel: benen naar voren en wijd, handen aan de teugels.
      this.linkerBeen.rotation.set(-1.35, 0, -0.32);
      this.rechterBeen.rotation.set(-1.35, 0, 0.32);
      this.linkerArm.rotation.set(-0.75, 0, 0);
      this.rechterArm.rotation.set(-0.75, 0, 0);
      return 0;
    }
    this.linkerBeen.rotation.z = 0;
    this.rechterBeen.rotation.z = 0;
    if (dansen) {
      // Met een tel van de muziek danst ze precies op de maat: elke tel een wip.
      this.fase = tel === undefined ? this.fase + dt * 7 : (tel + 0.5) * Math.PI;
      const f = this.fase;
      this.linkerArm.rotation.x = -2.7 + Math.sin(f) * 0.35;
      this.rechterArm.rotation.x = -2.7 - Math.sin(f) * 0.35;
      this.linkerArm.rotation.z = -0.3 + Math.sin(f * 2) * 0.25;
      this.rechterArm.rotation.z = 0.3 + Math.sin(f * 2) * 0.25;
      this.linkerBeen.rotation.x = Math.max(0, Math.sin(f)) * -0.6;
      this.rechterBeen.rotation.x = Math.max(0, -Math.sin(f)) * -0.6;
      return Math.abs(Math.sin(f)) * 0.3;
    }
    this.linkerArm.rotation.z = 0;
    this.rechterArm.rotation.z = 0;
    this.fase += dt * 11 * Math.max(tempo, 0.001);
    const zwaai = inDeLucht ? 0.35 : Math.sin(this.fase) * 0.75 * tempo;
    this.linkerBeen.rotation.x = zwaai;
    this.rechterBeen.rotation.x = -zwaai;
    if (inDeLucht) {
      this.linkerArm.rotation.x = -2.6;
      this.rechterArm.rotation.x = -2.6;
    } else {
      this.linkerArm.rotation.x = -zwaai;
      this.rechterArm.rotation.x = zwaai;
    }
    return 0;
  }

  /** Cape wappert als je rent; vleugels klapperen (sneller in de lucht). */
  private animeerFlapper(tempo: number, inDeLucht: boolean) {
    const f = this.flapper;
    if (!f) return;
    if (this.uiterlijk.extra === 'cape') {
      f.rotation.x = -0.1 - tempo * 0.7 - (inDeLucht ? 0.4 : 0) + Math.sin(this.tijd * 12) * 0.06 * (tempo + 0.2);
    } else {
      const snelheid = inDeLucht ? 16 : 3;
      for (const v of f.children) {
        v.rotation.y = (v.userData.kant as number) * (0.35 + Math.sin(this.tijd * snelheid) * (inDeLucht ? 0.45 : 0.12));
      }
    }
  }
}
