// De bouwkavel in de 3D-wereld: de grond, Bas de bouwer, en alles wat Ninte gebouwd
// heeft (met botsing, zodat ze haar huis in kan lopen en op haar toren kan klimmen).

import * as THREE from 'three';
import { botserUitBlok, type Botser, type Fysica, type Vec3 } from '../spel/fysica';
import { blok, blokOp, dynamisch, tekstBord, voegStatischSamen } from '../wereld/bouwstenen';
import type { Interactie } from '../avontuur/wereld';
import { plattegrond } from './analyse';
import { blokModel, meubelModel, muurBotsing, muurModel } from './modellen';
import { KAVEL, KAVEL_RAND, MUUR_HOOGTE, kleurHex, onderdeel, type Botsing } from './onderdelen';
import { geldigeRand, meubelMaat, type BouwStand, type Richting } from './stand';

const C = KAVEL.cel;
const B = KAVEL.breedte;
const D = KAVEL.diepte;

export const KAVEL_MIDDEN = { x: KAVEL.x0 + (B * C) / 2, z: KAVEL.z0 + (D * C) / 2 } as const;
/** Waar Bas staat (en waar je na het bouwen weer staat). */
export const BAS_PLEK = { x: KAVEL_RAND.x1 + 1.8, z: KAVEL_RAND.z1 - 3 } as const;
export const INGANG = { x: KAVEL_RAND.x1 + 3.2, y: 0, z: KAVEL_RAND.z1 - 5.5 } as const;

/** Midden van een vakje in de wereld. */
export function celMidden(x: number, z: number): { x: number; z: number } {
  return { x: KAVEL.x0 + (x + 0.5) * C, z: KAVEL.z0 + (z + 0.5) * C };
}

/** Het vakje onder een punt in de wereld (kan buiten het raster vallen). */
export function vakjeBij(wx: number, wz: number): [number, number] {
  return [Math.floor((wx - KAVEL.x0) / C), Math.floor((wz - KAVEL.z0) / C)];
}

/** De dichtstbijzijnde rand bij een punt. Met `richting` alleen liggende of staande randen. */
export function randBij(wx: number, wz: number, richting?: Richting): [Richting, number, number] | null {
  const fx = (wx - KAVEL.x0) / C, fz = (wz - KAVEL.z0) / C;
  const h: [Richting, number, number] = ['h', Math.floor(fx), Math.round(fz)];
  const v: [Richting, number, number] = ['v', Math.round(fx), Math.floor(fz)];
  const kies = richting === 'h' ? h : richting === 'v' ? v : Math.abs(fz - Math.round(fz)) <= Math.abs(fx - Math.round(fx)) ? h : v;
  return geldigeRand(...kies) ? kies : null;
}

/** Midden van een rand in de wereld. */
export function randMidden(r: Richting, x: number, z: number): { x: number; z: number } {
  return r === 'h' ? { x: KAVEL.x0 + (x + 0.5) * C, z: KAVEL.z0 + z * C } : { x: KAVEL.x0 + x * C, z: KAVEL.z0 + (z + 0.5) * C };
}

export class BouwWereld {
  readonly groep = new THREE.Group();
  readonly interacties: Interactie[] = [];
  readonly bas = new THREE.Group();
  readonly raster: THREE.LineSegments;
  readonly cursor: THREE.Mesh;
  private gebouw = new THREE.Group();
  private dak = new THREE.Group();
  private botsers: Botser[] = [];
  private laatste = '';
  private kamerVakjes = new Set<string>();
  bouwmodus = false;

