// Wilde dieren in het Rijland. Ze lopen rustig rond in hun eigen gebied. Ga ernaast
// staan en tem ze met een leervraag: dan wordt het dier van jou en rijd je er meteen op.
// Een getemd dier komt na een tijdje terug (er komt een nieuwe wilde).
//
// Meer wilde dieren? Pas de lijst WILDE_DIEREN aan.

import * as THREE from 'three';
import type { Vec3 } from '../spel/fysica';
import { zaadRng } from '../wereld/bouwstenen';
import type { Interactie } from '../avontuur/wereld';
import { rijdier, type Variant } from './dieren';
import { RijModel } from './model';
import { BIOMEN, KLIMTORENS, MIDDEN, RIJLAND, type BiomeId } from './rijland';
import { voetafdruk, type Heuvel } from '../wereld/heuvels';

export const WILDE_DIEREN: { soort: string; gebied: BiomeId | 'midden'; aantal: number; variant?: Variant }[] = [
  { soort: 'konijn', gebied: 'midden', aantal: 2 },
  { soort: 'vos', gebied: 'midden', aantal: 1 },
  { soort: 'konijn', gebied: 'weide', aantal: 3 },
  { soort: 'vos', gebied: 'weide', aantal: 2 },
  { soort: 'panda', gebied: 'weide', aantal: 2 },
  { soort: 'schildpad', gebied: 'weide', aantal: 1 },
  { soort: 'zebra', gebied: 'zand', aantal: 2 },
  { soort: 'luipaard', gebied: 'zand', aantal: 2 },
  { soort: 'flamingo', gebied: 'zand', aantal: 2 },
  { soort: 'ijsbeer', gebied: 'sneeuw', aantal: 2 },
  { soort: 'hert', gebied: 'sneeuw', aantal: 2 },
  { soort: 'vos', gebied: 'sneeuw', aantal: 1, variant: 'glitter' },
  { soort: 'eenhoorn', gebied: 'snoep', aantal: 2 },
  { soort: 'flamingo', gebied: 'snoep', aantal: 1, variant: 'glitter' },
  { soort: 'draakje', gebied: 'snoep', aantal: 1 },
];

/** Na zoveel seconden komt er een nieuw wild dier op de plek van een getemd dier. */
export const TERUG_NA = 300;
/** Verder weg dan dit staan ze stil (scheelt rekenwerk). */
const BEWEEG_BEREIK = 110;

export interface WildDier {
  soort: string;
  variant: Variant;
  model: RijModel;
  anker: { x: number; z: number };
  straal: number;
  hoek: number;
  snel: number;
  /** Seconden tot het dier terug is (0 = er is er een). */
  weg: number;
  interactie: Interactie;
}

const W = RIJLAND.x, Z = RIJLAND.z;

/** Een rustige plek in een gebied waar een wild dier rondjes kan lopen. */
function ankerIn(gebied: BiomeId | 'midden', rng: () => number, heuvels: readonly Heuvel[]): { x: number; z: number } {
  for (let poging = 0; poging < 50; poging++) {
    if (gebied === 'midden') {
      // Tussen de boom en de racebaan, maar niet op de ranch.
      const a = rng() * Math.PI * 2, r = 16 + rng() * 14;
      const x = W + Math.cos(a) * r, z = Z + Math.sin(a) * r;
      if (x > W + 8 && Math.abs(z - Z) < 12) continue;
      if (Math.abs(x - W) < 8 && z > Z + 10) continue;
      return { x, z };
    }
    const b = BIOMEN.find((v) => v.id === gebied)!;
    const x = W + b.sx * (15 + rng() * (RIJLAND.half - 30)), z = Z + b.sz * (15 + rng() * (RIJLAND.half - 30));
    if (Math.abs(x - W) < MIDDEN + 12 && Math.abs(z - Z) < MIDDEN + 12) continue;
    if (KLIMTORENS.some((t) => Math.abs(x - t.x) < t.basis / 2 + 12 && Math.abs(z - t.z) < t.basis / 2 + 12)) continue;
    // Het rondje van het dier (tot 9 meter) mag niet de heuvel in lopen.
    if (heuvels.some((h) => Math.hypot(x - h.x, z - h.z) < voetafdruk(h) + 11)) continue;
    return { x, z };
  }
  return { x: W + 20, z: Z - 20 };
}

export class WildeDieren {
  readonly groep = new THREE.Group();
  readonly dieren: WildDier[] = [];

  constructor(scene: THREE.Scene, heuvels: readonly Heuvel[] = []) {
    scene.add(this.groep);
    const rng = zaadRng(818);
    for (const w of WILDE_DIEREN) {
      const r = rijdier(w.soort);
      if (!r) continue;
      for (let i = 0; i < w.aantal; i++) {
        const variant = w.variant ?? 'normaal';
        const model = new RijModel(r.plan, variant);
        model.groep.scale.setScalar(0.85);
        this.groep.add(model.groep);
        const anker = ankerIn(w.gebied, rng, heuvels);
        const nr = this.dieren.length;
        const interactie: Interactie = { id: `wild-${nr}`, naam: `${r.icoon} Tem de ${r.naam.toLowerCase()}`, x: anker.x, y: 0, z: anker.z, soort: 'actie', straal: 3.6 };
        this.dieren.push({ soort: w.soort, variant, model, anker, straal: w.gebied === 'midden' ? 3 : 4 + rng() * 5, hoek: rng() * Math.PI * 2, snel: 0.18 + rng() * 0.15, weg: 0, interactie });
      }
    }
    this.update(0, { x: W, y: 0, z: Z });
  }

  get interacties(): Interactie[] {
    return this.dieren.map((d) => d.interactie);
  }

  /** Getemd: dit dier is nu van Ninte; er komt later een nieuw wild dier. */
  getemd(i: number) {
    const d = this.dieren[i];
    if (!d) return;
    d.weg = TERUG_NA;
    d.model.groep.visible = false;
    d.interactie.y = -999;
  }

  update(dt: number, speler: Vec3) {
    for (const d of this.dieren) {
      if (d.weg > 0) {
        d.weg = Math.max(0, d.weg - dt);
        if (d.weg > 0) continue;
        d.model.groep.visible = true;
      }
      const ver = Math.abs(d.anker.x - speler.x) > BEWEEG_BEREIK || Math.abs(d.anker.z - speler.z) > BEWEEG_BEREIK;
      const dichtbij = Math.hypot(d.model.groep.position.x - speler.x, d.model.groep.position.z - speler.z) < 4;
      // Staat Ninte ernaast, dan blijft het dier staan en kijkt het haar aan.
      if (!ver && !dichtbij) d.hoek += (dt * d.snel * 4) / Math.max(1, d.straal);
      const x = d.anker.x + Math.cos(d.hoek) * d.straal, z = d.anker.z + Math.sin(d.hoek) * d.straal;
      d.model.groep.position.set(x, 0, z);
      d.model.groep.rotation.y = dichtbij ? Math.atan2(speler.x - x, speler.z - z) : Math.atan2(-Math.sin(d.hoek), Math.cos(d.hoek));
      if (!ver) d.model.update(dt, dichtbij ? 0 : 0.45, false);
      Object.assign(d.interactie, { x, y: 0, z });
    }
  }
}
