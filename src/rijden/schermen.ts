// Schermen van het rijden: het broedhuis (eieren uitbroeden) en het dierenboek
// (je verzameling, en kiezen op welk dier je rijdt).

import { toon } from '../ui/schermen';
import { veilig } from '../ui/hud';
import type { Vraag } from '../leren/vragen';
import {
  EIEREN, PONY_ID, RIJDIEREN, ZELDZAAMHEDEN, rijdier, snelheidVan, trekDier, varianteVan, type EiSoort,
} from './dieren';
import { dierMetNr, gebruikEi, gevondenSoorten, PONY_NR, voegDierToe, type MijnDier, type RijStand } from './stand';
import { MEDAILLES, medailleTijden } from './race';

const komma = (n: number) => String(n).replace('.', ',');

/** Naam en icoon van een dier uit je verzameling. */
export function dierLabel(d: MijnDier, ponyNaam: string): { naam: string; icoon: string; zeldzaamheid: string; kleur: string } {
  if (d.soort === PONY_ID) return { naam: ponyNaam, icoon: '🐴', zeldzaamheid: 'Jouw pony', kleur: '#c68b59' };
  const r = rijdier(d.soort)!;
  const v = varianteVan(d.variant);
  const z = ZELDZAAMHEDEN.find((x) => x.id === r.zeldzaamheid)!;
  const naam = v.naam ? `${v.naam}-${r.naam.toLowerCase()}` : r.naam; // bijv. Glitter-vos
  return { naam, icoon: `${r.icoon}${v.icoon}`, zeldzaamheid: z.naam, kleur: z.kleur };
}

function eiHtml(soort: EiSoort, klasse = ''): string {
  const e = EIEREN.find((x) => x.id === soort)!;
  return `<span class="css-ei ${klasse}" style="--ei:${e.kleur};--stip:${e.stip}" aria-hidden="true"></span>`;
}

export interface BroedOpties {
  stand: RijStand;
  ponyNaam: string;
  /** Een nieuwe leervraag (spelling of rekenen). */
  vraag(): Vraag;
  /** Een antwoord op een leervraag, voor de herhaalbakjes. */
  opAntwoord(vraag: Vraag, goed: boolean, eersteKeer: boolean): void;
  opUitgebroed(dier: MijnDier): void;
  opRijden(nr: number): void;
  spreek(tekst: string): void;
  geluid: { klik(): void; goed(): void; fout(): void; magie(): void };
  opSluit(): void;
}

