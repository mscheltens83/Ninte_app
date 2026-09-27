// Pony en puppy uit blokjes, met een naamkaartje erboven.
// Ze lopen achter de speler aan, net als pets in Roblox.

import * as THREE from 'three';
import { blok, naamkaartje } from '../wereld/bouwstenen';

export interface Vacht {
  id: string;
  naam: string;
  lijf: string;
  manen: string;
  vlekken?: string;
}

export const PONY_KLEUREN: Vacht[] = [
  { id: 'bruin', naam: 'Bruin', lijf: '#8b5a2b', manen: '#2a1d14' },
  { id: 'vos', naam: 'Vos', lijf: '#c0652b', manen: '#e8a15c' },
  { id: 'zwart', naam: 'Zwart', lijf: '#2e2a2b', manen: '#141213' },
  { id: 'schimmel', naam: 'Schimmel', lijf: '#e8e6e1', manen: '#b9b5ad' },
  { id: 'palomino', naam: 'Palomino', lijf: '#e1b664', manen: '#fbf3dc' },
  { id: 'bont', naam: 'Bont', lijf: '#f4f1ea', manen: '#3a2a20', vlekken: '#6b4226' },
];

export const HOND_KLEUREN: Vacht[] = [
  { id: 'goud', naam: 'Goud', lijf: '#d9a55b', manen: '#b98335' },
  { id: 'chocolade', naam: 'Chocolade', lijf: '#6b4226', manen: '#4a2c18' },
  { id: 'zwart', naam: 'Zwart', lijf: '#2e2a2b', manen: '#141213' },
  { id: 'wit', naam: 'Wit', lijf: '#f2f0ea', manen: '#d8d2c4' },
  { id: 'grijs', naam: 'Grijs', lijf: '#9da3ab', manen: '#6f757c' },
  { id: 'gevlekt', naam: 'Gevlekt', lijf: '#f4f2ee', manen: '#2b2b2b', vlekken: '#2b2b2b' },
];

export function vachtVan(lijst: Vacht[], id: string): Vacht {
  return lijst.find((v) => v.id === id) ?? lijst[0];
}

interface Poot {
  groep: THREE.Group;
  fase: number;
  voor: boolean;
}

export abstract class Dier {
  readonly groep = new THREE.Group();
  readonly kaartje: ReturnType<typeof naamkaartje>;
  protected poten: Poot[] = [];
  protected staart = new THREE.Group();
  private stapFase = 0;
  private tijd = Math.random() * 10;
  private snelheid = new THREE.Vector3();
  /** Binnen deze afstand van zijn plekje blijft het dier staan. */
  protected volgAfstand = 0.7;
  protected maxSnelheid = 9;
  /** Waar een hoedje op het hoofd komt (in de eigen maat van het dier). */
  abstract readonly hoofdAnker: THREE.Vector3;
  private aaiTijden: number[] = [];
  protected speciaal: { soort: 'zoomies' | 'steigeren'; tijd: number; duur: number } | null = null;

  constructor(naam: string, kaartjeHoogte: number) {
    this.kaartje = naamkaartje(naam, 0.42);
    this.kaartje.position.y = kaartjeHoogte;
    this.groep.add(this.kaartje);
  }

  zetNaam(naam: string) {
    this.kaartje.zetTekst(naam);
  }

  protected poot(x: number, y: number, z: number, lengte: number, dikte: number, kleur: string, hoef: string, fase: number) {
    const groep = new THREE.Group();
    groep.position.set(x, y, z);
    groep.add(blok(dikte, lengte, dikte, kleur, 0, -lengte / 2, 0));
    groep.add(blok(dikte * 1.08, lengte * 0.16, dikte * 1.08, hoef, 0, -lengte + lengte * 0.08, 0));
    this.groep.add(groep);
    this.poten.push({ groep, fase, voor: z > 0 });
  }

  /**
   * Aaien. Geeft true terug als er 5 keer snel achter elkaar is geaaid:
   * dan doet het dier zijn speciale truc.
   */
  aai(): boolean {
    const nu = this.tijd;
    this.aaiTijden = this.aaiTijden.filter((t) => nu - t < 2.5);
    this.aaiTijden.push(nu);
    if (this.aaiTijden.length >= 5 && !this.speciaal) {
      this.aaiTijden = [];
      return true;
    }
    return false;
  }

  protected startSpeciaal(soort: 'zoomies' | 'steigeren', duur: number) {
    this.speciaal = { soort, tijd: 0, duur };
  }

