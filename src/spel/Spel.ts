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
import { bouwVleugel } from '../avontuur/wereld';
import { heeftVleugel } from '../avontuur/logica';
import { pasZweefSnelheidAan } from '../avontuur/landschap';
import { WERELD } from '../avontuur/inhoud';
import { Muziekregie } from '../ritme/regie';
import { Feestwereld, LICHT_KLEUREN, PODIUM, opDansvloer } from '../ritme/feestwereld';
import { kiesMuziekPlek } from '../ritme/plek';
import { Muziekmeter } from '../ritme/meter';
import { beatScherm } from '../ritme/beatScherm';
import { UITDAGINGEN, isLeeg, kopieBeat, voorbeeldBeat } from '../ritme/beat';
import { ENERGIE_NAMEN, type MuziekPlek } from '../ritme/liedjes';
import { puls } from '../ritme/dansen';
import { BouwWereld, INGANG, KAVEL_MIDDEN } from '../bouwen/wereld';
import { BouwModus } from '../bouwen/bouwModus';
import { BOUW_OPDRACHTEN } from '../bouwen/opdrachten';
import { opKavel } from '../bouwen/onderdelen';
import { AANKOMST, PORTAAL_DORP, RANCH, Rijland, inRijland } from '../rijden/rijland';
import { EI_PLEKKEN, EiWereld } from '../rijden/eieren';
import { MEDAILLES, Race, medailleVoor } from '../rijden/race';
import { RijModel } from '../rijden/model';
import { EIEREN, PONY_ID, rijdier, snelheidVan, sprongVan, type Bouwplan } from '../rijden/dieren';
import { dierMetNr, pakEi, voegDierToe } from '../rijden/stand';
import { broedhuisScherm, dierLabel, dierenboekScherm, temScherm } from '../rijden/schermen';
import { Aankleding } from '../rijden/aankleding';
import { WildeDieren } from '../rijden/wild';
import type { Interactie } from '../avontuur/wereld';

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
/** Zoveel minuten extra speeltijd geeft "Nog spelen vandaag toestaan". */
const EXTRA_MINUTEN = 15;

