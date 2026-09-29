// Het hart van het spel: de wereld, de speler, de dieren, de camera, de obby
// en de geheimen (easter eggs).

import * as THREE from 'three';
import { Avatar } from '../figuren/avatar';
import { KAST, beschikbareItems, koop, type Uiterlijk } from '../figuren/uiterlijk';
import { HOND_KLEUREN, PONY_KLEUREN, Pony, Puppy, vachtVan } from '../figuren/dieren';
import { Geluid } from '../geluid/geluid';
import { Muziek } from '../geluid/muziek';
import { kiesWoorden, verwerkAntwoord } from '../leren/herhaalbakjes';
import { kiesSommen, rekenVraag } from '../leren/rekenen';
import { spellingVraag, type Vraag } from '../leren/vragen';
import { INSPREEK_ZINNEN, Opnames } from '../leren/inspreken';
import { nederlandseStemmen, opSpreken, spreek, stelOpnameSpelerIn, stelStemIn } from '../leren/voorlezen';
import { oefenWoorden } from '../leren/schoolwoorden';
import { dierenAantal, nieuweDag, telSpeeltijd, tijdVoorbij } from '../leren/dag';
import { bewaarStand, type DierenTaak, type Spelstand } from '../opslag/opslag';
import { Hud, veilig } from '../ui/hud';
import { finishKaart, geheimenScherm, inspreekScherm, instellingenScherm, kastScherm, sluitScherm, tipKaart, toon, wachtwoordScherm } from '../ui/schermen';
import { dagAfsluiting, dicteeScherm, dierenScherm, oefenDeur, oudersScherm } from '../ui/lerenSchermen';
import { AANTAL_POORTEN, DeurenObby, REKEN_THEMA, SPELLING_THEMA, type ObbyGebeurtenis, type Poort } from '../wereld/deurenObby';
import { EILAND_RAND, STARTPUNT, WATER_HOOGTE, bouwEiland, type Eiland } from '../wereld/eiland';
import { GEHEIMEN, Geheimen, WACHTWOORD, type GeheimGebeurtenis } from '../wereld/geheimen';
import { bouwSeizoen, kerstmuts, kroontje, seizoenOp, type Seizoen, type SeizoenVersiering } from '../wereld/seizoen';
import { Leven, isWater } from '../wereld/leven';
import { Effecten } from '../wereld/versiering';
import { Besturing } from './besturing';
import { Fysica, type Lichaam } from './fysica';
import { Avontuur } from '../avontuur/schermen';

const LOOPSNELHEID = 8;
const SPRONGSNELHEID = 10.5;
const TRAMPOLINE_SNELHEID = 21;
const ZWAARTEKRACHT = 28;
const COYOTE_TIJD = 0.14; // je mag nét na de rand nog springen
const SPRING_BUFFER = 0.16; // te vroeg getikt telt ook
const DANS_NA = 12; // seconden stilstaan voordat Ninte gaat dansen
const OBBY_OORSPRONG = new THREE.Vector3(29, 0, 7.5);
const REKEN_OORSPRONG = new THREE.Vector3(29, 0, -18);
const OBBY_RICHTING = Math.PI / 2; // de obby loopt richting +x
const AANTAL_GOUDEN = 5;

type Modus = 'titel' | 'spelen' | 'scherm' | 'kast';

/** Wat het spel per obby bijhoudt. */
interface ObbyStaat {
  obby: DeurenObby;
  klaar: boolean;
  uitgelegd: boolean;
  ronde: { goedInEenKeer: number; verdiend: number };
}

export class Spel {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
  readonly fysica = new Fysica();
  readonly geluid = new Geluid();
  readonly muziek = new Muziek(this.geluid);
  readonly opnames = new Opnames(
    () => this.geluid.context,
    (bezig) => this.muziek.demp(bezig),
  );
  readonly hud = new Hud();
  readonly besturing: Besturing;
  readonly speler: Lichaam = {
    pos: { x: STARTPUNT.x, y: 0, z: STARTPUNT.z },
    snelheid: { x: 0, y: 0, z: 0 },
    straal: 0.4,
    hoogte: 2.5,
    opGrond: false,
    grond: null,
  };
  modus: Modus = 'titel';
  readonly seizoen: Seizoen | null = seizoenOp(new Date());

  private eiland: Eiland;
  readonly obby: DeurenObby;
  readonly rekenObby: DeurenObby;
  private obbies: ObbyStaat[];
  readonly geheimen: Geheimen;
  readonly avontuur: Avontuur;
  private versiering: SeizoenVersiering | null = null;
  private avatar: Avatar;
  private pony: Pony | null = null;
  private puppy: Puppy | null = null;
  private effecten: Effecten;
  private leven: Leven;
  private glinsterTimer = 0;
  private zon: THREE.DirectionalLight;
  private klok = new THREE.Timer();
  private straal = new THREE.Raycaster();

  private camYaw = 0;
  private camPitch = 0.38;
  private camAfstand = 11;
  private camEchteAfstand = 11;
  private camDoel = new THREE.Vector3();
  private sindsSlepen = 99;
  private kijkHoek = Math.PI;
  private coyote = 0;
  private springBuffer = 0;
  private wasOpGrond = true;
  private terugTimer = -1;
  private titelTijd = 0;
  private tijd = 0;
  private stilTijd = 0;
  private dansen = false;
  private spoorTimer = 0;
  private grondSporen: THREE.Vector3[] = [];
  private grondTimer = 0;
  private dicteeActief = false;
  private bewaarTimer = 0;
  private doelKnop = document.createElement('button');
  private introStart = STARTPUNT.clone();
  private verzorging: { taak: DierenTaak; tijd: number; object: THREE.Mesh; begin: THREE.Vector3; doel: THREE.Vector3 } | null = null;

