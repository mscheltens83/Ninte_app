// Schermen die over het spel heen komen: titel, dieren kiezen, tip, finish, uitleg.

import type { Vacht } from '../figuren/dieren';
import { PLEKKEN, type Plek } from '../geluid/muziek';
import { GROEP_UITLEG, microfoonHulp, type InspreekZin, type MicStatus } from '../leren/inspreken';
import { KAST, KLEUREN, itemStatus, slotTekst, type KastItem, type KastStand, type Uiterlijk } from '../figuren/uiterlijk';
import { veilig } from './hud';

const houder = () => document.getElementById('schermen')!;

let terugFocus: HTMLElement | null = null;
export function toon(html: string, klasse = ''): HTMLDivElement {
  if (!houder().firstElementChild) terugFocus = document.activeElement as HTMLElement | null;
  const scherm = document.createElement('div');
  scherm.className = `scherm ${klasse}`;
  scherm.innerHTML = html;
  scherm.setAttribute('role', 'dialog');
  scherm.setAttribute('aria-modal', 'true');
  scherm.tabIndex = -1;
  const titel = scherm.querySelector('h1, h2');
  if (titel) { titel.id = 'scherm-titel'; scherm.setAttribute('aria-labelledby', titel.id); }
  else scherm.setAttribute('aria-label', 'Spelscherm');
  scherm.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const velden = [...scherm.querySelectorAll<HTMLElement>('button, input, textarea, select, summary, [tabindex="0"]')]
      .filter((v) => !v.hasAttribute('disabled') && !v.hidden && v.getClientRects().length > 0);
    const eerste = velden[0], laatste = velden.at(-1);
    if (!eerste) { e.preventDefault(); scherm.focus(); }
    else if (e.shiftKey && (document.activeElement === eerste || document.activeElement === scherm)) { e.preventDefault(); laatste?.focus(); }
    else if (!e.shiftKey && (document.activeElement === laatste || !scherm.contains(document.activeElement))) { e.preventDefault(); eerste.focus(); }
  });
  houder().replaceChildren(scherm);
  for (const id of ['hud', 'vlak', 'canvas']) { const el = document.getElementById(id); if (el) el.inert = true; }
  requestAnimationFrame(() => {
    if (scherm.isConnected && !scherm.contains(document.activeElement))
      (scherm.querySelector<HTMLElement>('[data-focus]') ?? scherm.querySelector<HTMLElement>('button, input, textarea, select') ?? scherm).focus({ preventScroll: true });
  });
  return scherm;
}

export function sluitScherm() {
  houder().replaceChildren();
  for (const id of ['hud', 'vlak', 'canvas']) { const el = document.getElementById(id); if (el) el.inert = false; }
  if (terugFocus?.isConnected) terugFocus.focus({ preventScroll: true });
  terugFocus = null;
}

function knop(scherm: HTMLElement, selector: string, actie: () => void) {
  scherm.querySelector<HTMLButtonElement>(selector)!.addEventListener('click', actie);
}

export function titelScherm(opSpelen: () => void, opOuders?: () => void) {
  const s = toon(
    `<div class="titel">
      <h1>Nintes Wereld</h1>
      <p class="ondertitel">Paarden · Honden · Spelling-avonturen</p>
      <button class="knop" data-spelen>Spelen</button>
      ${opOuders ? '<button class="knop wit" data-ouders>Voor ouders</button>' : ''}
    </div>`,
    'doorzichtig',
  );
  knop(s, '[data-spelen]', opSpelen);
  if (opOuders) knop(s, '[data-ouders]', opOuders);
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
      <input class="naamveld" aria-label="${vraag}" type="text" maxlength="14" placeholder="Typ een naam"
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
        <div><b class="icoon">🚪</b>Volg de bordjes naar de Deuren-obby (spelling) of de Reken-obby (rekenen). Loop door de deur met het goede antwoord!</div>
        <div><b class="icoon">👕</b>In de kledingkast maak je je poppetje mooi. Speel nieuwe kleding vrij of koop het met hoefijzers.</div>
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
  titel: string,
  goed: string,
  fout: string,
  tip: string,
  opSpreek: () => void,
  opVerder: () => void,
) {
  const s = toon(
    `<div class="kaart">
      <h2>Bijna!</h2>
      <p>${veilig(titel)}</p>
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
  nieuweKleding: string[] = [],
  opKast?: () => void,
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
      ${nieuweKleding.length ? `<p class="tip">👕 Nieuw in je kledingkast: <b>${veilig(nieuweKleding.join(' en '))}</b>!</p><button class="knop wit" data-kast>👕 Naar de kledingkast</button>` : ''}
      <button class="knop blauw" data-eiland>Terug naar het eiland</button>
      <button class="knop" data-nogeens>Nog een keer</button>
      <p><button class="link-knop" data-blijf>Nog even hier rondkijken</button></p>
    </div>`,
  );
  knop(s, '[data-nogeens]', opNogEens);
  knop(s, '[data-eiland]', opEiland);
  knop(s, '[data-blijf]', opBlijf);
  if (opKast && nieuweKleding.length) knop(s, '[data-kast]', opKast);
}

