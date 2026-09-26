// Schermen die over het spel heen komen: titel, dieren kiezen, tip, finish, uitleg.

import type { Vacht } from '../figuren/dieren';
import { veilig } from './hud';

const houder = () => document.getElementById('schermen')!;

function toon(html: string, klasse = ''): HTMLDivElement {
  const scherm = document.createElement('div');
  scherm.className = `scherm ${klasse}`;
  scherm.innerHTML = html;
  houder().replaceChildren(scherm);
  return scherm;
}

export function sluitScherm() {
  houder().replaceChildren();
}

function knop(scherm: HTMLElement, selector: string, actie: () => void) {
  scherm.querySelector<HTMLButtonElement>(selector)!.addEventListener('click', actie);
}

export function titelScherm(opSpelen: () => void) {
  const s = toon(
    `<div class="titel">
      <h1>Nintes Wereld</h1>
      <p class="ondertitel">Paarden · Honden · Spelling-avonturen</p>
      <button class="knop" data-spelen>Spelen</button>
    </div>`,
    'doorzichtig',
  );
  knop(s, '[data-spelen]', opSpelen);
}

/**
 * Pony of puppy kiezen: kleur aantikken en zelf een naam typen.
 * Een naam begint met een hoofdletter; dat moet ze zelf verbeteren.
 */
export function dierKiezer(
  soort: 'pony' | 'puppy',
  kleuren: Vacht[],
  opKlaar: (naam: string, kleur: string) => void,
  klik: () => void,
) {
  const titel = soort === 'pony' ? 'Kies je pony!' : 'Kies je puppy!';
  const vraag = soort === 'pony' ? 'Hoe heet je pony?' : 'Hoe heet je puppy?';
  const s = toon(
    `<div class="kaart">
      <h2>${titel}</h2>
      <div class="kleuren">
        ${kleuren
          .map(
            (k, i) => `<button class="kleur${i === 0 ? ' gekozen' : ''}" data-kleur="${k.id}">
              <span class="rondje" style="background:${k.vlekken ? `radial-gradient(circle at 30% 35%, ${k.vlekken} 0 18%, transparent 19%), radial-gradient(circle at 70% 65%, ${k.vlekken} 0 14%, transparent 15%), ${k.lijf}` : `linear-gradient(135deg, ${k.lijf} 60%, ${k.manen} 60%)`}"></span>
              ${k.naam}
            </button>`,
          )
          .join('')}
      </div>
      <p><b>${vraag}</b></p>
      <input class="naamveld" type="text" maxlength="14" placeholder="Typ een naam"
        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" />
      <p class="hint"></p>
      <button class="knop" data-verder>Verder</button>
    </div>`,
  );
  let kleur = kleuren[0].id;
  s.querySelectorAll<HTMLButtonElement>('.kleur').forEach((b) =>
    b.addEventListener('click', () => {
      klik();
      kleur = b.dataset.kleur!;
      s.querySelectorAll('.kleur').forEach((x) => x.classList.toggle('gekozen', x === b));
    }),
  );
  const veld = s.querySelector<HTMLInputElement>('.naamveld')!;
  const hint = s.querySelector<HTMLParagraphElement>('.hint')!;
  const verder = () => {
    const naam = veld.value.trim().replace(/\s+/g, ' ');
    if (!naam) {
      hint.textContent = `Je ${soort} heeft nog geen naam!`;
      veld.focus();
      return;
    }
    if (!/^\p{L}/u.test(naam)) {
      hint.textContent = 'Een naam begint met een letter.';
      return;
    }
    if (naam[0] !== naam[0].toLocaleUpperCase('nl')) {
      hint.textContent = 'Tip: een naam begint met een hoofdletter. Kun jij dat verbeteren?';
      veld.focus();
      return;
    }
    veld.blur();
    opKlaar(naam, kleur);
  };
  veld.addEventListener('input', () => (hint.textContent = ''));
  veld.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') verder();
  });
  knop(s, '[data-verder]', verder);
}

