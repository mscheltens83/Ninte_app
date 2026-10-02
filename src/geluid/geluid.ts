// Geluidseffecten, gemaakt met de Web Audio API (geen geluidsbestanden nodig).

type Golf = OscillatorType;

export class Geluid {
  private ctx: AudioContext | null = null;
  aan = true;
  /** Optioneel: brengt elke toon naar de toonsoort van de muziek die nu speelt. */
  stemming: ((freq: number) => number) | null = null;

  /** De audio-context, pas beschikbaar na de eerste tik. */
  get context(): AudioContext | null {
    return this.ctx;
  }

  /** Moet vanuit een tik/klik worden aangeroepen (eis van iOS). */
  ontgrendel() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  private toon(freq: number, start: number, duur: number, golf: Golf = 'sine', volume = 0.18, naarFreq?: number) {
    if (!this.aan || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + start;
    if (this.stemming) {
      freq = this.stemming(freq);
      if (naarFreq) naarFreq = this.stemming(naarFreq);
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = golf;
    osc.frequency.setValueAtTime(freq, t);
    if (naarFreq) osc.frequency.exponentialRampToValueAtTime(naarFreq, t + duur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duur + 0.05);
  }

  private ruis(start: number, duur: number, volume = 0.2, filterFreq = 1200) {
    if (!this.aan || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + start;
    const lengte = Math.floor(ctx.sampleRate * duur);
    const buffer = ctx.createBuffer(1, lengte, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < lengte; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / lengte);
    const bron = ctx.createBufferSource();
    bron.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    bron.connect(filter).connect(gain).connect(ctx.destination);
    bron.start(t);
  }

  spring() {
    this.toon(330, 0, 0.18, 'square', 0.05, 660);
  }

  munt() {
    this.toon(988, 0, 0.08, 'square', 0.07);
    this.toon(1319, 0.07, 0.25, 'square', 0.07);
  }

  goed() {
    [523, 659, 784].forEach((f, i) => this.toon(f, i * 0.09, 0.22, 'triangle', 0.2));
  }

  fout() {
    this.toon(300, 0, 0.35, 'sine', 0.2, 180);
  }

  plof() {
    this.ruis(0, 0.35, 0.25, 700);
  }

  plons() {
    this.ruis(0, 0.6, 0.3, 1800);
  }

  klik() {
    this.toon(700, 0, 0.06, 'sine', 0.1);
  }

  fanfare() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.toon(f, i * 0.12, i === 5 ? 0.6 : 0.2, 'triangle', 0.22));
  }

  boing() {
    this.toon(180, 0, 0.35, 'sine', 0.25, 720);
    this.toon(360, 0.05, 0.3, 'triangle', 0.08, 900);
  }

  hinnik() {
    // Een paardengeluid: een hoge toon die trillend omlaag gaat.
    if (!this.aan || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(950, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.9);
    lfo.frequency.value = 22;
    lfoGain.gain.value = 60;
    lfo.connect(lfoGain).connect(osc.frequency);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + 1);
    lfo.stop(t + 1);
  }

  magie() {
    [1047, 1319, 1568, 2093, 2637].forEach((f, i) => this.toon(f, i * 0.07, 0.35, 'triangle', 0.1));
  }

  kist() {
    this.toon(220, 0, 0.12, 'square', 0.06, 180);
    [784, 988, 1175, 1568].forEach((f, i) => this.toon(f, 0.15 + i * 0.09, 0.3, 'triangle', 0.14));
  }

  /** Iets neerzetten tijdens het bouwen: een houten tikje. */
  bouw() {
    this.toon(520, 0, 0.07, 'square', 0.05, 390);
    this.ruis(0, 0.07, 0.1, 900);
  }

  /** Iets weghalen tijdens het bouwen. */
  gum() {
    this.toon(760, 0, 0.13, 'sine', 0.08, 320);
  }

  blaf() {
    this.toon(500, 0, 0.09, 'sawtooth', 0.08, 300);
    this.toon(520, 0.14, 0.09, 'sawtooth', 0.08, 310);
  }
}
