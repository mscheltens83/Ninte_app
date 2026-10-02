// Welk muziekje hoort bij de plek waar Ninte nu is?

import { GEBIEDEN, WERELD } from '../avontuur/inhoud';
import type { Vec3 } from '../spel/fysica';
import { bijPodium } from './feestwereld';
import type { MuziekPlek } from './liedjes';
import { opKavel } from '../bouwen/onderdelen';
import { inRijland } from '../rijden/rijland';

/** Binnen deze afstand van een gebied hoor je de muziek van dat gebied. */
export const GEBIED_STRAAL = 30;

export interface PlekInfo {
  pos: Vec3;
  opWolken: boolean;
  inObby: boolean;
}

export function kiesMuziekPlek({ pos, opWolken, inObby }: PlekInfo): MuziekPlek {
  if (opWolken) return 'geheim';
  if (inObby) return 'obby';
  if (inRijland(pos.x, pos.z, 20)) return 'rijland';
  if (bijPodium(pos)) return 'podium';
  if (opKavel(pos.x, pos.z, 3)) return 'kavel';
  if (pos.z >= WERELD.zuid) return 'eiland';
  let beste: MuziekPlek = 'wereld';
  let afstand = GEBIED_STRAAL;
  for (const g of GEBIEDEN) {
    const d = Math.hypot(g.x - pos.x, g.z - pos.z);
    if (d < afstand) {
      afstand = d;
      beste = g.id;
    }
  }
  return beste;
}