export function uitlegScherm(opSluit: () => void, computer: boolean) {
  const lopen = computer ? 'Lopen: W A S D of de pijltjes' : 'Lopen: zet je duim links op het scherm en schuif';
  const springen = computer ? 'Springen: spatiebalk' : 'Springen: de ronde knop rechtsonder';
  const kijken = computer ? 'Rondkijken: slepen met de muis' : 'Rondkijken: veeg met je vinger aan de rechterkant';
  const s = toon(
    `<div class="kaart">
      <h2>Zo speel je</h2>
      <div class="uitleg-lijst">
        <div><b class="icoon">🕹️</b>${lopen}</div>
        <div><b class="icoon">⤴️</b>${springen}</div>
        <div><b class="icoon">👀</b>${kijken}</div>
        <div><b class="icoon">🚪</b>Volg het bordje naar de Deuren-obby. Loop door de deur met de goede spelling!</div>
        <div><b class="icoon">🔊</b>Tik op het luidsprekertje om de zin te laten voorlezen.</div>
        <div><b class="icoon">❤️</b>Tik op je pony of puppy om ze te aaien.</div>
        <div><b class="icoon">⭐</b>Er zijn geheimen verstopt op het eiland. Kun jij ze allemaal vinden?</div>
      </div>
      <button class="knop" data-oke>Oké!</button>
    </div>`,
  );
  knop(s, '[data-oke]', opSluit);
}

export function tipKaart(
  goed: string,
  fout: string,
  tip: string,
  opSpreek: () => void,
  opVerder: () => void,
) {
  const s = toon(
    `<div class="kaart">
      <h2>Bijna!</h2>
      <p>De goede spelling is:</p>
      <p class="woord-groot">${veilig(goed)}</p>
      <p class="woord-fout">${veilig(fout)}</p>
      <p class="tip">${veilig(tip)}</p>
      <button class="knop wit" data-spreek>🔊 Lees voor</button>
      <button class="knop" data-verder>Probeer opnieuw</button>
    </div>`,
  );
  knop(s, '[data-spreek]', opSpreek);
  knop(s, '[data-verder]', opVerder);
}

export function finishKaart(
  goedInEenKeer: number,
  totaal: number,
  verdiend: number,
  opNogEens: () => void,
  opEiland: () => void,
  opBlijf: () => void,
) {
  const sterren = goedInEenKeer === totaal ? 3 : goedInEenKeer >= totaal - 2 ? 2 : 1;
  const tekst =
    goedInEenKeer === totaal
      ? 'Alle deuren in één keer goed. Wauw!'
      : `${goedInEenKeer} van de ${totaal} deuren in één keer goed.`;
  const s = toon(
    `<div class="kaart">
      <h2>Obby gehaald!</h2>
      <p class="sterren">${'⭐'.repeat(sterren)}${'<span style="opacity:.25">⭐</span>'.repeat(3 - sterren)}</p>
      <p>${tekst}</p>
      <p><b>+${verdiend} hoefijzers</b></p>
      <button class="knop blauw" data-eiland>Terug naar het eiland</button>
      <button class="knop" data-nogeens>Nog een keer</button>
      <p><button class="link-knop" data-blijf>Nog even hier rondkijken</button></p>
    </div>`,
  );
  knop(s, '[data-nogeens]', opNogEens);
  knop(s, '[data-eiland]', opEiland);
  knop(s, '[data-blijf]', opBlijf);
}

export interface StemOptie {
  naam: string;
  label: string;
}

export interface InstellingenOpties {
  geluidAan: boolean;
  muziekAan: boolean;
  stemmen: StemOptie[];
  stemNaam: string | null;
  tempo: number;
  opGeluid(aan: boolean): void;
  opMuziek(aan: boolean): void;
  opStem(naam: string | null): void;
  opTempo(tempo: number): void;
  opSluit(): void;
}

const TEMPO_KEUZES: [string, number][] = [
  ['Langzaam', 0.75],
  ['Normaal', 0.9],
  ['Snel', 1.05],
];

