// De zinnen die je zelf kunt inspreken, en het opnemen en afspelen ervan.
// Opnames blijven op de iPad (IndexedDB). Wat niet is ingesproken, leest
// de computerstem voor.

import { alles, bewaar, verwijder } from '../opslag/db';
import { WOORDEN } from './woorden';

export interface InspreekZin {
  sleutel: string;
  tekst: string;
  groep: 'Welkom en uitleg' | 'Aanmoedigen' | 'Dictee-zinnen';
}

export const INSPREEK_ZINNEN: InspreekZin[] = [
  { sleutel: 'welkom', tekst: 'Hoi Ninte! Welkom in Nintes Wereld.', groep: 'Welkom en uitleg' },
  { sleutel: 'welkom-terug', tekst: 'Hoi Ninte! Volg de bordjes naar de Deuren-obby of de Reken-obby.', groep: 'Welkom en uitleg' },
  { sleutel: 'uitleg-deuren', tekst: 'Deuren-obby! Loop steeds door de deur met de goede spelling.', groep: 'Welkom en uitleg' },
  { sleutel: 'uitleg-reken', tekst: 'Reken-obby! Loop steeds door de deur met het goede antwoord.', groep: 'Welkom en uitleg' },
  { sleutel: 'schatkist', tekst: 'Een schatkist! Weet jij het geheime wachtwoord?', groep: 'Welkom en uitleg' },
  { sleutel: 'mooie-naam', tekst: 'Wat een mooie naam!', groep: 'Aanmoedigen' },
  { sleutel: 'leuke-naam', tekst: 'Wat een leuke naam! En nu maak je je eigen poppetje.', groep: 'Aanmoedigen' },
  { sleutel: 'goed-zo', tekst: 'Goed zo!', groep: 'Aanmoedigen' },
  { sleutel: 'obby-gehaald', tekst: 'Obby gehaald! Goed gedaan!', groep: 'Aanmoedigen' },
  // Zoals bij een dictee: eerst het woord, dan de zin, dan nog een keer het woord.
  ...WOORDEN.map((k) => ({ sleutel: `dictee-${k.woord}`, tekst: `${k.woord} … ${k.zin} … ${k.woord}`, groep: 'Dictee-zinnen' as const })),
];

interface OpnameRij {
  sleutel: string;
  data: Blob;
}

export type AudioBron = () => AudioContext | null;

/** Speelt, neemt op en bewaart de ingesproken zinnen. */
export class Opnames {
  private rijen = new Map<string, Blob>();
  private cache = new Map<string, Promise<{ buffer: AudioBuffer; start: number; duur: number; versterking: number } | null>>();
  private speelt: AudioBufferSourceNode | null = null;
  private opname: { recorder: MediaRecorder; stream: MediaStream; stukjes: Blob[] } | null = null;

  constructor(private context: AudioBron, private opBezig: (bezig: boolean) => void) {
    void this.laad();
  }

  private async laad() {
    const rijen = await alles<OpnameRij>('opnames');
    this.rijen = new Map(rijen.map((r) => [r.sleutel, r.data]));
  }

  heeft(sleutel: string): boolean {
    return this.rijen.has(sleutel);
  }

  get aantal(): number {
    return INSPREEK_ZINNEN.filter((z) => this.rijen.has(z.sleutel)).length;
  }

  /** Kan dit apparaat (in deze omgeving) opnemen? */
  static kanOpnemen(): boolean {
    return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }

  /** Een opname afspelen. Geeft false als die zin niet is ingesproken. */
  speel(sleutel: string): boolean {
    const data = this.rijen.get(sleutel);
    const ctx = this.context();
    if (!data || !ctx) return false;
    this.stop();
    let klaar = this.cache.get(sleutel);
    if (!klaar) {
      klaar = data
        .arrayBuffer()
        .then((buf) => new Promise<AudioBuffer>((ok, fout) => ctx.decodeAudioData(buf, ok, fout)))
        .then((buffer) => ({ buffer, ...knipStilte(buffer) }))
        .catch(() => null);
      this.cache.set(sleutel, klaar);
    }
    this.opBezig(true);
    void klaar.then((k) => {
      if (!k) {
        this.opBezig(false);
        return;
      }
      const bron = ctx.createBufferSource();
      bron.buffer = k.buffer;
      const gain = ctx.createGain();
      gain.gain.value = k.versterking;
      bron.connect(gain).connect(ctx.destination);
      bron.onended = () => {
        if (this.speelt === bron) {
          this.speelt = null;
          this.opBezig(false);
        }
      };
      this.speelt = bron;
      bron.start(0, k.start, k.duur);
    });
    return true;
  }

  stop() {
    if (this.speelt) {
      const bron = this.speelt;
      this.speelt = null;
      try {
        bron.stop();
      } catch {
        // al gestopt
      }
      this.opBezig(false);
    }
  }

  /** Begin met opnemen. Gooit een fout als de microfoon niet mag of kan. */
  async begin() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const recorder = new MediaRecorder(stream);
    const stukjes: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) stukjes.push(e.data);
    };
    recorder.start();
    this.opname = { recorder, stream, stukjes };
  }

  /** Stop met opnemen en bewaar de opname onder deze sleutel. */
  async klaar(sleutel: string): Promise<boolean> {
    const o = this.opname;
    this.opname = null;
    if (!o) return false;
    const gestopt = new Promise<void>((ok) => (o.recorder.onstop = () => ok()));
    o.recorder.stop();
    await gestopt;
    for (const spoor of o.stream.getTracks()) spoor.stop(); // microfoon weer uit
    const data = new Blob(o.stukjes, { type: o.recorder.mimeType || 'audio/mp4' });
    if (data.size < 1000) return false;
    this.rijen.set(sleutel, data);
    this.cache.delete(sleutel);
    return bewaar('opnames', { sleutel, data } satisfies OpnameRij);
  }

  /** Opname afbreken zonder te bewaren. */
  annuleer() {
    const o = this.opname;
    this.opname = null;
    if (!o) return;
    try {
      o.recorder.stop();
    } catch {
      // niet erg
    }
    for (const spoor of o.stream.getTracks()) spoor.stop();
  }

  async wis(sleutel: string) {
    this.rijen.delete(sleutel);
    this.cache.delete(sleutel);
    await verwijder('opnames', sleutel);
  }
}

/**
 * Stilte aan het begin en eind wegknippen, en een zachte opname harder zetten.
 * Geeft de starttijd, duur (in seconden) en versterking terug.
 */
export function knipStilte(buffer: Pick<AudioBuffer, 'getChannelData' | 'sampleRate' | 'length'>, drempel = 0.02) {
  const data = buffer.getChannelData(0);
  let eerste = -1;
  let laatste = -1;
  let piek = 0;
  for (let i = 0; i < data.length; i++) {
    const a = Math.abs(data[i]);
    if (a > piek) piek = a;
    if (a > drempel) {
      if (eerste < 0) eerste = i;
      laatste = i;
    }
  }
  const sr = buffer.sampleRate;
  if (eerste < 0) return { start: 0, duur: buffer.length / sr, versterking: 1 };
  const start = Math.max(0, eerste / sr - 0.08);
  const eind = Math.min(buffer.length / sr, laatste / sr + 0.2);
  const versterking = piek > 0 ? Math.min(4, 0.9 / piek) : 1;
  return { start, duur: eind - start, versterking };
}