export interface StemOptie {
  naam: string;
  label: string;
}

export interface MuziekRegel {
  id: string;
  naam: string;
  plek: Plek;
  eigen: boolean;
}

export interface InstellingenOpties {
  geluidAan: boolean;
  muziekAan: boolean;
  nummers: MuziekRegel[];
  huidigNummer: string | null;
  opVolgende(): void;
  opToevoegen(bestanden: FileList, plek: Plek): void;
  opVerwijder(id: string): void;
  stemmen: StemOptie[];
  stemNaam: string | null;
  tempo: number;
  opGeluid(aan: boolean): void;
  opMuziek(aan: boolean): void;
  opStem(naam: string | null): void;
  opTempo(tempo: number): void;
  opInspreken(): void;
  opOuders(): void;
  opSluit(): void;
}

const TEMPO_KEUZES: [string, number][] = [
  ['Langzaam', 0.75],
  ['Normaal', 0.9],
  ['Snel', 1.05],
];

export function instellingenScherm(o: InstellingenOpties) {
  const schakelaar = (id: string, label: string, aan: boolean) =>
    `<div class="rij"><span>${label}</span><button class="schakelaar${aan ? ' aan' : ''}" aria-label="${label}" data-schakel="${id}" role="switch" aria-checked="${aan}">${aan ? 'Aan' : 'Uit'}</button></div>`;
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
      <button class="knop wit" data-ouders>Voor ouders · leren en voortgang</button>
      ${schakelaar('geluid', 'Geluidjes', o.geluidAan)}
      ${schakelaar('muziek', 'Muziek', o.muziekAan)}
      <div class="rij"><span class="nu-speelt">♪ ${veilig(o.huidigNummer ?? '...')}</span><button class="tempo-knop" data-volgende>⏭ Ander nummer</button></div>
      <details class="muzieklijst">
        <summary>Alle muziek (${o.nummers.length})</summary>
        ${PLEKKEN.map(
          ([plek, naam]) => `<h4>${naam}</h4>${o.nummers
            .filter((n) => n.plek === plek)
            .map((n) => `<div class="nummer"><span>${veilig(n.naam)}</span>${n.eigen ? `<button class="wis" data-wis="${veilig(n.id)}" aria-label="Verwijder">🗑</button>` : ''}</div>`)
            .join('') || '<p class="klein">Nog geen muziek.</p>'}`,
        ).join('')}
      </details>
      <h3>Eigen muziek toevoegen</h3>
      <p class="klein">Kies een MP3 van de iPad. Waar moet het nummer spelen?</p>
      <div class="tempo">${PLEKKEN.map(([plek, naam], i) => `<button class="tempo-knop${i === 0 ? ' gekozen' : ''}" data-plek="${plek}">${naam}</button>`).join('')}</div>
      <button class="knop blauw" data-toevoegen>＋ Muziek kiezen</button>
      <input type="file" accept="audio/*,.mp3,.m4a" multiple hidden data-bestand />
      <h3>Voorleesstem</h3>
      <button class="knop wit" data-inspreken>🎙️ Zelf de stem inspreken</button>
      <div class="stemmen">${stemmen}</div>
      <div class="rij"><span>Tempo</span><div class="tempo">${TEMPO_KEUZES.map(
        ([naam, t]) => `<button class="tempo-knop${Math.abs(o.tempo - t) < 0.01 ? ' gekozen' : ''}" data-tempo="${t}">${naam}</button>`,
      ).join('')}</div></div>
      <p class="tip">Klinkt de stem als een robot? Download een mooiere Nederlandse stem en start het spel opnieuw.<br>
        <b>iPad:</b> Instellingen → Toegankelijkheid → Gesproken materiaal → Stemmen → Nederlands (kies een stem met <b>Verbeterd</b> of <b>Premium</b>).<br>
        <b>Android:</b> Instellingen → zoek op <b>Tekst-naar-spraak</b> → Spraakengine van Google → Nederlands installeren.</p>
      <p class="klein">Ingebouwde muziek: "Carefree", "Monkeys Spinning Monkeys" en "Fluffing a Duck" van Kevin MacLeod (incompetech.com), licentie CC BY 4.0. Eigen muziek blijft alleen op dit apparaat.</p>
      <button class="knop" data-klaar>Klaar</button>
    </div>`,
  );
  knop(s, '[data-ouders]', o.opOuders);
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
  knop(s, '[data-inspreken]', o.opInspreken);
  knop(s, '[data-volgende]', o.opVolgende);
  let plek: Plek = 'eiland';
  s.querySelectorAll<HTMLButtonElement>('[data-plek]').forEach((b) =>
    b.addEventListener('click', () => {
      plek = b.dataset.plek as Plek;
      s.querySelectorAll('[data-plek]').forEach((x) => x.classList.toggle('gekozen', x === b));
    }),
  );
  const invoer = s.querySelector<HTMLInputElement>('[data-bestand]')!;
  knop(s, '[data-toevoegen]', () => invoer.click());
  invoer.addEventListener('change', () => {
    if (invoer.files?.length) o.opToevoegen(invoer.files, plek);
  });
  s.querySelectorAll<HTMLButtonElement>('[data-wis]').forEach((b) => b.addEventListener('click', () => o.opVerwijder(b.dataset.wis!)));
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

export interface KastOpties {
  titel: string;
  uiterlijk: Uiterlijk;
  stand: KastStand;
  opKies(u: Uiterlijk): void;
  opKoop(item: KastItem): boolean;
  opKlaar(): void;
  klik(): void;
}

type KastTab = 'haar' | 'kleding' | 'hoed' | 'extra' | 'huid';

const TABS: [KastTab, string][] = [
  ['haar', 'Haar'],
  ['kleding', 'Kleding'],
  ['hoed', 'Hoofd'],
  ['extra', 'Extra'],
  ['huid', 'Huid'],
];

/** De kledingkast: het poppetje staat links in beeld en verandert meteen mee. */
export function kastScherm(o: KastOpties) {
  const u = { ...o.uiterlijk };
  let tab: KastTab = 'haar';
  let teKopen: string | null = null;
  let hint = '';
  const s = toon('<div class="kast-paneel"></div>', 'kast');
  s.setAttribute('aria-label', o.titel);
  const paneel = s.querySelector<HTMLDivElement>('.kast-paneel')!;

  const stalen = (veld: 'huid' | 'haar' | 'shirt' | 'broek' | 'schoenen', label: string) =>
    `<h3>${label}</h3><div class="stalen">${KLEUREN[veld]
      .map((k, i) => `<button class="staal${u[veld] === k ? ' aan' : ''}" style="background:${k}" data-veld="${veld}" data-kleur="${k}" aria-label="${label}: ${kleurNaam(veld, i)}" aria-pressed="${u[veld] === k}" title="${kleurNaam(veld, i)}"></button>`)
      .join('')}</div>`;

  const items = (soort: KastItem['soort']) =>
    `<div class="items">${KAST.filter((i) => i.soort === soort)
      .map((i) => {
        const status = itemStatus(i, o.stand);
        const aan = u[soort] === i.waarde;
        const prijs = i.voorwaarde.soort === 'prijs' ? i.voorwaarde.hoefijzers : 0;
        let onder = '';
        if (aan) onder = '✓ Aan';
        else if (status === 'kopen') onder = teKopen === i.id ? `Koop voor ${prijs}!` : `${prijs} hoefijzers`;
        else if (status === 'op-slot') onder = `🔒 ${slotTekst(i)}`;
        const klas = ['item', aan ? 'aan' : '', status === 'op-slot' ? 'slot' : '', teKopen === i.id ? 'koop' : ''].join(' ');
        return `<button class="${klas}" aria-pressed="${aan}" data-item="${i.id}">${veilig(i.naam)}${onder ? `<small>${veilig(onder)}</small>` : ''}</button>`;
      })
      .join('')}</div>`;

  const inhoud = () => {
    switch (tab) {
      case 'haar':
        return `<h3>Kapsel</h3>${items('kapsel')}${stalen('haar', 'Haarkleur')}`;
      case 'kleding':
        return `${stalen('shirt', 'Shirt')}${stalen('broek', 'Broek')}${stalen('schoenen', 'Schoenen')}`;
      case 'hoed':
        return items('hoed');
      case 'extra':
        return items('extra');
      case 'huid':
        return stalen('huid', 'Huidkleur');
    }
  };

  const teken = () => {
    paneel.innerHTML = `
      <div class="kast-kop"><h2>${veilig(o.titel)}</h2><span class="kast-geld">${o.stand.hoefijzers} hoefijzers</span></div>
      <div class="tabs">${TABS.map(([id, naam]) => `<button class="tab${tab === id ? ' actief' : ''}" data-tab="${id}">${naam}</button>`).join('')}</div>
      <div class="kast-inhoud">${inhoud()}</div>
      <p class="hint">${veilig(hint)}</p>
      <button class="knop" data-klaar>Klaar</button>`;
  };

  paneel.addEventListener('click', (e) => {
    const doel = (e.target as HTMLElement).closest('button');
    if (!doel) return;
    o.klik();
    hint = '';
    if (doel.dataset.tab) {
      tab = doel.dataset.tab as KastTab;
      teKopen = null;
    } else if (doel.dataset.veld) {
      u[doel.dataset.veld as 'huid' | 'haar' | 'shirt' | 'broek' | 'schoenen'] = doel.dataset.kleur!;
      o.opKies({ ...u });
    } else if (doel.dataset.item) {
      const item = KAST.find((i) => i.id === doel.dataset.item)!;
      const status = itemStatus(item, o.stand);
      if (status === 'op-slot') {
        hint = `${item.naam}: ${slotTekst(item)} om dit vrij te spelen.`;
      } else if (status === 'kopen') {
        const prijs = item.voorwaarde.soort === 'prijs' ? item.voorwaarde.hoefijzers : 0;
        if (o.stand.hoefijzers < prijs) {
          hint = `Je hebt nog ${prijs - o.stand.hoefijzers} hoefijzers nodig. Verdien ze in de obby's!`;
          teKopen = null;
        } else if (teKopen !== item.id) {
          teKopen = item.id; // eerst vragen, dan pas kopen
        } else if (o.opKoop(item)) {
          teKopen = null;
          (u as Record<string, string>)[item.soort] = item.waarde;
          o.opKies({ ...u });
        }
      } else {
        teKopen = null;
        (u as Record<string, string>)[item.soort] = item.waarde;
        o.opKies({ ...u });
      }
    } else if ('klaar' in doel.dataset) {
      o.opKlaar();
      return;
    }
    teken();
    const focus = [...paneel.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      (doel.dataset.tab && b.dataset.tab === doel.dataset.tab) ||
      (doel.dataset.item && b.dataset.item === doel.dataset.item) ||
      (doel.dataset.veld && b.dataset.veld === doel.dataset.veld && b.dataset.kleur === doel.dataset.kleur));
    focus?.focus({ preventScroll: true });
  });
  teken();
}

