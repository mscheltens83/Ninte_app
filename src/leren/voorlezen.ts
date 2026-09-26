// Voorlezen met een Nederlandse stem van de iPad (Web Speech API).
// In de instellingen kies je zelf de mooiste stem en het tempo.

let stem: SpeechSynthesisVoice | null = null;
let gekozenNaam: string | null = null;
let tempo = 0.9;
const luisteraars = new Set<(bezig: boolean) => void>();
let klaarTimer: number | undefined;
let huidige: SpeechSynthesisUtterance | null = null;

function beschikbaar(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function taal(s: SpeechSynthesisVoice): string {
  return s.lang.replace('_', '-').toLowerCase();
}

/** Hoe mooi een stem waarschijnlijk klinkt: verbeterde stemmen eerst. */
function kwaliteit(s: SpeechSynthesisVoice): number {
  let punten = 0;
  if (/premium/i.test(s.name)) punten += 30;
  if (/enhanced|verbeterd|natural|neural/i.test(s.name)) punten += 20;
  if (taal(s) === 'nl-nl') punten += 10;
  if (/xander|claire|fenna|colette|maarten|google/i.test(s.name)) punten += 3;
  return punten;
}

/** Alle Nederlandse stemmen op dit apparaat, de mooiste eerst. */
export function nederlandseStemmen(): SpeechSynthesisVoice[] {
  if (!beschikbaar()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((s) => taal(s).startsWith('nl'))
    .sort((a, b) => kwaliteit(b) - kwaliteit(a));
}

function kiesStem() {
  const stemmen = nederlandseStemmen();
  stem = stemmen.find((s) => s.name === gekozenNaam) ?? stemmen[0] ?? null;
}

export function initVoorlezen() {
  if (!beschikbaar()) return;
  kiesStem();
  window.speechSynthesis.addEventListener?.('voiceschanged', kiesStem);
}

/** Stem (op naam, of null voor automatisch) en tempo instellen. */
export function stelStemIn(naam: string | null, nieuwTempo: number) {
  gekozenNaam = naam;
  tempo = nieuwTempo;
  if (beschikbaar()) kiesStem();
}

export function huidigeStem(): string | null {
  return stem?.name ?? null;
}

/** Laat weten wanneer de stem begint en stopt (om de muziek zachter te zetten). */
export function opSpreken(luisteraar: (bezig: boolean) => void) {
  luisteraars.add(luisteraar);
}

function meld(bezig: boolean) {
  if (!bezig) window.clearTimeout(klaarTimer);
  for (const l of luisteraars) l(bezig);
}

export function kanVoorlezen(): boolean {
  return beschikbaar();
}

export function spreek(tekst: string) {
  if (!beschikbaar()) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(tekst);
    u.lang = stem?.lang ?? 'nl-NL';
    if (stem) u.voice = stem;
    u.rate = tempo;
    u.pitch = 1.05;
    // Alleen reageren op de zin die nu wordt voorgelezen, niet op een afgebroken vorige.
    huidige = u;
    u.onend = () => u === huidige && meld(false);
    u.onerror = () => u === huidige && meld(false);
    meld(true);
    // Safari vergeet soms 'onend'; daarom ook een veiligheidstimer.
    window.clearTimeout(klaarTimer);
    klaarTimer = window.setTimeout(() => meld(false), 1500 + (tekst.length * 85) / tempo);
    synth.speak(u);
  } catch {
    // Voorlezen is een extraatje; het spel werkt ook zonder.
  }
}

export function stopVoorlezen() {
  huidige = null;
  if (beschikbaar()) window.speechSynthesis.cancel();
  meld(false);
}
