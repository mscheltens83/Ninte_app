// De bouwmodus: de camera kijkt van bovenaf op de kavel en Ninte tikt (of sleept)
// om te bouwen. Onderin kiest ze wat en welke kleur; linksboven staat de opdracht van Bas.

import * as THREE from 'three';
import { veilig } from '../ui/hud';
import {
  CATEGORIEEN, KAVEL, KLEUREN, ONDERDELEN, isMeubel, isMuurSoort, kleurHex, onderdeel,
  type Categorie, type KleurId, type OnderdeelId,
} from './onderdelen';
import {
  BOUW_OPDRACHTEN, heeftOnderdeel, leesAntwoord, opdrachtKlaar, opdrachtOpen, opdrachtVoor, volgendeOpdracht, type BouwOpdracht,
} from './opdrachten';
import {
  blokHoogte, draaiMeubel, haalBlokWeg, haalMeubelWeg, haalMuurWeg, haalVloerWeg, meubelMaat, meubelOp, muurOp, plaatsBlok,
  plaatsMeubel, plaatsMuur, plaatsVloer, vloerOp, type BouwStand, type Richting,
} from './stand';
import { KAVEL_MIDDEN, randBij, vakjeBij, type BouwWereld } from './wereld';

const C = KAVEL.cel;
const MAX_TERUG = 60;

export interface BouwModusOpties {
  wereld: BouwWereld;
  stand: BouwStand;
  camera: THREE.PerspectiveCamera;
  /** Het vlak over het canvas dat de vingers/muis opvangt. */
  vlak: HTMLElement;
  /** Waar de knoppenbalk in komt. */
  houder: HTMLElement;
  geluid: { klik(): void; plaats(): void; weg(): void; fout(): void };
  spreek(tekst: string): void;
  opVoltooid(o: BouwOpdracht): void;
  opBewaar(): void;
  opKlaar(): void;
}

/** Een plattegrond als plaatje (van bovenaf). */
export function tekeningSvg(vakjes: readonly (readonly [number, number])[]): string {
  const b = Math.max(...vakjes.map(([x]) => x)) + 1, d = Math.max(...vakjes.map(([, z]) => z)) + 1;
  const vak = 26;
  const rechthoeken = vakjes.map(([x, z]) => `<rect x="${x * vak + 4}" y="${z * vak + 4}" width="${vak}" height="${vak}" fill="#ffe4f0" stroke="#d0a8c0" stroke-width="1"/>`).join('');
  const set = new Set(vakjes.map(([x, z]) => `${x},${z}`));
  const lijnen: string[] = [];
  for (const [x, z] of vakjes) {
    const px = x * vak + 4, pz = z * vak + 4;
    if (!set.has(`${x},${z - 1}`)) lijnen.push(`<line x1="${px}" y1="${pz}" x2="${px + vak}" y2="${pz}"/>`);
    if (!set.has(`${x},${z + 1}`)) lijnen.push(`<line x1="${px}" y1="${pz + vak}" x2="${px + vak}" y2="${pz + vak}"/>`);
    if (!set.has(`${x - 1},${z}`)) lijnen.push(`<line x1="${px}" y1="${pz}" x2="${px}" y2="${pz + vak}"/>`);
    if (!set.has(`${x + 1},${z}`)) lijnen.push(`<line x1="${px + vak}" y1="${pz}" x2="${px + vak}" y2="${pz + vak}"/>`);
  }
  return `<svg class="bouw-tekening" viewBox="0 0 ${b * vak + 8} ${d * vak + 8}" role="img" aria-label="Plattegrond van ${vakjes.length} vakjes">${rechthoeken}<g stroke="#4b2a9e" stroke-width="5" stroke-linecap="round">${lijnen.join('')}</g></svg>`;
}