  constructor(canvas: HTMLCanvasElement, readonly stand: Spelstand) {
    nieuweDag(stand);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene.background = new THREE.Color('#9ed8ff');
    this.scene.fog = new THREE.Fog('#9ed8ff', 70, 230);
    this.scene.add(new THREE.HemisphereLight('#dff3ff', '#7cc35a', 1.6));
    this.zon = new THREE.DirectionalLight('#fff3dd', 2.4);
    this.zon.castShadow = true;
    this.zon.shadow.mapSize.set(2048, 2048);
    const sc = this.zon.shadow.camera;
    sc.left = -34;
    sc.right = 34;
    sc.top = 34;
    sc.bottom = -34;
    sc.near = 1;
    sc.far = 120;
    this.zon.shadow.bias = -0.0004;
    this.zon.shadow.normalBias = 0.03;
    this.scene.add(this.zon, this.zon.target);

    this.eiland = bouwEiland(this.scene, this.fysica);
    this.obby = new DeurenObby(this.scene, this.fysica, OBBY_OORSPRONG, SPELLING_THEMA);
    this.rekenObby = new DeurenObby(this.scene, this.fysica, REKEN_OORSPRONG, REKEN_THEMA);
    this.obbies = [this.obby, this.rekenObby].map((obby) => ({
      obby,
      klaar: false,
      uitgelegd: false,
      ronde: { goedInEenKeer: 0, verdiend: 0 },
    }));
    for (const o of this.obbies) o.obby.startRonde(this.nieuweVragen(o.obby));
    this.geheimen = new Geheimen(this.scene, this.fysica, this.obby.finishPunt);
    this.geheimen.verberg(stand.goudenHoefijzers);
    if (stand.geheimen.includes('schatkist')) this.geheimen.openKist(true);
    this.effecten = new Effecten(this.scene);
    this.leven = new Leven(this.scene, this.effecten);

    this.avatar = new Avatar(stand.uiterlijk);
    this.scene.add(this.avatar.groep);
    this.avatar.groep.position.copy(STARTPUNT);
    this.avatar.groep.rotation.y = this.kijkHoek;
    if (this.seizoen) {
      this.versiering = bouwSeizoen(this.scene, this.seizoen);
      const hoed = this.seizoen === 'winter' ? kerstmuts(1.1) : this.seizoen === 'koningsdag' ? kroontje(1) : null;
      if (hoed) {
        this.avatar.seizoenHoed = hoed;
        this.avatar.kleed(this.avatar.uiterlijk);
      }
    }
    this.maakDieren();

    this.besturing = new Besturing(
      document.getElementById('vlak')!,
      document.getElementById('springknop')!,
      document.getElementById('joystick-basis')!,
      document.getElementById('joystick-knop')!,
    );
    this.besturing.aan = false;

    this.geluid.aan = stand.geluidAan;
    this.muziek.zetAan(stand.muziekAan);
    opSpreken((bezig) => this.muziek.demp(bezig));
    stelOpnameSpelerIn((sleutels) => this.speelOpnames(sleutels));
    this.hud.zetHoefijzers(stand.hoefijzers);
    this.hud.zichtbaar(false);
    this.doelKnop.id = 'dagdoel';
    this.doelKnop.className = 'paneel';
    this.doelKnop.onclick = () => this.toonDieren();
    this.hud.hud.appendChild(this.doelKnop);
    this.zetDagdoel();
    this.pasKwaliteitAan();
    window.addEventListener('pagehide', () => bewaarStand(this.stand));
    document.addEventListener('visibilitychange', () => { if (document.hidden) bewaarStand(this.stand); });

    window.addEventListener('resize', () => this.pasFormaatAan());
    this.pasFormaatAan();
    this.avontuur = new Avontuur(this, stand);
  }

