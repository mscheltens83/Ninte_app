// Achtergrondmuziek met afspeellijsten per plek (eiland, obby, geheim).
//
// - Ingebouwde nummers: elke MP3 in src/muziek/<plek>/ komt vanzelf in de lijst.
// - Eigen nummers: toe te voegen op de iPad (⚙️ → Muziek), bewaard in IndexedDB.
// Nummers vloeien in elkaar over en de muziek wordt zachter als de stem voorleest.

import { alles, bewaar, verwijder } from '../opslag/db';
import type { Geluid } from './geluid';

export type Plek = 'eiland' | 'obby' | 'geheim';
export const PLEKKEN: [Plek, string][] = [
  ['eiland', 'Eiland'],
  ['obby', "Obby's"],
  ['geheim', 'Geheime plek'],
];

export interface Nummer {
  id: string;
  naam: string;
  plek: Plek;
  eigen: boolean;
  laad(): Promise<ArrayBuffer>;
}

interface EigenNummer {
  id: string;
  naam: string;
  plek: Plek;
  data: Blob;
}

const VOLUME = 0.32;
const VOLUME_GEDEMPT = 0.1;

/** "monkeys-spinning-monkeys" → "Monkeys spinning monkeys" */
function mooieNaam(bestand: string): string {
  const kaal = bestand.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return kaal.charAt(0).toUpperCase() + kaal.slice(1);
}

const INGEBOUWD: Nummer[] = Object.entries(
  import.meta.glob('../muziek/*/*.{mp3,m4a}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
).map(([pad, url]) => {
  const [, plek, bestand] = pad.match(/muziek\/([^/]+)\/([^/]+)$/)!;
  return {
    id: `ingebouwd:${plek}/${bestand}`,
    naam: mooieNaam(bestand),
    plek: plek as Plek,
    eigen: false,
    laad: () => fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))))),
  };
});

interface Speelt {
  nummer: Nummer;
  bron: AudioBufferSourceNode;
  gain: GainNode;
}

export class Muziek {
  private eigen: Nummer[] = [];
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private volgorde = new Map<Plek, number>();
  private huidig: Speelt | null = null;
  private gewenst: Plek | null = null;
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
    void this.laadEigen();
  }

  /** Alle nummers, ingebouwd en eigen. */
  get nummers(): Nummer[] {
    return [...INGEBOUWD, ...this.eigen];
  }

  get huidigNummer(): Nummer | null {
    return this.huidig?.nummer ?? null;
  }

  private afspeellijst(plek: Plek): Nummer[] {
    const lijst = this.nummers.filter((n) => n.plek === plek);
    return lijst.length ? lijst : this.nummers.filter((n) => n.plek === 'eiland');
  }

  private async laadEigen() {
    const rijen = await alles<EigenNummer>('muziek');
    this.eigen = rijen.map((r) => ({ id: r.id, naam: r.naam, plek: r.plek, eigen: true, laad: () => r.data.arrayBuffer() }));
  }

  /** Eigen muziek toevoegen vanaf de iPad. */
  async voegToe(bestanden: FileList | File[], plek: Plek): Promise<number> {
    let aantal = 0;
    for (const bestand of Array.from(bestanden)) {
      const id = `eigen:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      if (await bewaar('muziek', { id, naam: mooieNaam(bestand.name), plek, data: bestand } satisfies EigenNummer)) aantal++;
    }
    await this.laadEigen();
    return aantal;
  }

  async verwijderEigen(id: string) {
    await verwijder('muziek', id);
    this.buffers.delete(id);
    await this.laadEigen();
    if (this.huidig?.nummer.id === id) this.volgende();
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

  /** Muziek voor deze plek (doet niets als die al speelt). */
  speel(plek: Plek) {
    if (this.gewenst === plek) return;
    this.gewenst = plek;
    void this.start(plek);
  }

  /** Naar het volgende nummer van deze plek. */
  volgende() {
    if (!this.gewenst) return;
    this.volgorde.set(this.gewenst, (this.volgorde.get(this.gewenst) ?? 0) + 1);
    void this.start(this.gewenst);
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

  private buffer(ctx: AudioContext, nummer: Nummer): Promise<AudioBuffer | null> {
    let belofte = this.buffers.get(nummer.id);
    if (!belofte) {
      belofte = nummer
        .laad()
        .then((data) => new Promise<AudioBuffer>((ok, fout) => ctx.decodeAudioData(data, ok, fout)))
        .catch(() => {
          this.buffers.delete(nummer.id); // later opnieuw proberen
          return null;
        });
      this.buffers.set(nummer.id, belofte);
    }
    return belofte;
  }

  private async start(plek: Plek) {
    const ctx = this.geluid.context;
    if (!ctx) {
      this.gewenst = null; // na het ontgrendelen opnieuw proberen
      return;
    }
    const lijst = this.afspeellijst(plek);
    if (!lijst.length) return;
    if (!this.volgorde.has(plek)) this.volgorde.set(plek, Math.floor(Math.random() * lijst.length));
    const nummer = lijst[this.volgorde.get(plek)! % lijst.length];
    const buffer = await this.buffer(ctx, nummer);
    if (!buffer || this.gewenst !== plek) return;

    if (this.huidig) {
      const oud = this.huidig;
      oud.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
      oud.bron.stop(ctx.currentTime + 2);
    }
    const bron = ctx.createBufferSource();
    bron.buffer = buffer;
    bron.loop = lijst.length === 1;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(1, ctx.currentTime, 0.5);
    bron.connect(gain).connect(this.uitgang(ctx));
    bron.start();
    this.huidig = { nummer, bron, gain };
    // Nummer afgelopen? Dan het volgende van deze plek.
    bron.onended = () => {
      if (this.huidig?.bron === bron && this.gewenst === plek) this.volgende();
    };

    // Geheugen sparen: alleen het huidige nummer en één eilandnummer bewaren.
    const eiland = this.afspeellijst('eiland')[0]?.id;
    for (const id of [...this.buffers.keys()]) if (id !== nummer.id && id !== eiland) this.buffers.delete(id);
  }
}
