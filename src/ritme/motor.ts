// De meespeelmuziek: speelt de liedjes uit liedjes.ts af met de instrumenten uit
// instrumenten.ts. Hoe meer Ninte goed doet, hoe meer instrumenten er meedoen.
// Goede antwoorden worden een toontje dat precies in de maat en in de toonsoort past.

import { beatLagen, type Beat } from './beat';
import { Energie } from './energie';
import { INSTRUMENTEN, type Instrument, type InstrumentId, type Mixer } from './instrumenten';
import { Klok, STAPPEN_PER_MAAT, STAPPEN_PER_TEL } from './klok';
import { LIEDJES, type Laag, type LaagGroep, type Lied } from './liedjes';
import { leesPatroon, type Noot, type Patroon } from './patroon';
import { drieklank, frequentie, inToonsoort, trapNaarMidi } from './theorie';

const VOLUME = 0.4;
const VOLUME_GEDEMPT = 0.09;
/** Op deze hoogtes klinken goede antwoorden na elkaar: steeds een toontje hoger. */
const REEKS_TRAPPEN = [0, 2, 4, 7, 9, 11, 14, 16];

export type Moment = 'goed' | 'feest';

interface BereideLaag {
  laag: Laag;
  patroon: Patroon;
  instrument: Instrument;
}

interface BereidLied {
  lied: Lied;
  lagen: BereideLaag[];
}

const bereidCache = new Map<Lied, BereidLied>();

/** Patronen één keer lezen en controleren. Gooit een duidelijke fout bij een tikfout. */
export function bereidLied(lied: Lied): BereidLied {
  let b = bereidCache.get(lied);
  if (!b) {
    b = { lied, lagen: bereidLagen(lied.lagen, lied.id) };
    bereidCache.set(lied, b);
  }
  return b;
}

function bereidLagen(lagen: Laag[], naam: string): BereideLaag[] {
  return lagen.map((laag, i) => {
    const instrument = INSTRUMENTEN[laag.instrument] as Instrument | undefined;
    if (!instrument) throw new Error(`${naam}, laag ${i + 1}: onbekend instrument "${laag.instrument}"`);
    try {
      return { laag, patroon: leesPatroon(laag.patroon, laag.stap ?? 1), instrument };
    } catch (fout) {
      throw new Error(`${naam}, laag ${i + 1} (${laag.instrument}): ${(fout as Error).message}`);
    }
  });
}

/** Een galm (nagalm van een zaal), gemaakt van uitstervende ruis. */
function maakGalm(ctx: BaseAudioContext, seconden = 1.8): AudioBuffer {
  const lengte = Math.floor(ctx.sampleRate * seconden);
  const buffer = ctx.createBuffer(2, lengte, ctx.sampleRate);
  for (let k = 0; k < 2; k++) {
    const data = buffer.getChannelData(k);
    for (let i = 0; i < lengte; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / lengte) ** 3;
  }
  return buffer;
}

