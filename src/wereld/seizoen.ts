// Verrassingen die alleen op bepaalde dagen in het jaar te zien zijn.

import * as THREE from 'three';
import { blok, blokOp } from './bouwstenen';

export type Seizoen = 'winter' | 'koningsdag' | 'halloween';

export function seizoenOp(datum: Date): Seizoen | null {
  const maand = datum.getMonth() + 1;
  const dag = datum.getDate();
  if (maand === 12 || (maand === 1 && dag <= 6)) return 'winter';
  if (maand === 4 && (dag === 26 || dag === 27)) return 'koningsdag';
  if (maand === 10 && dag >= 25) return 'halloween';
  return null;
}

/** Een kerstmuts, met de onderkant op y = 0. */
export function kerstmuts(schaal = 1): THREE.Group {
  const g = new THREE.Group();
  const rood = new THREE.MeshStandardMaterial({ color: '#d62839', roughness: 0.8 });
  const wit = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
  const punt = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.7, 12), rood);
  punt.position.set(0, 0.42, -0.06);
  punt.rotation.x = -0.35;
  const rand = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.14, 16), wit);
  rand.position.y = 0.07;
  const bol = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), wit);
  bol.position.set(0, 0.74, -0.3);
  g.add(punt, rand, bol);
  g.scale.setScalar(schaal);
  return g;
}

/** Een oranje kroontje voor Koningsdag. */
export function kroontje(schaal = 1): THREE.Group {
  const g = new THREE.Group();
  const oranje = new THREE.MeshStandardMaterial({ color: '#ff7a00', roughness: 0.4, metalness: 0.3 });
  g.add(blok(0.66, 0.16, 0.66, oranje, 0, 0.08, 0));
  for (const [x, z] of [[-0.27, -0.27], [0.27, -0.27], [-0.27, 0.27], [0.27, 0.27], [0, 0.3], [0, -0.3]]) {
    g.add(blok(0.12, 0.2, 0.12, oranje, x, 0.26, z));
  }
  g.scale.setScalar(schaal);
  return g;
}

function pompoen(): THREE.Group {
  const g = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f07f1a';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(30, 55); ctx.lineTo(50, 35); ctx.lineTo(55, 60); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(98, 55); ctx.lineTo(78, 35); ctx.lineTo(73, 60); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(28, 78); ctx.lineTo(100, 78); ctx.lineTo(90, 100); ctx.lineTo(38, 100); ctx.fill();
  const gezicht = new THREE.CanvasTexture(c);
  gezicht.colorSpace = THREE.SRGBColorSpace;
  const oranje = new THREE.MeshStandardMaterial({ color: '#f07f1a', roughness: 0.7 });
  const voor = new THREE.MeshStandardMaterial({ map: gezicht, emissive: '#ff9a2e', emissiveMap: gezicht, emissiveIntensity: 0.35 });
  const lijf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), [oranje, oranje, oranje, oranje, voor, oranje]);
  lijf.position.y = 0.35;
  lijf.castShadow = true;
  g.add(lijf, blokOp(0.12, 0.25, 0.12, '#4f7d2b', 0, 0.7, 0));
  return g;
}

function vlaggetjes(van: THREE.Vector3, naar: THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  const kleuren = ['#ae1c28', '#ffffff', '#21468b', '#ff7a00'];
  const n = Math.round(van.distanceTo(naar) / 0.7);
  const vorm = new THREE.Shape();
  vorm.moveTo(-0.22, 0);
  vorm.lineTo(0.22, 0);
  vorm.lineTo(0, -0.45);
  vorm.closePath();
  const geo = new THREE.ShapeGeometry(vorm);
  const hoek = Math.atan2(naar.x - van.x, naar.z - van.z) - Math.PI / 2;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = van.clone().lerp(naar, t);
    p.y -= Math.sin(t * Math.PI) * 0.6; // doorhangend touwtje
    const vlag = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: kleuren[i % kleuren.length], side: THREE.DoubleSide }));
    vlag.position.copy(p);
    vlag.rotation.y = hoek;
    g.add(vlag);
  }
  return g;
}

/** Sneeuwvlokjes rond de camera. */
class Sneeuw {
  readonly punten: THREE.Points;
  private posities: Float32Array;
  private readonly aantal = 900;

  constructor() {
    this.posities = new Float32Array(this.aantal * 3);
    for (let i = 0; i < this.aantal; i++) {
      this.posities[i * 3] = (Math.random() - 0.5) * 70;
      this.posities[i * 3 + 1] = Math.random() * 35;
      this.posities[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.posities, 3));
    this.punten = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.22, transparent: true, opacity: 0.9 }));
    this.punten.frustumCulled = false;
  }

  update(dt: number, rond: THREE.Vector3, tijd: number) {
    const p = this.posities;
    for (let i = 0; i < this.aantal; i++) {
      p[i * 3 + 1] -= dt * (1.6 + (i % 5) * 0.25);
      p[i * 3] += Math.sin(tijd + i) * dt * 0.3;
      if (p[i * 3 + 1] < -2) p[i * 3 + 1] += 35;
    }
    this.punten.position.set(rond.x, rond.y - 8, rond.z);
    this.punten.geometry.attributes.position.needsUpdate = true;
  }
}

export interface SeizoenVersiering {
  seizoen: Seizoen;
  update(dt: number, camera: THREE.Vector3, tijd: number): void;
}

/** Bouwt de versiering voor dit seizoen; hoedjes voor de figuren doet het spel zelf. */
export function bouwSeizoen(scene: THREE.Scene, seizoen: Seizoen): SeizoenVersiering {
  let sneeuw: Sneeuw | null = null;
  if (seizoen === 'winter') {
    sneeuw = new Sneeuw();
    scene.add(sneeuw.punten);
  } else if (seizoen === 'koningsdag') {
    scene.add(vlaggetjes(new THREE.Vector3(-2.2, 4.3, 3), new THREE.Vector3(-14.8, 4.2, -2)));
    scene.add(vlaggetjes(new THREE.Vector3(2.2, 4.3, 3), new THREE.Vector3(28, 4.5, 5)));
  } else if (seizoen === 'halloween') {
    for (const [x, z] of [[-2.5, 13], [2.5, 13], [-7.5, 2], [-7.5, -4], [12, 9.5], [20, 5.5], [-13, -4]]) {
      const p = pompoen();
      p.position.set(x, 0, z);
      p.rotation.y = Math.atan2(-x, 10 - z);
      scene.add(p);
    }
  }
  return {
    seizoen,
    update(dt, camera, tijd) {
      sneeuw?.update(dt, camera, tijd);
    },
  };
}

/** Een kort bericht voor het seizoen. */
export function seizoenGroet(seizoen: Seizoen, naam: string): string {
  switch (seizoen) {
    case 'winter':
      return `Het sneeuwt in Nintes Wereld! Fijne feestdagen, ${naam}!`;
    case 'koningsdag':
      return `Fijne Koningsdag, ${naam}! Alles is oranje!`;
    case 'halloween':
      return `Boe! Het is Halloween in Nintes Wereld!`;
  }
}
