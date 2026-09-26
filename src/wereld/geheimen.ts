// Easter eggs: verstopte gouden hoefijzers, een trampoline, stapstenen naar
// een eilandje, een wolkenpad naar een wolkeneiland en een schatkist met slot.

import * as THREE from 'three';
import { Fysica, botserUitBlok, overlapt, type Botser, type Lichaam } from '../spel/fysica';
import { blok, blokOp, dynamisch, tekstBord, voegStatischSamen } from './bouwstenen';
import { hoefijzer } from './versiering';

export interface GeheimInfo {
  id: string;
  naam: string;
  hint: string;
}

/** Het geheimenboek. Wat nog niet gevonden is, staat er als ??? met een hint. */
export const GEHEIMEN: GeheimInfo[] = [
  { id: 'hoefijzers', naam: 'Gouden hoefijzers', hint: 'Er liggen 5 gouden hoefijzers verstopt. Eentje ligt heel hoog!' },
  { id: 'eenhoorn', naam: 'Magische pony', hint: 'Wat zou er gebeuren als je alle gouden hoefijzers vindt?' },
  { id: 'trampoline', naam: 'Boing!', hint: 'Achter de stal staat iets waar je heel hoog op kunt springen.' },
  { id: 'eilandje', naam: 'Palmeilandje', hint: 'Zie je in de verte een palmboom? Misschien kun je erheen springen.' },
  { id: 'wolkeneiland', naam: 'Wolkeneiland', hint: 'Kijk eens goed omhoog bij de finish van de Deuren-obby.' },
  { id: 'schatkist', naam: 'Schatkist', hint: 'Op de achterkant van een bord staat een geheim wachtwoord.' },
  { id: 'dansje', naam: 'Dansfeest', hint: 'Wat doet Ninte als ze een tijdje helemaal niks doet?' },
  { id: 'zoomies', naam: 'Zoomies!', hint: 'Tik heel vaak snel achter elkaar op je puppy.' },
  { id: 'steigeren', naam: 'Steigeren', hint: 'Tik heel vaak snel achter elkaar op je pony.' },
];

export const WACHTWOORD = 'regenboog';

export type GeheimGebeurtenis =
  | { soort: 'hoefijzer'; id: string; pos: THREE.Vector3 }
  | { soort: 'trampoline' }
  | { soort: 'kist' }
  | { soort: 'eilandje' }
  | { soort: 'wolkeneiland' };

interface GoudenHoefijzer {
  id: string;
  mesh: THREE.Mesh;
  basisY: number;
  gevonden: boolean;
}

/** Een zone waarbij je één keer een melding krijgt als je erin komt. */
interface Zone {
  botser: Botser;
  binnen: boolean;
}

function zone(x: number, y: number, z: number, b: number, h: number, d: number): Zone {
  return { botser: botserUitBlok(x, y, z, b, h, d), binnen: false };
}

export class Geheimen {
  readonly groep = new THREE.Group();
  private hoefijzers: GoudenHoefijzer[] = [];
  private trampoline: Botser;
  private kistDeksel = dynamisch(new THREE.Group());
  private kistOpen = false;
  private kistZone: Zone;
  private eilandZone: Zone;
  private wolkZone: Zone;
  /** Gebied rond het wolkenpad (voor de muziek). */
  private wolkGebied: Botser;
  private tijd = 0;

  constructor(scene: THREE.Scene, private f: Fysica, finish: THREE.Vector3) {
    scene.add(this.groep);
    this.trampoline = this.bouwTrampoline();
    this.bouwStaldak();
    this.kistZone = this.bouwKist();
    this.eilandZone = this.bouwEilandje();
    const wolk = this.bouwWolkenpad(finish);
    this.wolkZone = wolk.zone;
    this.wolkGebied = wolk.gebied;

    // De vijf gouden hoefijzers
    this.bouwHooitoren();
    this.plaatsHoefijzer('hooi', -25, 3.9, 6.4); // bovenop de hooitoren in de wei
    this.plaatsHoefijzer('dak', -16.2, 6.1, -6); // op het dak van de stal
    this.plaatsHoefijzer('dorp', -5.4, 1.0, -33); // achter de kratten bij het dorp
    this.plaatsHoefijzer('palm', -57.5, 1.1, -25); // op het palmeilandje
    this.plaatsHoefijzer('wolk', finish.x + 8, finish.y + 10, finish.z - 7.5); // op het wolkeneiland

    voegStatischSamen(this.groep);
  }

  private vast(b: number, h: number, d: number, kleur: string | THREE.Material, x: number, y: number, z: number) {
    this.groep.add(blokOp(b, h, d, kleur, x, y, z));
    return this.f.voegToe(botserUitBlok(x, y + h / 2, z, b, h, d));
  }

  private plaatsHoefijzer(id: string, x: number, y: number, z: number) {
    const mesh = dynamisch(hoefijzer(0.9));
    mesh.position.set(x, y, z);
    this.groep.add(mesh);
    this.hoefijzers.push({ id, mesh, basisY: y, gevonden: false });
  }

