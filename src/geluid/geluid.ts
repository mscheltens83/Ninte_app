// Geluidseffecten, gemaakt met de Web Audio API (geen geluidsbestanden nodig).

type Golf = OscillatorType;

export class Geluid {
  private ctx: AudioContext | null = null;
  aan = true;

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

  blaf() {
    this.toon(500, 0, 0.09, 'sawtooth', 0.08, 300);
    this.toon(520, 0.14, 0.09, 'sawtooth', 0.08, 310);
  }
}