type Modus = 'titel' | 'spelen' | 'scherm' | 'kast' | 'bouwen';

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
  /** Kiest tussen meespeelmuziek en MP3-nummers; de rest van het spel praat alleen hiermee. */
  readonly ritme: Muziekregie;
  readonly opnames = new Opnames(
    () => this.geluid.context,
    (bezig) => this.ritme.demp(bezig),
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
  zweeft=false;
  private zweefModel=bouwVleugel();
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
  private feest: Feestwereld;
  private bouwWereld: BouwWereld;
  private bouwModus: BouwModus;
  private bouwTipGezien = false;
  private rijland: Rijland;
  private eiWereld: EiWereld;
  private race = new Race();
  private rijModel: RijModel | null = null;
  private rijSnelheid = 1;
  private rijSprong = 1;
  private boostTijd = 0;
  private laatsteMelding = -99;
  private rijKnop = document.createElement('button');
  private rijToggle = document.createElement('button');
  private raceTijd = document.createElement('div');
  private eiVraagTeller = 0;
  private aankleding: Aankleding;
  private wilde: WildeDieren;
  private ponyActie: Interactie = { id: 'pony-rijden', naam: '🐴 Rijd op je pony', x: 0, y: -999, z: 0, soort: 'actie', straal: 2.8 };
  private meter: Muziekmeter;
  private dierDans: (() => void)[] = [];
  private laatsteTel = 0;
  private laatsteFeest = -999;
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
    this.ritme = new Muziekregie(this.geluid, this.muziek, stand.ritme);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene.background = new THREE.Color('#9ed8ff');
    this.scene.fog = new THREE.Fog('#9ed8ff', 100, 390);
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
    this.feest = new Feestwereld(this.scene, this.fysica, { zuinig: stand.beeldkwaliteit === 'zuinig' });
    this.bouwWereld = new BouwWereld(this.scene, this.fysica, stand.bouwen);
    this.rijland = new Rijland(this.scene, this.fysica);
    this.eiWereld = new EiWereld(this.scene, stand.rijden.eiPlekken);
    this.aankleding = new Aankleding(this.scene, this.fysica, EI_PLEKKEN);
    this.wilde = new WildeDieren(this.scene);
    const poort = new THREE.Group();
    this.scene.add(poort);
    this.rijland.regenboogPoort(poort, PORTAAL_DORP.x, PORTAAL_DORP.z, Math.PI / 2);
    this.bouwModus = new BouwModus({
      wereld: this.bouwWereld,
      stand: stand.bouwen,
      camera: this.camera,
      vlak: document.getElementById('vlak')!,
      houder: document.getElementById('spel')!,
      geluid: { klik: () => this.geluid.klik(), plaats: () => this.geluid.bouw(), weg: () => this.geluid.gum(), fout: () => this.geluid.fout() },
      spreek: (tekst) => spreek(tekst),
      opVoltooid: (o) => this.bouwOpdrachtGehaald(o.beloning.hoefijzers),
      opBewaar: () => bewaarStand(this.stand),
      opKlaar: () => this.stopBouwen(),
    });
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
    this.zweefModel.position.set(0,3,0);this.zweefModel.visible=false;this.avatar.groep.add(this.zweefModel);
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
    this.ritme.zetAan(stand.muziekAan);
    this.ritme.live.opNiveau = (niveau, vorig) => { if (niveau >= 4 && vorig < 4) this.feestje(); };
    opSpreken((bezig) => this.ritme.demp(bezig));
    stelOpnameSpelerIn((sleutels) => this.speelOpnames(sleutels));
    this.hud.zetHoefijzers(stand.hoefijzers);
    this.meter = new Muziekmeter(document.getElementById('hoefijzers')!, () => this.toonMuziekInfo());
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
    // Het discopodium doet mee met de gewone interactieknop (E / tik).
    for (const i of this.feest.interacties) {
      i.doe = () => this.toonBeatmaker();
      this.avontuur.wereld.interacties.push(i);
    }
    // Bas de bouwer: E / tik opent de bouwmodus.
    for (const i of this.bouwWereld.interacties) {
      i.doe = () => this.startBouwen();
      this.avontuur.wereld.interacties.push(i);
    }
    this.feest.dansvloer.voegToe(this.bouwWereld.bas, 'veer', { sterkte: 0.8 });
    // Het Rijland: broedhuis, poorten en de racebaan.
    const rijActies: Record<string, () => void> = {
      broedhuis: () => this.toonBroedhuis(),
      'rijland-terug': () => this.reisNaarDorp(),
      'race-start': () => this.startRace(),
    };
    for (const i of this.rijland.interacties) {
      i.doe = rijActies[i.id];
      this.avontuur.wereld.interacties.push(i);
    }
    // Wilde dieren temmen, en op je pony stappen als je ernaast staat.
    this.wilde.interacties.forEach((i, nr) => { i.doe = () => this.toonTemmen(nr); this.avontuur.wereld.interacties.push(i); });
    this.ponyActie.doe = () => this.stapOp(0);
    this.avontuur.wereld.interacties.push(this.ponyActie);
    this.avontuur.wereld.interacties.push({ id: 'naar-rijland', naam: '🌈 Naar het Rijland', x: PORTAAL_DORP.x, y: 0, z: PORTAAL_DORP.z, soort: 'actie', straal: 4.5, doe: () => this.reisNaarRijland() });
    this.leven.opLand = (x, z) => this.avontuur.wereld.isLand(x, z) || inRijland(x, z, 3);
    this.rijKnop.className = 'ronde-knop';
    this.rijKnop.textContent = '🐎';
    this.rijKnop.setAttribute('aria-label', 'Mijn rijdieren');
    this.rijKnop.onclick = () => this.toonDierenboek();
    document.getElementById('knoppen-rechts')!.prepend(this.rijKnop);
    // Grote rijknop boven de springknop: op- en afstappen met één tik (of de R-toets).
    this.rijToggle.id = 'rijknop';
    this.rijToggle.onclick = () => this.wisselRijden();
    this.hud.hud.append(this.rijToggle);
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'KeyR' || this.modus !== 'spelen' || (e.target instanceof HTMLElement && e.target.closest('input,textarea,select'))) return;
      e.preventDefault();
      this.wisselRijden();
    });
    this.zetRijKnop();
    this.raceTijd.id = 'race-tijd';
    this.raceTijd.hidden = true;
    this.hud.hud.append(this.raceTijd);
    if (stand.rijden.rijdt !== null) this.stapOp(stand.rijden.rijdt, true);
    // De bewoners wiegen en veren mee op de muziek.
    this.avontuur.wereld.bewoners.forEach((b, i) => {
      this.feest.dansvloer.voegToe(b.groep, 'veer', { sterkte: 0.8, fase: i * 0.13 });
      this.feest.dansvloer.voegToe(b.groep, 'wieg', { sterkte: 0.6, fase: i * 0.37 });
    });
  }

  start() {
    this.klok.connect(document);
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  /** Na de eerste tik: geluid ontgrendelen en de muziek starten. */
  startGeluid() {
    this.geluid.ontgrendel();
    this.ritme.speel(this.muziekPlek());
  }

  /** Welk muziekje hoort bij de plek waar Ninte nu is. */
  private muziekPlek(): MuziekPlek {
    return kiesMuziekPlek({ pos: this.speler.pos, opWolken: this.geheimen.opWolken(this.speler), inObby: !!this.huidigeObby() });
  }

  /** (Opnieuw) pony en puppy maken met de gekozen naam en kleur. */
  maakDieren() {
    for (const d of [this.pony, this.puppy]) if (d) this.scene.remove(d.groep);
    for (const stop of this.dierDans) stop();
    this.dierDans = [];
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
    // Pony en puppy veren mee op de maat.
    if (this.pony) this.dierDans.push(this.feest.dansvloer.voegToe(this.pony.groep, 'veer', { sterkte: 0.6 }));
    if (this.puppy) this.dierDans.push(this.feest.dansvloer.voegToe(this.puppy.groep, 'veer', { sterkte: 0.9, fase: 0.5 }));
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
    if (this.ritme.beatmakerOpen) this.ritme.sluitBeatmaker();
    if (this.bouwModus.isOpen) this.bouwModus.sluit(false);
    if (this.stand.dag.klaar || tijdVoorbij(this.stand)) { this.sluitDagAf(); return; }
    sluitScherm();
    this.modus = 'spelen';
    this.hud.zichtbaar(true);
    this.besturing.aan = true;
    this.ritme.demp(false);
    this.ritme.zetAan(this.stand.muziekAan);
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
      huidigNummer: this.ritme.huidigeNaam,
      muziekSoort: this.ritme.soort,
      opMuziekSoort: (soort) => {
        this.ritme.zetSoort(soort);
        bewaarStand(this.stand);
        window.setTimeout(() => this.herlaadInstellingen(), 400);
      },
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
        this.ritme.zetAan(aan);
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
    this.ritme.zetAan(false);
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
        this.ritme.zetAan(this.stand.muziekAan);
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
      // Speeltijd op? Dan krijgt ze er vandaag nog een kwartier bij.
      if (tijdVoorbij(this.stand)) this.stand.dag.speelSeconden = Math.max(0, (this.stand.speeltijdMinuten - EXTRA_MINUTEN) * 60);
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
    if (this.ritme.beatmakerOpen) this.ritme.sluitBeatmaker();
    if (this.bouwModus.isOpen) this.bouwModus.sluit(false);
    this.stopRace();
    this.ritme.demp(true);
    this.ritme.zetAan(false);
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
    if (telSpeeltijd(this.stand, verstreken, !document.hidden && (this.modus === 'spelen' || this.modus === 'bouwen' || this.dicteeActief || this.avontuur.aanHetOefenen || this.ritme.beatmakerOpen)) && !this.stand.dag.klaar)
      this.sluitDagAf();
    this.bewaarTimer += dt;
    if (this.bewaarTimer >= 15 && (this.modus === 'spelen' || this.dicteeActief)) { this.bewaarTimer = 0; bewaarStand(this.stand); }
    this.tijd += dt;
    this.besturing.update();
    this.avontuur.update(dt);

    if (this.modus === 'titel') this.updateTitelCamera(dt);
    if (this.modus === 'kast') this.updateKastCamera(dt);
    if (this.modus === 'spelen') {
      this.updateSpeler(dt);
      if (this.stand.introStap === 0 && new THREE.Vector3(this.speler.pos.x, 0, this.speler.pos.z).distanceTo(this.introStart) > 1.5) this.introVerder(1);
      for (const o of this.obbies) this.verwerk(o, o.obby.update(dt, this.speler));
      this.updateRijden(dt);
      this.verwerkGeheimen(this.geheimen.update(dt, this.speler));
      for (const tik of this.besturing.neemTikken()) this.tik(tik.x, tik.y);
    } else {
      const weg = { ...this.speler, pos: { x: -999, y: -999, z: -999 } };
      for (const o of this.obbies) o.obby.update(dt, weg);
      this.geheimen.update(dt, this.speler, false);
    }
    if (this.modus === 'spelen' || this.modus === 'scherm') this.updateCamera(dt);
    if (this.modus === 'bouwen') this.bouwModus.update(dt);
    if (this.modus === 'spelen' || this.modus === 'scherm' || this.modus === 'bouwen') this.ritme.speel(this.muziekPlek());
    this.bouwWereld.update(this.speler.pos);
    this.bouwTip();
    this.rijland.update(dt, this.rijModel ? this.rijSnelheid : 1);
    if (inRijland(this.speler.pos.x, this.speler.pos.z, 60)) {
      this.wilde.update(dt, this.speler.pos);
      this.aankleding.update(dt);
    }
    this.rijland.zetWeiDieren([...this.stand.rijden.dieren].reverse().filter((d, i, a) => a.findIndex((x) => x.soort === d.soort) === i));
    this.ritme.update(dt);
    this.updateDieren(dt);
    this.leven.update(dt, this.speler.pos);
    this.updateMuziekwereld(dt);
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

  /** Lampjes, bloemen, het podium en de muziekmeter bewegen op de maat. */
  private updateMuziekwereld(dt: number) {
    const stap = this.ritme.stap;
    const niveau = this.ritme.niveau;
    const rustig = this.effecten.rustig;
    this.feest.update(dt, stap, niveau, this.speler.pos, rustig);
    this.meter.zet(niveau, this.ritme.huidigeNaam ?? '');
    this.meter.puls(rustig ? 0 : puls(stap / 4));
    // Muzieknootjes uit de luidsprekers, op elke tel, als je dichtbij het podium bent.
    const tel = Math.floor(stap / 4);
    if (tel === this.laatsteTel) return;
    this.laatsteTel = tel;
    const p = this.speler.pos;
    if (rustig || niveau < 2 || Math.hypot(p.x - PODIUM.x, p.z - PODIUM.z) > 35) return;
    for (const l of this.feest.luidsprekers) {
      const kleur = LICHT_KLEUREN[Math.abs(tel + Math.round(l.z)) % LICHT_KLEUREN.length];
      this.effecten.glinster(l.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.6, (Math.random() - 0.5) * 0.8)), kleur);
    }
  }

  /** De muziek staat op volle kracht: een klein feestje (niet te vaak). */
  private feestje() {
    if (this.tijd - this.laatsteFeest < 90) return;
    this.laatsteFeest = this.tijd;
    window.setTimeout(() => {
      if (this.modus !== 'spelen' || this.stand.dag.klaar) return;
      const p = this.speler.pos;
      this.effecten.vuurwerk(new THREE.Vector3(p.x, p.y + 7, p.z), 3);
      this.effecten.confetti(new THREE.Vector3(p.x, p.y + 3, p.z));
      this.hud.meld('🎉 Feestmuziek!');
    }, 900);
  }

  /** Tik op de muziekmeter: welk liedje speelt er en hoe maak je het drukker? */
  private toonMuziekInfo() {
    if (this.modus !== 'spelen') return;
    this.geluid.klik();
    const naam = this.ritme.huidigeNaam ?? 'Muziek';
    const energie = ENERGIE_NAMEN[Math.max(0, Math.min(4, this.ritme.niveau))];
    const uitleg = this.ritme.soort === 'meespeel'
      ? 'Doe dingen goed, dan gaan er steeds meer instrumenten meedoen. Op het discopodium maak je je eigen beat!'
      : 'Je luistert naar nummers. Kies Meespeelmuziek in de instellingen voor muziek die meegroeit.';
    this.hud.toonBanner(`♪ <b>${veilig(naam)}</b> · ${energie}<br>${uitleg}`, () => spreek(uitleg), { duur: 6000 });
  }

  /** Bouwen op de kavel: de camera gaat omhoog en Ninte tikt om te bouwen. */
  startBouwen() {
    if (this.modus !== 'spelen') return;
    this.stopRace();
    this.geluid.klik();
    this.modus = 'bouwen';
    this.besturing.aan = false;
    this.besturing.loslaten();
    this.hud.zichtbaar(false);
    this.hud.verbergBanner();
    this.bouwModus.start();
    spreek('Hoi! Ik ben Bas de bouwer. Kies onderin wat je wilt bouwen en tik op het veld.');
  }

  // ---------- Rijden, eieren en racen ----------

  /** Het bouwplan van Ninte haar eigen pony, met haar gekozen kleuren. */
  private ponyPlan(): Bouwplan {
    const v = vachtVan(PONY_KLEUREN, this.stand.pony?.kleur ?? 'bruin');
    return { vorm: 'paard', lijf: v.lijf, accent: v.manen, licht: '#5a4638', oren: 'punt', staart: 'pluim', vlekken: v.vlekken, hoorn: !!this.pony?.isMagisch, schaal: 0.92 };
  }

  /** Op een dier stappen (nummer 0 = je pony). */
  stapOp(nr: number, stil = false) {
    const d = dierMetNr(this.stand.rijden, nr);
    if (!d || (d.soort === PONY_ID && !this.stand.pony)) return;
    this.stapAf(true);
    const plan = d.soort === PONY_ID ? this.ponyPlan() : rijdier(d.soort)!.plan;
    this.rijModel = new RijModel(plan, d.variant);
    this.scene.add(this.rijModel.groep);
    this.stand.rijden.rijdt = nr;
    this.stand.rijden.laatste = nr;
    this.avatar.rijdt = true;
    this.zetRijKnop();
    if (d.soort === PONY_ID && this.pony) this.pony.groep.visible = false;
    this.rijSnelheid = snelheidVan(d.soort, d.variant);
    this.rijSprong = sprongVan(d.soort);
    bewaarStand(this.stand);
    if (stil) return;
    const naam = dierLabel(d, this.stand.pony?.naam ?? 'Pony').naam;
    this.geluid.hinnik();
    this.effecten.stof(new THREE.Vector3(this.speler.pos.x, this.speler.pos.y + 0.1, this.speler.pos.z), 1);
    this.hud.toonBanner(`🐎 Je rijdt op ${veilig(naam)}! ⚡ ${String(this.rijSnelheid).replace('.', ',')}`, null, { goed: true, duur: 3500 });
  }

  /** Op- of afstappen. Opstappen kiest het dier waarop je het laatst reed, anders je pony. */
  wisselRijden() {
    if (this.modus !== 'spelen') return;
    if (this.rijModel) { this.stapAf(); return; }
    const r = this.stand.rijden;
    const nr = r.laatste !== null && dierMetNr(r, r.laatste) ? r.laatste : this.stand.pony ? 0 : r.dieren[0]?.nr;
    if (nr === undefined) {
      this.hud.toonBanner('Je hebt nog geen rijdier. Ga door de regenboogpoort naar het Rijland en tem een wild dier!', null, { duur: 5000 });
      return;
    }
    if (this.huidigeObby()) { this.hud.meld('In de obby loop je zelf'); return; }
    this.stapOp(nr);
  }

  private zetRijKnop() {
    const rijdt = !!this.rijModel;
    this.rijToggle.textContent = rijdt ? '⬇️' : '🐴';
    this.rijToggle.classList.toggle('rijdt', rijdt);
    this.rijToggle.setAttribute('aria-label', rijdt ? 'Afstappen' : 'Opstappen en rijden');
  }

  stapAf(stil = false) {
    if (!this.rijModel) return;
    this.scene.remove(this.rijModel.groep);
    this.rijModel = null;
    this.stand.rijden.rijdt = null;
    this.avatar.rijdt = false;
    this.zetRijKnop();
    if (this.pony) this.pony.groep.visible = true;
    this.boostTijd = 0;
    bewaarStand(this.stand);
    if (!stil) this.hud.meld('Afgestapt');
  }

  /** Grondhoogte onder een punt, met de botsblokken (voor dieren in het Rijland). */
  private grondOnder(x: number, z: number, vanaf: number): number {
    const afstand = this.fysica.straal({ x, y: vanaf + 3, z }, { x: 0, y: -1, z: 0 }, 14);
    return afstand >= 14 ? vanaf : vanaf + 3 - afstand;
  }

  /** Eén keer per beeldje tijdens het spelen: eieren pakken, springkussens, poorten en de race. */
  private updateRijden(dt: number) {
    const p = this.speler.pos;
    const rijdt = !!this.rijModel;
    if (rijdt && (this.zweeft || this.huidigeObby())) {
      this.stapAf(true);
      if (this.huidigeObby()) this.hud.meld('In de obby loop je zelf');
    }
    this.boostTijd = Math.max(0, this.boostTijd - dt);
    // De knop "Rijd op je pony" staat bij de pony, zolang je niet rijdt.
    if (this.pony && this.stand.pony && !rijdt && this.pony.groep.visible) {
      const q = this.pony.groep.position;
      Object.assign(this.ponyActie, { x: q.x, y: q.y, z: q.z, naam: `🐴 Rijd op ${this.stand.pony.naam}` });
    } else this.ponyActie.y = -999;
    // Eén keer uitleggen hoe rijden werkt.
    if (!this.stand.geheimen.includes('rijden-uitleg') && this.tijd > 20 && this.stand.pony && !rijdt && this.stand.introStap >= 3) {
      this.stand.geheimen.push('rijden-uitleg');
      bewaarStand(this.stand);
      const tekst = `Nieuw: rijden! Ga naast ${this.stand.pony.naam} staan en tik op Rijd op ${this.stand.pony.naam}, of tik op het paardje rechtsboven.`;
      this.hud.toonBanner(`🐎 ${veilig(tekst)}`, () => spreek(tekst), { duur: 9000 });
      spreek(tekst);
    }
    if (inRijland(p.x, p.z, 2)) {
      if (this.speler.opGrond && this.rijland.opSpringkussen(p)) {
        this.speler.snelheid.y = TRAMPOLINE_SNELHEID;
        this.speler.opGrond = false;
        this.coyote = 0;
        this.geluid.boing();
      }
      if (this.rijland.opSnelstrook(p)) {
        if (this.boostTijd < 0.5) this.geluid.spring();
        this.boostTijd = 2.5;
      }
      const dicht = this.rijland.dichtePoortBij(p, rijdt ? this.rijSnelheid : 1);
      if (dicht && this.tijd - this.laatsteMelding > 6) {
        this.laatsteMelding = this.tijd;
        const tekst = `Deze poort gaat open voor dieren met snelheid ${String(dicht.minSnelheid).replace('.', ',')} of meer. Broed eieren uit voor een sneller dier!`;
        this.hud.toonBanner(`${dicht.icoon} ${tekst}`, () => spreek(tekst), { duur: 6000 });
        spreek(tekst);
      }
    }
    const ei = this.eiWereld.update(dt, p);
    if (ei) {
      const soort = EIEREN.find((e) => e.id === ei.soort)!;
      if (pakEi(this.stand.rijden, ei.soort)) {
        this.eiWereld.gepakt(ei);
        this.geluid.magie();
        this.effecten.glinster(new THREE.Vector3(ei.x, ei.y + 1, ei.z), soort.kleur);
        this.effecten.ring(new THREE.Vector3(ei.x, ei.y + 0.2, ei.z), soort.kleur, 2.5);
        this.ritme.moment('goed');
        bewaarStand(this.stand);
        const tekst = `${soort.naam} gevonden! Breng het naar het broedhuis bij de Reuzenboom in het Rijland.`;
        this.hud.toonBanner(`${soort.icoon} ${tekst}`, () => spreek(tekst), { goed: true, duur: 4500 });
      } else if (this.tijd - this.laatsteMelding > 6) {
        this.laatsteMelding = this.tijd;
        this.hud.toonBanner(`Je tas zit vol met ${soort.naam.toLowerCase()}eren. Broed er eerst een paar uit in het broedhuis!`, null, { duur: 4500 });
      }
    }
    for (const g of this.race.update(dt, p)) {
      if (g.soort === 'tel') { this.hud.meld(String(g.getal)); this.geluid.klik(); }
      else if (g.soort === 'start') { this.hud.meld('GO!'); this.geluid.goed(); }
      else if (g.soort === 'ring') { this.geluid.munt(); this.effecten.ring(new THREE.Vector3(p.x, p.y + 1, p.z), '#ffd23f', 3); }
      else if (g.soort === 'finish') this.raceKlaar(g.tijd);
      else this.raceTijd.hidden = true;
    }
    if (this.race.bezig) {
      const ring = this.race.doelRing;
      this.raceTijd.textContent = ring === null ? '⏱ Klaar voor de start…' : `⏱ ${this.race.tijd.toFixed(1).replace('.', ',')} s · ring ${ring + 1}/8`;
      if (!inRijland(p.x, p.z, 10)) this.stopRace();
    }
    this.rijland.markeerRing(this.race.doelRing);
  }

  private startRace() {
    if (this.modus !== 'spelen') return;
    this.zetSpeler({ x: RANCH.start.x, y: 0, z: RANCH.start.z + 3 }, Math.PI);
    this.race.start();
    this.raceTijd.hidden = false;
    const tekst = 'Rijd zo snel als je kunt door alle ringen. De gouden ring is de volgende!';
    this.hud.toonBanner(`🏁 ${tekst}`, () => spreek(tekst), { duur: 4000 });
    spreek(tekst);
  }

  private stopRace() {
    this.race.stop();
    this.raceTijd.hidden = true;
    this.rijland.markeerRing(null);
  }

  private raceKlaar(tijd: number) {
    const r = this.stand.rijden;
    this.raceTijd.hidden = true;
    const medaille = medailleVoor(tijd);
    const record = r.record === null || tijd < r.record;
    let hoefijzers = r.record === null ? 10 : record ? 5 : 0;
    if (medaille > r.medaille) {
      hoefijzers += [0, 5, 10, 20][medaille];
      r.medaille = medaille;
    }
    if (record) r.record = tijd;
    bewaarStand(this.stand);
    this.geluid.fanfare();
    this.effecten.vuurwerk(new THREE.Vector3(this.speler.pos.x, this.speler.pos.y + 6, this.speler.pos.z), 3);
    this.ritme.moment('feest');
    if (hoefijzers) this.geefHoefijzers(hoefijzers);
    const tekst = `Finish! ${String(tijd).replace('.', ',')} seconden.${medaille ? ` ${MEDAILLES[medaille].slice(3)}!` : ''}${record ? ' Nieuw record!' : ''}`;
    this.hud.toonBanner(`🏁 ${veilig(tekst)} ${medaille ? MEDAILLES[medaille].slice(0, 2) : ''}`, () => spreek(tekst), { goed: true, duur: 6000 });
    spreek(tekst);
  }

  reisNaarRijland() {
    if (this.modus !== 'spelen' && this.modus !== 'scherm') return;
    this.geluid.magie();
    this.zetSpeler(AANKOMST, Math.PI);
    if (!this.stand.geheimen.includes('rijland')) {
      this.stand.geheimen.push('rijland');
      // Welkomstcadeau: meteen iets om uit te broeden.
      const e = this.stand.rijden.eieren;
      e.gewoon = Math.min(9, e.gewoon + 3);
      e.zeldzaam = Math.min(9, e.zeldzaam + 1);
      bewaarStand(this.stand);
      const tekst = 'Welkom in het Rijland! Je krijgt 3 witte eieren en 1 blauw ei cadeau. Broed ze uit in het broedhuis bij de Reuzenboom. Wilde dieren kun je temmen: ga ernaast staan en tik op Tem.';
      this.hud.toonBanner(`🌈 ${tekst}`, () => spreek(tekst), { duur: 9000 });
      spreek(tekst);
    }
  }

  reisNaarDorp() {
    this.stopRace();
    this.geluid.magie();
    this.zetSpeler({ x: PORTAAL_DORP.x - 4, y: 0, z: PORTAAL_DORP.z }, -Math.PI / 2);
  }

  /** Een leervraag voor een blauw of gouden ei: om en om spelling en rekenen. */
  private eiVraag(): Vraag {
    this.eiVraagTeller++;
    if (this.eiVraagTeller % 2 === 0) return kiesSommen(this.stand.sommen).map(rekenVraag)[0];
    const bank = oefenWoorden(this.stand.weekwoorden, this.stand.alleenWeekwoorden, this.stand.categorieen);
    return spellingVraag(kiesWoorden(bank, this.stand.woorden, 1)[0] ?? bank[0]);
  }

  toonBroedhuis() {
    if (this.modus !== 'spelen') return;
    this.geluid.klik();
    this.pauzeer();
    broedhuisScherm({
      stand: this.stand.rijden,
      ponyNaam: this.stand.pony?.naam ?? 'Pony',
      vraag: () => this.eiVraag(),
      opAntwoord: (v, goed, eerste) => {
        if (!eerste) return;
        const stats = this.stats(v);
        stats[v.sleutel] = verwerkAntwoord(stats[v.sleutel], goed, Date.now());
        if (v.soort === 'rekenen') { if (goed) this.stand.dag.sommenGoed++; else this.stand.dag.sommenFout++; }
        bewaarStand(this.stand);
      },
      opUitgebroed: () => {
        this.ritme.moment('feest');
        bewaarStand(this.stand);
      },
      opRijden: (nr) => { this.hervat(); this.stapOp(nr); },
      spreek: (t) => spreek(t),
      geluid: { klik: () => this.geluid.klik(), goed: () => this.geluid.goed(), fout: () => this.geluid.fout(), magie: () => this.geluid.fanfare() },
      opSluit: () => { this.geluid.klik(); this.hervat(); },
    });
  }

  /** Een wild dier temmen met een leervraag. */
  private toonTemmen(nr: number) {
    if (this.modus !== 'spelen') return;
    const w = this.wilde.dieren[nr];
    if (!w || w.weg > 0) return;
    this.geluid.klik();
    this.pauzeer();
    const vraag = this.eiVraag();
    temScherm({
      soort: w.soort,
      variant: w.variant,
      vraag,
      opAntwoord: (goed, eerste) => {
        if (!eerste) return;
        const stats = this.stats(vraag);
        stats[vraag.sleutel] = verwerkAntwoord(stats[vraag.sleutel], goed, Date.now());
        if (vraag.soort === 'rekenen') { if (goed) this.stand.dag.sommenGoed++; else this.stand.dag.sommenFout++; }
        bewaarStand(this.stand);
      },
      opGetemd: () => {
        const dier = voegDierToe(this.stand.rijden, w.soort, w.variant);
        this.hervat();
        if (!dier) { this.hud.toonBanner('Je stal zit vol! Je hebt al heel veel dieren.', null, { duur: 4000 }); return; }
        this.wilde.getemd(nr);
        this.ritme.moment('feest');
        this.geluid.fanfare();
        this.effecten.goudregen(new THREE.Vector3(this.speler.pos.x, this.speler.pos.y + 2.5, this.speler.pos.z));
        this.stapOp(dier.nr);
      },
      spreek: (t) => spreek(t),
      geluid: { klik: () => this.geluid.klik(), goed: () => this.geluid.goed(), fout: () => this.geluid.fout() },
      opSluit: () => { this.geluid.klik(); this.hervat(); },
    });
  }

  toonDierenboek() {
    if (this.modus !== 'spelen') return;
    this.geluid.klik();
    this.pauzeer();
    const p = this.speler.pos;
    const nu = Date.now();
    const liggend = EI_PLEKKEN.filter((e) => this.eiWereld.ligtEr(e.id, nu)).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
    const eiTip = liggend.length ? `Het dichtstbijzijnde ei ligt ${liggend[0].hint}.` : 'Alle eieren zijn gevonden. Over een paar minuten liggen er nieuwe!';
    const inRij = inRijland(p.x, p.z, 5);
    dierenboekScherm({
      stand: this.stand.rijden,
      ponyNaam: this.stand.pony?.naam ?? 'Pony',
      heeftPony: !!this.stand.pony,
      inRijland: inRij,
      eiTip,
      opRijden: (nr) => { this.hervat(); this.stapOp(nr); },
      opAfstappen: () => { this.hervat(); this.stapAf(); },
      opReis: () => { this.hervat(); if (inRij) this.reisNaarDorp(); else this.reisNaarRijland(); },
      klik: () => this.geluid.klik(),
      opSluit: () => { this.geluid.klik(); this.hervat(); },
    });
  }

  /** De eerste keer op de kavel: vertel hoe je begint met bouwen. */
  private bouwTip() {
    if (this.bouwTipGezien || this.modus !== 'spelen') return;
    const p = this.speler.pos;
    if (!opKavel(p.x, p.z, 2)) return;
    this.bouwTipGezien = true;
    const tekst = 'Dit is jouw bouwkavel! Tik op de knop Bouwen onderin, of tik op de kavel, om te beginnen.';
    this.hud.toonBanner(`🔨 ${tekst}`, () => spreek(tekst), { duur: 7000 });
    spreek(tekst);
  }

  private stopBouwen() {
    this.modus = 'spelen';
    this.besturing.aan = true;
    this.hud.zichtbaar(true);
    this.zetSpeler(INGANG, -Math.PI / 2);
    this.camDoel.set(INGANG.x, 1.8, INGANG.z);
    bewaarStand(this.stand);
    this.hud.toonBanner('🏡 Mooi gebouwd! Loop maar eens rond in je bouwwerk.', null, { goed: true, duur: 4500 });
    this.renderer.domElement.focus({ preventScroll: true });
  }

  /** Een bouwopdracht gehaald: feest boven de kavel. */
  private bouwOpdrachtGehaald(hoefijzers: number) {
    const midden = new THREE.Vector3(KAVEL_MIDDEN.x, 4, KAVEL_MIDDEN.z);
    this.geluid.fanfare();
    this.effecten.confetti(midden);
    this.effecten.vuurwerk(midden.clone().add(new THREE.Vector3(0, 6, 0)), 3);
    this.geefHoefijzers(hoefijzers, midden);
    this.ritme.moment('feest');
    if (BOUW_OPDRACHTEN.every((o) => this.stand.bouwen.voltooid.includes(o.id))) {
      this.vindGeheim('bouwmeester', 'Bouwmeester', 'Alle bouwopdrachten gehaald! Kijk eens in je kledingkast.');
    }
    bewaarStand(this.stand);
  }

  /** De beatmaker op het discopodium. */
  toonBeatmaker() {
    if (this.modus !== 'spelen') return;
    this.geluid.klik();
    this.pauzeer();
    this.hud.verbergBanner();
    const beat = kopieBeat(this.stand.ritme.beat ?? voorbeeldBeat());
    this.ritme.openBeatmaker(beat);
    beatScherm({
      beat,
      voltooid: this.stand.ritme.uitdagingen,
      stap: () => this.ritme.stap,
      opWijzig: (b) => this.ritme.wijzigBeat(b),
      opVoltooid: (u) => {
        if (!this.stand.ritme.uitdagingen.includes(u.id)) this.stand.ritme.uitdagingen.push(u.id);
        this.geefHoefijzers(u.beloning);
        if (UITDAGINGEN.every((x) => this.stand.ritme.uitdagingen.includes(x.id))) {
          this.vindGeheim('dj-meester', 'DJ-meester', 'Alle beat-uitdagingen gehaald! Kijk eens in je kledingkast.');
        }
        bewaarStand(this.stand);
      },
      opSpreek: (tekst) => spreek(tekst),
      opKlik: () => this.geluid.klik(),
      opKlaar: (b) => {
        this.stand.ritme.beat = isLeeg(b) ? null : b;
        bewaarStand(this.stand);
        this.geluid.klik();
        this.hervat();
        this.hud.toonBanner(isLeeg(b) ? '🎧 Het podium speelt weer de discomuziek.' : '🎧 Je eigen beat speelt nu op het discopodium!', null, { goed: true, duur: 4500 });
      },
    });
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
    const vaart = LOOPSNELHEID * (this.rijModel ? this.rijSnelheid : 1) * (this.boostTijd > 0 ? 1.5 : 1);
    if(!this.zweeft){s.snelheid.x += (rx * vaart - s.snelheid.x) * k;s.snelheid.z += (rz * vaart - s.snelheid.z) * k;}

    const wilSpringen = this.besturing.wilSpringen();
    if (wilSpringen) this.springBuffer = SPRING_BUFFER;
    this.coyote = s.opGrond ? COYOTE_TIJD : this.coyote - dt;
    if (this.springBuffer > 0 && this.coyote > 0 && this.terugTimer < 0) {
      if (this.stand.introStap === 1) this.introVerder(2);
      s.snelheid.y = SPRONGSNELHEID * (this.rijModel ? this.rijSprong : 1);
      this.coyote = 0;
      this.springBuffer = 0;
      s.opGrond = false;
      this.geluid.spring();
      this.effecten.stof(new THREE.Vector3(s.pos.x, s.pos.y + 0.1, s.pos.z), 0.5);
    }
    this.springBuffer -= dt;
    s.snelheid.y = Math.max(s.snelheid.y - ZWAARTEKRACHT * dt, -32);
    const wasZweven=this.zweeft;
    if(!s.opGrond&&s.snelheid.y<0&&heeftVleugel(this.stand.avontuur)&&s.pos.y-this.avontuur.wereld.terreinHoogte(s.pos.x,s.pos.z)>3){this.zweeft=true;if(!wasZweven)this.avontuur.zweefStart(s.pos);}
    if(this.zweeft){
      const helpt=this.stand.avontuur.missies['toren-vlucht'].werk.verzameld.includes('start-toren');
      pasZweefSnelheidAan(s,dt,rx,rz,helpt);
    }
    const valSnelheid = s.snelheid.y;
    const wasOpGrond = s.opGrond;
    this.fysica.beweeg(s, dt);
    if(this.zweeft&&s.opGrond){this.zweeft=false;this.avontuur.zweefLanding(s.pos);}
    if(this.zweefModel.parent!==this.avatar.groep)this.avatar.groep.add(this.zweefModel);
    this.zweefModel.visible=this.zweeft;
    // Stofwolkje bij een stevige landing
    if (!wasOpGrond && s.opGrond && valSnelheid < -9 && s.grond?.soort !== 'hooi') {
      this.effecten.stof(new THREE.Vector3(s.pos.x, s.pos.y + 0.1, s.pos.z), Math.min(1.6, -valSnelheid / 14));
    }
    this.wasOpGrond = s.opGrond;

    const richtingX=this.zweeft?s.snelheid.x:rx,richtingZ=this.zweeft?s.snelheid.z:rz;
    if (Math.hypot(richtingX, richtingZ) > 0.1) {
      const doel = Math.atan2(richtingX, richtingZ);
      let verschil = doel - this.kijkHoek;
      verschil = Math.atan2(Math.sin(verschil), Math.cos(verschil));
      this.kijkHoek += verschil * Math.min(1, dt * (this.zweeft?3:14));
    }

    // Een tijdje niks doen? Dan gaat Ninte dansen (een geheimpje).
    const stil = Math.hypot(b.x, b.y) === 0 && !wilSpringen && s.opGrond && !this.huidigeObby();
    this.stilTijd = stil ? this.stilTijd + dt : 0;
    // Op de dansvloer gaat ze meteen dansen, de dieren doen mee.
    const dansen = this.stilTijd > DANS_NA || (stil && opDansvloer(s.pos));
    if (dansen && !this.dansen) this.vindGeheim('dansje', 'Dansfeest!', `${this.stand.speler} gaat dansen!`);
    this.dansen = dansen;

    const tempo = Math.min(1, Math.hypot(s.snelheid.x, s.snelheid.z) / vaart);
    const tel = this.ritme.tel;
    const wip = this.avatar.animeer(dt, tempo, !this.wasOpGrond, dansen && !this.rijModel, tel);
    if (this.rijModel) {
      // Het rijdier loopt onder Ninte, zij zit in het zadel.
      this.rijModel.groep.position.set(s.pos.x, s.pos.y, s.pos.z);
      this.rijModel.groep.rotation.y = this.kijkHoek;
      this.rijModel.update(dt, tempo, !this.wasOpGrond);
      this.avatar.groep.position.set(s.pos.x, s.pos.y + this.rijModel.zadel - 0.95, s.pos.z);
    } else this.avatar.groep.position.set(s.pos.x, s.pos.y + wip, s.pos.z);
    this.avatar.groep.rotation.y = this.kijkHoek + (dansen ? Math.sin((tel * Math.PI) / 2) * 0.6 : 0);

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
    if(this.zweeft){const s=this.stand.avontuur.missies['toren-vlucht'];if(s.status==='actief'){s.werk.verzameld=s.werk.verzameld.filter(x=>x!=='start-toren');s.stap=2;bewaarStand(this.stand);}}
    this.zweeft=false;this.zweefModel.visible=false;
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
    const doel = new THREE.Vector3(s.x, s.y + 1.8 + (this.rijModel ? 1.1 : 0), s.z);
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
      if (inRijland(s.x, s.z, 6)) {
        v.y = this.grondOnder(v.x, v.z, s.y);
        return v;
      }
      if (s.z < -35) {
        const hz = this.avontuur.wereld.hutZ();
        const opGeheim = s.z < WERELD.noord-10 && this.stand.avontuur.gebieden.includes('boomhut');
        v.x = THREE.MathUtils.clamp(v.x, opGeheim ? -10 : -WERELD.halfBreedte+2, opGeheim ? 10 : WERELD.halfBreedte-2);
        v.z = THREE.MathUtils.clamp(v.z, opGeheim ? hz-10 : WERELD.noord+2, opGeheim ? hz+10 : -38);
        v.y = opGeheim?0:this.avontuur.wereld.terreinHoogte(v.x,v.z);
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
      this.pony.update(dt, doel, this.dansen, this.ritme.tel);
    }
    if (this.puppy) {
      const doel = verzorging?.taak === 'apporteren' && verzorging.tijd < 4.5
        ? verzorging.doel
        : inObby
        ? inObby.wachtplek(1)
        : opEiland(new THREE.Vector3(s.x, 0, s.z).addScaledVector(zij, 1.5).addScaledVector(voor, 0.2));
      this.puppy.update(dt, doel, this.dansen, this.ritme.tel);
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
    if (!geraakt) {
      // Op de bouwkavel of op Bas getikt? Dan gaan we bouwen.
      if (this.bouwWereld.raaktKavel(this.straal.ray)) this.startBouwen();
      return;
    }
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
    this.ritme.moment('feest');
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
    this.ritme.moment('goed');
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
          this.ritme.moment('feest');
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
