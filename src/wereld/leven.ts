// Leven op het eiland: vlinders die wegfladderen als je dichtbij komt,
// en vissen die af en toe uit het water springen.

import * as THREE from 'three';
import type { Vec3 } from '../spel/fysica';
import { zaadRng } from './bouwstenen';
import { EILAND_RAND, WATER_HOOGTE } from './eiland';
import type { Effecten } from './versiering';

const VLINDER_KLEUREN = ['#ff9bd2', '#ffd23f', '#8fd3ff', '#c9a7ff', '#ff8a3d', '#ffffff'];

interface Vlinder {
  groep: THREE.Group;
  links: THREE.Object3D;
  rechts: THREE.Object3D;
  thuis: THREE.Vector3;
  fase: number;
  schrik: number;
}

interface Vis {
  groep: THREE.Group;
  van: THREE.Vector3;
  naar: THREE.Vector3;
  tijd: number;
}

function maakVlinder(kleur: string): Omit<Vlinder, 'thuis' | 'fase' | 'schrik'> {
  const groep = new THREE.Group();
  const lijf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.22), new THREE.MeshBasicMaterial({ color: '#2b2340' }));
  groep.add(lijf);
  const vleugelGeo = new THREE.PlaneGeometry(0.26, 0.22);
  vleugelGeo.translate(0.13, 0, 0);
  vleugelGeo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: kleur, side: THREE.DoubleSide });
  const links = new THREE.Mesh(vleugelGeo, mat);
  const rechts = new THREE.Mesh(vleugelGeo, mat);
  rechts.scale.x = -1;
  groep.add(links, rechts);
  return { groep, links, rechts };
}

function maakVis(): THREE.Group {
  const g = new THREE.Group();
  const oranje = new THREE.MeshStandardMaterial({ color: '#ff8a3d', roughness: 0.5 });
  const lijf = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.7), oranje);
  const staart = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.24), oranje);
  staart.position.z = -0.44;
  const oog = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: '#1b1512' }));
  oog.position.set(0, 0.06, 0.22);
  g.add(lijf, staart, oog);
  return g;
}

/** Ligt dit punt in het water (niet op het eiland of het strand)? */
export function isWater(x: number, z: number): boolean {
  const strand = EILAND_RAND + 3.5;
  return Math.abs(x) > strand || Math.abs(z) > strand;
}

export class Leven {
  private vlinders: Vlinder[] = [];
  private vis: Vis | null = null;
  private visTimer = 4;
  private tijd = 0;

  constructor(private scene: THREE.Scene, private effecten: Effecten) {
    const rng = zaadRng(99);
    for (let i = 0; i < 14; i++) {
      const v = maakVlinder(VLINDER_KLEUREN[i % VLINDER_KLEUREN.length]);
      const thuis = new THREE.Vector3((rng() - 0.5) * 56, 1.1, (rng() - 0.5) * 56);
      v.groep.position.copy(thuis);
      scene.add(v.groep);
      this.vlinders.push({ ...v, thuis, fase: rng() * 10, schrik: 0 });
    }
  }

  update(dt: number, speler: Vec3) {
    this.tijd += dt;
    const sp = new THREE.Vector3(speler.x, speler.y + 1, speler.z);

    for (const v of this.vlinders) {
      v.fase += dt;
      const p = v.groep.position;
      // Rustig rondjes fladderen rond hun plekje
      const doel = new THREE.Vector3(
        v.thuis.x + Math.cos(v.fase * 0.7) * 2.2,
        v.thuis.y + Math.sin(v.fase * 2.1) * 0.35,
        v.thuis.z + Math.sin(v.fase * 0.9) * 2.2,
      );
      // Te dichtbij? Dan fladdert hij geschrokken omhoog en weg.
      const afstand = p.distanceTo(sp);
      if (afstand < 2.6) v.schrik = 2;
      if (v.schrik > 0) {
        v.schrik -= dt;
        doel.copy(p).add(p.clone().sub(sp).setY(0).normalize().multiplyScalar(3)).setY(v.thuis.y + 2.5);
      }
      const oud = p.clone();
      p.lerp(doel, Math.min(1, dt * (v.schrik > 0 ? 2.5 : 1.2)));
      const richting = p.clone().sub(oud);
      if (richting.lengthSq() > 1e-6) v.groep.rotation.y = Math.atan2(richting.x, richting.z);
      const flap = 0.25 + Math.abs(Math.sin(v.fase * (v.schrik > 0 ? 28 : 16))) * 1.1;
      v.links.rotation.z = flap;
      v.rechts.rotation.z = -flap;
    }

    // Af en toe springt er een vis uit het water, in de buurt van de speler.
    this.visTimer -= dt;
    if (!this.vis && this.visTimer <= 0) {
      this.visTimer = 5 + Math.random() * 5;
      for (let poging = 0; poging < 12; poging++) {
        const hoek = Math.random() * Math.PI * 2;
        const r = 9 + Math.random() * 14;
        const x = speler.x + Math.cos(hoek) * r;
        const z = speler.z + Math.sin(hoek) * r;
        if (!isWater(x, z)) continue;
        const sprong = new THREE.Vector3(Math.cos(hoek + 1.6), 0, Math.sin(hoek + 1.6)).multiplyScalar(3.2);
        const van = new THREE.Vector3(x, WATER_HOOGTE, z);
        const naar = van.clone().add(sprong);
        if (!isWater(naar.x, naar.z)) continue;
        const groep = maakVis();
        this.scene.add(groep);
        this.vis = { groep, van, naar, tijd: 0 };
        this.effecten.plons(van);
        break;
      }
    }
    if (this.vis) {
      const v = this.vis;
      v.tijd += dt;
      const t = v.tijd / 1.1;
      const p = v.van.clone().lerp(v.naar, t);
      p.y = WATER_HOOGTE + Math.sin(t * Math.PI) * 2.2;
      v.groep.position.copy(p);
      v.groep.rotation.y = Math.atan2(v.naar.x - v.van.x, v.naar.z - v.van.z);
      v.groep.rotation.x = -Math.cos(t * Math.PI) * 1.1;
      if (t >= 1) {
        this.effecten.plons(v.naar);
        this.scene.remove(v.groep);
        this.vis = null;
      }
    }
  }
}