function kleurNaam(veld: keyof typeof KLEUREN, index: number): string {
  const namen = {
    huid: ['Licht perzik', 'Perzik', 'Lichtbruin', 'Middenbruin', 'Donkerbruin', 'Diepbruin'],
    haar: ['Zwartbruin', 'Bruin', 'Koper', 'Goudblond', 'Lichtblond', 'Rood', 'Roze', 'Paars'],
    shirt: ['Paars', 'Roze', 'Geel', 'Groen', 'Blauw', 'Wit', 'Donkerpaars', 'Oranje'],
    broek: ['Blauw', 'Donkerpaars', 'Bruin', 'Wit', 'Roze', 'Groen'],
    schoenen: ['Wit', 'Donkerpaars', 'Bruin', 'Roze', 'Blauw', 'Geel'],
  };
  return namen[veld][index] ?? `Kleur ${index + 1}`;
}

export interface InspreekOpties {
  zinnen: InspreekZin[];
  micStatus: MicStatus;
  heeft(sleutel: string): boolean;
  opOpnemen(sleutel: string): Promise<void>;
  opStop(sleutel: string): Promise<boolean>;
  opLuister(sleutel: string): void;
  opWis(sleutel: string): Promise<void>;
  opSluit(): void;
}

/** Zelf de zinnen inspreken: opnemen, terugluisteren, opnieuw of wissen. */
export function inspreekScherm(o: InspreekOpties) {
  const groepen = [...new Set(o.zinnen.map((z) => z.groep))];
  const kanOpnemen = o.micStatus === 'kan';
  const micMelding =
    o.micStatus === 'voorbeeldlink'
      ? 'In deze voorbeeldlink (claude.ai) mag het spel de microfoon niet gebruiken, op geen enkel apparaat. Inspreken werkt in de app-versie van het spel (zie de uitleg over Netlify).'
      : o.micStatus === 'niet-ondersteund'
        ? 'Deze browser kan niet opnemen. Probeer Chrome (Android) of Safari (iPad).'
        : '';
  const s = toon(
    `<div class="kaart inspreken">
      <h2>🎙️ Stem inspreken</h2>
      <p class="voortgang"></p>
      <p class="tip">Tik op <b>Opnemen</b>, zeg de zin rustig en tik op <b>Stop</b>.
        De meeste zinnen passen bij elk woord en elke som. Je hoeft niet alles in te spreken:
        wat je niet inspreekt, leest de computerstem voor.</p>
      ${micMelding ? `<p class="hint">${veilig(micMelding)}</p>` : ''}
      <p class="hint" data-melding></p>
      ${groepen
        .map(
          (g) => `<h3>${veilig(g)}</h3><p class="klein">${veilig(GROEP_UITLEG[g])}</p>${o.zinnen
            .filter((z) => z.groep === g)
            .map((z) => `<div class="zin" data-zin="${veilig(z.sleutel)}"><p>${veilig(z.tekst)}</p><div class="zin-knoppen"></div></div>`)
            .join('')}`,
        )
        .join('')}
      <button class="knop" data-klaar>Klaar</button>
    </div>`,
  );
  const melding = s.querySelector<HTMLParagraphElement>('[data-melding]')!;
  const voortgang = s.querySelector<HTMLParagraphElement>('.voortgang')!;
  let opnemend: string | null = null;

  const tekenVoortgang = () => {
    const n = o.zinnen.filter((z) => o.heeft(z.sleutel)).length;
    voortgang.innerHTML = `<b>${n} van de ${o.zinnen.length}</b> zinnen ingesproken`;
  };

  const tekenRij = (rij: HTMLElement) => {
    const sleutel = rij.dataset.zin!;
    const heeft = o.heeft(sleutel);
    const bezig = opnemend === sleutel;
    rij.classList.toggle('opnemend', bezig);
    rij.classList.toggle('klaar', heeft);
    const knoppen = rij.querySelector<HTMLDivElement>('.zin-knoppen')!;
    if (bezig) {
      knoppen.innerHTML = '<button class="opname-knop stop" data-actie="stop">⏹ Stop</button>';
    } else {
      knoppen.innerHTML = `
        <button class="opname-knop" data-actie="op" ${!kanOpnemen || opnemend ? 'disabled' : ''}>🔴 ${heeft ? 'Opnieuw' : 'Opnemen'}</button>
        ${heeft ? '<button class="opname-knop" data-actie="luister" aria-label="Luister">▶️</button><button class="opname-knop" data-actie="wis" aria-label="Wis">🗑</button>' : ''}`;
    }
  };

  const rijen = [...s.querySelectorAll<HTMLElement>('[data-zin]')];
  const tekenAlles = () => {
    rijen.forEach(tekenRij);
    tekenVoortgang();
  };

  s.addEventListener('click', async (e) => {
    const knop = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-actie]');
    if (!knop) return;
    const rij = knop.closest<HTMLElement>('[data-zin]')!;
    const sleutel = rij.dataset.zin!;
    melding.textContent = '';
    switch (knop.dataset.actie) {
      case 'op':
        try {
          await o.opOpnemen(sleutel);
          opnemend = sleutel;
        } catch {
          melding.textContent = microfoonHulp();
        }
        tekenAlles();
        break;
      case 'stop': {
        opnemend = null;
        const gelukt = await o.opStop(sleutel);
        if (!gelukt) melding.textContent = 'De opname kon niet worden bewaard of was te kort. Controleer de vrije ruimte en probeer opnieuw.';
        tekenAlles();
        if (gelukt) o.opLuister(sleutel);
        break;
      }
      case 'luister':
        o.opLuister(sleutel);
        break;
      case 'wis':
        await o.opWis(sleutel);
        tekenAlles();
        break;
    }
  });
  knop(s, '[data-klaar]', o.opSluit);
  tekenAlles();
}
