// Het blokjespoppetje van de speler, in Roblox-stijl.

import * as THREE from 'three';
import { blok } from '../wereld/bouwstenen';

export interface AvatarKleuren {
  huid: string;
  haar: string;
  shirt: string;
  broek: string;
  schoenen: string;
}

export const STANDAARD_AVATAR: AvatarKleuren = {
  huid: '#f1c7a1',
  haar: '#6b3e1e',
  shirt: '#a35be0',
  broek: '#35508c',
  schoenen: '#f5f5f5',
};

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

export class Avatar {
  readonly groep = new THREE.Group();
  private linkerBeen = new THREE.Group();
  private rechterBeen = new THREE.Group();
  private linkerArm = new THREE.Group();
  private rechterArm = new THREE.Group();
  private fase = 0;

  constructor(k: AvatarKleuren = STANDAARD_AVATAR) {
    const g = this.groep;

    // Benen (draaipunt bij de heup)
    for (const [been, x] of [[this.linkerBeen, -0.24], [this.rechterBeen, 0.24]] as const) {
      been.position.set(x, 0.9, 0);
      been.add(blok(0.46, 0.75, 0.48, k.broek, 0, -0.375, 0));
      been.add(blok(0.48, 0.16, 0.54, k.schoenen, 0, -0.82, 0.02));
      g.add(been);
    }

    // Romp
    g.add(blok(0.96, 0.95, 0.5, k.shirt, 0, 1.375, 0));

    // Armen (draaipunt bij de schouder)
    for (const [arm, x] of [[this.linkerArm, -0.7], [this.rechterArm, 0.7]] as const) {
      arm.position.set(x, 1.78, 0);
      arm.add(blok(0.42, 0.45, 0.46, k.shirt, 0, -0.2, 0));
      arm.add(blok(0.4, 0.5, 0.44, k.huid, 0, -0.66, 0));
      g.add(arm);
    }

    // Hoofd met gezicht
    const hoofd = blok(0.62, 0.6, 0.6, k.huid, 0, 2.16, 0);
    g.add(hoofd);
    const gezicht = new THREE.Mesh(
      new THREE.PlaneGeometry(0.58, 0.58),
      new THREE.MeshBasicMaterial({ map: gezichtTextuur(), transparent: true }),
    );
    gezicht.position.set(0, 2.14, 0.305);
    g.add(gezicht);

    // Haar met paardenstaart
    g.add(blok(0.68, 0.2, 0.66, k.haar, 0, 2.5, -0.01));
    g.add(blok(0.68, 0.55, 0.16, k.haar, 0, 2.2, -0.3));
    g.add(blok(0.12, 0.4, 0.62, k.haar, -0.33, 2.28, -0.02));
    g.add(blok(0.12, 0.4, 0.62, k.haar, 0.33, 2.28, -0.02));
    g.add(blok(0.22, 0.5, 0.2, k.haar, 0, 2.2, -0.45));
    g.add(blok(0.24, 0.12, 0.24, '#ff5fa2', 0, 2.42, -0.42)); // haarelastiekje
  }

  /** Waar een hoedje of kroontje op het hoofd komt. */
  readonly hoofdAnker = new THREE.Vector3(0, 2.58, 0);

  /**
   * Loop-, spring- en dansanimatie. `tempo` is 0 (stil) tot 1 (rennen).
   * Geeft terug hoeveel het poppetje omhoog wipt (bij het dansen).
   */
  animeer(dt: number, tempo: number, inDeLucht: boolean, dansen = false): number {
    if (dansen) {
      this.fase += dt * 7;
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
}