export function instellingenScherm(o: InstellingenOpties) {
  const schakelaar = (id: string, label: string, aan: boolean) =>
    `<div class="rij"><span>${label}</span><button class="schakelaar${aan ? ' aan' : ''}" data-schakel="${id}" role="switch" aria-checked="${aan}">${aan ? 'Aan' : 'Uit'}</button></div>`;
  const stemmen = o.stemmen.length
    ? [{ naam: '', label: 'Automatisch (de mooiste)' }, ...o.stemmen]
        .map(
          (st) =>
            `<button class="stem${(o.stemNaam ?? '') === st.naam ? ' gekozen' : ''}" data-stem="${veilig(st.naam)}">${veilig(st.label)}</button>`,
        )
        .join('')
    : '<p class="klein">Op dit apparaat is geen Nederlandse stem gevonden.</p>';
  const s = toon(
    `<div class="kaart instellingen">
      <h2>Instellingen</h2>
      ${schakelaar('geluid', 'Geluidjes', o.geluidAan)}
      ${schakelaar('muziek', 'Muziek', o.muziekAan)}
      <h3>Voorleesstem</h3>
      <div class="stemmen">${stemmen}</div>
      <div class="rij"><span>Tempo</span><div class="tempo">${TEMPO_KEUZES.map(
        ([naam, t]) => `<button class="tempo-knop${Math.abs(o.tempo - t) < 0.01 ? ' gekozen' : ''}" data-tempo="${t}">${naam}</button>`,
      ).join('')}</div></div>
      <p class="tip">Klinkt de stem als een robot? Download op de iPad een mooiere stem:
        <b>Instellingen → Toegankelijkheid → Gesproken materiaal → Stemmen → Nederlands</b>.
        Kies een stem met <b>(Verbeterd)</b> of <b>(Premium)</b> achter de naam en start het spel opnieuw.</p>
      <p class="klein">Muziek: "Carefree", "Monkeys Spinning Monkeys" en "Fluffing a Duck" van Kevin MacLeod (incompetech.com), licentie CC BY 4.0.</p>
      <button class="knop" data-klaar>Klaar</button>
    </div>`,
  );
  s.querySelectorAll<HTMLButtonElement>('[data-schakel]').forEach((b) =>
    b.addEventListener('click', () => {
      const aan = !b.classList.contains('aan');
      b.classList.toggle('aan', aan);
      b.textContent = aan ? 'Aan' : 'Uit';
      b.setAttribute('aria-checked', String(aan));
      if (b.dataset.schakel === 'geluid') o.opGeluid(aan);
      else o.opMuziek(aan);
    }),
  );
  s.querySelectorAll<HTMLButtonElement>('[data-stem]').forEach((b) =>
    b.addEventListener('click', () => {
      s.querySelectorAll('[data-stem]').forEach((x) => x.classList.toggle('gekozen', x === b));
      o.opStem(b.dataset.stem || null);
    }),
  );
  s.querySelectorAll<HTMLButtonElement>('[data-tempo]').forEach((b) =>
    b.addEventListener('click', () => {
      s.querySelectorAll('[data-tempo]').forEach((x) => x.classList.toggle('gekozen', x === b));
      o.opTempo(Number(b.dataset.tempo));
    }),
  );
  knop(s, '[data-klaar]', o.opSluit);
}

export interface GeheimRegel {
  naam: string;
  hint: string;
  gevonden: boolean;
  extra?: string;
}

export function geheimenScherm(regels: GeheimRegel[], opSluit: () => void) {
  const gevonden = regels.filter((r) => r.gevonden).length;
  const s = toon(
    `<div class="kaart">
      <h2>Geheimen</h2>
      <p><b>${gevonden} van de ${regels.length}</b> gevonden</p>
      <div class="geheimen">
        ${regels
          .map((r) =>
            r.gevonden
              ? `<div class="geheim gevonden"><b>⭐ ${veilig(r.naam)}</b>${r.extra ? `<span>${veilig(r.extra)}</span>` : ''}</div>`
              : `<div class="geheim"><b>❓ ???</b><span>${veilig(r.hint)}</span>${r.extra ? `<span>${veilig(r.extra)}</span>` : ''}</div>`,
          )
          .join('')}
      </div>
      <button class="knop" data-klaar>Verder zoeken!</button>
    </div>`,
  );
  knop(s, '[data-klaar]', opSluit);
}

/** De schatkist met een slot: het wachtwoord moet goed gespeld zijn. */
export function wachtwoordScherm(opProbeer: (tekst: string) => boolean, opLater: () => void) {
  const s = toon(
    `<div class="kaart">
      <h2>Een schatkist!</h2>
      <p>Er zit een slot op. Typ het geheime wachtwoord:</p>
      <input class="naamveld" type="text" maxlength="20" placeholder="wachtwoord"
        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" />
      <p class="hint"></p>
      <button class="knop wit" data-later>Later</button>
      <button class="knop" data-open>Open de kist</button>
    </div>`,
  );
  const veld = s.querySelector<HTMLInputElement>('.naamveld')!;
  const hint = s.querySelector<HTMLParagraphElement>('.hint')!;
  const probeer = () => {
    if (!veld.value.trim()) {
      hint.textContent = 'Typ eerst het wachtwoord.';
      return;
    }
    if (!opProbeer(veld.value)) {
      hint.textContent = 'Bijna! Kijk nog eens goed hoe het op het briefje staat. Let op elke letter.';
      veld.select();
    }
  };
  veld.addEventListener('input', () => (hint.textContent = ''));
  veld.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') probeer();
  });
  knop(s, '[data-open]', probeer);
  knop(s, '[data-later]', opLater);
}