  /** Beweeg richting `doel` (op de grond) en animeer. `dansen`: meehuppelen. */
  update(dt: number, doel: THREE.Vector3, dansen = false) {
    this.tijd += dt;
    const pos = this.groep.position;
    if (this.speciaal) {
      this.speciaal.tijd += dt;
      if (this.speciaal.tijd > this.speciaal.duur) {
        this.speciaal = null;
        this.groep.rotation.x = 0;
      }
    }
    if (this.speciaal?.soort === 'zoomies') {
      // Rondjes rennen om de speler heen
      const t = this.speciaal.tijd * 3.2;
      doel = new THREE.Vector3(doel.x + Math.cos(t) * 3, doel.y, doel.z + Math.sin(t) * 3);
    }
    if (this.speciaal?.soort === 'steigeren') {
      const k = this.speciaal.tijd / this.speciaal.duur;
      this.groep.rotation.x = -Math.sin(k * Math.PI) * 0.75;
      for (const p of this.poten) if (p.voor) p.groep.rotation.x = -Math.sin(k * Math.PI) * 1.3;
      this.animeerStaart(this.tijd, 1);
      return;
    }
    const naar = new THREE.Vector3(doel.x - pos.x, 0, doel.z - pos.z);
    const afstand = naar.length();

    if (afstand > 40) {
      // Te ver weg: spring meteen naar de speler (zoals pets in Roblox).
      pos.set(doel.x, doel.y, doel.z);
      this.snelheid.set(0, 0, 0);
    }

    const gewenst = new THREE.Vector3();
    const zoomies = this.speciaal?.soort === 'zoomies';
    if (afstand > (zoomies ? 0 : this.volgAfstand)) {
      const max = zoomies ? 14 : this.maxSnelheid;
      const tempo = Math.min(max, (afstand - (zoomies ? 0 : this.volgAfstand)) * 2.5 + 1);
      gewenst.copy(naar).normalize().multiplyScalar(tempo);
    }
    this.snelheid.lerp(gewenst, Math.min(1, dt * 6));
    pos.x += this.snelheid.x * dt;
    pos.z += this.snelheid.z * dt;
    const hup = dansen ? Math.abs(Math.sin(this.tijd * 7)) * 0.45 : 0;
    pos.y += (doel.y + hup - pos.y) * Math.min(1, dt * 12);

    const v = this.snelheid.length();
    if (v > 0.3) {
      const hoek = Math.atan2(this.snelheid.x, this.snelheid.z);
      let verschil = hoek - this.groep.rotation.y;
      verschil = Math.atan2(Math.sin(verschil), Math.cos(verschil));
      this.groep.rotation.y += verschil * Math.min(1, dt * 8);
    }

    const tempo = Math.min(1, v / 6);
    this.stapFase += dt * (6 + v * 1.6);
    for (const p of this.poten) p.groep.rotation.x = Math.sin(this.stapFase + p.fase) * 0.7 * tempo;
    this.animeerStaart(this.tijd, tempo);
  }

  protected animeerStaart(tijd: number, _tempo: number) {
    this.staart.rotation.z = Math.sin(tijd * 2.2) * 0.25;
  }
}

export class Pony extends Dier {
  readonly hoofdAnker = new THREE.Vector3(0, 2.22, 1.02);
  private magisch = false;

  get isMagisch() {
    return this.magisch;
  }

  steiger() {
    this.startSpeciaal('steigeren', 1.4);
  }

