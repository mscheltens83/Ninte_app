// Glimmende dingen: hoefijzers, een beker, en alle effecten (confetti,
// vuurwerk, stofwolkjes, hartjes, ...).

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

const MAX_DEELTJES = 2500;

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

interface SpuitOpties {
  aantal: number;
  kleuren: string[];
  /** Hoe hard de deeltjes opzij vliegen. */
  kracht: number;
  /** Hoe hard ze omhoog gaan. */
  omhoog: number;
  grootte: number;
  duur: number;
  zwaartekracht?: number;
  /** Alle kanten op (bol) in plaats van vooral omhoog (fontein). */
  bol?: boolean;
  /** Plat, zoals glitters op het water. */
  plat?: boolean;
}

interface Zweefding {
  obj: THREE.Object3D;
  snelheid: THREE.Vector3;
  leeftijd: number;
  duur: number;
  groei?: number;
}

/**
 * Alle deeltjes-effecten. De blokjes delen één InstancedMesh: één
 * tekenopdracht voor duizenden deeltjes, zodat het op de iPad soepel blijft.
 */
export class Effecten {
  rustig = false;
  zuinig = false;
  private mesh: THREE.InstancedMesh;
  private pos = new Float32Array(MAX_DEELTJES * 3);
  private vel = new Float32Array(MAX_DEELTJES * 3);
  private rot = new Float32Array(MAX_DEELTJES * 3);
  private draai = new Float32Array(MAX_DEELTJES * 3);
  private leeftijd = new Float32Array(MAX_DEELTJES);
  private duur = new Float32Array(MAX_DEELTJES);
  private grootte = new Float32Array(MAX_DEELTJES);
  private zwaar = new Float32Array(MAX_DEELTJES);
  private plat = new Uint8Array(MAX_DEELTJES);
  private volgende = 0;
  private hulp = new THREE.Object3D();
  private kleur = new THREE.Color();
  private zwevers: Zweefding[] = [];
  private hartMat: THREE.SpriteMaterial | null = null;
  private wachtrij: { over: number; actie: () => void }[] = [];

