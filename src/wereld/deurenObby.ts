// Een deuren-obby: een hindernisbaan met poorten. Bij elke poort staan twee
// deuren met een antwoord (een woord of een getal). Het goede antwoord gaat
// open; bij het foute gaat het valluik open en plof je zachtjes in het hooi.
// De Deuren-obby (spelling) en de Reken-obby gebruiken allebei deze klasse.

import * as THREE from 'three';
import { Fysica, botserUitBlok, overlapt, type Botser, type Lichaam } from '../spel/fysica';
import type { Vraag } from '../leren/vragen';
import { blok, blokOp, dynamisch, tekstBord, voegStatischSamen, type Tekstbord } from './bouwstenen';
import { beker, hoefijzer } from './versiering';

export const AANTAL_POORTEN = 6;
const BREEDTE = 10; // breedte van een poort (z-richting)
const GAT = 2; // afstand tussen platforms
const HOOI_TOP = 0.1; // bovenkant van het hooi onder de valluiken
export interface ObbyThema {
  id: 'spelling' | 'rekenen';
  naam: string;
  kleur: string;
  platforms: string[];
  deuren: [string, string];
  /** Het vraagbord: lichthout met donkere letters, of een schoolbord. */
  bord: { achtergrond: string; kleur: string; rand: string };
}

export const SPELLING_THEMA: ObbyThema = {
  id: 'spelling',
  naam: 'Deuren-obby',
  kleur: '#ff6f91',
  platforms: ['#ff6f91', '#ffc75f', '#4fc3f7', '#9ccc65', '#ba68c8', '#ff9f68'],
  deuren: ['#4a90e2', '#f5a623'],
  bord: { achtergrond: '#fff8e7', kleur: '#2b2340', rand: '#8a5a2b' },
};

export const REKEN_THEMA: ObbyThema = {
  id: 'rekenen',
  naam: 'Reken-obby',
  kleur: '#3a86ff',
  platforms: ['#3a86ff', '#2ec4b6', '#8ac926', '#ffca3a', '#4cc9f0', '#80ed99'],
  deuren: ['#35c46a', '#a35be0'],
  bord: { achtergrond: '#2f5d50', kleur: '#ffffff', rand: '#8a5a2b' },
};
const glas = new THREE.MeshStandardMaterial({ color: '#bfe9ff', transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false });

interface Deur {
  scharnier: THREE.Group;
  materiaal: THREE.MeshStandardMaterial;
  botser: Botser;
  trigger: Botser;
  bord: Tekstbord;
  hoek: number;
  doelHoek: number;
}

interface Luik {
  scharnier: THREE.Group;
  botser: Botser;
  hoek: number;
  doelHoek: number;
}

export interface Poort {
  index: number;
  vraag: Vraag | null;
  goedLinks: boolean;
  status: 'wacht' | 'open' | 'gevallen';
  pogingen: number;
  aangekondigd: boolean;
  inHooiGemeld: boolean;
  deuren: [Deur, Deur]; // links (z-), rechts (z+)
  luiken: [Luik, Luik];
  vraagBord: Tekstbord;
  hooi: Botser;
  naderZone: Botser;
  voor: THREE.Vector3; // checkpoint vóór de deuren
  na: THREE.Vector3; // checkpoint achter de deuren
  vlagMateriaal: THREE.MeshStandardMaterial;
}

export type ObbyGebeurtenis =
  | { soort: 'start' }
  | { soort: 'nader'; poort: Poort }
  | { soort: 'goed'; poort: Poort; eersteKeer: boolean }
  | { soort: 'fout'; poort: Poort }
  | { soort: 'inHooi'; poort: Poort }
  | { soort: 'finish' }
  | { soort: 'terug' };

export class DeurenObby {
  readonly groep = new THREE.Group();
  readonly poorten: Poort[] = [];
  readonly startPunt: THREE.Vector3;
  checkpoint: THREE.Vector3;
  private startZone: Botser;
  private finishZone: Botser;
  private portaalZone: Botser;
  private opPortaal = false;
  /** Midden van het finishplatform (bovenkant). */
  readonly finishPunt: THREE.Vector3;
  private opStart = false;
  private gefinisht = false;
  private marker: THREE.Mesh;
  private beker: THREE.Group;
  private tijd = 0;
  readonly beginX: number;