  /** Alle gouden hoefijzers gevonden: de pony wordt een eenhoorn met regenboogmanen. */
  maakMagisch() {
    if (this.magisch) return;
    this.magisch = true;
    const g = this.groep;
    const parel = new THREE.MeshStandardMaterial({ color: '#fff6d6', emissive: '#ffd6f5', emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.2 });
    const hoorn = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.55, 10), parel);
    hoorn.position.set(0, 2.42, 1.3);
    hoorn.rotation.x = 0.55;
    g.add(hoorn);
    const regenboog = ['#ff4d4d', '#ff9a3d', '#ffd93d', '#5cd65c', '#4da6ff', '#7a5cff', '#c05cff'];
    const boven = new THREE.Vector3(0, 2.13, 0.72);
    const onder = new THREE.Vector3(0, 1.3, 0.33);
    regenboog.forEach((kleur, i) => {
      const p = boven.clone().lerp(onder, i / (regenboog.length - 1));
      const plukje = blok(0.2, 0.17, 0.26, kleur, p.x, p.y, p.z - 0.05);
      plukje.rotation.x = 0.45;
      g.add(plukje);
      if (i < 4) this.staart.add(blok(0.22, 0.2, 0.22, regenboog[i * 2], 0, -0.08 - i * 0.2, -0.06 - i * 0.05));
    });
  }

  constructor(naam: string, vacht: Vacht) {
    super(naam, 2.75);
    const g = this.groep;
    g.scale.setScalar(0.85); // een Shetlander is een kleine pony
    const { lijf, manen } = vacht;
    const hoef = '#3a2e28';

    g.add(blok(0.8, 0.78, 1.6, lijf, 0, 1.05, 0));
    if (vacht.vlekken) {
      g.add(blok(0.82, 0.5, 0.5, vacht.vlekken, 0, 1.12, -0.35));
      g.add(blok(0.82, 0.4, 0.35, vacht.vlekken, 0, 1.0, 0.45));
    }
    // Poten: diagonale paren lopen samen (draf)
    this.poot(-0.26, 0.72, 0.58, 0.72, 0.22, lijf, hoef, 0);
    this.poot(0.26, 0.72, -0.58, 0.72, 0.22, lijf, hoef, 0);
    this.poot(0.26, 0.72, 0.58, 0.72, 0.22, lijf, hoef, Math.PI);
    this.poot(-0.26, 0.72, -0.58, 0.72, 0.22, lijf, hoef, Math.PI);

    // Hals, hoofd en manen
    const hals = blok(0.42, 0.85, 0.46, lijf, 0, 1.62, 0.72);
    hals.rotation.x = 0.45;
    g.add(hals);
    const maanHals = blok(0.16, 0.9, 0.2, manen, 0, 1.7, 0.56);
    maanHals.rotation.x = 0.45;
    g.add(maanHals);
    g.add(blok(0.4, 0.42, 0.72, lijf, 0, 2.0, 1.08));
    g.add(blok(0.36, 0.3, 0.28, '#5a4638', 0, 1.9, 1.42)); // snuit
    g.add(blok(0.18, 0.16, 0.2, manen, 0, 2.27, 0.9)); // pluk
    g.add(blok(0.1, 0.2, 0.08, lijf, -0.13, 2.28, 0.8)); // oren
    g.add(blok(0.1, 0.2, 0.08, lijf, 0.13, 2.28, 0.8));
    g.add(blok(0.43, 0.09, 0.09, '#1b1512', 0, 2.08, 1.12)); // ogen

    // Staart
    this.staart.position.set(0, 1.35, -0.82);
    const s = blok(0.18, 0.8, 0.18, manen, 0, -0.38, -0.1);
    s.rotation.x = -0.25;
    this.staart.add(s);
    g.add(this.staart);
  }
}

export class Puppy extends Dier {
  readonly hoofdAnker = new THREE.Vector3(0, 1.08, 0.45);

  zoomies() {
    this.startSpeciaal('zoomies', 3.2);
  }

  constructor(naam: string, vacht: Vacht) {
    super(naam, 1.45);
    this.volgAfstand = 0.5;
    this.maxSnelheid = 10;
    const g = this.groep;
    const { lijf, manen } = vacht;

    g.add(blok(0.46, 0.4, 0.78, lijf, 0, 0.55, 0));
    if (vacht.vlekken) {
      g.add(blok(0.48, 0.14, 0.14, vacht.vlekken, 0.05, 0.7, -0.15));
      g.add(blok(0.48, 0.12, 0.12, vacht.vlekken, -0.06, 0.52, 0.2));
      g.add(blok(0.2, 0.12, 0.12, vacht.vlekken, 0.1, 0.78, 0.25));
    }
    const pootKleur = vacht.vlekken ? lijf : manen;
    this.poot(-0.15, 0.4, 0.26, 0.4, 0.14, lijf, pootKleur, 0);
    this.poot(0.15, 0.4, -0.26, 0.4, 0.14, lijf, pootKleur, 0);
    this.poot(0.15, 0.4, 0.26, 0.4, 0.14, lijf, pootKleur, Math.PI);
    this.poot(-0.15, 0.4, -0.26, 0.4, 0.14, lijf, pootKleur, Math.PI);

    // Hoofd
    g.add(blok(0.44, 0.4, 0.4, lijf, 0, 0.88, 0.45));
    g.add(blok(0.24, 0.18, 0.22, manen, 0, 0.8, 0.72)); // snuit
    g.add(blok(0.1, 0.08, 0.06, '#1b1512', 0, 0.86, 0.84)); // neus
    g.add(blok(0.46, 0.07, 0.07, '#1b1512', 0, 0.96, 0.62)); // ogen
    g.add(blok(0.1, 0.07, 0.03, '#ff7a93', 0, 0.72, 0.82)); // tong
    for (const x of [-0.25, 0.25]) {
      const oor = blok(0.08, 0.28, 0.2, manen, x, 0.86, 0.42);
      oor.rotation.z = x < 0 ? 0.25 : -0.25;
      g.add(oor);
    }

    // Kwispelstaart
    this.staart.position.set(0, 0.68, -0.38);
    const s = blok(0.08, 0.08, 0.34, manen, 0, 0.1, -0.12);
    s.rotation.x = 0.8;
    this.staart.add(s);
    g.add(this.staart);
  }

  protected animeerStaart(tijd: number, tempo: number) {
    this.staart.rotation.y = Math.sin(tijd * (14 + tempo * 6)) * 0.6;
  }
}
