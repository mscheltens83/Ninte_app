// Alle instrumenten van de meespeelmuziek, gemaakt met de Web Audio API.
// Er zijn geen geluidsbestanden nodig.
//
// Een nieuw instrument toevoegen? Zet een regel in INSTRUMENTEN met een `speel`-functie.
// Die krijgt een uitgang, een starttijd, een frequentie, een duur (seconden) en een sterkte.

export interface Mixer {
  ctx: BaseAudioContext;
  /** Eén seconde witte ruis, gedeeld door alle slaginstrumenten. */
  ruis: AudioBuffer;
}

export type Speel = (m: Mixer, uit: AudioNode, t: number, freq: number, duur: number, sterkte: number) => void;

export interface Instrument {
  naam: string;
  /** slag = slagwerk (toonhoogte telt niet), toon = één toon, akkoord = drie tonen tegelijk */
  soort: 'slag' | 'toon' | 'akkoord';
  /** -1 (links) tot 1 (rechts) */
  pan: number;
  /** Hoeveel galm (0..1) */
  galm: number;
  /** Duikt even weg op elke boem, zoals in moderne pop ("pompen"). */
  pompt?: boolean;
  speel: Speel;
}

const STIL = 0.0001;

/** Een omhullende: snel aan, dan exponentieel uitsterven. */
function omhul(g: AudioParam, t: number, piek: number, aanval: number, verval: number) {
  g.setValueAtTime(STIL, t);
  g.exponentialRampToValueAtTime(Math.max(STIL * 2, piek), t + aanval);
  g.exponentialRampToValueAtTime(STIL, t + aanval + verval);
}

/** Aan, vasthouden tot `vast`, daarna loslaten. */
function houd(g: AudioParam, t: number, piek: number, aanval: number, vast: number, los: number) {
  g.setValueAtTime(STIL, t);
  g.linearRampToValueAtTime(piek, t + aanval);
  g.setValueAtTime(piek, t + Math.max(aanval, vast));
  g.exponentialRampToValueAtTime(STIL, t + Math.max(aanval, vast) + los);
}

const krommes = new Map<number, Float32Array<ArrayBuffer>>();
/** Zachte vervorming: maakt bas en drums voller en ook hoorbaar op kleine speakers. */
function verzadig(m: Mixer, drive: number): WaveShaperNode {
  let kromme = krommes.get(drive);
  if (!kromme) {
    kromme = new Float32Array(1024);
    for (let i = 0; i < kromme.length; i++) {
      const x = (i / (kromme.length - 1)) * 2 - 1;
      kromme[i] = Math.tanh(x * drive) / Math.tanh(drive);
    }
    krommes.set(drive, kromme);
  }
  const w = m.ctx.createWaveShaper();
  w.curve = kromme;
  return w;
}

function osc(m: Mixer, type: OscillatorType, freq: number, t: number, stop: number): OscillatorNode {
  const o = m.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.start(t);
  o.stop(stop);
  return o;
}

function gain(m: Mixer): GainNode {
  return m.ctx.createGain();
}

