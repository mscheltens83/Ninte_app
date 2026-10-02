// De eierplekken: hier liggen eieren te wachten. Pak je er een, dan komt er na een
// tijdje een nieuw ei. Een nieuwe plek toevoegen = een regel in EI_PLEKKEN.

import * as THREE from 'three';
import type { Vec3 } from '../spel/fysica';
import { TOREN } from '../avontuur/inhoud';
import { dynamisch } from '../wereld/bouwstenen';
import type { EiSoort } from './dieren';
import { eiModel } from './model';
import { RIJLAND, torenTop } from './rijland';

export interface EiPlek { id: string; soort: EiSoort; x: number; y: number; z: number; hint: string }

const W = RIJLAND.x, Z = RIJLAND.z;

export const EI_PLEKKEN: EiPlek[] = [
  // In de gewone wereld, om mee te beginnen
  { id: 'dorp', soort: 'gewoon', x: 9, y: 0, z: -41, hint: 'bij de regenboogpoort op het dorpsplein' },
  { id: 'eiland', soort: 'gewoon', x: 5, y: 0, z: 14, hint: 'op het eiland bij de dieren' },
  { id: 'windtoren', soort: 'goud', x: TOREN.x - 16, y: TOREN.hoogte, z: TOREN.z, hint: 'helemaal bovenop de Windtoren' },
  // Midden van het Rijland
  { id: 'boomvoet', soort: 'gewoon', x: W - 20, y: 0, z: Z - 20, hint: 'bij de Reuzenboom' },
  // Bloemenweide
  { id: 'weide-1', soort: 'gewoon', x: W - 30, y: 0, z: Z - 80, hint: 'in de Bloemenweide' },
  { id: 'weide-2', soort: 'gewoon', x: W - 80, y: 0, z: Z - 30, hint: 'in de Bloemenweide' },
  { id: 'weide-3', soort: 'gewoon', x: W - 105, y: 0, z: Z - 105, hint: 'in een hoek van de Bloemenweide' },
  // Zandduinen
  { id: 'zand-1', soort: 'gewoon', x: W + 30, y: 0, z: Z - 82, hint: 'in de Zandduinen' },
  { id: 'zand-2', soort: 'zeldzaam', x: W + 115, y: 0, z: Z - 40, hint: 'achterin de Zandduinen' },
  { id: 'piramide', soort: 'zeldzaam', x: W + 95, y: torenTop('piramide'), z: Z - 95, hint: 'bovenop de piramide' },
  // Sneeuwland
  { id: 'sneeuw-1', soort: 'gewoon', x: W + 30, y: 0, z: Z + 82, hint: 'in het Sneeuwland' },
  { id: 'sneeuw-2', soort: 'zeldzaam', x: W + 70, y: 0, z: Z + 40, hint: 'in het Sneeuwland' },
  { id: 'berg', soort: 'zeldzaam', x: W + 95, y: torenTop('berg'), z: Z + 95, hint: 'bovenop de sneeuwberg' },
  // Snoepland
  { id: 'snoep-1', soort: 'zeldzaam', x: W - 30, y: 0, z: Z + 85, hint: 'in het Snoepland' },
  { id: 'snoep-2', soort: 'zeldzaam', x: W - 70, y: 0, z: Z + 40, hint: 'in het Snoepland' },
  { id: 'cupcake', soort: 'goud', x: W - 95, y: torenTop('cupcake'), z: Z + 95, hint: 'bovenop de grote cupcake' },
  { id: 'snoep-3', soort: 'goud', x: W - 115, y: 0, z: Z + 115, hint: 'in de verste hoek van het Snoepland' },
];

/** Na hoeveel seconden er weer een ei ligt. */
export const NIEUW_EI_NA: Record<EiSoort, number> = { gewoon: 90, zeldzaam: 240, goud: 480 };
const PAK_AFSTAND = 1.6;

export class EiWereld {
  readonly groep = new THREE.Group();
  private eieren = new Map<string, THREE.Group>();
  private tijd = 0;

  constructor(scene: THREE.Scene, private plekken: Record<string, number>) {
    scene.add(this.groep);
    for (const p of EI_PLEKKEN) {
      const ei = dynamisch(eiModel(p.soort));
      ei.position.set(p.x, p.y, p.z);
      ei.userData.plek = p;
      this.groep.add(ei);
      this.eieren.set(p.id, ei);
    }
  }

  /** Ligt er nu een ei op deze plek? */
  ligtEr(id: string, nu = Date.now()): boolean {
    return (this.plekken[id] ?? 0) <= nu;
  }

  /** De eieren die er nu liggen (voor glinsters). */
  zichtbare(): THREE.Vector3[] {
    return [...this.eieren.values()].filter((e) => e.visible).map((e) => e.position.clone().add(new THREE.Vector3(0, 0.7, 0)));
  }

  /** Elk beeldje: eieren laten dansen, en kijken of Ninte er een pakt. */
  update(dt: number, speler: Vec3, nu = Date.now()): EiPlek | null {
    this.tijd += dt;
    let gepakt: EiPlek | null = null;
    for (const p of EI_PLEKKEN) {
      const ei = this.eieren.get(p.id)!;
      ei.visible = this.ligtEr(p.id, nu);
      if (!ei.visible) continue;
      ei.rotation.y = this.tijd * 1.2;
      ei.position.y = p.y + Math.abs(Math.sin(this.tijd * 2.4 + p.x)) * 0.25;
      if (!gepakt && Math.hypot(speler.x - p.x, speler.z - p.z) < PAK_AFSTAND && Math.abs(speler.y - p.y) < 2) gepakt = p;
    }
    return gepakt;
  }

  /** Het ei is gepakt: de plek blijft een tijdje leeg. */
  gepakt(p: EiPlek, nu = Date.now()) {
    this.plekken[p.id] = nu + NIEUW_EI_NA[p.soort] * 1000;
    this.eieren.get(p.id)!.visible = false;
  }
}
