// Het hart van het spel: de wereld, de speler, de dieren, de camera en de obby.

import * as THREE from 'three';
import { Avatar } from '../figuren/avatar';
import { HOND_KLEUREN, PONY_KLEUREN, Pony, Puppy, vachtVan } from '../figuren/dieren';
import { Geluid } from '../geluid/geluid';
import { kiesWoorden, verwerkAntwoord } from '../leren/herhaalbakjes';
import { tipVoor, voorleesTekst, zinMetGat } from '../leren/spelling';
import { spreek } from '../leren/voorlezen';
import { WOORDEN, type Categorie, type Woordkaart } from '../leren/woorden';
import { bewaarStand, type Spelstand } from '../opslag/opslag';
import { Hud, veilig } from '../ui/hud';
import { finishKaart, sluitScherm, tipKaart } from '../ui/schermen';
import { AANTAL_POORTEN, DeurenObby, type ObbyGebeurtenis, type Poort } from '../wereld/deurenObby';
import { EILAND_RAND, STARTPUNT, WATER_HOOGTE, bouwEiland, type Eiland } from '../wereld/eiland';
import { Effecten } from '../wereld/versiering';
import { Besturing } from './besturing';
import { Fysica, type Lichaam } from './fysica';

const LOOPSNELHEID = 8;
const SPRONGSNELHEID = 10.5;
const ZWAARTEKRACHT = 28;
const COYOTE_TIJD = 0.14; // je mag nét na de rand nog springen
const SPRING_BUFFER = 0.16; // te vroeg getikt telt ook
const OBBY_OORSPRONG = new THREE.Vector3(29, 0, 7.5);
const WACHTPLEK_PONY = new THREE.Vector3(25.5, 0, 4.5);
const WACHTPLEK_PUPPY = new THREE.Vector3(26, 0, 10.5);
const CATEGORIEEN: Categorie[] = ['langermaakwoord', 'ei-ij', 'au-ou'];
const OBBY_RICHTING = Math.PI / 2; // de obby loopt richting +x

type Modus = 'titel' | 'spelen' | 'scherm';

export class Spel {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
  readonly fysica = new Fysica();
  readonly geluid = new Geluid();
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

  private eiland: Eiland;
  readonly obby: DeurenObby;
  private avatar = new Avatar();
  private pony: Pony | null = null;
  private puppy: Puppy | null = null;
  private effecten: Effecten;
  private zon: THREE.DirectionalLight;
  private klok = new THREE.Timer();

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
  private obbyKlaar = false;
  private obbyUitgelegd = false;
  private ronde = { goedInEenKeer: 0, verdiend: 0 };

  constructor(canvas: HTMLCanvasElement, readonly stand: Spelstand) {
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
    this.obby = new DeurenObby(this.scene, this.fysica, OBBY_OORSPRONG);
    this.obby.startRonde(this.kiesRondeWoorden());
    this.effecten = new Effecten(this.scene);

    this.scene.add(this.avatar.groep);
    this.avatar.groep.position.copy(STARTPUNT);
    this.avatar.groep.rotation.y = this.kijkHoek;
    this.maakDieren();

    this.besturing = new Besturing(
      document.getElementById('vlak')!,
      document.getElementById('springknop')!,
      document.getElementById('joystick-basis')!,
      document.getElementById('joystick-knop')!,
    );
    this.besturing.aan = false;

    this.geluid.aan = stand.geluidAan;
    this.hud.zetGeluid(stand.geluidAan);
    this.hud.zetHoefijzers(stand.hoefijzers);
    this.hud.zichtbaar(false);
    this.hud.geluidKnop.addEventListener('click', () => {
      this.stand.geluidAan = !this.stand.geluidAan;
      this.geluid.aan = this.stand.geluidAan;
      this.hud.zetGeluid(this.stand.geluidAan);
      bewaarStand(this.stand);
    });

    window.addEventListener('resize', () => this.pasFormaatAan());
    this.pasFormaatAan();
  }