  readonly zc: number;

  constructor(scene: THREE.Scene, private f: Fysica, oorsprong: THREE.Vector3, readonly thema: ObbyThema = SPELLING_THEMA) {
    scene.add(this.groep);
    const zc = oorsprong.z;
    this.zc = zc;
    this.beginX = oorsprong.x - 3;

    // Startplatform met poortje en bord
    const sx = oorsprong.x + 2;
    this.vast(4, 0.5, 5, '#e8e1d5', sx, 0, zc);
    this.startPunt = new THREE.Vector3(sx, 0.5, zc);
    this.checkpoint = this.startPunt.clone();
    this.startZone = botserUitBlok(sx, 1.5, zc, 4, 2, 5);
    for (const dz of [-2.4, 2.4]) this.vast(0.5, 4.2, 0.5, '#ffffff', sx - 1.5, 0.5, zc + dz);
    this.vast(0.6, 0.6, 5.4, thema.kleur, sx - 1.5, 4.7, zc);
    const startBord = tekstBord(thema.naam, 4.4, 1.0, { breedte: 640, achtergrond: '#ffffff', rand: thema.kleur });
    startBord.mesh.position.set(sx - 1.84, 4.35, zc);
    startBord.mesh.rotation.y = -Math.PI / 2;
    this.groep.add(startBord.mesh);
    this.marker = dynamisch(hoefijzer(1.4));
    this.marker.position.set(sx - 1.5, 6.4, zc);
    this.groep.add(this.marker);

    // Het parcours
    let x = sx + 2;
    let y = 0.5;
    for (let i = 0; i < AANTAL_POORTEN; i++) {
      const maat = i < 2 ? 3 : 2.6;
      const zig = i % 2 === 0 ? 1.6 : -1.6;
      for (const [j, dz] of [[0, zig], [1, -zig]] as const) {
        x += GAT;
        y += 0.4;
        this.vast(maat, 0.6, maat, thema.platforms[(i * 2 + j) % thema.platforms.length], x + maat / 2, y - 0.6, zc + dz);
        x += maat;
      }
      x += GAT;
      y += 0.4;
      this.poorten.push(this.bouwPoort(i, x, y, zc));
      x += 8;
    }

    // Finish
    x += GAT;
    y += 0.4;
    this.vast(8, 0.6, 8, '#ffe082', x + 4, y - 0.6, zc);
    this.finishZone = botserUitBlok(x + 4, y + 1, zc, 8, 2, 8);
    this.finishPunt = new THREE.Vector3(x + 4, y, zc);
    // Portaal terug naar het eiland (zoals "back to lobby" in Roblox-obby's)
    const portaal = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.12, 1.8),
      new THREE.MeshStandardMaterial({ color: '#4da6ff', emissive: '#4da6ff', emissiveIntensity: 0.8 }),
    );
    portaal.position.set(x + 6.2, y + 0.06, zc - 2.7);
    this.groep.add(dynamisch(portaal));
    this.portaalZone = botserUitBlok(x + 6.2, y + 1, zc - 2.7, 1.4, 2, 1.4);
    this.groep.add(blokOp(0.12, 1.6, 0.12, '#ffffff', x + 7.3, y, zc - 3.7));
    const terugBord = tekstBord('Terug naar\nhet eiland', 1.8, 0.9, { breedte: 384, achtergrond: '#ffffff', rand: '#4da6ff' });
    terugBord.mesh.position.set(x + 7.22, y + 1.9, zc - 3.7);
    terugBord.mesh.rotation.y = -Math.PI / 2;
    this.groep.add(terugBord.mesh);
    this.beker = dynamisch(beker());
    this.beker.position.set(x + 5.5, y, zc);
    this.groep.add(this.beker);
    for (const dz of [-3.8, 3.8]) this.vast(0.5, 4.2, 0.5, '#ffffff', x + 0.5, y, zc + dz);
    this.vast(0.6, 0.6, 8.2, '#ffc75f', x + 0.5, y + 4.2, zc);
    const finishBord = tekstBord('Finish!', 3.6, 1.0, { breedte: 512, achtergrond: '#ffffff', rand: '#ffc75f' });
    finishBord.mesh.position.set(x + 0.16, y + 3.7, zc);
    finishBord.mesh.rotation.y = -Math.PI / 2;
    this.groep.add(finishBord.mesh);

    voegStatischSamen(this.groep);
  }

  /** Zichtbaar blok met botser; y is de onderkant. */
  private vast(b: number, h: number, d: number, kleur: string, x: number, y: number, z: number) {
    this.groep.add(blokOp(b, h, d, kleur, x, y, z));
    return this.f.voegToe(botserUitBlok(x, y + h / 2, z, b, h, d));
  }

  private bouwPoort(index: number, x0: number, gy: number, zc: number): Poort {
    const f = this.f;
    const halve = BREEDTE / 2;
    // Aanloopstrook, en de strook achter de deuren
    this.vast(2, 0.6, BREEDTE, '#e8e1d5', x0 + 1, gy - 0.6, zc);
    this.vast(3, 0.6, BREEDTE, '#e8e1d5', x0 + 6.5, gy - 0.6, zc);

    // Twee valluiken vóór de deuren (scharnier aan de kant van de aanloop)
    const luiken = ([-1, 1] as const).map((kant) => {
      const scharnier = dynamisch(new THREE.Group());
      scharnier.position.set(x0 + 2, gy, zc + (kant * halve) / 2);
      const plank = blok(2.6, 0.6, halve - 0.04, '#b07a45', 1.3, -0.3, 0);
      scharnier.add(plank);
      for (let p = -1; p <= 1; p++) scharnier.add(blok(2.6, 0.02, 0.08, '#8a5a2b', 1.3, 0.005, p * 1.4, false));
      this.groep.add(scharnier);
      const botser = f.voegToe(botserUitBlok(x0 + 3.3, gy - 0.3, zc + (kant * halve) / 2, 2.6, 0.6, halve));
      return { scharnier, botser, hoek: 0, doelHoek: 0 };
    }) as [Luik, Luik];

    // Muur met twee deuropeningen, en glazen zijwanden zodat je niet
    // om de deuren heen kunt springen (en niet per ongeluk van de zijkant valt).
    const mx = x0 + 4.8;
    const muur = '#7e8aa2';
    const H = 3.6;
    this.vast(0.4, H, 1.4, muur, mx, gy, zc - 4.3);
    this.vast(0.4, H, 2.8, muur, mx, gy, zc);
    this.vast(0.4, H, 1.4, muur, mx, gy, zc + 4.3);
    for (const kant of [-1, 1]) {
      const z = zc + kant * (halve + 0.15);
      this.groep.add(blokOp(8, H, 0.3, glas, x0 + 4, gy, z, false));
      this.groep.add(blokOp(8, 0.2, 0.36, '#ffffff', x0 + 4, gy + H, z));
      f.voegToe(botserUitBlok(x0 + 4, gy + H / 2, z, 8, H, 0.3));
    }
    this.vast(0.4, 0.6, 2.2, muur, mx, gy + 3.0, zc - 2.5);
    this.vast(0.4, 0.6, 2.2, muur, mx, gy + 3.0, zc + 2.5);

    const deurKleuren = this.thema.deuren;
    const deuren = ([-1, 1] as const).map((kant, i) => {
      const dz = zc + kant * 2.5;
      const materiaal = new THREE.MeshStandardMaterial({ color: deurKleuren[i], roughness: 0.6 });
      const scharnier = dynamisch(new THREE.Group());
      scharnier.position.set(mx, gy, dz - 1.1);
      const paneel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.0, 2.2), materiaal);
      paneel.position.set(0, 1.5, 1.1);
      paneel.castShadow = true;
      scharnier.add(paneel);
      scharnier.add(blok(0.12, 0.18, 0.18, '#ffd23f', -0.14, 1.3, 1.9)); // deurknop
      const bord = tekstBord('...', 2.0, 0.9, { breedte: 512, achtergrond: '#ffffff', rand: '#2b2340' });
      bord.mesh.position.set(-0.11, 1.95, 1.1);
      bord.mesh.rotation.y = -Math.PI / 2;
      scharnier.add(bord.mesh);
      this.groep.add(scharnier);
      const botser = f.voegToe(botserUitBlok(mx, gy + 1.5, dz, 0.2, 3.0, 2.2));
      const trigger = botserUitBlok(mx - 0.35, gy + 1.5, dz, 0.5, 3.0, 2.0);
      return { scharnier, materiaal, botser, trigger, bord, hoek: 0, doelHoek: 0 };
    }) as [Deur, Deur];

    // Bord met de zin boven de muur
    const vraagBord = tekstBord('...', 9.6, 1.4, { breedte: 1024, ...this.thema.bord });
    vraagBord.mesh.position.set(mx - 0.22, gy + H + 0.75, zc);
    vraagBord.mesh.rotation.y = -Math.PI / 2;
    this.groep.add(vraagBord.mesh);
    this.groep.add(blok(0.3, 1.5, 9.8, '#8a5a2b', mx, gy + H + 0.75, zc));
    f.voegToe(botserUitBlok(mx, gy + H + 0.75, zc, 0.3, 1.5, 9.8)); // zodat de camera er niet achter blijft hangen

    // Zacht hooi onder de valluiken
    const hooiTop = HOOI_TOP;
    this.groep.add(blokOp(4.6, 1.3, BREEDTE + 1, '#e9c46a', x0 + 3.3, hooiTop - 1.3, zc));
    for (let i = 0; i < 6; i++) {
      this.groep.add(blokOp(0.8, 0.3, 1.2, '#d4a72c', x0 + 1.6 + (i % 3) * 1.6, hooiTop, zc - 4 + i * 1.6, false));
    }
    const hooi = f.voegToe(botserUitBlok(x0 + 3.3, hooiTop - 0.65, zc, 4.6, 1.3, BREEDTE + 1, 'hooi'));

    // Checkpoint-vlag achter de deuren
    const vlagMateriaal = new THREE.MeshStandardMaterial({ color: '#c9c9c9', roughness: 0.7 });
    this.groep.add(blokOp(0.12, 2.6, 0.12, '#ffffff', x0 + 7.6, gy, zc + 4.2));
    const vlag = dynamisch(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 1.0), vlagMateriaal));
    vlag.position.set(x0 + 7.6, gy + 2.2, zc + 3.7);
    this.groep.add(vlag);

    return {
      index,
      vraag: null,
      goedLinks: true,
      status: 'wacht',
      pogingen: 0,
      aangekondigd: false,
      inHooiGemeld: false,
      deuren,
      luiken,
      vraagBord,
      hooi,
      naderZone: botserUitBlok(x0 + 2.3, gy + 1.5, zc, 4.6, 3, BREEDTE),
      voor: new THREE.Vector3(x0 + 0.9, gy, zc),
      na: new THREE.Vector3(x0 + 6.5, gy, zc),
      vlagMateriaal,
    };
  }

  /** Nieuwe ronde: alle poorten dicht en nieuwe vragen. */
  startRonde(vragen: Vraag[]) {
    this.gefinisht = false;
    this.checkpoint = this.startPunt.clone();
    this.poorten.forEach((p, i) => {
      p.status = 'wacht';
      p.pogingen = 0;
      p.aangekondigd = false;
      p.inHooiGemeld = false;
      p.vlagMateriaal.color.set('#c9c9c9');
      for (const d of p.deuren) {
        d.doelHoek = 0;
        d.botser.actief = true;
      }
      for (const l of p.luiken) {
        l.doelHoek = 0;
        l.botser.actief = true;
      }
      p.vraag = vragen[i % vragen.length] ?? null;
      if (p.vraag) {
        p.vraagBord.zetTekst(p.vraag.tekst.replace('___', '?'));
        this.husselDeuren(p);
      }
    });
  }

  private husselDeuren(p: Poort) {
    if (!p.vraag) return;
    p.goedLinks = Math.random() < 0.5;
    p.deuren[0].bord.zetTekst(p.goedLinks ? p.vraag.goed : p.vraag.fout);
    p.deuren[1].bord.zetTekst(p.goedLinks ? p.vraag.fout : p.vraag.goed);
  }

  /** Na een fout: valluik dicht, deuren opnieuw gehusseld, nog een kans. */
  herstelPoort(p: Poort) {
    p.status = 'wacht';
    p.aangekondigd = false;
    p.inHooiGemeld = false;
    for (const l of p.luiken) {
      l.doelHoek = 0;
      l.botser.actief = true;
    }
    this.husselDeuren(p);
    this.checkpoint = p.voor.clone();
  }

  /** Is de speler op (of boven) dit parcours? Dan wachten de dieren bij de start. */
  bevat(x: number, z: number): boolean {
    return x > this.beginX + 1.5 && Math.abs(z - this.zc) < 12;
  }

  /** Waar de dieren wachten terwijl je de obby doet. */
  wachtplek(i: number): THREE.Vector3 {
    return new THREE.Vector3(this.beginX - 1.5, 0, this.zc + (i === 0 ? -3 : 3));
  }

  update(dt: number, speler: Lichaam): ObbyGebeurtenis[] {
    this.tijd += dt;
    const uit: ObbyGebeurtenis[] = [];
    this.marker.rotation.y += dt * 1.6;
    this.marker.position.y += Math.sin(this.tijd * 2) * dt * 0.3;
    this.beker.rotation.y += dt * 0.8;

    const opStart = overlapt(this.startZone, speler);
    if (opStart && !this.opStart) uit.push({ soort: 'start' });
    this.opStart = opStart;

    for (const p of this.poorten) {
      if (!p.vraag) continue;
      if (p.status === 'wacht') {
        if (!p.aangekondigd && overlapt(p.naderZone, speler)) {
          p.aangekondigd = true;
          this.checkpoint = p.voor.clone();
          uit.push({ soort: 'nader', poort: p });
        }
        for (let i = 0; i < 2; i++) {
          if (!overlapt(p.deuren[i].trigger, speler)) continue;
          const goed = (i === 0) === p.goedLinks;
          if (goed) {
            p.status = 'open';
            p.deuren[i].doelHoek = 1.7;
            p.deuren[i].botser.actief = false;
            p.vlagMateriaal.color.set('#35c46a');
            this.checkpoint = p.na.clone();
            uit.push({ soort: 'goed', poort: p, eersteKeer: p.pogingen === 0 });
          } else {
            p.status = 'gevallen';
            p.pogingen++;
            p.luiken[i].doelHoek = -1.45;
            p.luiken[i].botser.actief = false;
            uit.push({ soort: 'fout', poort: p });
          }
          break;
        }
      } else if (p.status === 'gevallen' && !p.inHooiGemeld && (speler.grond === p.hooi || speler.pos.y < HOOI_TOP - 0.6)) {
        // In het hooi geland (of met veel vaart erlangs in het water): tijd voor de tip.
        p.inHooiGemeld = true;
        uit.push({ soort: 'inHooi', poort: p });
      }

      for (const d of p.deuren) {
        d.hoek += (d.doelHoek - d.hoek) * Math.min(1, dt * 5);
        d.scharnier.rotation.y = d.hoek;
      }
      for (const l of p.luiken) {
        l.hoek += (l.doelHoek - l.hoek) * Math.min(1, dt * 9);
        l.scharnier.rotation.z = l.hoek;
      }
    }

    if (!this.gefinisht && overlapt(this.finishZone, speler)) {
      this.gefinisht = true;
      this.checkpoint = this.finishPunt.clone();
      uit.push({ soort: 'finish' });
    }
    const opPortaal = overlapt(this.portaalZone, speler);
    if (opPortaal && !this.opPortaal) uit.push({ soort: 'terug' });
    this.opPortaal = opPortaal;
    return uit;
  }

  get bekerPositie(): THREE.Vector3 {
    return this.beker.position.clone().add(new THREE.Vector3(0, 2, 0));
  }
}
