// De zinnen die je zelf kunt inspreken, en het opnemen en afspelen ervan.
// De meeste zinnen zijn universeel (aanmoedigen, troosten, uitleg) en passen
// bij elk woord en elke som. Voor het dictee spreek je alleen het woord in.
// Opnames blijven op het apparaat (IndexedDB). Wat niet is ingesproken,
// leest de computerstem voor.

import { alles, bewaar, verwijder } from '../opslag/db';
import { WOORDEN } from './woorden';

export type InspreekGroep = 'Begroeten' | 'Aanmoedigen' | 'Troosten' | 'Uitleg en beloning' | 'Woorden voor het dictee';

export interface InspreekZin {
  sleutel: string;
  tekst: string;
  groep: InspreekGroep;
}

/** Wat elke groep doet, voor bovenaan in de lijst. */
export const GROEP_UITLEG: Record<InspreekGroep, string> = {
  Begroeten: 'Als het spel begint.',
  Aanmoedigen: 'Bij een goed antwoord kiest het spel er steeds eentje uit. Hoe meer je er inspreekt, hoe meer afwisseling.',
  Troosten: 'Bij een fout antwoord, voordat het trucje komt. Ook hier kiest het spel er steeds eentje uit.',
  'Uitleg en beloning': 'Bij de deurenbaan, de finish, geheimen en nieuwe kleding. Deze zinnen passen bij spelling én rekenen.',
  'Woorden voor het dictee': 'Alleen het woord zelf, bijvoorbeeld "paard". De zin staat al op het bord. Nieuwe woorden spreek je later op dezelfde manier in.',
};

export const INSPREEK_ZINNEN: InspreekZin[] = [
  { sleutel: 'hoi', tekst: 'Hoi Ninte!', groep: 'Begroeten' },
  { sleutel: 'welkom', tekst: 'Welkom in Nintes Wereld!', groep: 'Begroeten' },
  { sleutel: 'volg-bordjes', tekst: 'Volg de bordjes naar de deurenbanen!', groep: 'Begroeten' },

  { sleutel: 'goed-1', tekst: 'Goed zo!', groep: 'Aanmoedigen' },
  { sleutel: 'goed-2', tekst: 'Super!', groep: 'Aanmoedigen' },
  { sleutel: 'goed-3', tekst: 'Knap hoor!', groep: 'Aanmoedigen' },
  { sleutel: 'goed-4', tekst: 'Wauw, helemaal goed!', groep: 'Aanmoedigen' },
  { sleutel: 'goed-5', tekst: 'Jij bent een kanjer!', groep: 'Aanmoedigen' },

  { sleutel: 'fout-1', tekst: 'Bijna!', groep: 'Troosten' },
  { sleutel: 'fout-2', tekst: 'Oeps, dat was de verkeerde deur.', groep: 'Troosten' },
  { sleutel: 'fout-3', tekst: 'Geeft niks, probeer het nog een keer!', groep: 'Troosten' },

  { sleutel: 'kies-deur', tekst: 'Loop steeds door de deur met het goede antwoord.', groep: 'Uitleg en beloning' },
  { sleutel: 'obby-gehaald', tekst: 'Je hebt de deurenbaan gehaald! Goed gedaan!', groep: 'Uitleg en beloning' },
  { sleutel: 'geheim', tekst: 'Je hebt een geheim gevonden!', groep: 'Uitleg en beloning' },
  { sleutel: 'hoefijzer', tekst: 'Een gouden hoefijzer!', groep: 'Uitleg en beloning' },
  { sleutel: 'kleding', tekst: 'Er hangt iets nieuws in je kledingkast!', groep: 'Uitleg en beloning' },
  { sleutel: 'schatkist', tekst: 'Een schatkist! Weet jij het geheime wachtwoord?', groep: 'Uitleg en beloning' },
  { sleutel: 'mooie-naam', tekst: 'Wat een mooie naam!', groep: 'Uitleg en beloning' },
  { sleutel: 'maak-poppetje', tekst: 'Maak nu je eigen poppetje!', groep: 'Uitleg en beloning' },

  ...WOORDEN.map((k) => ({ sleutel: `woord-${k.woord}`, tekst: k.woord, groep: 'Woorden voor het dictee' as const })),
];

/** Waarom opnemen (niet) kan. */
export type MicStatus = 'kan' | 'voorbeeldlink' | 'niet-ondersteund';

/** Uitleg om de microfoon toe te staan, passend bij het apparaat. */
export function microfoonHulp(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): string {
  if (/Android/i.test(ua)) {
    return 'De microfoon mag niet gebruikt worden. Tik in Chrome op het slotje (of ⋮ → Site-instellingen) links van het adres, zet Microfoon op Toestaan en probeer het opnieuw.';
  }
  if (/iPad|iPhone|iPod/i.test(ua) || (/Macintosh/i.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document)) {
    return 'De microfoon mag niet gebruikt worden. Ga naar Instellingen → Safari → Microfoon, kies Vraag of Sta toe en probeer het opnieuw.';
  }
  return 'De microfoon mag niet gebruikt worden. Sta de microfoon toe in de instellingen van je browser en probeer het opnieuw.';
}

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

  /**
   * Kan er hier opgenomen worden? In de claude.ai-voorbeeldlink draait het spel
   * in een ingesloten venster waar de microfoon nooit mag.
   */
  static micStatus(): MicStatus {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) return 'niet-ondersteund';
    let ingesloten = false;
    try {
      ingesloten = window.self !== window.top;
    } catch {
      ingesloten = true;
    }
    return ingesloten ? 'voorbeeldlink' : 'kan';
  }

  /** Een willekeurige ingesproken zin uit een reeks (bijv. 'goed-'). */
  speelWillekeurig(voorvoegsel: string, daarna?: () => void): boolean {
    const keuzes = [...this.rijen.keys()].filter((k) => k.startsWith(voorvoegsel));
    if (!keuzes.length) return false;
    return this.speel(keuzes[Math.floor(Math.random() * keuzes.length)], daarna);
  }

  /** Een opname afspelen. Geeft false als die zin niet is ingesproken. */
  speel(sleutel: string, daarna?: () => void): boolean {
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
          daarna?.();
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
    if (!await bewaar('opnames', { sleutel, data } satisfies OpnameRij)) return false;
    this.rijen.set(sleutel, data);
    this.cache.delete(sleutel);
    return true;
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