  /** Al gevonden hoefijzers niet meer laten zien. */
  verberg(ids: string[]) {
    for (const h of this.hoefijzers) {
      if (ids.includes(h.id)) {
        h.gevonden = true;
        h.mesh.visible = false;
      }
    }
  }

  openKist(direct = false) {
    this.kistOpen = true;
    if (direct) this.kistDeksel.rotation.x = -1.9;
  }

  get kistIsOpen() {
    return this.kistOpen;
  }

  /** Is de speler op of bij het wolkenpad? */
  opWolken(l: Lichaam): boolean {
    return overlapt(this.wolkGebied, l);
  }

  private bouwTrampoline(): Botser {
    const x = -28.5;
    const z = -6;
    for (const [dx, dz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) {
      this.groep.add(blokOp(0.2, 0.3, 0.2, '#555b66', x + dx, 0, z + dz));
    }
    this.groep.add(blokOp(3.2, 0.14, 3.2, '#3a86ff', x, 0.28, z));
    this.groep.add(blokOp(2.6, 0.16, 2.6, '#1b1b24', x, 0.3, z));
    return this.f.voegToe(botserUitBlok(x, 0.21, z, 3.2, 0.42, 3.2));
  }

  /** Een trapje van hooibalen in de wei: 1, 2 en 3 balen hoog. */
  private bouwHooitoren() {
    const x = -25;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j <= i; j++) this.vast(1.6, 1, 1.2, j % 2 ? '#e2b85a' : '#e9c46a', x, j, 4 + i * 1.2);
    }
  }

  /** Onzichtbare treden op het schuine staldak, zodat je erop kunt staan. */
  private bouwStaldak() {
    const lagen: [number, number, number][] = [
      [-6, 2, 5.1],
      [-7.75, 1.5, 4.6],
      [-4.25, 1.5, 4.6],
      [-9.25, 1.5, 4.0],
      [-2.75, 1.5, 4.0],
    ];
    for (const [z, d, top] of lagen) this.f.voegToe(botserUitBlok(-20, top - 0.2, z, 11, 0.4, d));
  }

  private bouwKist(): Zone {
    const x = -23.3;
    const z = -3.7;
    const bruin = '#8a5a2b';
    const goud = '#ffc933';
    this.vast(1.3, 0.6, 0.8, bruin, x, 0, z);
    this.groep.add(blokOp(1.34, 0.1, 0.84, goud, x, 0.25, z));
    this.groep.add(blokOp(0.2, 0.25, 0.1, goud, x, 0.3, z + 0.42));
    // Deksel met scharnier aan de achterkant
    this.kistDeksel.position.set(x, 0.6, z - 0.4);
    this.kistDeksel.add(blok(1.3, 0.3, 0.8, bruin, 0, 0.15, 0.4));
    this.kistDeksel.add(blok(1.34, 0.08, 0.84, goud, 0, 0.3, 0.4));
    this.groep.add(this.kistDeksel);
    return zone(x, 1, z + 0.6, 2.8, 2, 2.4);
  }

  private bouwEilandje(): Zone {
    // Stapstenen vanaf de noordwesthoek van het eiland
    const z = -24;
    for (let i = 0; i < 5; i++) {
      const x = -40.3 - i * 2.6;
      this.vast(1.8, 0.5, 1.8, '#9aa3ab', x, -0.75, z + (i % 2 === 0 ? 0.3 : -0.3));
    }
    // Het eilandje met een palmboom
    const cx = -56;
    this.vast(7, 3, 7, '#f2d59b', cx, -3, z);
    const stam = '#9b6b3d';
    for (let i = 0; i < 6; i++) this.groep.add(blokOp(0.45, 0.6, 0.45, stam, cx - 1.5 + i * 0.12, i * 0.6, z + 1 - i * 0.05));
    this.f.voegToe(botserUitBlok(cx - 1.2, 1.8, z + 0.85, 0.6, 3.6, 0.6));
    const blad = '#3fae4a';
    for (let i = 0; i < 5; i++) {
      const hoek = (i / 5) * Math.PI * 2;
      const b = blok(2.4, 0.12, 0.7, blad, cx - 0.8 + Math.cos(hoek) * 1.1, 3.55, z + 0.8 + Math.sin(hoek) * 1.1);
      b.rotation.y = -hoek;
      b.rotation.z = 0.25;
      this.groep.add(b);
    }
    this.groep.add(blokOp(0.35, 0.35, 0.35, '#6b4226', cx - 0.8, 3.2, z + 0.8)); // kokosnoot
    // Een schelp en een zandkasteeltje
    this.groep.add(blokOp(0.4, 0.15, 0.3, '#ffb3c7', cx + 2, 0, z - 2));
    this.groep.add(blokOp(1, 0.6, 1, '#e8c77f', cx + 1.6, 0, z + 2));
    this.groep.add(blokOp(0.4, 0.4, 0.4, '#e8c77f', cx + 1.6, 0.6, z + 2));
    return zone(cx, 1, z, 7, 2.5, 7);
  }

  private bouwWolkenpad(f: THREE.Vector3): { zone: Zone; gebied: Botser } {
    const wolkMat = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#e3eefa' });
    const treden: [number, number, number][] = [
      [2, 1.1, 6.5],
      [-1, 2.2, 8.5],
      [-4, 3.3, 6.5],
      [-5.5, 4.4, 3.3],
      [-5, 5.5, 0],
      [-2.5, 6.6, -2.5],
      [0.5, 7.7, -4.5],
    ];
    for (const [dx, dy, dz] of treden) {
      const x = f.x + dx;
      const y = f.y + dy;
      const z = f.z + dz;
      this.groep.add(blok(2.4, 0.5, 2.4, wolkMat, x, y - 0.25, z));
      this.groep.add(blok(1.4, 0.4, 1.4, wolkMat, x + 0.5, y - 0.1, z - 0.4));
      this.f.voegToe(botserUitBlok(x, y - 0.25, z, 2.4, 0.5, 2.4));
    }
    // Het wolkeneiland
    const cx = f.x + 6;
    const cy = f.y + 8.8;
    const cz = f.z - 6;
    this.vast(7, 1, 7, '#6cc24a', cx, cy - 1, cz);
    this.groep.add(blokOp(6, 1.2, 6, '#8b5a2b', cx, cy - 2.2, cz, false));
    this.groep.add(blokOp(3.5, 1, 3.5, '#7a4f2a', cx, cy - 3.2, cz, false));
    for (const [dx, dz] of [[-3.2, 3], [3.4, -2.6], [-3, -3.4]]) {
      this.groep.add(blok(2.6, 0.9, 1.8, wolkMat, cx + dx, cy - 1.3, cz + dz, false));
    }
    // Regenboog
    const kleuren = ['#ff4d4d', '#ff9a3d', '#ffd93d', '#5cd65c', '#4da6ff', '#7a5cff', '#c05cff'];
    kleuren.forEach((kleur, i) => {
      const boog = dynamisch(new THREE.Mesh(
        new THREE.TorusGeometry(3.4 - i * 0.22, 0.12, 6, 32, Math.PI),
        new THREE.MeshBasicMaterial({ color: kleur }),
      ));
      boog.position.set(cx, cy, cz - 1.5);
      this.groep.add(boog);
    });
    const bord = tekstBord('Wolkeneiland', 3, 0.8, { breedte: 512, achtergrond: '#ffffff', rand: '#7a5cff' });
    bord.mesh.position.set(cx - 3.2, cy + 1.2, cz + 3.2);
    bord.mesh.rotation.y = -Math.PI / 4;
    this.groep.add(bord.mesh);
    this.groep.add(blokOp(0.15, 1.3, 0.15, '#8a5a2b', cx - 3.2, cy, cz + 3.25));
    return {
      zone: zone(cx, cy + 1.2, cz, 7, 2.5, 7),
      gebied: botserUitBlok(f.x + 1, f.y + 9, f.z, 18, 12, 22),
    };
  }

  private binnenkomst(z: Zone, l: Lichaam): boolean {
    const nu = overlapt(z.botser, l);
    const nieuw = nu && !z.binnen;
    z.binnen = nu;
    return nieuw;
  }

  update(dt: number, speler: Lichaam): GeheimGebeurtenis[] {
    this.tijd += dt;
    const uit: GeheimGebeurtenis[] = [];
    const p = speler.pos;
    for (const h of this.hoefijzers) {
      if (h.gevonden) continue;
      h.mesh.rotation.y += dt * 2.2;
      h.mesh.position.y = h.basisY + Math.sin(this.tijd * 2.5 + h.basisY) * 0.15;
      const dx = h.mesh.position.x - p.x;
      const dz = h.mesh.position.z - p.z;
      const dy = h.mesh.position.y - (p.y + 1.2);
      if (Math.hypot(dx, dz) < 1.3 && Math.abs(dy) < 1.3) {
        h.gevonden = true;
        h.mesh.visible = false;
        uit.push({ soort: 'hoefijzer', id: h.id, pos: h.mesh.position.clone() });
      }
    }
    if (speler.opGrond && speler.grond === this.trampoline) uit.push({ soort: 'trampoline' });
    if (this.binnenkomst(this.kistZone, speler) && !this.kistOpen) uit.push({ soort: 'kist' });
    if (this.binnenkomst(this.eilandZone, speler)) uit.push({ soort: 'eilandje' });
    if (this.binnenkomst(this.wolkZone, speler)) uit.push({ soort: 'wolkeneiland' });
    if (this.kistOpen) this.kistDeksel.rotation.x += (-1.9 - this.kistDeksel.rotation.x) * Math.min(1, dt * 4);
    return uit;
  }
}