export class BouwModus {
  private ui = document.createElement('div');
  private open = false;
  private categorie: Categorie = 'muren';
  private gekozen: OnderdeelId = 'muur';
  private kleur: KleurId = 'lichtroze';
  private draai = 0;
  private terug: string[] = [];
  private yaw = 0.6;
  private doelYaw = 0.6;
  private afstand = 30;
  private doelAfstand = 30;
  private actief: BouwOpdracht | null = null;
  private tipOpen = false;
  private melding = '';
  private aanraking: { id: number; x: number; y: number; bewogen: boolean; laatste: string; richting?: Richting; snapshot: boolean } | null = null;
  private doelPunt = new THREE.Vector3();

  constructor(private o: BouwModusOpties) {
    this.ui.id = 'bouw-ui';
    this.ui.hidden = true;
    // Boven het spel, maar onder schermen zoals instellingen.
    const schermen = o.houder.querySelector('#schermen');
    if (schermen) o.houder.insertBefore(this.ui, schermen);
    else o.houder.append(this.ui);
    o.vlak.addEventListener('pointerdown', (e) => this.omlaag(e));
    o.vlak.addEventListener('pointermove', (e) => this.beweeg(e));
    o.vlak.addEventListener('pointerup', (e) => this.omhoog(e));
    o.vlak.addEventListener('pointercancel', () => (this.aanraking = null));
    o.vlak.addEventListener('wheel', (e) => { if (this.open) this.doelAfstand = THREE.MathUtils.clamp(this.doelAfstand + Math.sign(e.deltaY) * 3, 14, 46); }, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (!this.open || (e.target instanceof HTMLElement && e.target.closest('input,textarea'))) return;
      if (e.key === 'Escape') { e.preventDefault(); this.sluit(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.ongedaan(); }
      if (e.key.toLowerCase() === 'r') this.draaiKeuze();
    });
  }

  get isOpen(): boolean {
    return this.open;
  }

  start() {
    this.open = true;
    this.ui.hidden = false;
    this.o.wereld.bouwmodus = true;
    this.terug = [];
    this.actief = volgendeOpdracht(this.o.stand);
    this.melding = this.o.stand.muren.length || this.o.stand.blokken.length ? '' : 'Tik op het veld om te bouwen, of sleep om veel muren of vloer tegelijk te leggen.';
    this.teken();
  }

  /** Stoppen met bouwen. `melden` = false als het spel het afsluit (bijv. einde speeltijd). */
  sluit(melden = true) {
    if (!this.open) return;
    this.open = false;
    this.ui.hidden = true;
    this.aanraking = null;
    this.o.wereld.bouwmodus = false;
    this.o.wereld.toonCursor(null);
    this.o.opBewaar();
    if (melden) this.o.opKlaar();
  }

  /** De camera kijkt schuin van boven naar de kavel; draaien en zoomen met de knoppen. */
  update(dt: number) {
    if (!this.open) return;
    const k = Math.min(1, dt * 6);
    this.yaw += (this.doelYaw - this.yaw) * k;
    this.afstand += (this.doelAfstand - this.afstand) * k;
    const pitch = 0.95;
    const cam = this.o.camera;
    this.doelPunt.set(KAVEL_MIDDEN.x, 0, KAVEL_MIDDEN.z);
    cam.position.set(
      KAVEL_MIDDEN.x + Math.sin(this.yaw) * Math.cos(pitch) * this.afstand,
      Math.sin(pitch) * this.afstand,
      KAVEL_MIDDEN.z + Math.cos(this.yaw) * Math.cos(pitch) * this.afstand,
    );
    cam.lookAt(this.doelPunt);
  }

  // ---------- invoer ----------

