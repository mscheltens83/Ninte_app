// Eenvoudige botsingen tussen de speler (een staande doos) en blokken
// die recht in de wereld staan. Genoeg voor lopen, springen en een obby.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 'kruin' (bladeren van een boom) houdt alleen de camera tegen, niet de speler. */
export type BotserSoort = 'vast' | 'hooi' | 'kruin';

export interface Botser {
  min: Vec3;
  max: Vec3;
  actief: boolean;
  soort: BotserSoort;
}

export interface Lichaam {
  /** Midden van de voeten. */
  pos: Vec3;
  snelheid: Vec3;
  straal: number;
  hoogte: number;
  opGrond: boolean;
  grond: Botser | null;
}

/** Hoe hoog een opstapje mag zijn om er vanzelf op te lopen. */
export const STAPHOOGTE = 0.55;
const MAX_STAP_PER_DEELSTAP = 0.2;
const MARGE = 1e-4;

export function maakBotser(min: Vec3, max: Vec3, soort: BotserSoort = 'vast'): Botser {
  return { min: { ...min }, max: { ...max }, actief: true, soort };
}

/** Botser uit een midden en afmetingen (breedte x, hoogte y, diepte z). */
export function botserUitBlok(x: number, y: number, z: number, b: number, h: number, d: number, soort: BotserSoort = 'vast'): Botser {
  return maakBotser({ x: x - b / 2, y: y - h / 2, z: z - d / 2 }, { x: x + b / 2, y: y + h / 2, z: z + d / 2 }, soort);
}

export function overlapt(b: Botser, l: Lichaam, x = l.pos.x, y = l.pos.y, z = l.pos.z): boolean {
  return (
    x + l.straal > b.min.x &&
    x - l.straal < b.max.x &&
    y + l.hoogte > b.min.y &&
    y < b.max.y &&
    z + l.straal > b.min.z &&
    z - l.straal < b.max.z
  );
}

export class Fysica {
  botsers: Botser[] = [];

  voegToe(b: Botser): Botser {
    this.botsers.push(b);
    return b;
  }

  private botst(b: Botser): boolean {
    return b.actief && b.soort !== 'kruin';
  }

  private vrij(l: Lichaam, x: number, y: number, z: number): boolean {
    for (const b of this.botsers) if (this.botst(b) && overlapt(b, l, x, y, z)) return false;
    return true;
  }

  /** Beweegt het lichaam met zijn snelheid en lost botsingen op. */
  beweeg(l: Lichaam, dt: number) {
    const s = l.snelheid;
    const afstand = Math.max(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z)) * dt;
    const stappen = Math.max(1, Math.ceil(afstand / MAX_STAP_PER_DEELSTAP));
    const h = dt / stappen;
    let opGrond = false;
    let grond: Botser | null = null;
    for (let i = 0; i < stappen; i++) {
      this.beweegAs(l, 'x', s.x * h, opGrond || l.opGrond);
      this.beweegAs(l, 'z', s.z * h, opGrond || l.opGrond);
      const r = this.beweegVerticaal(l, s.y * h);
      if (r) {
        opGrond = true;
        grond = r;
      }
    }
    l.opGrond = opGrond;
    l.grond = grond;
  }

  private beweegAs(l: Lichaam, as: 'x' | 'z', delta: number, magStappen: boolean) {
    if (delta === 0) return;
    const nieuw = { ...l.pos };
    nieuw[as] += delta;
    for (const b of this.botsers) {
      if (!this.botst(b) || !overlapt(b, l, nieuw.x, nieuw.y, nieuw.z)) continue;
      const stap = b.max.y - l.pos.y;
      if (magStappen && stap > 0 && stap <= STAPHOOGTE && this.vrij(l, nieuw.x, b.max.y + MARGE, nieuw.z)) {
        nieuw.y = b.max.y + MARGE;
        continue;
      }
      nieuw[as] = delta > 0 ? b.min[as] - l.straal - MARGE : b.max[as] + l.straal + MARGE;
      if (as === 'x') l.snelheid.x = 0;
      else l.snelheid.z = 0;
    }
    l.pos.x = nieuw.x;
    l.pos.y = nieuw.y;
    l.pos.z = nieuw.z;
  }

  /** Geeft de botser terug waar het lichaam op landt, of null. */
  private beweegVerticaal(l: Lichaam, delta: number): Botser | null {
    let y = l.pos.y + delta;
    let geland: Botser | null = null;
    for (const b of this.botsers) {
      if (!this.botst(b) || !overlapt(b, l, l.pos.x, y, l.pos.z)) continue;
      if (delta <= 0) {
        y = b.max.y;
        geland = b;
      } else {
        y = b.min.y - l.hoogte - MARGE;
      }
      l.snelheid.y = 0;
    }
    // Staat het lichaam precies op een blok, dan telt dat ook als grond.
    if (!geland && delta <= 0) {
      for (const b of this.botsers) {
        if (this.botst(b) && Math.abs(y - b.max.y) < 1e-3 && overlapt(b, l, l.pos.x, y - 0.01, l.pos.z)) {
          geland = b;
          break;
        }
      }
    }
    l.pos.y = y;
    return geland;
  }

  /**
   * Hoe ver een straal vanuit `van` in `richting` (lengte 1) komt voordat hij
   * een blok raakt. Gebruikt om de camera niet achter een muur te laten zitten.
   */
  straal(van: Vec3, richting: Vec3, max: number): number {
    let dichtste = max;
    const assen = ['x', 'y', 'z'] as const;
    for (const b of this.botsers) {
      if (!b.actief) continue;
      let tMin = 0;
      let tMax = dichtste;
      let raak = true;
      for (const as of assen) {
        const o = van[as];
        const d = richting[as];
        if (Math.abs(d) < 1e-9) {
          if (o < b.min[as] || o > b.max[as]) {
            raak = false;
            break;
          }
          continue;
        }
        let t1 = (b.min[as] - o) / d;
        let t2 = (b.max[as] - o) / d;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) {
          raak = false;
          break;
        }
      }
      // Begint de straal ín een blok, dan telt dat blok niet mee.
      if (raak && tMin > 0.01 && tMin < dichtste) dichtste = tMin;
    }
    return dichtste;
  }

  /** Of het lichaam in of op deze botser staat. */
  raakt(l: Lichaam, b: Botser): boolean {
    return b.actief && overlapt(b, l, l.pos.x, l.pos.y - 0.05, l.pos.z);
  }
}