function maakRuis(ctx: BaseAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

interface Graaf {
  ctx: AudioContext;
  mixer: Mixer;
  hoofd: GainNode;
  bus: GainNode;
  /** Instrumenten die wegduiken op elke boem lopen via deze knop. */
  pomp: GainNode;
  galm: GainNode;
  kanalen: Map<string, GainNode>;
}

export class Meespeelmuziek {
  readonly energie = new Energie();
  /** Wordt aangeroepen als de energie verandert (bijv. voor een feestje bij 4). */
  opNiveau: ((niveau: number, vorig: number) => void) | null = null;

  private graaf: Graaf | null = null;
  private klok: Klok;
  private timer: ReturnType<typeof setInterval> | undefined;
  private huidig: BereidLied;
  private gewenst: BereidLied;
  private eigen: { beat: Beat; lagen: BereideLaag[] } | null = null;
  private eigenAlleenOp = 'podium';
  private actief = false;
  private aan = true;
  private gedempt = false;
  private reeks = 0;
  private wachtrij: Moment[] = [];
  private vorigNiveau = -1;
  private vrijeStap = 0;

  constructor(private bron: () => AudioContext | null, startLied: Lied = LIEDJES[0]) {
    this.huidig = this.gewenst = bereidLied(startLied);
    this.klok = new Klok((stap, tijd) => this.plan(stap, tijd), startLied.bpm);
  }

  get lied(): Lied {
    return this.huidig.lied;
  }

  get bpm(): number {
    return this.klok.bpm;
  }

  get speelt(): boolean {
    return this.klok.aanHetLopen;
  }

  /** De energie (0..4) van dit moment. */
  get niveau(): number {
    return this.energie.niveau(this.huidig.lied.basis);
  }

  /** Waar in de maat we nu zijn, in 16e stappen (met decimalen). Ook zonder geluid. */
  get stap(): number {
    const ctx = this.graaf?.ctx;
    if (ctx && this.klok.aanHetLopen && ctx.state === 'running') {
      const vertraging = (ctx as AudioContext & { outputLatency?: number }).outputLatency || ctx.baseLatency || 0;
      return this.klok.stapOp(ctx.currentTime - vertraging);
    }
    return this.vrijeStap;
  }

  /** Waar in de maat we nu zijn, in tellen (met decimalen). */
  get tel(): number {
    return this.stap / STAPPEN_PER_TEL;
  }

  /** Meespeelmuziek is de gekozen muzieksoort (of niet). */
  zetActief(ja: boolean) {
    this.actief = ja;
    if (ja) this.probeerStart();
    else this.stop();
  }

  zetAan(aan: boolean) {
    this.aan = aan;
    this.pasVolumeAan();
    if (aan) this.probeerStart();
  }

  demp(ja: boolean) {
    this.gedempt = ja;
    this.pasVolumeAan();
  }

  /** Kies een liedje. Het wisselt netjes aan het begin van de volgende maat. */
  kies(lied: Lied) {
    if (this.gewenst.lied === lied) return;
    this.gewenst = bereidLied(lied);
    if (!this.klok.aanHetLopen) {
      this.huidig = this.gewenst;
      this.klok.bpm = this.tempoVan(this.huidig.lied);
    }
  }

  /** Een eigen beat die meespeelt (op het podium). Vervangt daar de drums. */
  zetEigenBeat(beat: Beat | null, alleenOp = 'podium') {
    this.eigenAlleenOp = alleenOp;
    this.eigen = beat ? { beat, lagen: bereidLagen(beatLagen(beat), 'eigen beat') } : null;
  }

  /** Iets goed gedaan of iets groots bereikt: de muziek viert mee. */
  moment(soort: Moment) {
    if (soort === 'goed') {
      this.energie.goed(1);
      this.reeks++;
    } else {
      this.energie.goed(4);
    }
    if (this.wachtrij.length < 4) this.wachtrij.push(soort);
  }

  /** Begin weer rustig (bijv. na een nieuwe dag). */
  rustig() {
    this.energie.reset();
    this.reeks = 0;
  }

  /** Breng een frequentie naar de toonsoort van het huidige liedje. */
  stemming(freq: number): number {
    const l = this.huidig.lied;
    return inToonsoort(freq, l.grondtoon, l.toonladder);
  }

  update(dt: number) {
    this.energie.update(dt);
    if (this.energie.aantalPunten < 1) this.reeks = 0;
    if (this.actief && this.aan && !this.klok.aanHetLopen) this.probeerStart();
    const echt = this.graaf && this.klok.aanHetLopen && this.graaf.ctx.state === 'running';
    this.vrijeStap = echt ? this.stap : this.vrijeStap + (dt * this.klok.bpm * STAPPEN_PER_TEL) / 60;
    const niveau = this.niveau;
    if (niveau !== this.vorigNiveau) {
      const vorig = this.vorigNiveau;
      this.vorigNiveau = niveau;
      if (vorig >= 0) this.opNiveau?.(niveau, vorig);
    }
  }

  private tempoVan(lied: Lied): number {
    return this.eigenActief(lied) ? this.eigen!.beat.bpm : lied.bpm;
  }

  private eigenActief(lied = this.huidig.lied): boolean {
    return !!this.eigen && lied.id === this.eigenAlleenOp;
  }

  private probeerStart() {
    if (!this.actief || !this.aan || this.klok.aanHetLopen) return;
    const ctx = this.bron();
    if (!ctx) return;
    try {
      if (!this.graaf || this.graaf.ctx !== ctx) this.graaf = this.bouwGraaf(ctx);
    } catch {
      this.graaf = null;
      return;
    }
    this.huidig = this.gewenst;
    this.klok.bpm = this.tempoVan(this.huidig.lied);
    this.klok.start(ctx.currentTime);
    this.pasVolumeAan();
    this.timer = setInterval(() => {
      if (this.graaf && this.graaf.ctx.state === 'running') this.klok.tik(this.graaf.ctx.currentTime);
    }, 25);
    if (ctx.state === 'running') this.klok.tik(ctx.currentTime);
  }

  private stop() {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
    this.klok.stop();
    this.pasVolumeAan();
  }

  private bouwGraaf(ctx: AudioContext): Graaf {
    const hoofd = ctx.createGain();
    hoofd.gain.value = 0.0001;
    // Eindmix: meer laag en een beetje glans, daarna stevig samengedrukt zoals op de radio.
    const pers = ctx.createDynamicsCompressor();
    pers.threshold.value = -20;
    pers.knee.value = 6;
    pers.ratio.value = 5;
    pers.attack.value = 0.005;
    pers.release.value = 0.15;
    const laag = ctx.createBiquadFilter();
    laag.type = 'lowshelf';
    laag.frequency.value = 110;
    laag.gain.value = 5;
    const glans = ctx.createBiquadFilter();
    glans.type = 'highshelf';
    glans.frequency.value = 9000;
    glans.gain.value = 3;
    const bus = ctx.createGain();
    bus.connect(laag).connect(glans).connect(pers).connect(hoofd).connect(ctx.destination);
    const pomp = ctx.createGain();
    pomp.connect(bus);
    const galm = ctx.createGain();
    galm.gain.value = 0.6;
    const zaal = ctx.createConvolver();
    zaal.buffer = maakGalm(ctx);
    galm.connect(zaal).connect(bus);
    return { ctx, mixer: { ctx, ruis: maakRuis(ctx) }, hoofd, bus, pomp, galm, kanalen: new Map() };
  }

  /** Eén kanaal per instrument: links/rechts en een beetje galm. */
  private kanaal(g: Graaf, id: InstrumentId): GainNode {
    let k = g.kanalen.get(id);
    if (!k) {
      const inst = INSTRUMENTEN[id] as Instrument;
      k = g.ctx.createGain();
      const doel = inst.pompt ? g.pomp : g.bus;
      const naarBus = typeof g.ctx.createStereoPanner === 'function' ? g.ctx.createStereoPanner() : null;
      if (naarBus) {
        naarBus.pan.value = inst.pan;
        k.connect(naarBus).connect(doel);
      } else {
        k.connect(doel);
      }
      const send = g.ctx.createGain();
      send.gain.value = inst.galm;
      k.connect(send).connect(g.galm);
      g.kanalen.set(id, k);
    }
    return k;
  }

  private pasVolumeAan() {
    const g = this.graaf;
    if (!g) return;
    const doel = this.actief && this.aan && this.klok.aanHetLopen ? (this.gedempt ? VOLUME_GEDEMPT : VOLUME) : 0.0001;
    g.hoofd.gain.cancelScheduledValues(g.ctx.currentTime);
    g.hoofd.gain.setTargetAtTime(doel, g.ctx.currentTime, 0.25);
  }

  /** Alle lagen die nu meespelen. */
  private speelbareLagen(niveau: number): BereideLaag[] {
    const eigen = this.eigenActief();
    const stil = new Set<LaagGroep>(eigen ? ['drums', 'extra'] : []);
    const lagen = this.huidig.lagen.filter(({ laag }) =>
      niveau >= (laag.vanaf ?? 0) && niveau <= (laag.tot ?? 4) && !(laag.groep && stil.has(laag.groep)));
    return eigen ? [...lagen, ...this.eigen!.lagen] : lagen;
  }

  private plan(stap: number, tijd: number) {
    const g = this.graaf;
    if (!g) return;
    if (stap % STAPPEN_PER_MAAT === 0 && this.gewenst !== this.huidig) this.huidig = this.gewenst;
    if (stap % STAPPEN_PER_TEL === 0) this.klok.bpm = this.tempoVan(this.huidig.lied);
    const lied = this.huidig.lied;
    const akkoord = lied.akkoorden[Math.floor(stap / STAPPEN_PER_MAAT) % lied.akkoorden.length];
    const swing = stap % 2 === 1 ? (lied.swing ?? 0) * this.klok.stapDuur : 0;
    const t = tijd + swing;
    for (const b of this.speelbareLagen(this.niveau)) {
      for (const noot of b.patroon.perStap[stap % b.patroon.lengte]) this.speelNoot(g, b, noot, t, akkoord);
    }
    if (this.wachtrij.length && stap % 2 === 0) this.vier(g, this.wachtrij.shift()!, t, akkoord);
  }

  private speelNoot(g: Graaf, b: BereideLaag, noot: Noot, t: number, akkoord: number) {
    const { laag, instrument } = b;
    const lied = this.huidig.lied;
    const sterkte = (laag.volume ?? 1) * noot.sterkte;
    const duur = noot.duur * this.klok.stapDuur;
    const uit = this.kanaal(g, laag.instrument);
    // Op elke boem duiken bas en akkoorden even weg: het pompende geluid van moderne pop.
    if (laag.instrument === 'boem') {
      g.pomp.gain.cancelScheduledValues(t);
      g.pomp.gain.setValueAtTime(0.35, t);
      g.pomp.gain.linearRampToValueAtTime(1, t + this.klok.stapDuur * 3);
    }
    if (instrument.soort === 'slag' || noot.trap === null) {
      instrument.speel(g.mixer, uit, t, 0, duur, sterkte);
      return;
    }
    const trap = (laag.volgt === 'toonsoort' ? 0 : akkoord) + noot.trap;
    const grond = lied.grondtoon + 12 * (laag.octaaf ?? 0);
    if (instrument.soort === 'akkoord' || laag.akkoord) {
      for (const midi of drieklank(grond, lied.toonladder, trap)) instrument.speel(g.mixer, uit, t, frequentie(midi), duur, sterkte);
    } else {
      instrument.speel(g.mixer, uit, t, frequentie(trapNaarMidi(grond, lied.toonladder, trap)), duur, sterkte);
    }
  }

  /** Een goed antwoord wordt een toontje; een feest wordt een bekken met een loopje omhoog. */
  private vier(g: Graaf, soort: Moment, t: number, akkoord: number) {
    const lied = this.huidig.lied;
    const grond = lied.grondtoon + 12;
    const d = this.klok.stapDuur;
    const toon = (trap: number, wanneer: number, sterkte: number) => {
      const f = frequentie(trapNaarMidi(grond, lied.toonladder, akkoord + trap));
      INSTRUMENTEN.bel.speel(g.mixer, this.kanaal(g, 'bel'), wanneer, f, d * 4, sterkte);
      INSTRUMENTEN.marimba.speel(g.mixer, this.kanaal(g, 'marimba'), wanneer, f / 2, d * 2, sterkte * 0.6);
    };
    if (soort === 'goed') {
      toon(REEKS_TRAPPEN[Math.min(this.reeks, REEKS_TRAPPEN.length) - 1] ?? 0, t, 1.1);
    } else {
      INSTRUMENTEN.bekken.speel(g.mixer, this.kanaal(g, 'bekken'), t, 0, 1, 1.2);
      [0, 2, 4, 7, 9, 11, 14].forEach((trap, i) => toon(trap, t + i * d, 0.9));
    }
  }
}
