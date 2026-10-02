// Het beatmakerscherm: een rooster met 16 vakjes per instrument. Wat Ninte aanzet,
// hoort ze meteen in de muziek. Uitdagingen oefenen tellen, patronen en breuken.

import { toon } from '../ui/schermen';
import { veilig } from '../ui/hud';
import {
  BEAT_RIJEN, BEAT_STAPPEN, BPM_MAX, BPM_MIN, UITDAGINGEN, kopieBeat, legeBeat, staatAan, zetBpm, zetVakje,
  type Beat, type RijId, type Uitdaging,
} from './beat';

export interface BeatSchermOpties {
  beat: Beat;
  voltooid: readonly string[];
  /** Waar de muziek nu is, in 16e stappen. */
  stap: () => number;
  opWijzig: (beat: Beat) => void;
  opVoltooid: (u: Uitdaging) => void;
  opSpreek: (tekst: string) => void;
  opKlik: () => void;
  opKlaar: (beat: Beat) => void;
}

/** Een willekeurige beat die toch altijd lekker klinkt. */
export function verrasBeat(bpm: number, rng: () => number = Math.random): Beat {
  const b = legeBeat(bpm);
  const kies = (kans: number) => rng() < kans;
  b.rijen.boem = [...'x-------x-------'].map((t, i) => (t === 'x' || (i % 2 === 0 && kies(0.15)) ? 'x' : '-')).join('');
  b.rijen.klap = '----x-------x---';
  b.rijen.tik = [...Array(BEAT_STAPPEN)].map((_, i) => (i % 2 === 0 || kies(0.2) ? 'x' : '-')).join('');
  b.rijen.koe = [...Array(BEAT_STAPPEN)].map(() => (kies(0.12) ? 'x' : '-')).join('');
  const basPatroon = [...Array(4)].map((_, i) => (i === 0 || kies(0.35) ? 'x' : '-')).join('');
  b.rijen.bas = basPatroon.repeat(4);
  b.rijen.bel = [...Array(BEAT_STAPPEN)].map((_, i) => (i % 2 === 0 && kies(0.3) ? 'x' : '-')).join('');
  return b;
}

