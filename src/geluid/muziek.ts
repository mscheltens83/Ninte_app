// Achtergrondmuziek met Web Audio: rustig overvloeien tussen nummers en
// zachter tijdens het voorlezen.
//
// Muziek: Kevin MacLeod (incompetech.com), licentie CC BY 4.0:
//   eiland.mp3 = "Carefree", obby.mp3 = "Monkeys Spinning Monkeys", geheim.mp3 = "Fluffing a Duck"

import type { Geluid } from './geluid';

export type Nummer = 'eiland' | 'obby' | 'geheim';

const VOLUME = 0.32;
const VOLUME_GEDEMPT = 0.1;

interface Speelt {
  naam: Nummer;
  bron: AudioBufferSourceNode;
  gain: GainNode;
}

export class Muziek {
  private buffers = new Map<Nummer, Promise<AudioBuffer | null>>();
  private huidig: Speelt | null = null;
  private gewenst: Nummer | null = null;
  private hoofd: GainNode | null = null;
  private aan = true;
  private gedempt = false;

  constructor(private geluid: Geluid) {
    document.addEventListener('visibilitychange', () => {
      const ctx = this.geluid.context;
      if (!ctx) return;
      if (document.hidden) void ctx.suspend();
      else void ctx.resume();
    });
  }

  zetAan(aan: boolean) {
    this.aan = aan;
    this.pasVolumeAan();
  }

  /** Zachter zetten terwijl de stem iets voorleest. */
  demp(ja: boolean) {
    this.gedempt = ja;
    this.pasVolumeAan();
  }

  speel(naam: Nummer) {
    if (this.gewenst === naam) return;
    this.gewenst = naam;
    void this.start(naam);
  }

  private pasVolumeAan() {
    const ctx = this.geluid.context;
    if (!ctx || !this.hoofd) return;
    const doel = this.aan ? (this.gedempt ? VOLUME_GEDEMPT : VOLUME) : 0;
    this.hoofd.gain.setTargetAtTime(doel, ctx.currentTime, 0.25);
  }

  private uitgang(ctx: AudioContext): GainNode {
    if (!this.hoofd) {
      this.hoofd = ctx.createGain();
      this.hoofd.gain.value = this.aan ? VOLUME : 0;
      this.hoofd.connect(ctx.destination);
    }
    return this.hoofd;
  }

  private laad(ctx: AudioContext, naam: Nummer): Promise<AudioBuffer | null> {
    let belofte = this.buffers.get(naam);
    if (!belofte) {
      belofte = fetch(`./muziek/${naam}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((data) => new Promise<AudioBuffer>((ok, fout) => ctx.decodeAudioData(data, ok, fout)))
        .catch(() => {
          this.buffers.delete(naam); // later opnieuw proberen
          return null;
        });
      this.buffers.set(naam, belofte);
    }
    return belofte;
  }

  private async start(naam: Nummer) {
    const ctx = this.geluid.context;
    if (!ctx) {
      this.gewenst = null; // na het ontgrendelen opnieuw proberen
      return;
    }
    const buffer = await this.laad(ctx, naam);
    if (!buffer || this.gewenst !== naam) return;

    if (this.huidig) {
      const oud = this.huidig;
      oud.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
      oud.bron.stop(ctx.currentTime + 2);
    }
    const bron = ctx.createBufferSource();
    bron.buffer = buffer;
    bron.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(1, ctx.currentTime, 0.5);
    bron.connect(gain).connect(this.uitgang(ctx));
    bron.start();
    this.huidig = { naam, bron, gain };

    // Geheugen sparen: alleen het eilandnummer en het huidige nummer bewaren.
    for (const k of [...this.buffers.keys()]) if (k !== naam && k !== 'eiland') this.buffers.delete(k);
  }
}