function filter(m: Mixer, type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
  const f = m.ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function ruis(m: Mixer, t: number, duur: number): AudioBufferSourceNode {
  const b = m.ctx.createBufferSource();
  b.buffer = m.ruis;
  const begin = Math.random() * Math.max(0, m.ruis.duration - duur - 0.05);
  b.start(t, begin, duur + 0.05);
  return b;
}

/** Ruis door een filter met een korte omhullende: de basis van bijna al het slagwerk. */
function ruisSlag(m: Mixer, uit: AudioNode, t: number, piek: number, verval: number, type: BiquadFilterType, freq: number, q = 0.7) {
  const g = gain(m);
  omhul(g.gain, t, piek, 0.002, verval);
  ruis(m, t, verval + 0.01).connect(filter(m, type, freq, q)).connect(g).connect(uit);
}

export const INSTRUMENTEN = {
  boem: {
    naam: 'Boem (basdrum)', soort: 'slag', pan: 0, galm: 0.02,
    speel: (m, uit, t, _f, _d, s) => {
      // Lichaam: een diepe toon die snel omlaag zakt, licht vervormd voor meer kracht.
      const o = osc(m, 'sine', 190, t, t + 0.6);
      o.frequency.exponentialRampToValueAtTime(52, t + 0.07);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.4);
      const g = gain(m);
      omhul(g.gain, t, 1.15 * s, 0.002, 0.48);
      o.connect(verzadig(m, 2.2)).connect(g).connect(uit);
      // Klik: de tik bovenop, waardoor je de boem ook op een iPad goed hoort.
      const k = osc(m, 'triangle', 2600, t, t + 0.03);
      k.frequency.exponentialRampToValueAtTime(600, t + 0.02);
      const kg = gain(m);
      omhul(kg.gain, t, 0.35 * s, 0.001, 0.02);
      k.connect(kg).connect(uit);
      ruisSlag(m, uit, t, 0.18 * s, 0.01, 'highpass', 4000);
    },
  },
  klap: {
    naam: 'Klap', soort: 'slag', pan: 0.1, galm: 0.35,
    speel: (m, uit, t, _f, _d, s) => {
      const g = gain(m);
      g.gain.setValueAtTime(STIL, t);
      for (const dt of [0, 0.011, 0.022]) {
        g.gain.setValueAtTime(0.55 * s, t + dt);
        g.gain.exponentialRampToValueAtTime(0.08 * s, t + dt + 0.009);
      }
      g.gain.setValueAtTime(0.45 * s, t + 0.031);
      g.gain.exponentialRampToValueAtTime(STIL, t + 0.2);
      ruis(m, t, 0.22).connect(filter(m, 'bandpass', 1250, 0.9)).connect(g).connect(uit);
    },
  },
  trom: {
    naam: 'Snaredrum', soort: 'slag', pan: 0.05, galm: 0.35,
    speel: (m, uit, t, _f, _d, s) => {
      // Een vette popsnare: ruis met een lange staart en twee tonen eronder.
      ruisSlag(m, uit, t, 0.6 * s, 0.24, 'bandpass', 2400, 0.6);
      ruisSlag(m, uit, t, 0.3 * s, 0.12, 'highpass', 6000);
      for (const [f, v] of [[210, 0.45], [340, 0.2]] as const) {
        const o = osc(m, 'triangle', f, t, t + 0.2);
        o.frequency.exponentialRampToValueAtTime(f * 0.75, t + 0.12);
        const g = gain(m);
        omhul(g.gain, t, v * s, 0.002, 0.14);
        o.connect(verzadig(m, 1.6)).connect(g).connect(uit);
      }
    },
  },
  tik: {
    naam: 'Tsss (dichte hihat)', soort: 'slag', pan: -0.25, galm: 0.08,
    speel: (m, uit, t, _f, _d, s) => ruisSlag(m, uit, t, 0.22 * s, 0.035, 'highpass', 9000),
  },
  tsss: {
    naam: 'Open hihat', soort: 'slag', pan: -0.3, galm: 0.15,
    speel: (m, uit, t, _f, _d, s) => ruisSlag(m, uit, t, 0.16 * s, 0.28, 'highpass', 6500),
  },
  shaker: {
    naam: 'Shaker', soort: 'slag', pan: 0.35, galm: 0.1,
    speel: (m, uit, t, _f, _d, s) => {
      const g = gain(m);
      g.gain.setValueAtTime(STIL, t);
      g.gain.linearRampToValueAtTime(0.12 * s, t + 0.025);
      g.gain.exponentialRampToValueAtTime(STIL, t + 0.09);
      ruis(m, t, 0.1).connect(filter(m, 'bandpass', 5200, 1.2)).connect(g).connect(uit);
    },
  },
  bekken: {
    naam: 'Bekken', soort: 'slag', pan: 0.2, galm: 0.4,
    speel: (m, uit, t, _f, _d, s) => ruisSlag(m, uit, t, 0.2 * s, 1.6, 'highpass', 4200),
  },
  koe: {
    naam: 'Koebel', soort: 'slag', pan: 0.3, galm: 0.2,
    speel: (m, uit, t, _f, _d, s) => {
      const g = gain(m);
      omhul(g.gain, t, 0.2 * s, 0.002, 0.28);
      const bp = filter(m, 'bandpass', 1500, 2.5);
      for (const f of [560, 835]) osc(m, 'square', f, t, t + 0.35).connect(bp);
      bp.connect(g).connect(uit);
    },
  },
  bas: {
    naam: 'Bas', soort: 'toon', pan: 0, galm: 0.03, pompt: true,
    speel: (m, uit, t, f, d, s) => {
      // Een zware popbas: een diepe sinus plus een gefilterde zaagtand, licht vervormd.
      const lengte = Math.min(Math.max(d, 0.12), 1.5);
      const g = gain(m);
      houd(g.gain, t, 0.5 * s, 0.005, lengte * 0.85, 0.07);
      const sub = osc(m, 'sine', f, t, t + lengte + 0.1);
      const zaag = osc(m, 'sawtooth', f, t, t + lengte + 0.1);
      const lp = filter(m, 'lowpass', 1800, 3);
      lp.frequency.setValueAtTime(1800, t);
      lp.frequency.exponentialRampToValueAtTime(320, t + 0.16);
      const zg = gain(m);
      zg.gain.value = 0.55;
      zaag.connect(lp).connect(zg).connect(g);
      sub.connect(g);
      g.connect(verzadig(m, 1.8)).connect(uit);
    },
  },
  subbas: {
    naam: '808-bas', soort: 'toon', pan: 0, galm: 0.02, pompt: true,
    speel: (m, uit, t, f, d, s) => {
      // De beroemde 808: een lange, glijdende diepe toon, vervormd zodat je hem ook op kleine speakers hoort.
      const lengte = Math.min(Math.max(d, 0.2), 1.6);
      const o = osc(m, 'sine', f * 1.6, t, t + lengte + 0.2);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      const g = gain(m);
      houd(g.gain, t, 0.75 * s, 0.004, lengte * 0.8, 0.15);
      o.connect(verzadig(m, 3)).connect(g).connect(uit);
    },
  },
  supersaw: {
    naam: 'Supersaw-akkoord', soort: 'akkoord', pan: 0, galm: 0.45, pompt: true,
    speel: (m, uit, t, f, d, s) => {
      // Vijf licht ontstemde zaagtanden: het brede, glanzende popakkoord.
      const lengte = Math.max(d, 0.2);
      const g = gain(m);
      houd(g.gain, t, 0.028 * s, 0.015, lengte * 0.92, 0.25);
      const lp = filter(m, 'lowpass', 3600, 0.6);
      for (const cent of [-22, -9, 0, 9, 22]) {
        const o = osc(m, 'sawtooth', f, t, t + lengte + 0.35);
        o.detune.value = cent;
        o.connect(lp);
      }
      lp.connect(g).connect(uit);
    },
  },
  stab: {
    naam: 'Akkoordstoot', soort: 'akkoord', pan: 0.15, galm: 0.4, pompt: true,
    speel: (m, uit, t, f, _d, s) => {
      const g = gain(m);
      omhul(g.gain, t, 0.05 * s, 0.003, 0.22);
      const lp = filter(m, 'lowpass', 4200, 1);
      lp.frequency.setValueAtTime(4200, t);
      lp.frequency.exponentialRampToValueAtTime(900, t + 0.2);
      for (const cent of [-12, 0, 12]) {
        const o = osc(m, 'sawtooth', f, t, t + 0.3);
        o.detune.value = cent;
        o.connect(lp);
      }
      lp.connect(g).connect(uit);
    },
  },
  popPluk: {
    naam: 'Poppluk', soort: 'toon', pan: -0.1, galm: 0.4, pompt: true,
    speel: (m, uit, t, f, _d, s) => {
      // Het korte, heldere plingende geluid uit veel zomerhits.
      const g = gain(m);
      omhul(g.gain, t, 0.2 * s, 0.002, 0.38);
      const lp = filter(m, 'lowpass', 5000, 2);
      lp.frequency.setValueAtTime(5000, t);
      lp.frequency.exponentialRampToValueAtTime(700, t + 0.25);
      osc(m, 'sawtooth', f, t, t + 0.45).connect(lp);
      const vierkant = osc(m, 'square', f * 2, t, t + 0.45);
      const vg = gain(m);
      vg.gain.value = 0.3;
      vierkant.connect(vg).connect(lp);
      lp.connect(g).connect(uit);
    },
  },
  diepbas: {
    naam: 'Zachte bas', soort: 'toon', pan: 0, galm: 0.05, pompt: true,
    speel: (m, uit, t, f, d, s) => {
      const lengte = Math.min(Math.max(d, 0.15), 2);
      const g = gain(m);
      houd(g.gain, t, 0.55 * s, 0.01, lengte * 0.85, 0.1);
      osc(m, 'triangle', f, t, t + lengte + 0.15).connect(g).connect(uit);
    },
  },
  pad: {
    naam: 'Zacht tapijt', soort: 'akkoord', pan: 0, galm: 0.55, pompt: true,
    speel: (m, uit, t, f, d, s) => {
      const lengte = Math.max(d, 0.4);
      const g = gain(m);
      houd(g.gain, t, 0.05 * s, Math.min(0.35, lengte / 3), lengte, 0.7);
      const lp = filter(m, 'lowpass', 1500, 0.5);
      for (const cent of [-8, 8]) {
        const o = osc(m, 'sawtooth', f, t, t + lengte + 0.8);
        o.detune.value = cent;
        o.connect(lp);
      }
      lp.connect(g).connect(uit);
    },
  },
  orgel: {
    naam: 'Orgel', soort: 'akkoord', pan: -0.15, galm: 0.3, pompt: true,
    speel: (m, uit, t, f, d, s) => {
      const g = gain(m);
      houd(g.gain, t, 0.05 * s, 0.005, Math.min(d, 0.25), 0.12);
      const lp = filter(m, 'lowpass', 2600);
      osc(m, 'square', f, t, t + 0.6).connect(lp);
      osc(m, 'sine', f * 2, t, t + 0.6).connect(lp);
      lp.connect(g).connect(uit);
    },
  },
  pluk: {
    naam: 'Gitaar', soort: 'toon', pan: -0.35, galm: 0.25, pompt: true,
    speel: (m, uit, t, f, _d, s) => {
      const g = gain(m);
      omhul(g.gain, t, 0.24 * s, 0.003, 0.5);
      const lp = filter(m, 'lowpass', 3200);
      lp.frequency.setValueAtTime(3200, t);
      lp.frequency.exponentialRampToValueAtTime(700, t + 0.4);
      osc(m, 'triangle', f, t, t + 0.6).connect(lp);
      const zaag = gain(m);
      zaag.gain.value = 0.35;
      osc(m, 'sawtooth', f, t, t + 0.6).connect(zaag).connect(lp);
      lp.connect(g).connect(uit);
    },
  },
  marimba: {
    naam: 'Marimba', soort: 'toon', pan: 0.3, galm: 0.25,
    speel: (m, uit, t, f, _d, s) => {
      const g = gain(m);
      omhul(g.gain, t, 0.32 * s, 0.002, 0.45);
      osc(m, 'sine', f, t, t + 0.55).connect(g);
      const g2 = gain(m);
      omhul(g2.gain, t, 0.12 * s, 0.001, 0.06);
      osc(m, 'sine', f * 4, t, t + 0.1).connect(g2).connect(uit);
      g.connect(uit);
    },
  },
  bel: {
    naam: 'Bel', soort: 'toon', pan: 0.2, galm: 0.5,
    speel: (m, uit, t, f, _d, s) => {
      const drager = osc(m, 'sine', f, t, t + 1.4);
      const mod = osc(m, 'sine', f * 3.5, t, t + 1.4);
      const diepte = gain(m);
      diepte.gain.setValueAtTime(f * 2.2, t);
      diepte.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.9);
      mod.connect(diepte).connect(drager.frequency);
      const g = gain(m);
      omhul(g.gain, t, 0.16 * s, 0.002, 1.2);
      drager.connect(g).connect(uit);
    },
  },
  fluit: {
    naam: 'Fluit', soort: 'toon', pan: -0.1, galm: 0.4,
    speel: (m, uit, t, f, d, s) => {
      const lengte = Math.max(d, 0.12);
      const o = osc(m, 'sine', f, t, t + lengte + 0.2);
      const tril = osc(m, 'sine', 5.5, t, t + lengte + 0.2);
      const trilDiepte = gain(m);
      trilDiepte.gain.setValueAtTime(0, t);
      trilDiepte.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.3, lengte));
      tril.connect(trilDiepte).connect(o.frequency);
      const g = gain(m);
      houd(g.gain, t, 0.2 * s, 0.04, lengte * 0.9, 0.1);
      const adem = gain(m);
      omhul(adem.gain, t, 0.03 * s, 0.01, 0.08);
      ruis(m, t, 0.1).connect(filter(m, 'bandpass', f * 2, 2)).connect(adem).connect(uit);
      o.connect(g).connect(uit);
    },
  },
  lead: {
    naam: 'Spelcomputer', soort: 'toon', pan: 0.1, galm: 0.3, pompt: true,
    speel: (m, uit, t, f, d, s) => {
      const lengte = Math.max(d * 0.9, 0.08);
      const g = gain(m);
      houd(g.gain, t, 0.06 * s, 0.004, lengte, 0.06);
      const lp = filter(m, 'lowpass', 3400);
      for (const cent of [-6, 6]) {
        const o = osc(m, 'square', f, t, t + lengte + 0.1);
        o.detune.value = cent;
        o.connect(lp);
      }
      lp.connect(g).connect(uit);
    },
  },
  piep: {
    naam: 'Piepjes', soort: 'toon', pan: -0.4, galm: 0.35,
    speel: (m, uit, t, f, _d, s) => {
      const g = gain(m);
      omhul(g.gain, t, 0.05 * s, 0.002, 0.09);
      osc(m, 'square', f, t, t + 0.12).connect(g).connect(uit);
    },
  },
} satisfies Record<string, Instrument>;

export type InstrumentId = keyof typeof INSTRUMENTEN;

export function isInstrument(id: string): id is InstrumentId {
  return Object.hasOwn(INSTRUMENTEN, id);
}
