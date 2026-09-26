// Glimmende dingen: hoefijzers, een beker, en confetti.

import * as THREE from 'three';

const goud = new THREE.MeshStandardMaterial({
  color: '#ffc933',
  metalness: 0.55,
  roughness: 0.3,
  emissive: '#6b4a00',
  emissiveIntensity: 0.35,
});

/** Een gouden hoefijzer (open kant naar boven). */
export function hoefijzer(grootte = 1): THREE.Mesh {
  const buiten = 0.5 * grootte;
  const binnen = 0.3 * grootte;
  const van = -0.15 * Math.PI;
  const tot = 1.15 * Math.PI;
  const vorm = new THREE.Shape();
  vorm.absarc(0, 0, buiten, van, tot, false);
  vorm.absarc(0, 0, binnen, tot, van, true);
  vorm.closePath();
  const geo = new THREE.ExtrudeGeometry(vorm, { depth: 0.14 * grootte, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
  geo.center();
  geo.rotateZ(Math.PI); // open kant naar boven, zoals een gelukshoefijzer
  const mesh = new THREE.Mesh(geo, goud);
  mesh.castShadow = true;
  return mesh;
}

/** Een gouden beker voor de finish. */
export function beker(): THREE.Group {
  const g = new THREE.Group();
  const voet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), goud);
  voet.position.y = 0.15;
  const steel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.7, 12), goud);
  steel.position.y = 0.65;
  const kom = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.35, 1.1, 20, 1, true), goud);
  kom.position.y = 1.55;
  const bodem = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 20), goud);
  bodem.position.y = 1.0;
  g.add(voet, steel, kom, bodem);
  for (const x of [-0.8, 0.8]) {
    const oor = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.07, 8, 16), goud);
    oor.position.set(x, 1.6, 0);
    g.add(oor);
  }
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return g;
}

interface Deeltje {
  mesh: THREE.Object3D;
  snelheid: THREE.Vector3;
  leeftijd: number;
  levensduur: number;
  draai: THREE.Vector3;
  /** Zweeft omhoog in plaats van te vallen (hartjes). */
  zweef?: boolean;
}

const deeltjeGeo = new THREE.BoxGeometry(1, 1, 1);

function hartjesMateriaal(): THREE.SpriteMaterial {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ff4f8b';
  ctx.beginPath();
  ctx.moveTo(32, 56);
  ctx.bezierCurveTo(4, 36, 4, 10, 20, 10);
  ctx.bezierCurveTo(28, 10, 32, 16, 32, 20);
  ctx.bezierCurveTo(32, 16, 36, 10, 44, 10);
  ctx.bezierCurveTo(60, 10, 60, 36, 32, 56);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.SpriteMaterial({ map: t, depthWrite: false });
}

/** Confetti, plonsjes en sterretjes. */
export class Effecten {
  private deeltjes: Deeltje[] = [];
  private materialen = new Map<string, THREE.MeshBasicMaterial>();
  private hartMat: THREE.SpriteMaterial | null = null;

  constructor(private scene: THREE.Scene) {}

  private mat(kleur: string) {
    let m = this.materialen.get(kleur);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color: kleur, transparent: true });
      this.materialen.set(kleur, m);
    }
    return m;
  }

  private spuit(pos: THREE.Vector3, aantal: number, kleuren: string[], kracht: number, omhoog: number, grootte: number, levensduur: number) {
    for (let i = 0; i < aantal; i++) {
      const mesh = new THREE.Mesh(deeltjeGeo, this.mat(kleuren[i % kleuren.length]));
      const s = grootte * (0.6 + Math.random() * 0.8);
      mesh.scale.set(s, s * 0.4, s);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      const hoek = Math.random() * Math.PI * 2;
      const k = kracht * (0.4 + Math.random() * 0.6);
      this.deeltjes.push({
        mesh,
        snelheid: new THREE.Vector3(Math.cos(hoek) * k, omhoog * (0.6 + Math.random() * 0.6), Math.sin(hoek) * k),
        leeftijd: 0,
        levensduur: levensduur * (0.7 + Math.random() * 0.5),
        draai: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
      });
    }
  }

  confetti(pos: THREE.Vector3) {
    this.spuit(pos, 60, ['#ff6f91', '#ffc75f', '#4fc3f7', '#9ccc65', '#ba68c8', '#ffffff'], 5, 9, 0.18, 1.8);
  }

  plons(pos: THREE.Vector3) {
    this.spuit(pos, 30, ['#bfe9ff', '#ffffff', '#7fd0ff'], 3, 7, 0.2, 0.9);
  }

  hooi(pos: THREE.Vector3) {
    this.spuit(pos, 26, ['#f2d15c', '#e9c46a', '#d4a72c'], 3, 5, 0.16, 1.0);
  }

  goudregen(pos: THREE.Vector3) {
    this.spuit(pos, 50, ['#ffd23f', '#fff1a8', '#ffb300', '#ffffff'], 4, 8, 0.16, 1.5);
  }

  /** Regenboogspoor achter de speler. */
  spoor(pos: THREE.Vector3) {
    const kleuren = ['#ff4d4d', '#ff9a3d', '#ffd93d', '#5cd65c', '#4da6ff', '#7a5cff'];
    this.spuit(pos, 2, [kleuren[Math.floor(Math.random() * kleuren.length)]], 0.6, 1.2, 0.18, 0.7);
  }

  hartjes(pos: THREE.Vector3, aantal = 5) {
    this.hartMat ??= hartjesMateriaal();
    for (let i = 0; i < aantal; i++) {
      const sprite = new THREE.Sprite(this.hartMat);
      const s = 0.35 + Math.random() * 0.25;
      sprite.scale.set(s, s, s);
      sprite.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.3, (Math.random() - 0.5) * 0.8));
      this.scene.add(sprite);
      this.deeltjes.push({
        mesh: sprite,
        snelheid: new THREE.Vector3((Math.random() - 0.5) * 0.8, 2.2 + Math.random(), (Math.random() - 0.5) * 0.8),
        leeftijd: 0,
        levensduur: 1.1 + Math.random() * 0.4,
        draai: new THREE.Vector3(),
        zweef: true,
      });
    }
  }

  update(dt: number) {
    for (let i = this.deeltjes.length - 1; i >= 0; i--) {
      const d = this.deeltjes[i];
      d.leeftijd += dt;
      d.snelheid.y -= (d.zweef ? 0 : 14) * dt;
      d.snelheid.multiplyScalar(1 - dt * 0.8);
      d.mesh.position.addScaledVector(d.snelheid, dt);
      d.mesh.rotation.x += d.draai.x * dt;
      d.mesh.rotation.y += d.draai.y * dt;
      d.mesh.rotation.z += d.draai.z * dt;
      if (d.leeftijd > d.levensduur) {
        this.scene.remove(d.mesh);
        this.deeltjes.splice(i, 1);
      }
    }
  }
}