  start() {
    this.klok.connect(document);
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  /** Na de eerste tik: geluid ontgrendelen en de muziek starten. */
  startGeluid() {
    this.geluid.ontgrendel();
    this.muziek.speel('eiland');
  }

  /** (Opnieuw) pony en puppy maken met de gekozen naam en kleur. */
  maakDieren() {
    for (const d of [this.pony, this.puppy]) if (d) this.scene.remove(d.groep);
    const { pony, puppy } = this.stand;
    this.pony = pony ? new Pony(pony.naam, vachtVan(PONY_KLEUREN, pony.kleur)) : null;
    this.puppy = puppy ? new Puppy(puppy.naam, vachtVan(HOND_KLEUREN, puppy.kleur)) : null;
    if (this.pony) {
      this.pony.groep.position.set(STARTPUNT.x + 2.0, 0, STARTPUNT.z + 0.4);
      if (this.stand.geheimen.includes('eenhoorn')) this.pony.maakMagisch();
      this.scene.add(this.pony.groep);
    }
    if (this.puppy) {
      this.puppy.groep.position.set(STARTPUNT.x - 1.5, 0, STARTPUNT.z - 0.2);
      this.scene.add(this.puppy.groep);
    }
    if (this.seizoen === 'winter') {
      for (const [dier, maat] of [[this.pony, 0.75], [this.puppy, 0.6]] as const) {
        if (!dier) continue;
        const muts = kerstmuts(maat);
        muts.position.copy(dier.hoofdAnker);
        dier.groep.add(muts);
      }
    }
    this.eiland.stalBord.zetTekst(pony ? `Stal van ${pony.naam}` : 'Stal');
    this.eiland.hokBord.zetTekst(puppy ? puppy.naam : 'Hok');
  }

  /** Nieuwe vragen voor een obby: woorden of sommen, lastige vaker. */
  private nieuweVragen(obby: DeurenObby): Vraag[] {
    if (obby.thema.id === 'rekenen') return kiesSommen(this.stand.sommen).map(rekenVraag);
    const bank = oefenWoorden(this.stand.weekwoorden, this.stand.alleenWeekwoorden, this.stand.categorieen);
    const woorden = kiesWoorden(bank, this.stand.woorden, AANTAL_POORTEN);
    // Ook een kleine weeklijst vult alle zes deuren.
    while (woorden.length > 0 && woorden.length < AANTAL_POORTEN) woorden.push(bank[woorden.length % bank.length]);
    if (!woorden.length) throw new Error('Er zijn geen oefenwoorden beschikbaar.');
    return woorden.slice(0, AANTAL_POORTEN).map(spellingVraag);
  }

  /** De obby waar de speler nu in is (of undefined op het eiland). */
  private huidigeObby(): ObbyStaat | undefined {
    const p = this.speler.pos;
    return this.obbies.find((o) => o.obby.bevat(p.x, p.z));
  }

  /** Van het titelscherm naar het spel. */
  begin() {
    this.modus = 'spelen';
    this.hud.zichtbaar(true);
    this.besturing.aan = true;
    this.camYaw = 0;
    this.camDoel.set(this.speler.pos.x, this.speler.pos.y + 1.8, this.speler.pos.z);
    if (this.stand.dag.klaar || tijdVoorbij(this.stand)) this.sluitDagAf();
  }

  /** Een scherm over het spel: besturing uit. */
  pauzeer() {
    this.modus = 'scherm';
    this.besturing.aan = false;
    this.besturing.loslaten();
  }

  hervat() {
    this.dicteeActief = false;
    if (this.stand.dag.klaar || tijdVoorbij(this.stand)) { this.sluitDagAf(); return; }
    sluitScherm();
    this.modus = 'spelen';
    this.hud.zichtbaar(true);
    this.besturing.aan = true;
    this.muziek.demp(false);
    this.muziek.zetAan(this.stand.muziekAan);
    this.renderer.domElement.focus({ preventScroll: true });
  }

  toonInstellingen(klik = true) {
    if (this.modus !== 'spelen') return;
    if (klik) this.geluid.klik();
    this.pauzeer();
    const proef = () => spreek(`Hoi ${this.stand.speler}! Zo klink ik.`);
    instellingenScherm({
      geluidAan: this.stand.geluidAan,
      muziekAan: this.stand.muziekAan,
      nummers: this.muziek.nummers.map(({ id, naam, plek, eigen }) => ({ id, naam, plek, eigen })),
      huidigNummer: this.muziek.huidigNummer?.naam ?? null,
      opVolgende: () => {
        this.muziek.volgende();
        window.setTimeout(() => this.herlaadInstellingen(), 700);
      },
      opToevoegen: async (bestanden, plek) => {
        const aantal = await this.muziek.voegToe(bestanden, plek);
        this.herlaadInstellingen();
        const tekst = aantal === bestanden.length ? (aantal === 1 ? 'Nummer toegevoegd!' : `${aantal} nummers toegevoegd!`)
          : `${aantal} van ${bestanden.length} nummers bewaard. De overige konden niet worden opgeslagen; controleer de beschikbare ruimte.`;
        this.hud.toonBanner(`♪ ${tekst}`, null, { goed: aantal === bestanden.length, duur: 7000 });
      },
      opVerwijder: async (id) => {
        await this.muziek.verwijderEigen(id);
        this.herlaadInstellingen();
      },
      stemmen: nederlandseStemmen().map((s) => ({ naam: s.name, label: `${s.name} · ${s.lang}` })),
      stemNaam: this.stand.stemNaam,
      tempo: this.stand.stemTempo,
      opGeluid: (aan) => {
        this.stand.geluidAan = aan;
        this.geluid.aan = aan;
        this.geluid.klik();
        bewaarStand(this.stand);
      },
      opMuziek: (aan) => {
        this.stand.muziekAan = aan;
        this.muziek.zetAan(aan);
        bewaarStand(this.stand);
      },
      opStem: (naam) => {
        this.stand.stemNaam = naam;
        stelStemIn(naam, this.stand.stemTempo);
        bewaarStand(this.stand);
        proef();
      },
      opTempo: (tempo) => {
        this.stand.stemTempo = tempo;
        stelStemIn(this.stand.stemNaam, tempo);
        bewaarStand(this.stand);
        proef();
      },
      opInspreken: () => {
        this.geluid.klik();
        this.toonInspreken();
      },
      opOuders: () => this.toonOuders(),
      opSluit: () => {
        this.geluid.klik();
        this.hervat();
      },
    });
  }

  /** Ingesproken zinnen na elkaar afspelen, als ze er allemaal zijn. */
  private speelOpnames(sleutels: string[]): boolean {
    if (!sleutels.every((k) => this.opnames.heeft(k))) return false;
    const volgende = (i: number) => {
      if (i < sleutels.length) this.opnames.speel(sleutels[i], () => volgende(i + 1));
    };
    volgende(0);
    return true;
  }

  /** Zelf de zinnen inspreken. De muziek staat dan even stil. */
  private toonInspreken() {
    this.muziek.zetAan(false);
    inspreekScherm({
      zinnen: INSPREEK_ZINNEN,
      micStatus: Opnames.micStatus(),
      heeft: (sleutel) => this.opnames.heeft(sleutel),
      opOpnemen: () => {
        this.opnames.stop();
        return this.opnames.begin();
      },
      opStop: (sleutel) => this.opnames.klaar(sleutel),
      opLuister: (sleutel) => {
        if (!this.opnames.speel(sleutel)) this.geluid.fout();
      },
      opWis: (sleutel) => this.opnames.wis(sleutel),
      opSluit: () => {
        this.opnames.annuleer();
        this.muziek.zetAan(this.stand.muziekAan);
        this.geluid.klik();
        this.hervat();
      },
    });
  }

  /** Het instellingenscherm opnieuw tekenen (na muziek toevoegen of wisselen). */
  private herlaadInstellingen() {
    if (this.modus !== 'scherm' || !document.querySelector('.kaart.instellingen')) return;
    this.modus = 'spelen';
    this.toonInstellingen(false);
  }

  toonGeheimen() {
    if (this.modus !== 'spelen') return;
    this.geluid.klik();
    this.pauzeer();
    const gevonden = new Set(this.stand.geheimen);
    const aantalGoud = this.stand.goudenHoefijzers.length;
    geheimenScherm(
      GEHEIMEN.map((g) => ({
        naam: g.naam,
        hint: g.hint,
        gevonden: g.id === 'hoefijzers' ? aantalGoud >= AANTAL_GOUDEN : gevonden.has(g.id),
        extra: g.id === 'hoefijzers' ? `${aantalGoud} van de ${AANTAL_GOUDEN} gevonden` : undefined,
      })),
      () => {
        this.geluid.klik();
        this.hervat();
      },
    );
  }

  pasKwaliteitAan() {
    const zuinig = this.stand.beeldkwaliteit === 'zuinig';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, zuinig ? 1 : 2));
    this.renderer.shadowMap.enabled = !zuinig;
    const rustig = this.stand.minderEffecten || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.effecten.rustig = rustig;
    this.effecten.zuinig = zuinig;
    document.body.classList.toggle('minder-effecten', rustig);
    this.pasFormaatAan();
  }

  private zetDagdoel() {
    this.doelKnop.textContent = this.stand.introStap < 3
      ? ['Stap 1/3 · Loop een stukje', 'Stap 2/3 · Spring!', 'Stap 3/3 · Kies een oefendeur'][this.stand.introStap]
      : `🐴 Help je dieren · ${dierenAantal(this.stand)}/6`;
  }

  private introVerder(stap: number) {
    this.stand.introStap = stap;
    if (stap === 3) this.stand.uitlegGezien = true;
    bewaarStand(this.stand);
    this.zetDagdoel();
  }

  toonOuders(opSluit?: () => void) {
    this.dicteeActief = false;
    this.pauzeer();
    oudersScherm(this.stand, () => {
      this.pasKwaliteitAan();
      // Start een verse ronde veilig op het eiland, zodat oude vragen niet blijven staan.
      for (const o of this.obbies) this.nieuweRonde(o);
      this.zetSpeler(STARTPUNT, Math.PI);
      this.zetDagdoel();
    }, opSluit ?? (() => this.hervat()), this.stand.dag.klaar ? () => {
      if (tijdVoorbij(this.stand)) {
        const feedback = document.querySelector<HTMLElement>('[data-feedback]');
        if (feedback) feedback.textContent = 'Verhoog eerst de dagelijkse speeltijd en bewaar de instellingen.';
        return;
      }
      this.stand.dag.klaar = false;
      bewaarStand(this.stand);
      this.hervat();
    } : undefined, () => this.avontuur.toonOuderAvonturen(() => this.toonOuders(opSluit)));
  }

  toonDieren() {
    if (this.modus !== 'spelen') return;
    this.pauzeer();
    if (this.stand.introStap < 3) {
      if (this.stand.introStap === 2) {
        oefenDeur(() => { this.introVerder(3); this.hervat(); this.hud.meld('Goed zo! Je bent klaar om je dieren te helpen.'); });
      } else {
        const computer = window.matchMedia('(pointer: fine)').matches;
        const uitleg = this.stand.introStap === 0
          ? (computer ? 'Houd W, A, S of D ingedrukt om te lopen.' : 'Sleep de joystick linksonder om een stukje te lopen.')
          : (computer ? 'Druk op de spatiebalk om te springen.' : 'Tik op de pijl rechtsonder om te springen.');
        const s = toon(`<div class="kaart"><h2>Eerst even oefenen</h2><p>${uitleg}</p><button class="knop" data-oefen>Ik ga oefenen</button><button class="knop wit" data-skip>Ik ken de besturing al</button></div>`);
        s.querySelector<HTMLButtonElement>('[data-oefen]')!.onclick = () => this.hervat();
        s.querySelector<HTMLButtonElement>('[data-skip]')!.onclick = () => { this.introVerder(2); this.hervat(); this.toonDieren(); };
      }
      return;
    }
    const menu = () => {
      this.dicteeActief = false;
      dierenScherm(this.stand, (taak) => {
        this.dicteeActief = true;
        dicteeScherm(this.stand, taak, (n) => this.geefHoefijzers(n), () => {
          this.dicteeActief = false;
          this.hervat();
          this.verzorgDier(taak);
          this.zetDagdoel();
        }, () => { this.dicteeActief = false; this.zetDagdoel(); menu(); });
      }, () => this.hervat(), () => this.sluitDagAf());
    };
    menu();
  }

  private sluitDagAf() {
    this.avontuur?.stop();
    this.dicteeActief = false;
    this.stand.dag.klaar = true;
    this.pauzeer();
    this.hud.verbergBanner();
    this.muziek.demp(true);
    this.muziek.zetAan(false);
    bewaarStand(this.stand);
    dagAfsluiting(this.stand, () => this.toonOuders());
  }

  private verzorgDier(taak: DierenTaak) {
    if (this.verzorging) this.ruimVerzorgingOp();
    this.zetSpeler(STARTPUNT, Math.PI);
    this.pony?.groep.position.set(STARTPUNT.x + 2, 0, STARTPUNT.z);
    this.puppy?.groep.position.set(STARTPUNT.x - 1.5, 0, STARTPUNT.z);
    const object = new THREE.Mesh(
      taak === 'voeren' ? new THREE.ConeGeometry(0.18, 0.65, 8) : taak === 'borstelen' ? new THREE.BoxGeometry(0.45, 0.18, 0.3) : new THREE.SphereGeometry(0.22, 12, 8),
      new THREE.MeshStandardMaterial({ color: taak === 'voeren' ? '#ff8a24' : taak === 'borstelen' ? '#a35be0' : '#c6e642' }));
    const begin = new THREE.Vector3(STARTPUNT.x - 1.5, 0.3, STARTPUNT.z);
    const doel = begin.clone().add(new THREE.Vector3(-4, 0, 2));
    this.verzorging = { taak, tijd: 0, object, begin, doel };
    this.scene.add(object);
    this.hud.toonBanner(taak === 'voeren' ? 'Smullen! Je pony krijgt een wortel.' : taak === 'borstelen' ? 'Je pony wordt heerlijk geborsteld.' : 'Daar gaat je puppy! Haal de bal!', null, { goed: true, duur: 7000 });
  }

  private ruimVerzorgingOp() {
    if (!this.verzorging) return;
    const obj = this.verzorging.object;
    this.scene.remove(obj); obj.geometry.dispose();
    (obj.material as THREE.Material).dispose();
    this.verzorging = null;
  }

  private pasFormaatAan() {
    const b = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(b, h, false);
    this.camera.aspect = b / h;
    // In staande stand iets verder uitzoomen, zodat je genoeg ziet.
    this.camera.fov = b < h ? 72 : 60;
    this.camera.updateProjectionMatrix();
  }

  private frame(tijd: number) {
    this.klok.update(tijd);
    const verstreken = this.klok.getDelta();
    const dt = Math.min(verstreken, 1 / 20);
    const rustte = this.stand.dag.klaar;
    if (nieuweDag(this.stand)) {
      if (this.dicteeActief || (rustte && this.modus === 'scherm')) this.hervat();
      this.zetDagdoel(); bewaarStand(this.stand);
    }
    if (telSpeeltijd(this.stand, verstreken, !document.hidden && (this.modus === 'spelen' || this.dicteeActief || this.avontuur.aanHetOefenen)) && !this.stand.dag.klaar)
      this.sluitDagAf();
    this.bewaarTimer += dt;
    if (this.bewaarTimer >= 15 && (this.modus === 'spelen' || this.dicteeActief)) { this.bewaarTimer = 0; bewaarStand(this.stand); }
    this.tijd += dt;
    this.besturing.update();
    this.avontuur.update();

    if (this.modus === 'titel') this.updateTitelCamera(dt);
    if (this.modus === 'kast') this.updateKastCamera(dt);
    if (this.modus === 'spelen') {
      this.updateSpeler(dt);
      if (this.stand.introStap === 0 && new THREE.Vector3(this.speler.pos.x, 0, this.speler.pos.z).distanceTo(this.introStart) > 1.5) this.introVerder(1);
      for (const o of this.obbies) this.verwerk(o, o.obby.update(dt, this.speler));
      this.verwerkGeheimen(this.geheimen.update(dt, this.speler));
      for (const tik of this.besturing.neemTikken()) this.tik(tik.x, tik.y);
    } else {
      const weg = { ...this.speler, pos: { x: -999, y: -999, z: -999 } };
      for (const o of this.obbies) o.obby.update(dt, weg);
      this.geheimen.update(dt, this.speler, false);
    }
    if (this.modus === 'spelen' || this.modus === 'scherm') {
      this.updateCamera(dt);
      const nummer = this.geheimen.opWolken(this.speler) ? 'geheim' : this.huidigeObby() ? 'obby' : 'eiland';
      this.muziek.speel(nummer);
    }
    this.updateDieren(dt);
    this.leven.update(dt, this.speler.pos);
    this.updateGlinsters(dt);
    this.effecten.update(dt);
    this.versiering?.update(dt, this.camera.position, this.tijd);
    for (const w of this.eiland.wolken) {
      w.position.x += dt * 1.2;
      if (w.position.x > 130) w.position.x = -130;
    }

    // De zon volgt de speler, zodat er overal schaduw is.
    const p = this.speler.pos;
    this.zon.position.set(p.x + 18, p.y + 32, p.z + 14);
    this.zon.target.position.set(p.x, p.y, p.z);

    this.renderer.render(this.scene, this.camera);
  }

  /** Glinsters: op het water, rond gouden hoefijzers en rond de eenhoorn. */
  private updateGlinsters(dt: number) {
    if (this.stand.beeldkwaliteit === 'zuinig' || this.effecten.rustig) return;
    this.glinsterTimer -= dt;
    if (this.glinsterTimer > 0) return;
    this.glinsterTimer = 0.06;
    const p = this.speler.pos;
    for (let i = 0; i < 2; i++) {
      const x = p.x + (Math.random() - 0.5) * 60;
      const z = p.z + (Math.random() - 0.5) * 60;
      if (isWater(x, z) && !this.avontuur.wereld.isLand(x,z)) this.effecten.waterGlinster(new THREE.Vector3(x, WATER_HOOGTE + 0.03, z));
    }
    if (Math.random() < 0.35) {
      for (const h of this.geheimen.zichtbareHoefijzers()) {
        if (h.distanceTo(new THREE.Vector3(p.x, p.y, p.z)) > 40) continue;
        this.effecten.glinster(h.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2)));
      }
    }
    if (this.pony?.isMagisch && Math.random() < 0.5) {
      const kop = this.pony.groep.localToWorld(this.pony.hoofdAnker.clone());
      const kleuren = ['#ff9bd2', '#c9a7ff', '#fff6b0', '#8fd3ff'];
      kop.add(new THREE.Vector3((Math.random() - 0.5) * 1.4, (Math.random() - 0.3) * 1.2, (Math.random() - 0.5) * 1.4));
      this.effecten.glinster(kop, kleuren[Math.floor(Math.random() * kleuren.length)]);
    }
  }

  /** In de kledingkast: de camera kijkt Ninte aan, zij staat links in beeld. */
  private updateKastCamera(dt: number) {
    const p = this.speler.pos;
    const voor = new THREE.Vector3(Math.sin(this.kijkHoek), 0, Math.cos(this.kijkHoek));
    const doelPos = new THREE.Vector3(p.x, p.y + 2.1, p.z).addScaledVector(voor, 5.4);
    const camRechts = new THREE.Vector3().crossVectors(voor.clone().negate(), new THREE.Vector3(0, 1, 0)).normalize();
    const staand = window.innerWidth < window.innerHeight;
    const kijk = new THREE.Vector3(p.x, p.y + 1.35, p.z);
    if (staand) kijk.y -= 1.0;
    else kijk.addScaledVector(camRechts, 1.3);
    const k = Math.min(1, dt * 5);
    this.camera.position.lerp(doelPos, k);
    this.camDoel.lerp(kijk, k);
    this.camera.lookAt(this.camDoel);
    this.avatar.groep.visible = true;
    this.avatar.groep.rotation.y = this.kijkHoek + Math.sin(this.tijd * 0.9) * 0.5;
    this.avatar.animeer(dt, 0, false);
  }

  /** Een kant op waar niets tussen Ninte en de camera staat (voor de kledingkast). */
  private vrijeKijkHoek(): number {
    const p = this.speler.pos;
    const van = new THREE.Vector3(p.x, p.y + 1.6, p.z);
    const negeer = new Set<THREE.Object3D>([this.avatar.groep]);
    if (this.pony) negeer.add(this.pony.groep);
    if (this.puppy) negeer.add(this.puppy.groep);
    const straal = new THREE.Raycaster();
    straal.far = 5.8;
    straal.camera = this.camera; // nodig voor naamkaartjes (sprites)
    for (const stap of [0, 1, -1, 2, -2, 3, -3, 4]) {
      const hoek = this.kijkHoek + (stap * Math.PI) / 4;
      straal.set(van, new THREE.Vector3(Math.sin(hoek), 0.1, Math.cos(hoek)).normalize());
      const raak = straal.intersectObjects(this.scene.children, true).find((r) => {
        let o: THREE.Object3D | null = r.object;
        while (o) {
          if (negeer.has(o)) return false;
          o = o.parent;
        }
        return !(r.object instanceof THREE.InstancedMesh) && !(r.object instanceof THREE.Sprite) && !(r.object instanceof THREE.Points);
      });
      if (!raak) return hoek;
    }
    return this.kijkHoek;
  }

  /** De kledingkast openen. `daarna` wordt aangeroepen als ze op Klaar tikt. */
  openKast(titel = 'Kledingkast', daarna?: () => void) {
    if (this.modus !== 'spelen') return;
    this.geluid.klik();
    this.kijkHoek = this.vrijeKijkHoek();
    this.camera.position.set(this.speler.pos.x, this.speler.pos.y + 3, this.speler.pos.z).addScaledVector(
      new THREE.Vector3(Math.sin(this.kijkHoek), 0, Math.cos(this.kijkHoek)),
      7,
    );
    this.modus = 'kast';
    this.besturing.aan = false;
    this.besturing.loslaten();
    this.hud.zichtbaar(false);
    this.hud.verbergBanner();
    kastScherm({
      titel,
      uiterlijk: this.stand.uiterlijk,
      stand: this.stand,
      klik: () => this.geluid.klik(),
      opKies: (u: Uiterlijk) => {
        this.stand.uiterlijk = u;
        this.avatar.kleed(u);
        this.effecten.toverwolk(new THREE.Vector3(this.speler.pos.x, this.speler.pos.y + 1.3, this.speler.pos.z));
        this.geluid.magie();
        bewaarStand(this.stand);
      },
      opKoop: (item) => {
        const gelukt = koop(item, this.stand);
        if (gelukt) {
          this.hud.zetHoefijzers(this.stand.hoefijzers);
          this.geluid.munt();
          bewaarStand(this.stand);
        }
        return gelukt;
      },
      opKlaar: () => {
        sluitScherm();
        this.modus = 'spelen';
        this.besturing.aan = true;
        this.hud.zichtbaar(true);
        this.camYaw = this.kijkHoek + Math.PI;
        daarna?.();
      },
    });
  }

  /** Nieuwe kleding vrijgespeeld? Dan een feestje en een melding. */
  private meldNieuweKleding(voor: Set<string>): string[] {
    const nu = beschikbareItems(this.stand);
    const nieuw = KAST.filter((i) => nu.has(i.id) && !voor.has(i.id)).map((i) => i.naam);
    if (nieuw.length) {
      const p = this.speler.pos;
      this.effecten.vuurwerk(new THREE.Vector3(p.x, p.y + 6, p.z));
      this.geluid.fanfare();
      const tekst = `Nieuw in je kledingkast: ${nieuw.join(' en ')}!`;
      window.setTimeout(() => {
        this.hud.toonBanner(`👕 ${veilig(tekst)}`, () => spreek(tekst, 'kleding'), { goed: true, duur: 5000 });
        if (this.modus === 'spelen') spreek(tekst, 'kleding');
      }, 1800);
    }
    return nieuw;
  }

  private updateTitelCamera(dt: number) {
    this.titelTijd += dt * 0.08;
    const r = 40;
    this.camera.position.set(Math.sin(this.titelTijd) * r, 17, Math.cos(this.titelTijd) * r);
    this.camera.lookAt(0, 1, 0);
  }

  private updateSpeler(dt: number) {
    const s = this.speler;
    const b = this.besturing.beweging;
    const sin = Math.sin(this.camYaw);
    const cos = Math.cos(this.camYaw);
    // Vooruit is weg van de camera; rechts is rechts op het scherm.
    const rx = -sin * b.y + cos * b.x;
    const rz = -cos * b.y - sin * b.x;
    const grip = s.opGrond ? 14 : 6;
    const k = Math.min(1, dt * grip);
    s.snelheid.x += (rx * LOOPSNELHEID - s.snelheid.x) * k;
    s.snelheid.z += (rz * LOOPSNELHEID - s.snelheid.z) * k;

    const wilSpringen = this.besturing.wilSpringen();
    if (wilSpringen) this.springBuffer = SPRING_BUFFER;
    this.coyote = s.opGrond ? COYOTE_TIJD : this.coyote - dt;
    if (this.springBuffer > 0 && this.coyote > 0 && this.terugTimer < 0) {
      if (this.stand.introStap === 1) this.introVerder(2);
      s.snelheid.y = SPRONGSNELHEID;
      this.coyote = 0;
      this.springBuffer = 0;
      s.opGrond = false;
      this.geluid.spring();
      this.effecten.stof(new THREE.Vector3(s.pos.x, s.pos.y + 0.1, s.pos.z), 0.5);
    }
    this.springBuffer -= dt;
    s.snelheid.y = Math.max(s.snelheid.y - ZWAARTEKRACHT * dt, -32);
    const valSnelheid = s.snelheid.y;
    const wasOpGrond = s.opGrond;
    this.fysica.beweeg(s, dt);
    // Stofwolkje bij een stevige landing
    if (!wasOpGrond && s.opGrond && valSnelheid < -9 && s.grond?.soort !== 'hooi') {
      this.effecten.stof(new THREE.Vector3(s.pos.x, s.pos.y + 0.1, s.pos.z), Math.min(1.6, -valSnelheid / 14));
    }
    this.wasOpGrond = s.opGrond;

    if (Math.hypot(rx, rz) > 0.1) {
      const doel = Math.atan2(rx, rz);
      let verschil = doel - this.kijkHoek;
      verschil = Math.atan2(Math.sin(verschil), Math.cos(verschil));
      this.kijkHoek += verschil * Math.min(1, dt * 14);
    }

    // Een tijdje niks doen? Dan gaat Ninte dansen (een geheimpje).
    const stil = Math.hypot(b.x, b.y) === 0 && !wilSpringen && s.opGrond && !this.huidigeObby();
    this.stilTijd = stil ? this.stilTijd + dt : 0;
    const dansen = this.stilTijd > DANS_NA;
    if (dansen && !this.dansen) this.vindGeheim('dansje', 'Dansfeest!', `${this.stand.speler} gaat dansen!`);
    this.dansen = dansen;

    const tempo = Math.min(1, Math.hypot(s.snelheid.x, s.snelheid.z) / LOOPSNELHEID);
    const wip = this.avatar.animeer(dt, tempo, !this.wasOpGrond, dansen);
    this.avatar.groep.position.set(s.pos.x, s.pos.y + wip, s.pos.z);
    this.avatar.groep.rotation.y = this.kijkHoek + (dansen ? Math.sin(this.tijd * 3.5) * 0.6 : 0);

    // Regenboogspoor (beloning uit de schatkist)
    if (this.stand.geheimen.includes('schatkist') && tempo > 0.2 && s.opGrond) {
      this.spoorTimer -= dt;
      if (this.spoorTimer <= 0) {
        this.spoorTimer = 0.045;
        this.effecten.spoor(new THREE.Vector3(s.pos.x, s.pos.y + 0.15, s.pos.z));
      }
    }

    // Plekken onthouden waar je stond, om na een plons daar terug te komen.
    if (s.opGrond && !this.huidigeObby()) {
      this.grondTimer -= dt;
      if (this.grondTimer <= 0) {
        this.grondTimer = 0.25;
        this.grondSporen.push(new THREE.Vector3(s.pos.x, s.pos.y, s.pos.z));
        if (this.grondSporen.length > 6) this.grondSporen.shift();
      }
    }

    // In het water gevallen? Plons, en terug naar een veilige plek.
    if (this.terugTimer < 0 && s.pos.y < WATER_HOOGTE - 0.4) {
      this.terugTimer = 0.8;
      this.effecten.plons(new THREE.Vector3(s.pos.x, WATER_HOOGTE, s.pos.z));
      this.geluid.plons();
      this.hud.verbergBanner();
    }
    if (this.terugTimer >= 0) {
      this.terugTimer -= dt;
      if (this.terugTimer < 0) {
        const obby = this.huidigeObby()?.obby;
        if (obby) {
          this.zetSpeler(obby.checkpoint, OBBY_RICHTING);
        } else {
          const veilig = this.grondSporen[Math.max(0, this.grondSporen.length - 4)] ?? STARTPUNT;
          this.grondSporen = [];
          this.zetSpeler(veilig, Math.atan2(-veilig.x, -veilig.z)); // kijk naar het midden van het eiland
        }
      }
    }
  }

  /** Zet de speler ergens neer. Met `kijkHoek` kijken speler én camera die kant op. */
  zetSpeler(punt: THREE.Vector3 | { x: number; y: number; z: number }, kijkHoek?: number) {
    if (kijkHoek !== undefined) {
      this.kijkHoek = kijkHoek;
      this.camYaw = kijkHoek + Math.PI;
      this.avatar.groep.rotation.y = kijkHoek;
    }
    const s = this.speler;
    s.pos.x = punt.x;
    s.pos.y = punt.y + 0.05;
    s.pos.z = punt.z;
    s.snelheid.x = s.snelheid.y = s.snelheid.z = 0;
    this.terugTimer = -1;
    this.avatar.groep.position.set(s.pos.x, s.pos.y, s.pos.z);
  }

  private updateCamera(dt: number) {
    const d = this.besturing.neemCameraDelta();
    this.sindsSlepen = d.x || d.y ? 0 : this.sindsSlepen + dt;
    this.camYaw -= d.x * 0.0065;
    // Zoals in Roblox: als je loopt, draait de camera rustig mee achter je aan.
    const v = this.speler.snelheid;
    const tempo = Math.hypot(v.x, v.z) / LOOPSNELHEID;
    if (this.modus === 'spelen' && this.sindsSlepen > 1.2 && tempo > 0.3 && this.besturing.beweging.y > -0.3) {
      const verschil = Math.atan2(Math.sin(this.kijkHoek + Math.PI - this.camYaw), Math.cos(this.kijkHoek + Math.PI - this.camYaw));
      this.camYaw += verschil * Math.min(1, dt * 0.9 * tempo);
    }
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + d.y * 0.0045, 0.05, 1.25);
    this.camAfstand = THREE.MathUtils.clamp(this.camAfstand + d.zoom, 5, 22);

    const s = this.speler.pos;
    const doel = new THREE.Vector3(s.x, s.y + 1.8, s.z);
    // Bij een val in het water blijft de camera even boven het water hangen.
    if (doel.y < WATER_HOOGTE + 1.5) doel.y = WATER_HOOGTE + 1.5;
    this.camDoel.lerp(doel, Math.min(1, dt * 12));
    const c = this.camDoel;
    const cp = Math.cos(this.camPitch);
    const richting = {
      x: Math.sin(this.camYaw) * cp,
      y: Math.sin(this.camPitch),
      z: Math.cos(this.camYaw) * cp,
    };
    // Zit er een muur tussen? Dan komt de camera dichterbij (zoals in Roblox).
    const vrij = Math.max(0.3, this.fysica.straal(c, richting, this.camAfstand) - 0.3);
    this.camEchteAfstand = vrij < this.camEchteAfstand ? vrij : this.camEchteAfstand + (vrij - this.camEchteAfstand) * Math.min(1, dt * 4);
    const a = this.camEchteAfstand;
    this.camera.position.set(c.x + richting.x * a, c.y + richting.y * a, c.z + richting.z * a);
    this.camera.lookAt(c);
    // Heel dichtbij? Dan verdwijnt het poppetje even, anders zie je alleen haar hoofd.
    this.avatar.groep.visible = a > 2.6;
  }

  private updateDieren(dt: number) {
    this.pony?.rust(this.stand.dag.klaar);
    this.puppy?.rust(this.stand.dag.klaar);
    const verzorging = this.verzorging;
    if (verzorging && !this.stand.dag.klaar) {
      verzorging.tijd += dt;
      const { taak, tijd, object, begin, doel } = verzorging;
      if (taak === 'apporteren') {
        if (tijd < 2) object.position.copy(begin).lerp(doel, tijd / 2).add(new THREE.Vector3(0, Math.sin(tijd / 2 * Math.PI) * 1.3, 0));
        else if (tijd < 4.5) object.position.copy(doel);
        else if (this.puppy) object.position.copy(this.puppy.groep.localToWorld(this.puppy.hoofdAnker.clone())).add(new THREE.Vector3(0, -0.35, 0.15));
      } else if (this.pony) {
        const punt = this.pony.groep.localToWorld((taak === 'voeren' ? this.pony.hoofdAnker : new THREE.Vector3(0.55, 1.35, 0)).clone());
        object.position.copy(punt).add(new THREE.Vector3(0, taak === 'voeren' ? -0.2 : Math.sin(tijd * 6) * 0.2, 0));
        object.rotation.z = taak === 'voeren' ? Math.PI / 2 + Math.sin(tijd * 8) * 0.12 : 0.2;
      }
      if (tijd >= 8) { this.ruimVerzorgingOp(); this.pony?.steiger(); }
    }
    const s = this.speler.pos;
    const inObby = this.huidigeObby()?.obby;
    // De dieren lopen naast de speler (niet ervoor, dan zie je niets).
    const zij = new THREE.Vector3(Math.cos(this.kijkHoek), 0, -Math.sin(this.kijkHoek));
    const voor = new THREE.Vector3(Math.sin(this.kijkHoek), 0, Math.cos(this.kijkHoek));
    const grens = EILAND_RAND - 1;
    const opEiland = (v: THREE.Vector3) => {
      if (s.z < -35) {
        const hz = this.avontuur.wereld.hutZ();
        const opGeheim = s.z < -90 && this.stand.avontuur.gebieden.includes('boomhut');
        v.x = THREE.MathUtils.clamp(v.x, opGeheim ? -10 : -33, opGeheim ? 10 : 33);
        v.z = THREE.MathUtils.clamp(v.z, opGeheim ? hz-10 : -84, opGeheim ? hz+10 : -38);
        v.y = 0;
        return v;
      }
      v.x = THREE.MathUtils.clamp(v.x, -grens, grens);
      v.z = THREE.MathUtils.clamp(v.z, -grens, grens);
      v.y = 0;
      return v;
    };
    if (this.pony) {
      const doel = inObby
        ? inObby.wachtplek(0)
        : opEiland(new THREE.Vector3(s.x, 0, s.z).addScaledVector(zij, -2.0).addScaledVector(voor, -0.4));
      this.pony.update(dt, doel, this.dansen);
    }
    if (this.puppy) {
      const doel = verzorging?.taak === 'apporteren' && verzorging.tijd < 4.5
        ? verzorging.doel
        : inObby
        ? inObby.wachtplek(1)
        : opEiland(new THREE.Vector3(s.x, 0, s.z).addScaledVector(zij, 1.5).addScaledVector(voor, 0.2));
      this.puppy.update(dt, doel, this.dansen);
    }
  }

  /** Een tikje op het scherm: raak je een dier, dan aai je het. */
  private tik(x: number, y: number) {
    const ndc = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    this.straal.setFromCamera(ndc, this.camera);
    this.straal.camera = this.camera;
    const kandidaten = [this.pony, this.puppy].filter((d) => d !== null);
    let geraakt: Pony | Puppy | null = null;
    let dichtst = Infinity;
    for (const dier of kandidaten) {
      const raak = this.straal.intersectObject(dier.groep, true)[0];
      if (raak && raak.distance < dichtst) {
        dichtst = raak.distance;
        geraakt = dier;
      }
    }
    if (!geraakt) return;
    const kop = geraakt.groep.localToWorld(geraakt.hoofdAnker.clone());
    this.effecten.hartjes(kop.add(new THREE.Vector3(0, 0.4, 0)));
    const truc = geraakt.aai();
    if (geraakt instanceof Pony) {
      this.geluid.klik();
      if (truc) {
        geraakt.steiger();
        this.geluid.hinnik();
        this.vindGeheim('steigeren', 'Steigeren!', `${this.stand.pony?.naam ?? 'Je pony'} gaat op zijn achterbenen staan!`);
      }
    } else {
      this.geluid.blaf();
      if (truc) {
        geraakt.zoomies();
        this.vindGeheim('zoomies', 'Zoomies!', `${this.stand.puppy?.naam ?? 'Je puppy'} krijgt de zoomies!`);
      }
    }
  }

  /** Een geheim gevonden: melding, geluidje en in het geheimenboek. */
  private vindGeheim(id: string, titel: string, tekst: string) {
    if (this.stand.geheimen.includes(id)) return;
    const kledingVoor = beschikbareItems(this.stand);
    this.stand.geheimen.push(id);
    bewaarStand(this.stand);
    this.geluid.magie();
    const p = this.speler.pos;
    this.effecten.goudregen(new THREE.Vector3(p.x, p.y + 2.5, p.z));
    this.hud.toonBanner(`⭐ <b>Geheim gevonden: ${veilig(titel)}</b><br>${veilig(tekst)}`, () => spreek(tekst, 'geheim'), { goed: true, duur: 5000 });
    spreek(tekst, 'geheim');
    this.meldNieuweKleding(kledingVoor);
  }

  private verwerkGeheimen(gebeurtenissen: GeheimGebeurtenis[]) {
    for (const g of gebeurtenissen) {
      switch (g.soort) {
        case 'trampoline':
          this.speler.snelheid.y = TRAMPOLINE_SNELHEID;
          this.speler.opGrond = false;
          this.coyote = 0; // anders maakt een gewone sprong de superstuiter ongedaan
          this.geluid.boing();
          this.vindGeheim('trampoline', 'Boing!', 'Wat een hoge sprong! Kun je nu op het dak van de stal komen?');
          break;
        case 'eilandje':
          this.vindGeheim('eilandje', 'Palmeilandje', 'Je hebt het palmeilandje gevonden!');
          break;
        case 'wolkeneiland':
          this.vindGeheim('wolkeneiland', 'Wolkeneiland', 'Wauw, een eiland in de wolken! Met een regenboog!');
          break;
        case 'hoefijzer': {
          if (!this.stand.goudenHoefijzers.includes(g.id)) this.stand.goudenHoefijzers.push(g.id);
          const n = this.stand.goudenHoefijzers.length;
          this.effecten.goudregen(g.pos);
          this.geluid.magie();
          this.geefHoefijzers(5, g.pos);
          if (n >= AANTAL_GOUDEN) {
            this.pony?.maakMagisch();
            const naam = this.stand.pony?.naam ?? 'Je pony';
            this.vindGeheim('eenhoorn', 'Magische pony', `Alle gouden hoefijzers! ${naam} is nu een magische eenhoorn!`);
          } else {
            const tekst = `Een gouden hoefijzer! Je hebt er ${n} van de ${AANTAL_GOUDEN}.`;
            this.hud.toonBanner(`✨ ${tekst}`, () => spreek(tekst, 'hoefijzer'), { goed: true, duur: 4000 });
            spreek(tekst, 'hoefijzer');
          }
          bewaarStand(this.stand);
          break;
        }
        case 'kist':
          this.openSlot();
          break;
      }
    }
  }

  private openSlot() {
    this.pauzeer();
    spreek('Een schatkist! Weet jij het geheime wachtwoord?', 'schatkist');
    wachtwoordScherm(
      (tekst) => {
        if (tekst.trim().toLowerCase() !== WACHTWOORD) {
          this.geluid.fout();
          return false;
        }
        this.hervat();
        this.geheimen.openKist();
        this.geluid.kist();
        this.effecten.confetti(new THREE.Vector3(-23.3, 1.5, -3.7));
        this.geefHoefijzers(20);
        this.vindGeheim('schatkist', 'Schatkist', 'De kist is open! Je krijgt een regenboogspoor. Loop maar eens rond!');
        return true;
      },
      () => {
        this.geluid.klik();
        this.hervat();
      },
    );
  }

  private geefHoefijzers(n: number, van?: THREE.Vector3) {
    this.stand.hoefijzers += n;
    this.stand.dag.hoefijzers += n;
    this.zetDagdoel();
    const o = this.huidigeObby();
    if (o) o.ronde.verdiend += n;
    // Hoefijzertjes vliegen vanaf de plek (of vanaf Ninte) naar de teller.
    const p = (van ?? new THREE.Vector3(this.speler.pos.x, this.speler.pos.y + 2, this.speler.pos.z)).clone().project(this.camera);
    if (!this.effecten.rustig) this.hud.vliegHoefijzers(((p.x + 1) / 2) * window.innerWidth, ((1 - p.y) / 2) * window.innerHeight, n);
    this.hud.zetHoefijzers(this.stand.hoefijzers, true);
    this.hud.meld(`+${n}`);
    this.geluid.munt();
    bewaarStand(this.stand);
  }

  private spreekPoort(p: Poort) {
    if (p.vraag) spreek(p.vraag.voorlezen, p.vraag.opname);
  }

  /** De herhaalbakjes voor spelling of rekenen. */
  private stats(v: Vraag) {
    return v.soort === 'rekenen' ? this.stand.sommen : this.stand.woorden;
  }

  private verwerk(o: ObbyStaat, gebeurtenissen: ObbyGebeurtenis[]) {
    for (const g of gebeurtenissen) {
      switch (g.soort) {
        case 'start':
          if (o.klaar) this.nieuweRonde(o);
          if (!o.uitgelegd) {
            o.uitgelegd = true;
            const reken = o.obby.thema.id === 'rekenen';
            const tekst = reken
              ? 'Reken-obby! Loop steeds door de deur met het goede antwoord.'
              : 'Deuren-obby! Loop steeds door de deur met de goede spelling.';
            this.hud.toonBanner(tekst, () => spreek(tekst, 'kies-deur'), { duur: 6000 });
            spreek(tekst, 'kies-deur');
          }
          break;
        case 'nader': {
          const p = g.poort;
          this.hud.toonBanner(veilig(p.vraag!.tekst).replace('___', '<span class="gat"></span>'), () => this.spreekPoort(p));
          this.spreekPoort(p);
          break;
        }
        case 'goed': {
          const p = g.poort;
          const vraag = p.vraag!;
          if (g.eersteKeer) {
            const stats = this.stats(vraag);
            stats[vraag.sleutel] = verwerkAntwoord(stats[vraag.sleutel], true, Date.now());
            o.ronde.goedInEenKeer++;
            if (vraag.soort === 'rekenen') this.stand.dag.sommenGoed++;
          }
          this.geluid.goed();
          this.opnames.speelWillekeurig('goed-'); // alleen als je zelf aanmoedigingen hebt ingesproken
          this.effecten.confetti(new THREE.Vector3(p.na.x - 1, p.na.y + 2, this.speler.pos.z));
          this.effecten.ring(p.na.clone(), '#35c46a', 5);
          this.hud.toonBanner(`Goed zo! <b>${veilig(vraag.goed)}</b> ✔️`, null, { goed: true, duur: 1800 });
          this.geefHoefijzers(g.eersteKeer ? 3 : 1);
          break;
        }
        case 'fout': {
          const vraag = g.poort.vraag!;
          if (g.poort.pogingen === 1) {
            const stats = this.stats(vraag);
            stats[vraag.sleutel] = verwerkAntwoord(stats[vraag.sleutel], false, Date.now());
            if (vraag.soort === 'rekenen') this.stand.dag.sommenFout++;
            bewaarStand(this.stand);
          }
          this.geluid.fout();
          this.hud.verbergBanner();
          break;
        }
        case 'inHooi': {
          const p = g.poort;
          const vraag = p.vraag!;
          this.geluid.plof();
          this.effecten.hooi(new THREE.Vector3(this.speler.pos.x, this.speler.pos.y + 0.3, this.speler.pos.z));
          window.setTimeout(() => {
            if (this.stand.dag.klaar || this.modus !== 'spelen') {
              o.obby.herstelPoort(p);
              this.zetSpeler(p.voor, OBBY_RICHTING);
              return;
            }
            this.pauzeer();
            const uitleg = `${vraag.goed}. ${vraag.tip}`;
            tipKaart(vraag.tipTitel, vraag.goed, vraag.fout, vraag.tip, () => spreek(uitleg), () => {
              this.geluid.klik();
              o.obby.herstelPoort(p);
              this.zetSpeler(p.voor, OBBY_RICHTING);
              this.hervat();
            });
            // Eerst een ingesproken troostzinnetje (als dat er is), dan het trucje.
            if (!this.opnames.speelWillekeurig('fout-', () => spreek(uitleg))) spreek(uitleg);
          }, 450);
          break;
        }
        case 'finish': {
          o.klaar = true;
          this.stand.obbyGehaald++;
          this.geluid.fanfare();
          this.effecten.confetti(o.obby.bekerPositie);
          this.effecten.vuurwerk(o.obby.bekerPositie.clone().add(new THREE.Vector3(0, 5, 0)));
          this.hud.verbergBanner();
          this.geefHoefijzers(10);
          const { goedInEenKeer, verdiend } = o.ronde;
          const kledingVoor = beschikbareItems(this.stand);
          if (!this.stand.gehaald.includes(o.obby.thema.id)) this.stand.gehaald.push(o.obby.thema.id);
          if (goedInEenKeer === AANTAL_POORTEN) this.stand.drieSterren = true;
          bewaarStand(this.stand);
          const nieuweKleding = KAST.filter((i) => beschikbareItems(this.stand).has(i.id) && !kledingVoor.has(i.id)).map((i) => i.naam);
          window.setTimeout(() => {
            if (this.stand.dag.klaar || this.modus !== 'spelen') return;
            this.pauzeer();
            spreek('Obby gehaald! Goed gedaan!', 'obby-gehaald');
            finishKaart(
              goedInEenKeer,
              AANTAL_POORTEN,
              verdiend,
              () => {
                this.nieuweRonde(o);
                this.zetSpeler(o.obby.startPunt, OBBY_RICHTING);
                this.hervat();
              },
              () => {
                this.nieuweRonde(o);
                this.zetSpeler(STARTPUNT, Math.PI);
                this.hervat();
              },
              () => {
                this.geluid.klik();
                this.hervat();
              },
              nieuweKleding,
              () => {
                this.hervat();
                this.openKast();
              },
            );
          }, 1400);
          break;
        }
        case 'terug':
          this.geluid.magie();
          this.zetSpeler(STARTPUNT, Math.PI);
          break;
      }
    }
  }

  private nieuweRonde(o: ObbyStaat) {
    o.klaar = false;
    o.ronde = { goedInEenKeer: 0, verdiend: 0 };
    o.obby.startRonde(this.nieuweVragen(o.obby));
  }
}
