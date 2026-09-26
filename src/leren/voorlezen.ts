// Voorlezen met de Nederlandse stem van de iPad (Web Speech API).

let stem: SpeechSynthesisVoice | null = null;

function beschikbaar(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function kiesStem() {
  const stemmen = window.speechSynthesis.getVoices();
  const nl = stemmen.filter((s) => s.lang.replace('_', '-').toLowerCase().startsWith('nl'));
  const nlNL = nl.filter((s) => s.lang.replace('_', '-').toLowerCase() === 'nl-nl');
  const kandidaten = nlNL.length ? nlNL : nl;
  // Verbeterde stemmen klinken veel natuurlijker, als die er zijn.
  stem =
    kandidaten.find((s) => /premium|enhanced|verbeterd|natural/i.test(s.name)) ??
    kandidaten.find((s) => /xander|claire|google/i.test(s.name)) ??
    kandidaten[0] ??
    null;
}

export function initVoorlezen() {
  if (!beschikbaar()) return;
  kiesStem();
  window.speechSynthesis.addEventListener?.('voiceschanged', kiesStem);
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
    u.lang = 'nl-NL';
    if (stem) u.voice = stem;
    u.rate = 0.9;
    u.pitch = 1.05;
    synth.speak(u);
  } catch {
    // Voorlezen is een extraatje; het spel werkt ook zonder.
  }
}

export function stopVoorlezen() {
  if (beschikbaar()) window.speechSynthesis.cancel();
}