  private straal(e: PointerEvent): THREE.Ray {
    const r = this.o.vlak.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.o.camera);
    return raycaster.ray;
  }

  private omlaag(e: PointerEvent) {
    if (!this.open || this.aanraking) return;
    e.preventDefault();
    this.o.vlak.setPointerCapture?.(e.pointerId);
    this.aanraking = { id: e.pointerId, x: e.clientX, y: e.clientY, bewogen: false, laatste: '', snapshot: false };
  }

  private beweeg(e: PointerEvent) {
    if (!this.open) return;
    const a = this.aanraking;
    if (!a) {
      if (e.pointerType === 'mouse') this.toonVoorbeeld(e);
      return;
    }
    if (a.id !== e.pointerId) return;
    if (!a.bewogen && Math.hypot(e.clientX - a.x, e.clientY - a.y) < 10) return;
    a.bewogen = true;
    this.sleep(e, a);
  }

  private omhoog(e: PointerEvent) {
    const a = this.aanraking;
    if (!this.open || !a || a.id !== e.pointerId) return;
    this.aanraking = null;
    if (!a.bewogen) this.tik(e);
    else if (a.snapshot) this.naWijziging();
  }

  private bewaarVoorTerug() {
    this.terug.push(JSON.stringify(this.o.stand));
    if (this.terug.length > MAX_TERUG) this.terug.shift();
  }

  /** Slepen: muren in een rechte lijn, vloer en blokken over meerdere vakjes. Alleen toevoegen. */
  private sleep(e: PointerEvent, a: NonNullable<BouwModus['aanraking']>) {
    const o = onderdeel(this.gekozen);
    if (this.categorie === 'gum' || !o || (o.soort !== 'muur' && o.soort !== 'vloer')) return;
    const p = this.o.wereld.grondPunt(this.straal(e));
    if (!p) return;
    const s = this.o.stand;
    if (o.soort === 'muur') {
      if (!a.richting) {
        // De richting van de eerste beweging bepaalt of de muur liggend of staand loopt.
        const start = this.o.wereld.grondPunt(this.straal({ clientX: a.x, clientY: a.y } as PointerEvent));
        if (start) a.richting = Math.abs(p.x - start.x) >= Math.abs(p.z - start.z) ? 'h' : 'v';
        if (start) this.sleepMuur(start, a);
      }
      this.sleepMuur(p, a);
    } else {
      const [x, z] = vakjeBij(p.x, p.z);
      const sleutel = `${x},${z}`;
      if (sleutel === a.laatste) return;
      a.laatste = sleutel;
      if (!vloerOp(s, x, z) || vloerOp(s, x, z)!.kleur !== this.kleur) {
        if (!a.snapshot) { this.bewaarVoorTerug(); a.snapshot = true; }
        if (plaatsVloer(s, x, z, this.kleur)) { this.o.geluid.plaats(); this.o.wereld.sync(); }
      }
    }
  }

  private sleepMuur(p: THREE.Vector3, a: NonNullable<BouwModus['aanraking']>) {
    const rand = randBij(p.x, p.z, a.richting);
    if (!rand) return;
    const sleutel = rand.join(',');
    if (sleutel === a.laatste) return;
    a.laatste = sleutel;
    const s = this.o.stand;
    const oud = muurOp(s, ...rand);
    if (oud && oud.soort === this.gekozen && oud.kleur === this.kleur) return;
    if (!a.snapshot) { this.bewaarVoorTerug(); a.snapshot = true; }
    if (isMuurSoort(this.gekozen) && plaatsMuur(s, ...rand, this.gekozen, this.kleur)) {
      this.o.geluid.plaats();
      this.o.wereld.sync();
    }
  }

  /** Eén tik: plaatsen, weghalen of draaien. */
  private tik(e: PointerEvent) {
    const straal = this.straal(e);
    const s = this.o.stand;
    const w = this.o.wereld;
    const blokRaak = w.raakBlok(straal);
    const p = w.grondPunt(straal);
    this.bewaarVoorTerug();
    let gelukt = false;
    let weg = false;
    if (this.categorie === 'gum') {
      weg = true;
      if (blokRaak) gelukt = haalBlokWeg(s, blokRaak.x, blokRaak.z);
      else if (p) gelukt = this.gumOp(p);
    } else {
      const o = onderdeel(this.gekozen);
      if (o?.soort === 'blok') {
        if (blokRaak) gelukt = plaatsBlok(s, blokRaak.x, blokRaak.z, this.kleur);
        else if (p) { const [x, z] = vakjeBij(p.x, p.z); gelukt = plaatsBlok(s, x, z, this.kleur); }
      } else if (p && o?.soort === 'muur' && isMuurSoort(o.id)) {
        const rand = randBij(p.x, p.z);
        if (rand) {
          const oud = muurOp(s, ...rand);
          if (oud && oud.soort === o.id && oud.kleur === this.kleur) { gelukt = haalMuurWeg(s, ...rand); weg = true; }
          else gelukt = plaatsMuur(s, ...rand, o.id, this.kleur);
        }
      } else if (p && o?.soort === 'vloer') {
        const [x, z] = vakjeBij(p.x, p.z);
        const oud = vloerOp(s, x, z);
        if (oud && oud.kleur === this.kleur) { gelukt = haalVloerWeg(s, x, z); weg = true; }
        else gelukt = plaatsVloer(s, x, z, this.kleur);
      } else if (p && o && isMeubel(o.id)) {
        const [x, z] = vakjeBij(p.x, p.z);
        const daar = meubelOp(s, x, z);
        if (daar && daar.id === o.id) gelukt = draaiMeubel(s, daar);
        else if (!daar) gelukt = !!plaatsMeubel(s, o.id, x, z, this.draai, o.kleurbaar ? this.kleur : o.standaardKleur);
      }
    }
    if (!gelukt) {
      this.terug.pop();
      this.o.geluid.fout();
      return;
    }
    if (weg) this.o.geluid.weg();
    else this.o.geluid.plaats();
    w.sync();
    this.naWijziging();
  }

  /** Gum op de grond: eerst een muur vlakbij, dan een meubel, dan de vloer. */
  private gumOp(p: THREE.Vector3): boolean {
    const s = this.o.stand;
    const rand = randBij(p.x, p.z);
    if (rand) {
      const m = rand[0] === 'h' ? (p.z - KAVEL.z0) / C : (p.x - KAVEL.x0) / C;
      if (Math.abs(m - Math.round(m)) < 0.25 && haalMuurWeg(s, ...rand)) return true;
    }
    const [x, z] = vakjeBij(p.x, p.z);
    const meubel = meubelOp(s, x, z);
    if (meubel) return haalMeubelWeg(s, meubel);
    if (blokHoogte(s, x, z) > 0) return haalBlokWeg(s, x, z);
    if (rand && haalMuurWeg(s, ...rand)) return true;
    return haalVloerWeg(s, x, z);
  }

  private toonVoorbeeld(e: PointerEvent) {
    const w = this.o.wereld;
    const p = w.grondPunt(this.straal(e));
    const o = onderdeel(this.gekozen);
    if (!p || this.categorie === 'gum' || !o) { w.toonCursor(null); return; }
    const kleur = kleurHex(o.kleurbaar ? this.kleur : o.standaardKleur);
    if (o.soort === 'muur') {
      const rand = randBij(p.x, p.z);
      w.toonCursor(rand ? { soort: 'rand', r: rand[0], x: rand[1], z: rand[2] } : null, kleur);
      return;
    }
    const [x, z] = vakjeBij(p.x, p.z);
    if (x < 0 || z < 0 || x >= KAVEL.breedte || z >= KAVEL.diepte) { w.toonCursor(null); return; }
    if (isMeubel(o.id)) {
      const [b, d] = meubelMaat(o.id, this.draai);
      w.toonCursor({ soort: 'vakje', x: Math.min(x, KAVEL.breedte - b), z: Math.min(z, KAVEL.diepte - d), b, d }, kleur);
    } else {
      w.toonCursor({ soort: 'vakje', x, z, y: o.soort === 'blok' ? blokHoogte(this.o.stand, x, z) : 0 }, kleur);
    }
  }

  private ongedaan() {
    const vorige = this.terug.pop();
    if (!vorige) { this.o.geluid.fout(); return; }
    const oud = JSON.parse(vorige) as BouwStand;
    // Opdrachten en antwoorden blijven gewoon gehaald.
    Object.assign(this.o.stand, { muren: oud.muren, vloer: oud.vloer, meubels: oud.meubels, blokken: oud.blokken, dak: oud.dak, dakKleur: oud.dakKleur });
    this.o.geluid.weg();
    this.o.wereld.sync();
    this.o.opBewaar();
    this.teken();
  }

  private draaiKeuze() {
    this.draai = (this.draai + 1) % 4;
    this.o.geluid.klik();
    this.teken();
  }

  /** Na elke wijziging: opdracht controleren en bewaren. */
  private naWijziging() {
    this.controleer();
    this.o.opBewaar();
    this.tekenOpdracht();
  }

  private controleer() {
    const s = this.o.stand;
    const o = this.actief;
    if (!o || s.voltooid.includes(o.id) || !opdrachtOpen(s, o) || !opdrachtKlaar(s, o)) return;
    s.voltooid.push(o.id);
    const nieuw = o.beloning.onderdelen.map((id) => { const x = onderdeel(id)!; return `${x.icoon} ${x.naam}`; });
    this.melding = `✓ Super! ${o.titel}: +${o.beloning.hoefijzers} hoefijzers${nieuw.length ? `. Nieuw om mee te bouwen: ${nieuw.join(', ')}` : ''}`;
    this.o.opVoltooid(o);
    this.actief = volgendeOpdracht(s);
    this.tipOpen = false;
    this.teken();
  }

  // ---------- knoppenbalk ----------

  private teken() {
    const s = this.o.stand;
    const items = ONDERDELEN.filter((o) => o.categorie === this.categorie);
    const gekozen = onderdeel(this.gekozen);
    const kleurbaar = this.categorie !== 'gum' && !!gekozen?.kleurbaar;
    this.ui.innerHTML = `
      <div class="bouw-boven">
        <button type="button" class="knop klein" data-klaar>✓ Klaar</button>
        <button type="button" class="ronde-knop" data-terug aria-label="Ongedaan maken" title="Ongedaan maken">↩️</button>
        <button type="button" class="ronde-knop" data-draaicam="-1" aria-label="Camera naar links draaien">⟲</button>
        <button type="button" class="ronde-knop" data-draaicam="1" aria-label="Camera naar rechts draaien">⟳</button>
        <button type="button" class="ronde-knop" data-zoom="-4" aria-label="Inzoomen">＋</button>
        <button type="button" class="ronde-knop" data-zoom="4" aria-label="Uitzoomen">－</button>
        <button type="button" class="bouw-dak${s.dak ? ' aan' : ''}" data-dak aria-pressed="${s.dak}">🏠 Dak ${s.dak ? 'aan' : 'uit'}</button>
      </div>
      <section class="bouw-opdracht paneel" aria-live="polite"></section>
      <div class="bouw-onder paneel">
        <div class="bouw-tabs" role="tablist">${CATEGORIEEN.map((c) => `<button type="button" role="tab" aria-selected="${c.id === this.categorie}" class="bouw-tab${c.id === this.categorie ? ' gekozen' : ''}" data-cat="${c.id}"><span aria-hidden="true">${c.icoon}</span> ${c.naam}</button>`).join('')}</div>
        ${this.categorie === 'gum'
          ? '<p class="bouw-uitleg">🧽 Tik op iets om het weg te halen. Met ↩️ zet je het terug.</p>'
          : `<div class="bouw-items">${items.map((o) => {
            const heeft = heeftOnderdeel(s, o.id);
            const op = opdrachtVoor(o.id);
            return `<button type="button" class="bouw-item${o.id === this.gekozen ? ' gekozen' : ''}" data-item="${o.id}" ${heeft ? '' : 'disabled'} title="${heeft ? veilig(o.naam) : `Haal eerst de opdracht: ${veilig(op?.titel ?? '')}`}"><span class="bouw-icoon" aria-hidden="true">${heeft ? o.icoon : '🔒'}</span>${veilig(o.naam)}</button>`;
          }).join('')}${gekozen && isMeubel(gekozen.id) ? `<button type="button" class="bouw-item" data-draai aria-label="Draai het meubel"><span class="bouw-icoon" aria-hidden="true">↻</span>Draai</button>` : ''}</div>`}
        ${kleurbaar ? `<div class="bouw-kleuren">${KLEUREN.map((k) => `<button type="button" class="bouw-kleur${k.id === this.kleur ? ' gekozen' : ''}" data-kleur="${k.id}" style="--kleur:${k.hex}" aria-label="${k.naam}" title="${k.naam}"></button>`).join('')}</div>` : ''}
      </div>`;
    const ui = this.ui;
    ui.querySelector<HTMLButtonElement>('[data-klaar]')!.onclick = () => { this.o.geluid.klik(); this.sluit(); };
    ui.querySelector<HTMLButtonElement>('[data-terug]')!.onclick = () => this.ongedaan();
    ui.querySelectorAll<HTMLButtonElement>('[data-draaicam]').forEach((b) => (b.onclick = () => { this.o.geluid.klik(); this.doelYaw += Number(b.dataset.draaicam) * (Math.PI / 4); }));
    ui.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach((b) => (b.onclick = () => { this.o.geluid.klik(); this.doelAfstand = THREE.MathUtils.clamp(this.doelAfstand + Number(b.dataset.zoom), 14, 46); }));
    ui.querySelector<HTMLButtonElement>('[data-dak]')!.onclick = () => {
      this.o.geluid.klik();
      s.dak = !s.dak;
      if (s.dak) s.dakKleur = this.kleur;
      this.o.wereld.sync();
      this.o.opBewaar();
      this.melding = s.dak ? '🏠 Je huis krijgt een dak als je klaar bent met bouwen. Elke dichte kamer krijgt er een.' : '';
      this.teken();
    };
    ui.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach((b) => (b.onclick = () => {
      this.o.geluid.klik();
      this.categorie = b.dataset.cat as Categorie;
      const eerste = ONDERDELEN.find((o) => o.categorie === this.categorie && heeftOnderdeel(s, o.id));
      if (eerste) this.kiesItem(eerste.id, true);
      this.teken();
    }));
    ui.querySelectorAll<HTMLButtonElement>('[data-item]').forEach((b) => (b.onclick = () => {
      this.o.geluid.klik();
      this.kiesItem(b.dataset.item as OnderdeelId);
      this.teken();
    }));
    ui.querySelector<HTMLButtonElement>('[data-draai]')?.addEventListener('click', () => this.draaiKeuze());
    ui.querySelectorAll<HTMLButtonElement>('[data-kleur]').forEach((b) => (b.onclick = () => {
      this.o.geluid.klik();
      this.kleur = b.dataset.kleur as KleurId;
      this.teken();
    }));
    this.tekenOpdracht();
  }

  /** Bij een andere categorie begint de kleur bij de standaardkleur; daarbinnen blijft je eigen kleur. */
  private kiesItem(id: OnderdeelId, nieuweCategorie = false) {
    this.gekozen = id;
    const o = onderdeel(id);
    if (nieuweCategorie && o?.kleurbaar) this.kleur = o.standaardKleur;
  }

  private tekenOpdracht() {
    const vak = this.ui.querySelector<HTMLElement>('.bouw-opdracht');
    if (!vak) return;
    const s = this.o.stand;
    const o = this.actief;
    const blij = this.melding ? `<p class="bouw-melding">${veilig(this.melding)}</p>` : '';
    const chips = `<div class="beat-chips">${BOUW_OPDRACHTEN.map((x, i) => {
      const klaar = s.voltooid.includes(x.id), open = opdrachtOpen(s, x);
      return `<button type="button" class="chip${klaar ? ' klaar' : ''}${x === o ? ' gekozen' : ''}" data-kies="${x.id}" ${open ? '' : 'disabled'} aria-label="Opdracht ${i + 1}: ${veilig(x.titel)}${klaar ? ', gehaald' : open ? '' : ', nog op slot'}">${klaar ? '✓' : open ? i + 1 : '🔒'}</button>`;
    }).join('')}</div>`;
    if (!o) {
      vak.innerHTML = `${blij}<h3>🏆 Alle bouwopdrachten gehaald!</h3><p>Je bent een echte bouwmeester. Bouw nu je droomhuis!</p>${chips}`;
    } else {
      const nr = BOUW_OPDRACHTEN.indexOf(o) + 1;
      const gebouwd = o.klopt(s);
      const goedAntwoord = !!o.vraag && s.antwoorden[o.id] === o.vraag.antwoord;
      vak.innerHTML = `${blij}<h3>🔨 Bas: ${nr}. ${veilig(o.titel)}${s.voltooid.includes(o.id) ? ' ✓' : ''}</h3>
        <p>${veilig(o.opdracht)}</p>
        ${o.tekening ? tekeningSvg(o.tekening) : ''}
        <ul class="bouw-stappen">
          <li class="${gebouwd ? 'klaar' : ''}">${gebouwd ? '✓' : '○'} Gebouwd</li>
          ${o.vraag ? `<li class="${goedAntwoord ? 'klaar' : ''}">${goedAntwoord ? '✓' : '○'} Rekenvraag</li>` : ''}
        </ul>
        ${o.vraag ? `<p>${veilig(o.vraag.tekst)}</p>${goedAntwoord ? `<p class="bouw-melding">✓ ${o.vraag.antwoord} ${veilig(o.vraag.eenheid ?? '')}: goed!</p>` : `<form class="bouw-vraag" data-vraag><input type="text" inputmode="decimal" autocomplete="off" aria-label="Jouw antwoord" placeholder="antwoord"><button type="submit" class="knop klein">Controleer</button></form>`}` : ''}
        <div class="beat-hulp"><button type="button" class="tempo-knop" data-lees>🔊 Lees voor</button><button type="button" class="tempo-knop" data-tip>💡 Tip</button></div>
        <p class="tip" ${this.tipOpen ? '' : 'hidden'}>${veilig(o.tip)}</p>${chips}`;
      vak.querySelector<HTMLButtonElement>('[data-lees]')!.onclick = () => this.o.spreek(`${o.titel}. ${o.opdracht}${o.vraag ? ` ${o.vraag.tekst}` : ''}`);
      vak.querySelector<HTMLButtonElement>('[data-tip]')!.onclick = () => {
        this.o.geluid.klik();
        this.tipOpen = !this.tipOpen;
        this.tekenOpdracht();
        if (this.tipOpen) this.o.spreek(o.tip);
      };
      vak.querySelector<HTMLFormElement>('[data-vraag]')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const veld = (e.currentTarget as HTMLFormElement).querySelector('input')!;
        const getal = leesAntwoord(veld.value);
        if (getal === o.vraag!.antwoord) {
          s.antwoorden[o.id] = getal;
          this.melding = gebouwd ? '' : `✓ Goed gerekend! Nu nog bouwen.`;
          this.o.geluid.plaats();
          this.naWijziging();
        } else {
          this.melding = getal === null ? 'Typ een getal.' : 'Nog niet goed. Kijk naar de tip en probeer het nog eens.';
          this.o.geluid.fout();
          this.tekenOpdracht();
          this.ui.querySelector<HTMLInputElement>('[data-vraag] input')?.focus();
        }
      });
    }
    vak.querySelectorAll<HTMLButtonElement>('[data-kies]').forEach((b) => (b.onclick = () => {
      this.o.geluid.klik();
      this.actief = BOUW_OPDRACHTEN.find((x) => x.id === b.dataset.kies) ?? null;
      this.tipOpen = false;
      this.melding = '';
      this.tekenOpdracht();
    }));
  }
}
