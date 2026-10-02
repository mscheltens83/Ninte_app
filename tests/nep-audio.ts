// Een nep-AudioContext voor tests. Hij is net zo streng als een echte browser:
// ongeldige tijden of een exponentiële ramp naar 0 geven een fout.

function controleerTijd(t: number, wat: string) {
  if (!Number.isFinite(t) || t < 0) throw new RangeError(`${wat}: ongeldige tijd ${t}`);
}

export class NepParam {
  value = 0;
  stappen: { soort: string; waarde: number; tijd: number }[] = [];
  setValueAtTime(v: number, t: number) {
    if (!Number.isFinite(v)) throw new TypeError(`setValueAtTime: waarde ${v}`);
    controleerTijd(t, 'setValueAtTime');
    this.stappen.push({ soort: 'zet', waarde: v, tijd: t });
    return this;
  }
  linearRampToValueAtTime(v: number, t: number) {
    if (!Number.isFinite(v)) throw new TypeError(`linearRamp: waarde ${v}`);
    controleerTijd(t, 'linearRamp');
    this.stappen.push({ soort: 'lineair', waarde: v, tijd: t });
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    if (!Number.isFinite(v) || v <= 0) throw new RangeError(`exponentialRamp: waarde ${v} moet groter dan 0 zijn`);
    controleerTijd(t, 'exponentialRamp');
    this.stappen.push({ soort: 'exp', waarde: v, tijd: t });
    return this;
  }
  setTargetAtTime(v: number, t: number, c: number) {
    if (!Number.isFinite(v) || !(c > 0)) throw new RangeError('setTargetAtTime');
    controleerTijd(t, 'setTargetAtTime');
    this.stappen.push({ soort: 'doel', waarde: v, tijd: t });
    return this;
  }
  cancelScheduledValues(t: number) {
    controleerTijd(t, 'cancelScheduledValues');
    return this;
  }
}

class NepNode {
  verbonden: NepNode[] = [];
  constructor(readonly ctx: NepAudioContext) {}
  connect<T>(doel: T): T {
    this.verbonden.push(doel as unknown as NepNode);
    return doel;
  }
  disconnect() {
    this.verbonden = [];
  }
}

class NepBron extends NepNode {
  begin = -1;
  einde = Infinity;
  onended: (() => void) | null = null;
  start(t = 0) {
    controleerTijd(t, 'start');
    if (this.begin >= 0) throw new Error('start mag maar één keer');
    this.begin = t;
    this.ctx.gestart.push(this);
  }
  stop(t = 0) {
    controleerTijd(t, 'stop');
    this.einde = t;
  }
}

class NepOscillator extends NepBron {
  type = 'sine';
  frequency = new NepParam();
  detune = new NepParam();
}

class NepBufferBron extends NepBron {
  buffer: unknown = null;
  loop = false;
  override start(t = 0, offset = 0, duur?: number) {
    if (offset < 0 || (duur !== undefined && !(duur >= 0))) throw new RangeError('start: offset/duur');
    super.start(t);
  }
}

export class NepAudioContext {
  currentTime = 0;
  sampleRate = 8000;
  state: 'running' | 'suspended' = 'running';
  baseLatency = 0;
  destination = new NepNode(this);
  gestart: NepBron[] = [];

  createGain() { return Object.assign(new NepNode(this), { gain: Object.assign(new NepParam(), { value: 1 }) }); }
  createOscillator() { return new NepOscillator(this); }
  createBufferSource() { return new NepBufferBron(this); }
  createBiquadFilter() { return Object.assign(new NepNode(this), { type: 'lowpass', frequency: new NepParam(), Q: new NepParam(), gain: new NepParam() }); }
  createStereoPanner() { return Object.assign(new NepNode(this), { pan: new NepParam() }); }
  createWaveShaper() { return Object.assign(new NepNode(this), { curve: null as unknown, oversample: 'none' }); }
  createConvolver() { return Object.assign(new NepNode(this), { buffer: null as unknown, normalize: true }); }
  createDynamicsCompressor() {
    return Object.assign(new NepNode(this), { threshold: new NepParam(), ratio: new NepParam(), attack: new NepParam(), release: new NepParam(), knee: new NepParam() });
  }
  createBuffer(kanalen: number, lengte: number, sr: number) {
    const data = Array.from({ length: kanalen }, () => new Float32Array(lengte));
    return { duration: lengte / sr, length: lengte, numberOfChannels: kanalen, sampleRate: sr, getChannelData: (k: number) => data[k] };
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
}

export function nepContext(): AudioContext & NepAudioContext {
  return new NepAudioContext() as unknown as AudioContext & NepAudioContext;
}