export function beatScherm(o: BeatSchermOpties): HTMLDivElement {
  let beat = kopieBeat(o.beat);
  const voltooid = new Set(o.voltooid);
  let actief: Uitdaging | null = UITDAGINGEN.find((u) => !voltooid.has(u.id)) ?? null;
  let tipOpen = false;
  let melding = '';
  /** Een uitdaging telt pas als Ninte die rij (of het tempo) zelf heeft aangepast. */
  let aangeraakt = new Set<string>();

  const kop = Array.from({ length: BEAT_STAPPEN }, (_, i) => `<span class="${i % 4 === 0 ? 'tel' : ''}">${i % 4 === 0 ? i / 4 + 1 : '·'}</span>`).join('');
  const rijen = BEAT_RIJEN.map((r) => `<div class="beat-rij" data-rij="${r.id}"><span class="beat-naam"><span aria-hidden="true">${r.icoon}</span> ${r.naam}</span>${Array.from({ length: BEAT_STAPPEN }, (_, i) =>
    `<button type="button" class="vakje" data-rij="${r.id}" data-stap="${i}" aria-pressed="false" aria-label="${r.naam}, vakje ${i + 1}"></button>`).join('')}</div>`).join('');

  const s = toon(`<div class="kaart beatmaker">
    <h2>🎧 Beatmaker</h2>
    <p class="klein">Tik op de vakjes. Je hoort je beat meteen, en alles past bij de muziek!</p>
    <section class="beat-uitdaging" aria-live="polite"></section>
    <div class="beat-rooster" role="group" aria-label="Beat: ${BEAT_RIJEN.length} instrumenten met ${BEAT_STAPPEN} vakjes">
      <div class="beat-rij beat-kop" aria-hidden="true"><span class="beat-naam">Tel</span>${kop}</div>
      ${rijen}
    </div>
    <div class="beat-tempo">
      <button type="button" class="tempo-knop" data-tempo="-2" aria-label="Langzamer">−</button>
      <label for="beat-bpm">Tempo</label>
      <input type="range" id="beat-bpm" min="${BPM_MIN}" max="${BPM_MAX}" step="2" value="${beat.bpm}">
      <output for="beat-bpm" data-bpm>${beat.bpm}</output><span class="klein">tellen per minuut</span>
      <button type="button" class="tempo-knop" data-tempo="2" aria-label="Sneller">+</button>
    </div>
    <div class="beat-knoppen">
      <button type="button" class="knop wit klein" data-verras>🎲 Verras me</button>
      <button type="button" class="knop wit klein" data-wis>🧽 Alles wissen</button>
    </div>
    <button type="button" class="knop" data-klaar>Klaar · bewaar mijn beat</button>
  </div>`, 'beat-scherm');

  const vakjes = [...s.querySelectorAll<HTMLButtonElement>('.vakje')];
  const uitdagingVak = s.querySelector<HTMLElement>('.beat-uitdaging')!;
  const bpmVeld = s.querySelector<HTMLInputElement>('#beat-bpm')!;
  const bpmUit = s.querySelector<HTMLOutputElement>('[data-bpm]')!;

  const tekenVakjes = () => {
    for (const v of vakjes) {
      const aan = staatAan(beat, v.dataset.rij as RijId, Number(v.dataset.stap));
      v.classList.toggle('aan', aan);
      v.setAttribute('aria-pressed', String(aan));
    }
    bpmVeld.value = String(beat.bpm);
    bpmUit.textContent = String(beat.bpm);
    s.querySelectorAll<HTMLElement>('.beat-rij[data-rij]').forEach((r) => r.classList.toggle('doel', r.dataset.rij === actief?.rij));
  };

  const tekenUitdaging = () => {
    const lijst = `<div class="beat-chips">${UITDAGINGEN.map((u, i) =>
      `<button type="button" class="chip${voltooid.has(u.id) ? ' klaar' : ''}${u === actief ? ' gekozen' : ''}" data-kies="${u.id}" aria-label="Uitdaging ${i + 1}: ${veilig(u.titel)}${voltooid.has(u.id) ? ', gehaald' : ''}">${voltooid.has(u.id) ? '✓' : i + 1}</button>`).join('')}</div>`;
    const blij = melding ? `<p class="beat-goed">${veilig(melding)}</p>` : '';
    if (!actief) {
      uitdagingVak.innerHTML = `${blij}<h3>🏆 Alle uitdagingen gehaald!</h3><p>Je bent een echte DJ. Maak nu je eigen beat, of kies een uitdaging om nog eens te doen.</p>${lijst}`;
    } else {
      const nr = UITDAGINGEN.indexOf(actief) + 1;
      uitdagingVak.innerHTML = `${blij}<h3>Uitdaging ${nr}/${UITDAGINGEN.length}: ${veilig(actief.titel)}${voltooid.has(actief.id) ? ' ✓' : ''}</h3>
        <p>${veilig(actief.opdracht)}</p>
        <div class="beat-hulp"><button type="button" class="tempo-knop" data-lees>🔊 Lees voor</button><button type="button" class="tempo-knop" data-tip>💡 Tip</button></div>
        <p class="tip" ${tipOpen ? '' : 'hidden'}>${veilig(actief.tip)}</p>${lijst}`;
      uitdagingVak.querySelector<HTMLButtonElement>('[data-lees]')!.onclick = () => o.opSpreek(`${actief!.titel}. ${actief!.opdracht}`);
      uitdagingVak.querySelector<HTMLButtonElement>('[data-tip]')!.onclick = () => {
        o.opKlik();
        tipOpen = !tipOpen;
        tekenUitdaging();
        if (tipOpen) o.opSpreek(actief!.tip);
      };
    }
    uitdagingVak.querySelectorAll<HTMLButtonElement>('[data-kies]').forEach((b) => (b.onclick = () => {
      o.opKlik();
      actief = UITDAGINGEN.find((u) => u.id === b.dataset.kies) ?? null;
      tipOpen = false;
      melding = '';
      tekenUitdaging();
      tekenVakjes();
    }));
  };

  const controleer = () => {
    if (!actief || !aangeraakt.has(actief.rij ?? 'tempo') || !actief.klopt(beat)) return;
    const eerste = !voltooid.has(actief.id);
    voltooid.add(actief.id);
    melding = eerste ? `✓ Goed zo! ${actief.titel}: +${actief.beloning} hoefijzers` : `✓ Goed zo! ${actief.titel} klopt weer.`;
    if (eerste) o.opVoltooid(actief);
    actief = UITDAGINGEN.find((u) => !voltooid.has(u.id)) ?? null;
    tipOpen = false;
    tekenUitdaging();
    tekenVakjes();
  };

  const gewijzigd = () => {
    tekenVakjes();
    o.opWijzig(beat);
    controleer();
  };

  for (const v of vakjes) {
    v.addEventListener('click', () => {
      const rij = v.dataset.rij as RijId;
      const stap = Number(v.dataset.stap);
      zetVakje(beat, rij, stap, !staatAan(beat, rij, stap));
      aangeraakt.add(rij);
      melding = '';
      gewijzigd();
    });
  }
  const zetTempo = (bpm: number) => {
    zetBpm(beat, bpm);
    aangeraakt.add('tempo');
    melding = '';
    gewijzigd();
  };
  bpmVeld.addEventListener('input', () => zetTempo(Number(bpmVeld.value)));
  s.querySelectorAll<HTMLButtonElement>('[data-tempo]').forEach((b) => (b.onclick = () => {
    o.opKlik();
    zetTempo(beat.bpm + Number(b.dataset.tempo));
  }));
  s.querySelector<HTMLButtonElement>('[data-verras]')!.onclick = () => {
    o.opKlik();
    beat = verrasBeat(beat.bpm);
    aangeraakt = new Set();
    gewijzigd();
  };
  s.querySelector<HTMLButtonElement>('[data-wis]')!.onclick = () => {
    o.opKlik();
    beat = legeBeat(beat.bpm);
    aangeraakt = new Set();
    gewijzigd();
  };
  s.querySelector<HTMLButtonElement>('[data-klaar]')!.onclick = () => o.opKlaar(kopieBeat(beat));

  tekenUitdaging();
  tekenVakjes();
  o.opWijzig(beat);

  // De speelkop: de kolom die nu klinkt licht op.
  let vorige = -1;
  const kolommen = Array.from({ length: BEAT_STAPPEN }, (_, i) => vakjes.filter((v) => Number(v.dataset.stap) === i));
  const loop = () => {
    if (!s.isConnected) return;
    const nu = ((Math.floor(o.stap()) % BEAT_STAPPEN) + BEAT_STAPPEN) % BEAT_STAPPEN;
    if (nu !== vorige) {
      kolommen[vorige]?.forEach((v) => v.classList.remove('nu'));
      kolommen[nu].forEach((v) => v.classList.add('nu'));
      vorige = nu;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return s;
}
