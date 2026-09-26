import { describe, expect, it } from 'vitest';
import { Fysica, botserUitBlok, type Lichaam } from '../src/spel/fysica';

function lichaam(x = 0, y = 0, z = 0): Lichaam {
  return { pos: { x, y, z }, snelheid: { x: 0, y: 0, z: 0 }, straal: 0.4, hoogte: 2, opGrond: false, grond: null };
}

function wereldMetVloer() {
  const f = new Fysica();
  // Vloer: bovenkant op y = 0.
  f.voegToe(botserUitBlok(0, -1, 0, 40, 2, 40));
  return f;
}

function simuleer(f: Fysica, l: Lichaam, seconden: number, zwaartekracht = 28) {
  const dt = 1 / 60;
  for (let t = 0; t < seconden; t += dt) {
    l.snelheid.y -= zwaartekracht * dt;
    f.beweeg(l, dt);
  }
}

describe('fysica', () => {
  it('laat een vallend lichaam op de vloer landen', () => {
    const f = wereldMetVloer();
    const l = lichaam(0, 5, 0);
    simuleer(f, l, 2);
    expect(l.pos.y).toBeCloseTo(0, 3);
    expect(l.opGrond).toBe(true);
  });

  it('valt niet door een dun platform, ook niet met hoge snelheid', () => {
    const f = new Fysica();
    f.voegToe(botserUitBlok(0, 0, 0, 3, 0.4, 3));
    const l = lichaam(0, 20, 0);
    l.snelheid.y = -30;
    simuleer(f, l, 2);
    expect(l.pos.y).toBeCloseTo(0.2, 3);
  });

  it('houdt een muur tegen', () => {
    const f = wereldMetVloer();
    f.voegToe(botserUitBlok(3, 2, 0, 1, 4, 10));
    const l = lichaam(0, 0, 0);
    for (let i = 0; i < 120; i++) {
      l.snelheid.x = 8;
      l.snelheid.y -= 28 / 60;
      f.beweeg(l, 1 / 60);
    }
    expect(l.pos.x).toBeLessThan(2.5 - 0.4 + 0.01);
  });

  it('stapt vanzelf op een laag opstapje', () => {
    const f = wereldMetVloer();
    f.voegToe(botserUitBlok(4, 0.25, 0, 4, 0.5, 4)); // bovenkant op 0.5
    const l = lichaam(0, 0, 0);
    simuleer(f, l, 0.1);
    for (let i = 0; i < 60; i++) {
      l.snelheid.x = 6;
      l.snelheid.y -= 28 / 60;
      f.beweeg(l, 1 / 60);
    }
    expect(l.pos.x).toBeGreaterThan(3);
    expect(l.pos.y).toBeCloseTo(0.5, 2);
  });

  it('valt door een botser die uit staat (valluik)', () => {
    const f = wereldMetVloer();
    const luik = f.voegToe(botserUitBlok(0, 3, 0, 4, 0.4, 4)); // bovenkant op 3.2
    const l = lichaam(0, 3.2, 0);
    simuleer(f, l, 0.2);
    expect(l.pos.y).toBeCloseTo(3.2, 2);
    luik.actief = false;
    simuleer(f, l, 2);
    expect(l.pos.y).toBeCloseTo(0, 2);
  });

  it('ziet met een straal de eerste muur', () => {
    const f = wereldMetVloer();
    f.voegToe(botserUitBlok(5, 2, 0, 1, 4, 10)); // muur van x = 4.5 tot 5.5
    const afstand = f.straal({ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }, 20);
    expect(afstand).toBeCloseTo(4.5, 5);
    // Omhoog kijken: niets in de weg
    expect(f.straal({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }, 20)).toBe(20);
    // Een straal die in de vloer begint, telt de vloer niet mee
    expect(f.straal({ x: 0, y: -0.5, z: 0 }, { x: 1, y: 0, z: 0 }, 3)).toBe(3);
  });

  it('laat de speler door een boomkruin lopen, maar houdt de camera tegen', () => {
    const f = wereldMetVloer();
    f.voegToe(botserUitBlok(3, 1, 0, 2, 2, 2, 'kruin'));
    const l = lichaam(0, 0, 0);
    for (let i = 0; i < 60; i++) {
      l.snelheid.x = 6;
      l.snelheid.y -= 28 / 60;
      f.beweeg(l, 1 / 60);
    }
    expect(l.pos.x).toBeGreaterThan(4);
    expect(f.straal({ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }, 20)).toBeCloseTo(2, 5);
  });
});
