// Alles wat op de maat beweegt. Zet een 3D-object op de dansvloer met een dansstijl;
// de dansvloer laat het bij elke tel meebewegen, harder naarmate de muziek drukker is.
//
// Een nieuwe dansstijl toevoegen? Zet een functie in DANSSTIJLEN. Die krijgt de
// danser, de 'puls' (1 op de tel, zakt daarna weg), de tel en de sterkte.
// Stijlen veranderen alleen schaal en draaiing (en positie bij `wip`), altijd
// vanaf de beginstand, zodat niets wegdrijft.

import * as THREE from 'three';

export interface Danser {
  object: THREE.Object3D;
  stijl: DansStijlId;
  sterkte: number;
  /** Verschuiving in tellen, zodat niet alles precies tegelijk beweegt. */
  fase: number;
  basisSchaal: THREE.Vector3;
  basisDraai: THREE.Euler;
  basisY: number;
}

export type DansStijl = (d: Danser, puls: number, tel: number, sterkte: number) => void;

/** 1 precies op de tel, daarna snel wegzakkend. */
export function puls(tel: number): number {
  const f = tel - Math.floor(tel);
  return Math.exp(-f * 5);
}

export const DANSSTIJLEN = {
  /** In- en uitveren op de tel (voor dieren, luidsprekers, poppetjes). */
  veer: (d, p, _t, s) => {
    const k = p * 0.09 * s;
    d.object.scale.set(d.basisSchaal.x * (1 + k * 0.5), d.basisSchaal.y * (1 - k), d.basisSchaal.z * (1 + k * 0.5));
  },
  /** Opveren en weer landen (alleen voor dingen die nergens anders bewegen). */
  wip: (d, p, _t, s) => {
    d.object.position.y = d.basisY + p * 0.35 * s;
  },
  /** Heen en weer wiegen, één kant per tel. */
  wieg: (d, _p, t, s) => {
    d.object.rotation.z = d.basisDraai.z + Math.sin(t * Math.PI) * 0.12 * s;
  },
  /** Ja-knikken op de maat. */
  knik: (d, p, _t, s) => {
    d.object.rotation.x = d.basisDraai.x + p * 0.18 * s;
  },
  /** Groter worden op de tel (voor lampen en bloemen). */
  pomp: (d, p, _t, s) => {
    d.object.scale.copy(d.basisSchaal).multiplyScalar(1 + p * 0.16 * s);
  },
  /** Rustig ronddraaien, sneller als het drukker is (discobal). */
  draai: (d, _p, t, s) => {
    d.object.rotation.y = d.basisDraai.y + t * 0.6 * (0.4 + s);
  },
} satisfies Record<string, DansStijl>;

export type DansStijlId = keyof typeof DANSSTIJLEN;

/** Hoe sterk alles danst bij energie 0..4. */
export const DANS_STERKTE = [0.35, 0.55, 0.75, 0.9, 1.1];

export class Dansvloer {
  private dansers: Danser[] = [];
  /** Rustige effecten: veel minder beweging. */
  rustig = false;

  get aantal(): number {
    return this.dansers.length;
  }

  /** Laat een object meedansen. Geeft een functie terug om het weer te laten stoppen. */
  voegToe(object: THREE.Object3D, stijl: DansStijlId, opties: { sterkte?: number; fase?: number } = {}): () => void {
    const d: Danser = {
      object,
      stijl,
      sterkte: opties.sterkte ?? 1,
      fase: opties.fase ?? 0,
      basisSchaal: object.scale.clone(),
      basisDraai: object.rotation.clone(),
      basisY: object.position.y,
    };
    this.dansers.push(d);
    return () => this.verwijder(d);
  }

  private verwijder(d: Danser) {
    const i = this.dansers.indexOf(d);
    if (i < 0) return;
    this.dansers.splice(i, 1);
    d.object.scale.copy(d.basisSchaal);
    d.object.rotation.copy(d.basisDraai);
    if (d.stijl === 'wip') d.object.position.y = d.basisY;
  }

  update(tel: number, energie: number) {
    const sterkte = (DANS_STERKTE[Math.max(0, Math.min(4, Math.round(energie)))] ?? 1) * (this.rustig ? 0.25 : 1);
    for (const d of this.dansers) {
      const t = tel + d.fase;
      DANSSTIJLEN[d.stijl](d, puls(t), t, sterkte * d.sterkte);
    }
  }
}
