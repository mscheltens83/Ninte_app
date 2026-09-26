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
    </div>`,
  );
  knop(s, '[data-nogeens]', opNogEens);
  knop(s, '[data-eiland]', opEiland);
}