  constructor(private scene: THREE.Scene) {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), MAX_DEELTJES);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    const nul = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < MAX_DEELTJES; i++) {
      this.mesh.setMatrixAt(i, nul);
      this.mesh.setColorAt(i, this.kleur.set('#ffffff'));
    }
    scene.add(this.mesh);
  }

  private spuit(p: THREE.Vector3, o: SpuitOpties) {
    if (this.rustig) return;
    const aantal = this.zuinig ? Math.ceil(o.aantal / 4) : o.aantal;
    for (let n = 0; n < aantal; n++) {
      const i = this.volgende;
      this.volgende = (this.volgende + 1) % MAX_DEELTJES;
      const i3 = i * 3;
      this.pos[i3] = p.x;
      this.pos[i3 + 1] = p.y;
      this.pos[i3 + 2] = p.z;
      if (o.bol) {
        // Gelijkmatig over een bol verdeeld
        const u = Math.random() * 2 - 1;
        const hoek = Math.random() * Math.PI * 2;
        const r = Math.sqrt(1 - u * u);
        const k = o.kracht * (0.75 + Math.random() * 0.25);
        this.vel[i3] = r * Math.cos(hoek) * k;
        this.vel[i3 + 1] = u * k + o.omhoog;
        this.vel[i3 + 2] = r * Math.sin(hoek) * k;
      } else {
        const hoek = Math.random() * Math.PI * 2;
        const k = o.kracht * (0.4 + Math.random() * 0.6);
        this.vel[i3] = Math.cos(hoek) * k;
        this.vel[i3 + 1] = o.omhoog * (0.6 + Math.random() * 0.6);
        this.vel[i3 + 2] = Math.sin(hoek) * k;
      }
      for (let a = 0; a < 3; a++) {
        this.rot[i3 + a] = Math.random() * 6;
        this.draai[i3 + a] = (Math.random() - 0.5) * 16;
      }
      this.leeftijd[i] = 0;
      this.duur[i] = o.duur * (0.7 + Math.random() * 0.5);
      this.grootte[i] = o.grootte * (0.6 + Math.random() * 0.8);
      this.zwaar[i] = o.zwaartekracht ?? 14;
      this.plat[i] = o.plat ? 1 : 0;
      this.mesh.setColorAt(i, this.kleur.set(o.kleuren[n % o.kleuren.length]));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /** Iets later laten gebeuren (voor vuurwerk). */
  private straks(over: number, actie: () => void) {
    this.wachtrij.push({ over, actie });
  }

  confetti(pos: THREE.Vector3) {
    this.spuit(pos, { aantal: 70, kleuren: ['#ff6f91', '#ffc75f', '#4fc3f7', '#9ccc65', '#ba68c8', '#ffffff'], kracht: 5, omhoog: 9, grootte: 0.18, duur: 1.8 });
  }

  plons(pos: THREE.Vector3) {
    this.spuit(pos, { aantal: 36, kleuren: ['#bfe9ff', '#ffffff', '#7fd0ff'], kracht: 3, omhoog: 7, grootte: 0.2, duur: 0.9 });
    this.ring(pos, '#ffffff', 2.5);
  }

  hooi(pos: THREE.Vector3) {
    this.spuit(pos, { aantal: 30, kleuren: ['#f2d15c', '#e9c46a', '#d4a72c'], kracht: 3, omhoog: 5, grootte: 0.16, duur: 1.0 });
  }

  goudregen(pos: THREE.Vector3) {
    this.spuit(pos, { aantal: 60, kleuren: ['#ffd23f', '#fff1a8', '#ffb300', '#ffffff'], kracht: 4, omhoog: 8, grootte: 0.16, duur: 1.5 });
  }

  /** Stofwolkje bij het landen of afzetten. */
  stof(pos: THREE.Vector3, hoeveel = 1) {
    this.spuit(pos, { aantal: Math.round(10 * hoeveel), kleuren: ['#e8e1d5', '#ffffff', '#d9cbb0'], kracht: 2.6 * hoeveel, omhoog: 1.2, grootte: 0.22, duur: 0.5, zwaartekracht: 2 });
  }

  /** Regenboogspoor achter de speler. */
  spoor(pos: THREE.Vector3) {
    const kleuren = ['#ff4d4d', '#ff9a3d', '#ffd93d', '#5cd65c', '#4da6ff', '#7a5cff'];
    this.spuit(pos, { aantal: 2, kleuren: [kleuren[Math.floor(Math.random() * kleuren.length)]], kracht: 0.6, omhoog: 1.2, grootte: 0.18, duur: 0.7 });
  }

  /** Een klein glinstertje (bij gouden hoefijzers en de eenhoorn). */
  glinster(pos: THREE.Vector3, kleur = '#fff6b0') {
    this.spuit(pos, { aantal: 1, kleuren: [kleur], kracht: 0.3, omhoog: 0.8, grootte: 0.12, duur: 0.7, zwaartekracht: 0 });
  }

  /** Glinstering op het water. */
  waterGlinster(pos: THREE.Vector3) {
    this.spuit(pos, { aantal: 1, kleuren: ['#ffffff'], kracht: 0, omhoog: 0, grootte: 0.22, duur: 0.9, zwaartekracht: 0, plat: true });
  }

  /** Toverwolk bij het omkleden: sterretjes en een ring. */
  toverwolk(pos: THREE.Vector3) {
    this.spuit(pos, { aantal: 45, kleuren: ['#ff9bd2', '#c9a7ff', '#ffffff', '#ffe27a'], kracht: 3.2, omhoog: 1, grootte: 0.16, duur: 0.9, zwaartekracht: 1, bol: true });
    this.ring(new THREE.Vector3(pos.x, pos.y - 1.2, pos.z), '#ff9bd2', 2.2);
  }

  /** Vuurwerk: een paar pijlen die omhoog schieten en uit elkaar spatten. */
  vuurwerk(pos: THREE.Vector3, pijlen = 4) {
    if (this.rustig || this.zuinig) return;
    const paletten = [
      ['#ff4d6d', '#ffb3c1', '#ffffff'],
      ['#ffd23f', '#fff1a8', '#ff9f1c'],
      ['#4cc9f0', '#b5f2ff', '#ffffff'],
      ['#9b5de5', '#f15bb5', '#fee440'],
      ['#80ed99', '#c7f9cc', '#ffffff'],
    ];
    for (let n = 0; n < pijlen; n++) {
      const doel = pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 10, 3 + Math.random() * 4, (Math.random() - 0.5) * 10));
      const start = new THREE.Vector3(doel.x, pos.y - 6, doel.z);
      const kleuren = paletten[Math.floor(Math.random() * paletten.length)];
      this.straks(n * 0.35, () => {
        // Het spoor van de pijl
        for (let t = 0; t < 8; t++) {
          const p = start.clone().lerp(doel, t / 8);
          this.straks(t * 0.04, () => this.spuit(p, { aantal: 2, kleuren: ['#fff6d6'], kracht: 0.4, omhoog: -1, grootte: 0.1, duur: 0.4, zwaartekracht: 0 }));
        }
        this.straks(0.34, () => {
          this.spuit(doel, { aantal: 90, kleuren, kracht: 7, omhoog: 0, grootte: 0.16, duur: 1.4, zwaartekracht: 3, bol: true });
          this.spuit(doel, { aantal: 25, kleuren: ['#ffffff'], kracht: 3, omhoog: 0, grootte: 0.1, duur: 0.9, zwaartekracht: 1, bol: true });
        });
      });
    }
  }

  /** Een ring die uitdijt en verdwijnt (bij een checkpoint of plons). */
  ring(pos: THREE.Vector3, kleur = '#ffffff', grootte = 3) {
    if (this.rustig) return;
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1, 32),
      new THREE.MeshBasicMaterial({ color: kleur, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(pos).add(new THREE.Vector3(0, 0.05, 0));
    mesh.scale.setScalar(0.2);
    this.scene.add(mesh);
    this.zwevers.push({ obj: mesh, snelheid: new THREE.Vector3(), leeftijd: 0, duur: 0.7, groei: grootte });
  }

  hartjes(pos: THREE.Vector3, aantal = 5) {
    if (this.rustig) return;
    this.hartMat ??= hartjesMateriaal();
    for (let i = 0; i < aantal; i++) {
      const sprite = new THREE.Sprite(this.hartMat);
      const s = 0.35 + Math.random() * 0.25;
      sprite.scale.set(s, s, s);
      sprite.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.3, (Math.random() - 0.5) * 0.8));
      this.scene.add(sprite);
      this.zwevers.push({
        obj: sprite,
        snelheid: new THREE.Vector3((Math.random() - 0.5) * 0.8, 2.2 + Math.random(), (Math.random() - 0.5) * 0.8),
        leeftijd: 0,
        duur: 1.1 + Math.random() * 0.4,
      });
    }
  }

  update(dt: number) {
    // Geplande effecten
    for (let i = this.wachtrij.length - 1; i >= 0; i--) {
      const w = this.wachtrij[i];
      w.over -= dt;
      if (w.over <= 0) {
        this.wachtrij.splice(i, 1);
        w.actie();
      }
    }

    // Blokjes
    const h = this.hulp;
    let veranderd = false;
    for (let i = 0; i < MAX_DEELTJES; i++) {
      if (this.duur[i] <= 0) continue;
      veranderd = true;
      const i3 = i * 3;
      this.leeftijd[i] += dt;
      const t = this.leeftijd[i] / this.duur[i];
      if (t >= 1) {
        this.duur[i] = 0;
        h.scale.set(0, 0, 0);
        h.updateMatrix();
        this.mesh.setMatrixAt(i, h.matrix);
        continue;
      }
      this.vel[i3 + 1] -= this.zwaar[i] * dt;
      const demping = 1 - dt * 0.8;
      this.vel[i3] *= demping;
      this.vel[i3 + 2] *= demping;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      const s = this.grootte[i] * (1 - t * t);
      h.position.set(this.pos[i3], this.pos[i3 + 1], this.pos[i3 + 2]);
      if (this.plat[i]) {
        h.rotation.set(0, this.rot[i3 + 1], 0);
        h.scale.set(s * 1.6, s * 0.05, s * 0.4);
      } else {
        for (let a = 0; a < 3; a++) this.rot[i3 + a] += this.draai[i3 + a] * dt;
        h.rotation.set(this.rot[i3], this.rot[i3 + 1], this.rot[i3 + 2]);
        h.scale.set(s, s * 0.45, s);
      }
      h.updateMatrix();
      this.mesh.setMatrixAt(i, h.matrix);
    }
    if (veranderd) this.mesh.instanceMatrix.needsUpdate = true;

    // Hartjes en ringen
    for (let i = this.zwevers.length - 1; i >= 0; i--) {
      const z = this.zwevers[i];
      z.leeftijd += dt;
      const t = z.leeftijd / z.duur;
      if (z.groei) {
        z.obj.scale.setScalar(0.2 + t * z.groei);
        ((z.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t);
      } else {
        z.obj.position.addScaledVector(z.snelheid, dt);
      }
      if (t >= 1) {
        this.scene.remove(z.obj);
        if (z.groei) {
          const m = z.obj as THREE.Mesh;
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        }
        this.zwevers.splice(i, 1);
      }
    }
  }
}