export function broedhuisScherm(o: BroedOpties): HTMLDivElement {
  const s = toon(`<div class="kaart rij-kaart">
    <h2>🥚 Broedhuis</h2>
    <p class="klein">Witte eieren gaan vanzelf open. Blauwe en gouden eieren gaan open als je een vraag goed hebt.</p>
    <div class="eieren-rij"></div>
    <section class="broed-vak" aria-live="polite"></section>
    <button class="knop wit" data-sluit>Klaar</button>
  </div>`, 'rij-scherm');
  const rij = s.querySelector<HTMLElement>('.eieren-rij')!;
  const vak = s.querySelector<HTMLElement>('.broed-vak')!;
  let bezig = false;

  const tekenEieren = () => {
    rij.innerHTML = EIEREN.map((e) => `<article class="ei-kaart">${eiHtml(e.id)}<b>${e.naam}</b><span>× ${o.stand.eieren[e.id]}</span>
      <button class="knop klein" data-broed="${e.id}" ${o.stand.eieren[e.id] && !bezig ? '' : 'disabled'}>${e.vraag ? 'Vraag + uitbroeden' : 'Uitbroeden'}</button></article>`).join('');
    rij.querySelectorAll<HTMLButtonElement>('[data-broed]').forEach((b) => (b.onclick = () => begin(b.dataset.broed as EiSoort)));
    if (!EIEREN.some((e) => o.stand.eieren[e.id]) && !bezig && !vak.innerHTML) {
      vak.innerHTML = '<p>Je hebt nog geen eieren. Rijd rond in het Rijland en zoek ze! In het dierenboek (🐎) staat waar ze liggen.</p>';
    }
  };

  const begin = (soort: EiSoort) => {
    o.geluid.klik();
    const e = EIEREN.find((x) => x.id === soort)!;
    if (e.vraag) stelVraag(soort, o.vraag(), true);
    else broed(soort);
  };

  const stelVraag = (soort: EiSoort, v: Vraag, eerste: boolean, feedback = '') => {
    bezig = true;
    tekenEieren();
    const keuzes = Math.random() < 0.5 ? [v.goed, v.fout] : [v.fout, v.goed];
    vak.innerHTML = `${eiHtml(soort, 'groot')}<p class="broed-vraag">${veilig(v.tekst).replace('___', '<span class="gat"></span>')}</p>
      <div class="broed-keuzes">${keuzes.map((k) => `<button class="knop" data-keuze="${veilig(k)}">${veilig(k)}</button>`).join('')}</div>
      <button class="tempo-knop" data-lees>🔊 Lees voor</button>${feedback ? `<p class="tip">${feedback}</p>` : ''}`;
    vak.querySelector<HTMLButtonElement>('[data-lees]')!.onclick = () => o.spreek(v.voorlezen);
    o.spreek(v.voorlezen);
    vak.querySelectorAll<HTMLButtonElement>('[data-keuze]').forEach((b) => (b.onclick = () => {
      const goed = b.dataset.keuze === v.goed;
      o.opAntwoord(v, goed, eerste);
      if (goed) {
        o.geluid.goed();
        broed(soort);
      } else {
        o.geluid.fout();
        const tip = `${veilig(v.tipTitel)} <b>${veilig(v.goed)}</b>. ${veilig(v.tip)}`;
        o.spreek(`${v.goed}. ${v.tip}`);
        stelVraag(soort, v, false, tip);
      }
    }));
  };

  const broed = (soort: EiSoort) => {
    bezig = true;
    tekenEieren();
    vak.innerHTML = `${eiHtml(soort, 'groot wiebel')}<p><b>Het ei beweegt…</b></p>`;
    window.setTimeout(() => {
      if (!s.isConnected) { bezig = false; return; }
      if (!gebruikEi(o.stand, soort)) { bezig = false; tekenEieren(); return; }
      const { soort: id, variant } = trekDier(soort);
      const dier = voegDierToe(o.stand, id, variant);
      bezig = false;
      if (!dier) {
        vak.innerHTML = '<p>Je stal zit vol! Je hebt al heel veel dieren.</p>';
        tekenEieren();
        return;
      }
      o.opUitgebroed(dier);
      o.geluid.magie();
      const l = dierLabel(dier, o.ponyNaam);
      const nieuw = o.stand.dieren.filter((d) => d.soort === dier.soort).length === 1;
      vak.innerHTML = `<div class="onthulling" style="--zeld:${l.kleur}"><span class="dier-icoon">${l.icoon}</span></div>
        <h3>${nieuw ? 'Nieuw! ' : ''}${veilig(l.naam)}</h3>
        <p><span class="zeld-label" style="--zeld:${l.kleur}">${l.zeldzaamheid}</span> · ⚡ ${komma(snelheidVan(dier.soort, dier.variant))}</p>
        <div class="broed-keuzes"><button class="knop" data-rij>🐎 Rijd erop!</button></div>`;
      o.spreek(`Je hebt een ${l.naam}!`);
      vak.querySelector<HTMLButtonElement>('[data-rij]')!.onclick = () => o.opRijden(dier.nr);
      tekenEieren();
    }, 1500);
  };

  s.querySelector<HTMLButtonElement>('[data-sluit]')!.onclick = () => o.opSluit();
  tekenEieren();
  return s;
}