  constructor(scene: THREE.Scene, private f: Fysica, private stand: BouwStand) {
    scene.add(this.groep);
    this.groep.add(this.gebouw, this.dak);
    this.bouwKavel();
    this.raster = this.maakRaster();
    this.cursor = dynamisch(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false })));
    this.cursor.visible = false;
    this.groep.add(this.raster, this.cursor);
    this.sync(true);
  }

  private bouwKavel() {
    const vast = new THREE.Group();
    const breed = B * C, diep = D * C;
    vast.add(blokOp(breed + 1, 0.03, diep + 1, '#e8d9b5', KAVEL_MIDDEN.x, 0, KAVEL_MIDDEN.z, false));
    // Een vrolijke rand van gekleurde tegels rond de kavel
    const kleuren = ['#ff5fa2', '#ffd23f', '#46d17a', '#4fb8ff', '#a36bff', '#ff8a3d'];
    let i = 0;
    for (let x = 0; x < B; x++) for (const z of [KAVEL.z0 - 0.35, KAVEL_RAND.z1 + 0.35]) vast.add(blokOp(C - 0.1, 0.05, 0.5, kleuren[i++ % 6], KAVEL.x0 + (x + 0.5) * C, 0, z, false));
    for (let z = 0; z < D; z++) for (const x of [KAVEL.x0 - 0.35, KAVEL_RAND.x1 + 0.35]) vast.add(blokOp(0.5, 0.05, C - 0.1, kleuren[i++ % 6], x, 0, KAVEL.z0 + (z + 0.5) * C, false));
    // Vlaggetjes op de hoeken
    for (const [x, z] of [[KAVEL.x0, KAVEL.z0], [KAVEL_RAND.x1, KAVEL.z0], [KAVEL.x0, KAVEL_RAND.z1], [KAVEL_RAND.x1, KAVEL_RAND.z1]]) {
      vast.add(blokOp(0.12, 2.6, 0.12, '#f6f1ff', x, 0, z));
      vast.add(blok(0.06, 0.5, 0.7, kleuren[i++ % 6], x, 2.35, z + 0.35));
    }
    // Een stapel bouwmateriaal
    for (let n = 0; n < 6; n++) vast.add(blokOp(0.7, 0.35, 0.35, '#d9774a', BAS_PLEK.x + 0.6 + (n % 3) * 0.72, Math.floor(n / 3) * 0.35, BAS_PLEK.z + 2.2));
    this.f.voegToe(botserUitBlok(BAS_PLEK.x + 1.32, 0.35, BAS_PLEK.z + 2.2, 2.2, 0.7, 0.4));
    this.groep.add(vast);
    voegStatischSamen(vast);
    // Bord
    const bord = tekstBord('🏡 Jouw bouwkavel', 5, 1.2, { breedte: 640, achtergrond: '#fff9e9', rand: '#ff8a3d' });
    bord.mesh.position.set(KAVEL_RAND.x1 + 0.8, 2.6, KAVEL_RAND.z1 - 7);
    bord.mesh.rotation.y = Math.PI / 2;
    this.groep.add(dynamisch(bord.mesh), blokOp(0.15, 2.2, 0.15, '#c68b59', KAVEL_RAND.x1 + 0.8, 0, KAVEL_RAND.z1 - 7));
    // Bas de bouwer, met een gele helm
    const bas = this.bas;
    bas.position.set(BAS_PLEK.x, 0, BAS_PLEK.z);
    bas.rotation.y = Math.PI / 2;
    bas.add(blokOp(0.22, 0.7, 0.28, '#3b5a8c', -0.2, 0, 0), blokOp(0.22, 0.7, 0.28, '#3b5a8c', 0.2, 0, 0));
    bas.add(blokOp(0.7, 0.85, 0.42, '#ff8a3d', 0, 0.7, 0), blokOp(0.72, 0.12, 0.44, '#ffd23f', 0, 1.0, 0));
    bas.add(blokOp(0.55, 0.55, 0.5, '#e8b48a', 0, 1.55, 0), blok(0.08, 0.08, 0.04, '#283849', -0.12, 1.88, 0.26), blok(0.08, 0.08, 0.04, '#283849', 0.12, 1.88, 0.26));
    bas.add(blokOp(0.66, 0.22, 0.62, '#ffd23f', 0, 2.08, 0), blokOp(0.7, 0.05, 0.75, '#ffd23f', 0, 2.06, 0.08));
    const naam = tekstBord('💬 Bas de bouwer', 2.8, 0.7, { breedte: 512, achtergrond: '#fff9e9', rand: '#ff8a3d' });
    naam.mesh.position.set(0, 2.9, 0);
    bas.add(dynamisch(naam.mesh));
    dynamisch(bas);
    this.groep.add(bas);
    this.f.voegToe(botserUitBlok(BAS_PLEK.x, 1.1, BAS_PLEK.z, 0.7, 2.2, 0.7));
    this.interacties.push({ id: 'bouwen', naam: '🔨 Bouwen met Bas', x: BAS_PLEK.x, y: 0, z: BAS_PLEK.z, soort: 'actie' });
  }

  private maakRaster(): THREE.LineSegments {
    const punten: number[] = [];
    for (let x = 0; x <= B; x++) punten.push(KAVEL.x0 + x * C, 0.12, KAVEL.z0, KAVEL.x0 + x * C, 0.12, KAVEL_RAND.z1);
    for (let z = 0; z <= D; z++) punten.push(KAVEL.x0, 0.12, KAVEL.z0 + z * C, KAVEL_RAND.x1, 0.12, KAVEL.z0 + z * C);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(punten, 3));
    const lijnen = dynamisch(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 })));
    lijnen.visible = false;
    return lijnen;
  }

  private botsBlok(x: number, y: number, z: number, b: number, h: number, d: number) {
    this.botsers.push(this.f.voegToe(botserUitBlok(x, y + h / 2, z, b, h, d)));
  }

  private leegGroep(g: THREE.Group) {
    for (const kind of [...g.children]) {
      g.remove(kind);
      kind.traverse((o) => { if (o instanceof THREE.Mesh && o.geometry.userData.samengevoegd) o.geometry.dispose(); });
    }
  }

  /** Alles opnieuw opbouwen als de bouwstand veranderd is. */
  sync(force = false) {
    const s = this.stand;
    const handtekening = JSON.stringify([s.muren, s.vloer, s.meubels, s.blokken, s.dak, s.dakKleur]);
    if (!force && handtekening === this.laatste) return;
    this.laatste = handtekening;
    this.leegGroep(this.gebouw);
    this.leegGroep(this.dak);
    const weg = new Set(this.botsers);
    this.f.botsers = this.f.botsers.filter((b) => !weg.has(b));
    this.botsers = [];

    for (const m of s.muren) {
      const p = randMidden(m.r, m.x, m.z);
      const model = muurModel(m.soort, m.kleur);
      model.position.set(p.x, 0, p.z);
      if (m.r === 'v') model.rotation.y = Math.PI / 2;
      this.gebouw.add(model);
      for (const [lx, y, b, h] of muurBotsing(m.soort)) {
        if (m.r === 'h') this.botsBlok(p.x + lx, y, p.z, b, h, 0.2);
        else this.botsBlok(p.x, y, p.z + lx, 0.2, h, b);
      }
    }
    for (const v of s.vloer) {
      const p = celMidden(v.x, v.z);
      this.gebouw.add(blokOp(C - 0.04, 0.05, C - 0.04, kleurHex(v.kleur), p.x, 0.03, p.z, false));
    }
    for (const m of s.meubels) {
      const o = onderdeel(m.id);
      const [b, d] = meubelMaat(m.id, m.draai);
      const basis = o?.maat ?? [1, 1];
      const mx = KAVEL.x0 + (m.x + b / 2) * C, mz = KAVEL.z0 + (m.z + d / 2) * C;
      const model = meubelModel(m.id, o?.kleurbaar ? m.kleur : o?.standaardKleur ?? m.kleur, basis[0], basis[1]);
      model.position.set(mx, 0, mz);
      model.rotation.y = -m.draai * (Math.PI / 2);
      this.gebouw.add(model);
      const bots: Botsing = o?.botsing ?? { hoogte: 0.8 };
      if (bots === 'geen') continue;
      if ('hoogte' in bots) this.botsBlok(mx, 0, mz, b * C - 0.2, bots.hoogte, d * C - 0.2);
      else this.botsBlok(mx, 0, mz, 0.45, bots.smal, 0.45);
    }
    for (const bl of s.blokken) {
      const p = celMidden(bl.x, bl.z);
      const model = blokModel(bl.kleur);
      model.position.set(p.x, bl.y * C, p.z);
      this.gebouw.add(model);
      this.botsBlok(p.x, bl.y * C, p.z, C, C, C);
    }
    // Een plat, gekleurd dak boven elke dichte kamer.
    this.kamerVakjes.clear();
    for (const k of plattegrond(s).kamers) for (const [x, z] of k.vakjes) this.kamerVakjes.add(`${x},${z}`);
    if (s.dak) {
      for (const sleutel of this.kamerVakjes) {
        const [x, z] = sleutel.split(',').map(Number);
        const p = celMidden(x, z);
        this.dak.add(blokOp(C + 0.2, 0.25, C + 0.2, kleurHex(s.dakKleur), p.x, MUUR_HOOGTE, p.z));
      }
    }
    voegStatischSamen(this.gebouw);
    voegStatischSamen(this.dak);
    for (const g of [this.gebouw, this.dak]) for (const kind of g.children) if (kind instanceof THREE.Mesh) kind.geometry.userData.samengevoegd = true;
  }

  /** Dak verbergen tijdens het bouwen en als Ninte binnen staat (dan zie je haar). */
  update(speler: Vec3) {
    const [x, z] = vakjeBij(speler.x, speler.z);
    const binnen = this.kamerVakjes.has(`${x},${z}`) && speler.y < MUUR_HOOGTE;
    this.dak.visible = this.stand.dak && !this.bouwmodus && !binnen;
    this.raster.visible = this.bouwmodus;
    if (!this.bouwmodus) this.cursor.visible = false;
  }

  /** Waar een straal de grond van de kavel raakt. */
  grondPunt(straal: THREE.Ray): THREE.Vector3 | null {
    return straal.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
  }

  /** Het dichtstbijzijnde blok dat de straal raakt. */
  raakBlok(straal: THREE.Ray): { x: number; z: number; y: number; afstand: number } | null {
    let beste: { x: number; z: number; y: number; afstand: number } | null = null;
    const doos = new THREE.Box3();
    const punt = new THREE.Vector3();
    for (const b of this.stand.blokken) {
      const p = celMidden(b.x, b.z);
      doos.min.set(p.x - C / 2, b.y * C, p.z - C / 2);
      doos.max.set(p.x + C / 2, (b.y + 1) * C, p.z + C / 2);
      if (!straal.intersectBox(doos, punt)) continue;
      const afstand = punt.distanceTo(straal.origin);
      if (!beste || afstand < beste.afstand) beste = { x: b.x, z: b.z, y: b.y, afstand };
    }
    return beste;
  }

  /** Laat zien waar iets komt (alleen met een muis, die kan zweven). */
  toonCursor(doel: { soort: 'rand'; r: Richting; x: number; z: number } | { soort: 'vakje'; x: number; z: number; b?: number; d?: number; y?: number } | null, kleur = '#ffffff') {
    const c = this.cursor;
    c.visible = !!doel;
    if (!doel) return;
    (c.material as THREE.MeshBasicMaterial).color.set(kleur);
    if (doel.soort === 'rand') {
      const p = randMidden(doel.r, doel.x, doel.z);
      c.position.set(p.x, MUUR_HOOGTE / 2, p.z);
      c.scale.set(doel.r === 'h' ? C + 0.2 : 0.3, MUUR_HOOGTE, doel.r === 'h' ? 0.3 : C + 0.2);
    } else {
      const b = doel.b ?? 1, d = doel.d ?? 1;
      c.position.set(KAVEL.x0 + (doel.x + b / 2) * C, (doel.y ?? 0) * C + 0.3, KAVEL.z0 + (doel.z + d / 2) * C);
      c.scale.set(b * C, 0.6, d * C);
    }
  }
}