  start() {
    this.klok.connect(document);
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  /** (Opnieuw) pony en puppy maken met de gekozen naam en kleur. */
  maakDieren() {
    for (const d of [this.pony, this.puppy]) if (d) this.scene.remove(d.groep);
    const { pony, puppy } = this.stand;
    this.pony = pony ? new Pony(pony.naam, vachtVan(PONY_KLEUREN, pony.kleur)) : null;
    this.puppy = puppy ? new Puppy(puppy.naam, vachtVan(HOND_KLEUREN, puppy.kleur)) : null;
    if (this.pony) {
      this.pony.groep.position.set(STARTPUNT.x + 2.0, 0, STARTPUNT.z + 0.4);
      this.scene.add(this.pony.groep);
    }
    if (this.puppy) {
      this.puppy.groep.position.set(STARTPUNT.x - 1.5, 0, STARTPUNT.z - 0.2);
      this.scene.add(this.puppy.groep);
    }
    this.eiland.stalBord.zetTekst(pony ? `Stal van ${pony.naam}` : 'Stal');
    this.eiland.hokBord.zetTekst(puppy ? puppy.naam : 'Hok');
  }

  /** Van elke categorie evenveel woorden, lastige woorden vaker. */
  private kiesRondeWoorden(): Woordkaart[] {
    const perCategorie = Math.ceil(AANTAL_POORTEN / CATEGORIEEN.length);
    const woorden = CATEGORIEEN.flatMap((c) => kiesWoorden(WOORDEN, this.stand.woorden, perCategorie, [c]));
    for (let i = woorden.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [woorden[i], woorden[j]] = [woorden[j], woorden[i]];
    }
    return woorden.slice(0, AANTAL_POORTEN);
  }

  /** Van het titelscherm naar het spel. */
  begin() {
    this.modus = 'spelen';
    this.hud.zichtbaar(true);
    this.besturing.aan = true;
    this.camYaw = 0;
    this.camDoel.set(this.speler.pos.x, this.speler.pos.y + 1.8, this.speler.pos.z);
  }

  /** Een scherm over het spel: besturing uit. */
  pauzeer() {
    this.modus = 'scherm';
    this.besturing.aan = false;
    this.besturing.loslaten();
  }

  hervat() {
    sluitScherm();
    this.modus = 'spelen';
    this.besturing.aan = true;
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
    const dt = Math.min(this.klok.getDelta(), 1 / 20);
    this.besturing.update();

    if (this.modus === 'titel') this.updateTitelCamera(dt);
    if (this.modus === 'spelen') {
      this.updateSpeler(dt);
      this.verwerk(this.obby.update(dt, this.speler));
    } else {
      this.obby.update(dt, { ...this.speler, pos: { x: -999, y: -999, z: -999 } });
    }
    if (this.modus !== 'titel') this.updateCamera(dt);
    this.updateDieren(dt);
    this.effecten.update(dt);
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

    if (this.besturing.wilSpringen()) this.springBuffer = SPRING_BUFFER;
    this.coyote = s.opGrond ? COYOTE_TIJD : this.coyote - dt;
    if (this.springBuffer > 0 && this.coyote > 0 && this.terugTimer < 0) {
      s.snelheid.y = SPRONGSNELHEID;
      this.coyote = 0;
      this.springBuffer = 0;
      s.opGrond = false;
      this.geluid.spring();
    }
    this.springBuffer -= dt;
    s.snelheid.y = Math.max(s.snelheid.y - ZWAARTEKRACHT * dt, -32);
    this.fysica.beweeg(s, dt);
    this.wasOpGrond = s.opGrond;

    if (Math.hypot(rx, rz) > 0.1) {
      const doel = Math.atan2(rx, rz);
      let verschil = doel - this.kijkHoek;
      verschil = Math.atan2(Math.sin(verschil), Math.cos(verschil));
      this.kijkHoek += verschil * Math.min(1, dt * 14);
    }
    this.avatar.groep.position.set(s.pos.x, s.pos.y, s.pos.z);
    this.avatar.groep.rotation.y = this.kijkHoek;
    const tempo = Math.min(1, Math.hypot(s.snelheid.x, s.snelheid.z) / LOOPSNELHEID);
    this.avatar.animeer(dt, tempo, !this.wasOpGrond);

    // In het water gevallen? Plons, en terug naar het laatste checkpoint.
    if (this.terugTimer < 0 && s.pos.y < WATER_HOOGTE - 0.4) {
      this.terugTimer = 0.8;
      this.effecten.plons(new THREE.Vector3(s.pos.x, WATER_HOOGTE, s.pos.z));
      this.geluid.plons();
      this.hud.verbergBanner();
    }
    if (this.terugTimer >= 0) {
      this.terugTimer -= dt;
      if (this.terugTimer < 0) {
        if (this.obby.bevat(s.pos.x)) this.zetSpeler(this.obby.checkpoint, OBBY_RICHTING);
        else this.zetSpeler(STARTPUNT, Math.PI);
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
    const vrij = Math.max(1.5, this.fysica.straal(c, richting, this.camAfstand) - 0.35);
    this.camEchteAfstand = vrij < this.camEchteAfstand ? vrij : this.camEchteAfstand + (vrij - this.camEchteAfstand) * Math.min(1, dt * 4);
    const a = this.camEchteAfstand;
    this.camera.position.set(c.x + richting.x * a, c.y + richting.y * a, c.z + richting.z * a);
    this.camera.lookAt(c);
    // Heel dichtbij? Dan verdwijnt het poppetje even, anders zie je alleen haar hoofd.
    this.avatar.groep.visible = a > 2.6;
  }

  private updateDieren(dt: number) {
    const s = this.speler.pos;
    const inObby = this.obby.bevat(s.x);
    // De dieren lopen naast de speler (niet ervoor, dan zie je niets).
    const zij = new THREE.Vector3(Math.cos(this.kijkHoek), 0, -Math.sin(this.kijkHoek));
    const voor = new THREE.Vector3(Math.sin(this.kijkHoek), 0, Math.cos(this.kijkHoek));
    const grens = EILAND_RAND - 1;
    const opEiland = (v: THREE.Vector3) => {
      v.x = THREE.MathUtils.clamp(v.x, -grens, grens);
      v.z = THREE.MathUtils.clamp(v.z, -grens, grens);
      v.y = 0;
      return v;
    };
    if (this.pony) {
      const doel = inObby
        ? WACHTPLEK_PONY.clone()
        : opEiland(new THREE.Vector3(s.x, 0, s.z).addScaledVector(zij, -2.0).addScaledVector(voor, -0.4));
      this.pony.update(dt, doel);
    }
    if (this.puppy) {
      const doel = inObby
        ? WACHTPLEK_PUPPY.clone()
        : opEiland(new THREE.Vector3(s.x, 0, s.z).addScaledVector(zij, 1.5).addScaledVector(voor, 0.2));
      this.puppy.update(dt, doel);
    }
  }

  private geefHoefijzers(n: number) {
    this.stand.hoefijzers += n;
    this.ronde.verdiend += n;
    this.hud.zetHoefijzers(this.stand.hoefijzers, true);
    this.hud.meld(`+${n}`);
    this.geluid.munt();
    bewaarStand(this.stand);
  }

  private spreekPoort(p: Poort) {
    if (p.kaart) spreek(voorleesTekst(p.kaart));
  }

  private verwerk(gebeurtenissen: ObbyGebeurtenis[]) {
    for (const g of gebeurtenissen) {
      switch (g.soort) {
        case 'start':
          if (this.obbyKlaar) this.nieuweRonde();
          if (!this.obbyUitgelegd) {
            this.obbyUitgelegd = true;
            const tekst = 'Deuren-obby! Loop steeds door de deur met de goede spelling.';
            this.hud.toonBanner(tekst, () => spreek(tekst), { duur: 6000 });
            spreek(tekst);
          }
          break;
        case 'nader': {
          const p = g.poort;
          this.hud.toonBanner(veilig(zinMetGat(p.kaart!)).replace('___', '<span class="gat"></span>'), () => this.spreekPoort(p));
          this.spreekPoort(p);
          break;
        }
        case 'goed': {
          const p = g.poort;
          const kaart = p.kaart!;
          if (g.eersteKeer) {
            this.stand.woorden[kaart.woord] = verwerkAntwoord(this.stand.woorden[kaart.woord], true, Date.now());
            this.ronde.goedInEenKeer++;
          }
          this.geluid.goed();
          this.effecten.confetti(new THREE.Vector3(p.na.x - 1, p.na.y + 2, this.speler.pos.z));
          this.hud.toonBanner(`Goed zo! <b>${veilig(kaart.woord)}</b> ✔️`, null, { goed: true, duur: 1800 });
          this.geefHoefijzers(g.eersteKeer ? 3 : 1);
          break;
        }
        case 'fout': {
          const kaart = g.poort.kaart!;
          if (g.poort.pogingen === 1) {
            this.stand.woorden[kaart.woord] = verwerkAntwoord(this.stand.woorden[kaart.woord], false, Date.now());
            bewaarStand(this.stand);
          }
          this.geluid.fout();
          this.hud.verbergBanner();
          break;
        }
        case 'inHooi': {
          const p = g.poort;
          const kaart = p.kaart!;
          this.geluid.plof();
          this.effecten.hooi(new THREE.Vector3(this.speler.pos.x, this.speler.pos.y + 0.3, this.speler.pos.z));
          window.setTimeout(() => {
            this.pauzeer();
            const tip = tipVoor(kaart);
            tipKaart(kaart.woord, p.fout, tip, () => spreek(`${kaart.woord}. ${tip}`), () => {
              this.geluid.klik();
              this.obby.herstelPoort(p);
              this.zetSpeler(p.voor, OBBY_RICHTING);
              this.hervat();
            });
            spreek(`${kaart.woord}. ${tip}`);
          }, 450);
          break;
        }
        case 'finish': {
          this.obbyKlaar = true;
          this.stand.obbyGehaald++;
          this.geluid.fanfare();
          this.effecten.confetti(this.obby.bekerPositie);
          this.hud.verbergBanner();
          this.geefHoefijzers(10);
          const { goedInEenKeer, verdiend } = this.ronde;
          window.setTimeout(() => {
            this.pauzeer();
            spreek('Obby gehaald! Goed gedaan!');
            finishKaart(
              goedInEenKeer,
              AANTAL_POORTEN,
              verdiend,
              () => {
                this.nieuweRonde();
                this.zetSpeler(this.obby.startPunt, OBBY_RICHTING);
                this.hervat();
              },
              () => {
                this.nieuweRonde();
                this.zetSpeler(STARTPUNT, Math.PI);
                this.hervat();
              },
            );
          }, 1400);
          break;
        }
      }
    }
  }

  private nieuweRonde() {
    this.obbyKlaar = false;
    this.ronde = { goedInEenKeer: 0, verdiend: 0 };
    this.obby.startRonde(this.kiesRondeWoorden());
  }
}