export interface BoekOpties {
  stand: RijStand;
  ponyNaam: string;
  heeftPony: boolean;
  inRijland: boolean;
  /** Een tip waar het dichtstbijzijnde ei ligt. */
  eiTip: string;
  opRijden(nr: number): void;
  opAfstappen(): void;
  opReis(): void;
  klik(): void;
  opSluit(): void;
}

export function dierenboekScherm(o: BoekOpties): HTMLDivElement {
  const st = o.stand;
  const mijn: MijnDier[] = [...(o.heeftPony ? [dierMetNr(st, PONY_NR)!] : []), ...[...st.dieren].sort((a, b) => snelheidVan(b.soort, b.variant) - snelheidVan(a.soort, a.variant))];
  const gevonden = gevondenSoorten(st);
  const [brons, zilver, goud] = medailleTijden().map((t) => Math.round(t));
  const kaarten = mijn.map((d) => {
    const l = dierLabel(d, o.ponyNaam);
    const rijdt = st.rijdt === d.nr;
    return `<article class="dier-kaart${rijdt ? ' rijdt' : ''}" style="--zeld:${l.kleur}"><span class="dier-icoon">${l.icoon}</span><b>${veilig(l.naam)}</b>
      <span class="zeld-label">${l.zeldzaamheid}</span><span>⚡ ${komma(snelheidVan(d.soort, d.variant))}</span>
      <button class="knop klein" data-rij="${d.nr}" ${rijdt ? 'disabled' : ''}>${rijdt ? '✓ Je rijdt' : 'Rijden'}</button></article>`;
  }).join('');
  const nogTeVinden = RIJDIEREN.filter((r) => !gevonden.has(r.id)).map((r) => {
    const z = ZELDZAAMHEDEN.find((x) => x.id === r.zeldzaamheid)!;
    return `<article class="dier-kaart onbekend" style="--zeld:${z.kleur}"><span class="dier-icoon">❓</span><b>???</b><span class="zeld-label">${z.naam}</span></article>`;
  }).join('');
  const s = toon(`<div class="kaart rij-kaart">
    <h2>🐎 Mijn rijdieren</h2>
    <p class="eier-telling">${EIEREN.map((e) => `${eiHtml(e.id)} ${st.eieren[e.id]}`).join(' &nbsp; ')}</p>
    <p class="klein">🔎 ${veilig(o.eiTip)}</p>
    <p class="klein">🏁 Race: ${st.record ? `beste tijd ${komma(st.record)} s ${MEDAILLES[st.medaille]}` : 'nog niet gereden'} · brons < ${brons} s, zilver < ${zilver} s, goud < ${goud} s</p>
    ${st.rijdt !== null ? '<button class="knop wit klein" data-af>⬇️ Afstappen</button>' : ''}
    <div class="dieren-raster">${kaarten || '<p>Nog geen rijdieren. Zoek eieren!</p>'}</div>
    ${nogTeVinden ? `<h3>Nog te vinden (${RIJDIEREN.length - gevonden.size})</h3><div class="dieren-raster">${nogTeVinden}</div>` : '<h3>🏆 Je hebt alle soorten gevonden!</h3>'}
    <button class="knop blauw" data-reis>${o.inRijland ? '🏠 Terug naar het dorp' : '🌈 Naar het Rijland'}</button>
    <button class="knop wit" data-sluit>Klaar</button>
  </div>`, 'rij-scherm');
  s.querySelectorAll<HTMLButtonElement>('[data-rij]').forEach((b) => (b.onclick = () => o.opRijden(Number(b.dataset.rij))));
  s.querySelector<HTMLButtonElement>('[data-af]')?.addEventListener('click', () => o.opAfstappen());
  s.querySelector<HTMLButtonElement>('[data-reis]')!.onclick = () => o.opReis();
  s.querySelector<HTMLButtonElement>('[data-sluit]')!.onclick = () => o.opSluit();
  return s;
}
