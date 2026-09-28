import { aanHerhalingToe, kiesWoorden, verwerkAntwoord, volgendeHerhaling, type WoordStats } from '../leren/herhaalbakjes';
import { dierenAantal } from '../leren/dag';
import { CATEGORIEEN, leesWeekwoorden, normaalWoord, oefenWoorden } from '../leren/schoolwoorden';
import { tipVoor, voorleesTekst, zinMetGat } from '../leren/spelling';
import { spreek } from '../leren/voorlezen';
import { CATEGORIE_NAMEN, type Categorie } from '../leren/woorden';
import { bewaarStand, exporteerStand, leesBackUp, opslagMelding, type DierenTaak, type Spelstand } from '../opslag/opslag';
import { veilig } from './hud';
import { toon } from './schermen';

export const TAKEN: [DierenTaak, string, string][] = [
  ['voeren', '🥕 Pony voeren', 'De pony krijgt een lekkere wortel.'],
  ['borstelen', '🧽 Pony borstelen', 'Maak de vacht van je pony mooi.'],
  ['apporteren', '🎾 Met de puppy spelen', 'Je puppy haalt de bal voor je op.'],
];

export function dierenScherm(stand: Spelstand, opTaak: (taak: DierenTaak) => void, opSluit: () => void, opEinde: () => void) {
  const s = toon(`<div class="kaart leren"><h2>Help je dieren</h2>
    <p>Luister naar het woord en typ het zelf. Met twee woorden help je één dier.</p>
    <p class="dagdoel">Vandaag: ${dierenAantal(stand)} van 6 woorden</p>
    ${TAKEN.map(([id, naam, tekst]) => `<button class="knop ${stand.dag.dieren[id] === 2 ? 'wit' : ''}" data-taak="${id}" ${stand.dag.dieren[id] === 2 ? 'disabled' : ''}>${naam} · ${stand.dag.dieren[id]}/2${stand.dag.dieren[id] === 2 ? ' ✓' : ''}</button><p class="klein">${tekst}</p>`).join('')}
    ${dierenAantal(stand) === 6 ? '<p>Alle dieren zijn geholpen! Je kunt nog verkennen of rustig afsluiten.</p>' : ''}
    <button class="knop wit" data-sluit>Terug naar het eiland</button><button class="knop wit" data-einde>Voor vandaag klaar</button></div>`);
  s.querySelectorAll<HTMLButtonElement>('[data-taak]').forEach((b) => b.onclick = () => opTaak(b.dataset.taak as DierenTaak));
  s.querySelector<HTMLButtonElement>('[data-sluit]')!.onclick = opSluit;
  s.querySelector<HTMLButtonElement>('[data-einde]')!.onclick = opEinde;
}

export function dicteeScherm(stand: Spelstand, taak: DierenTaak, opBeloning: (n: number) => void,
  opKlaar: () => void, opSluit: () => void) {
  const bank = oefenWoorden(stand.weekwoorden, stand.alleenWeekwoorden, stand.categorieen);
  const kaarten = kiesWoorden(bank, stand.dictee, 2 - stand.dag.dieren[taak]);
  // Een lijst van één schoolwoord mag ook: dezelfde kaart blijft voor extra oefening beschikbaar.
  if (kaarten.length === 1 && stand.dag.dieren[taak] === 0) kaarten.push(kaarten[0]);
  if (!kaarten.length) {
    const s = toon('<div class="kaart"><h2>Geen oefenwoorden</h2><p>Kies bij Voor ouders een categorie die bij de weekwoorden past.</p><button class="knop">Terug</button></div>');
    s.querySelector('button')!.onclick = opSluit;
    return;
  }
  let index = 0;
  const volgende = () => {
    const kaart = kaarten[index];
    let beoordeeld = false, metHulp = false, af = false, voorbeeld = false;
    const s = toon(`<div class="kaart leren"><h2>${TAKEN.find(([id]) => id === taak)![1]}</h2>
      <p>Woord ${stand.dag.dieren[taak] + 1} van 2 · luister en typ</p>
      <p class="dictee-zin">${veilig(zinMetGat(kaart))}</p>
      <button class="knop wit" data-luister>🔊 Luister naar het woord</button>
      <button class="knop wit" data-voorbeeld>Ik hoor het niet · woord bekijken</button>
      <form><label for="dictee-woord">Welk woord hoor je?</label><input id="dictee-woord" class="naamveld" data-focus maxlength="40" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" aria-describedby="dictee-feedback">
      <button class="knop" type="submit">Controleer</button></form>
      <p id="dictee-feedback" class="feedback" aria-live="polite"></p>
      <button class="knop" data-verder hidden>Verder</button><button class="knop wit" data-sluit>Later verder</button></div>`);
    const input = s.querySelector<HTMLInputElement>('input')!;
    const feedback = s.querySelector<HTMLElement>('.feedback')!;
    const verder = s.querySelector<HTMLButtonElement>('[data-verder]')!;
    const controleer = s.querySelector<HTMLButtonElement>('[type="submit"]')!;
    const bekijk = s.querySelector<HTMLButtonElement>('[data-voorbeeld]')!;
    bekijk.onclick = () => {
      if (af) return;
      voorbeeld = !voorbeeld;
      metHulp = true;
      feedback.textContent = voorbeeld ? `Bekijk het woord: ${kaart.woord}. Verberg het en typ uit je hoofd. Deze oefening telt als oefenen met hulp.` : 'Typ nu het woord uit je hoofd.';
      bekijk.textContent = voorbeeld ? 'Verberg het woord · ik ga typen' : 'Woord nog eens bekijken';
      input.disabled = voorbeeld; controleer.disabled = voorbeeld;
      if (!voorbeeld) input.focus();
    };
    s.querySelector<HTMLButtonElement>('[data-luister]')!.onclick = () => spreek(voorleesTekst(kaart));
    s.querySelector<HTMLButtonElement>('[data-sluit]')!.onclick = opSluit;
    s.querySelector('form')!.onsubmit = (e) => {
      e.preventDefault();
      if (af || !input.value.trim()) { if (!input.value.trim()) feedback.textContent = 'Typ eerst het woord dat je hoort.'; return; }
      const goed = normaalWoord(input.value) === normaalWoord(kaart.woord);
      if (!beoordeeld) {
        stand.dictee[kaart.woord] = verwerkAntwoord(stand.dictee[kaart.woord], goed && !metHulp, Date.now());
        stand.dag[goed && !metHulp ? 'woordenGoed' : 'woordenFout']++;
        beoordeeld = true;
        metHulp ||= !goed;
        bewaarStand(stand);
      }
      if (!goed) {
        feedback.textContent = `Bijna! ${tipVoor(kaart)} Typ het woord nog eens.`;
        input.select();
        spreek(tipVoor(kaart));
        return;
      }
      af = true;
      stand.dag.dieren[taak]++;
      if (metHulp) stand.dag.verbeterd++;
      input.disabled = true;
      bekijk.disabled = true;
      s.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled = true;
      feedback.textContent = metHulp ? `Goed verbeterd: ${kaart.woord}! Dit woord komt terug om zonder hulp te oefenen.` : `Goed gespeld: ${kaart.woord}!`;
      opBeloning(metHulp ? 1 : 3);
      if (dierenAantal(stand) === 6) opBeloning(4);
      bewaarStand(stand);
      verder.hidden = false;
      verder.textContent = stand.dag.dieren[taak] === 2 ? 'Help het dier!' : 'Volgend woord';
      verder.focus();
    };
    verder.onclick = () => {
      if (stand.dag.dieren[taak] === 2) opKlaar();
      else { index++; volgende(); }
    };
    spreek(voorleesTekst(kaart));
  };
  volgende();
}

function resultaat(stats: WoordStats, sleutels: string[]): string {
  const waarden = sleutels.map((k) => stats[k]).filter(Boolean);
  const goed = waarden.reduce((n, s) => n + s.goed, 0), fout = waarden.reduce((n, s) => n + s.fout, 0);
  return goed + fout ? `${Math.round(100 * goed / (goed + fout))}% (${goed} goed, ${fout} fout)` : 'Nog niet geoefend';
}

export function oudersScherm(stand: Spelstand, opWijzig: () => void, opSluit: () => void, opVerder?: () => void) {
  const alleWoorden = oefenWoorden(stand.weekwoorden, false, CATEGORIEEN);
  const zwak = alleWoorden.filter((w) => stand.dictee[w.woord])
    .sort((a, b) => stand.dictee[a.woord].bakje - stand.dictee[b.woord].bakje || stand.dictee[b.woord].fout - stand.dictee[a.woord].fout).slice(0, 12);
  const sommen = Object.entries(stand.sommen).filter(([, s]) => s.fout > 0).sort((a, b) => b[1].fout - a[1].fout).slice(0, 10);
  const s = toon(`<div class="kaart leren ouders"><h2>Voor ouders</h2>
    <p class="klein">Voortgang en schoolwoorden blijven op dit apparaat. Een back-up helpt bij overstappen of verlies van browsergegevens.</p>
    <h3>Vandaag</h3><p>${dierenAantal(stand)}/6 dierenwoorden · ${stand.dag.woordenGoed} meteen goed · ${stand.dag.woordenFout} met hulp · ${stand.dag.verbeterd} verbeterd.<br>
    Rekenen: ${stand.dag.sommenGoed} goed, ${stand.dag.sommenFout} fout. Speeltijd: ${Math.floor(stand.dag.speelSeconden / 60)} minuten.</p>
    <h3>Schoolwoorden van deze week</h3><label for="weekwoorden">Eén woord per regel. Optioneel: woord | voorbeeldzin | langere vorm</label>
    <textarea id="weekwoorden" rows="6" placeholder="hond | De hond speelt buiten. | honden">${veilig(stand.weekwoorden.map((w) => [w.woord, w.zin, w.langer ?? ''].join(' | ')).join('\n'))}</textarea>
    <label class="vink"><input type="checkbox" data-alleen ${stand.alleenWeekwoorden ? 'checked' : ''}> Alleen deze schoolwoorden oefenen (lege lijst gebruikt de gewone woorden)</label>
    <fieldset><legend>Spellingcategorieën</legend>${CATEGORIEEN.map((c) => `<label class="vink"><input type="checkbox" value="${c}" data-categorie ${stand.categorieen.includes(c) ? 'checked' : ''}> ${CATEGORIE_NAMEN[c]}</label>`).join('')}</fieldset>
    <h3>Speeltijd en beeld</h3><label for="speelduur">Maximaal spelen per dag</label><select id="speelduur">${[5,10,15,20,30,45,60,0].map((n) => `<option value="${n}" ${stand.speeltijdMinuten === n ? 'selected' : ''}>${n ? `${n} minuten` : 'Geen tijdslimiet'}</option>`).join('')}${![5,10,15,20,30,45,60,0].includes(stand.speeltijdMinuten) ? `<option value="${stand.speeltijdMinuten}" selected>${stand.speeltijdMinuten} minuten</option>` : ''}</select>
    <label for="kwaliteit">Beeldkwaliteit</label><select id="kwaliteit"><option value="mooi" ${stand.beeldkwaliteit === 'mooi' ? 'selected' : ''}>Mooi · schaduwen en scherp beeld</option><option value="zuinig" ${stand.beeldkwaliteit === 'zuinig' ? 'selected' : ''}>Zuinig · minder effecten, zonder schaduwen</option></select>
    <label class="vink"><input type="checkbox" data-rustig ${stand.minderEffecten ? 'checked' : ''}> Minder bewegende effecten</label>
    <button class="knop" data-bewaar>Bewaar instellingen</button><p class="feedback" data-feedback aria-live="polite"></p>
    <h3>Leerontwikkeling</h3><p class="klein">Percentages tellen het eerste antwoord per oefening. Deuren meten herkenning; dictee meet zelf spellen. Goed herhaald na 1, 3, 7 en 14 dagen schuift een woord verder.</p>
    <div class="tabel-scroll"><table><thead><tr><th>Categorie</th><th>Zelf typen</th><th>Deuren</th></tr></thead><tbody>${CATEGORIEEN.map((c) => { const keys = alleWoorden.filter((w) => w.categorie === c).map((w) => w.woord); return `<tr><td>${CATEGORIE_NAMEN[c]}</td><td>${resultaat(stand.dictee, keys)}</td><td>${resultaat(stand.woorden, keys)}</td></tr>`; }).join('')}</tbody></table></div>
    <h4>Woorden om te herhalen</h4>${zwak.length ? `<ul>${zwak.map((w) => {const stat = stand.dictee[w.woord]; return `<li>${veilig(w.woord)} · ${stat.fout} keer lastig · ${aanHerhalingToe(stat) ? 'nu aan de beurt' : `vanaf ${new Date(volgendeHerhaling(stat)).toLocaleDateString('nl-NL')}`}</li>`;}).join('')}</ul>` : '<p>Nog geen dictee gemaakt.</p>'}
    <h4>Lastige sommen</h4>${sommen.length ? `<ul>${sommen.map(([key, st]) => `<li>${veilig(key.replace('x',' × ').replace(':',' ÷ '))} · ${st.fout} keer fout</li>`).join('')}</ul>` : '<p>Nog geen lastige sommen.</p>'}
    <h3>Voortgang beschermen</h3><p>${veilig(opslagMelding().tekst || 'De voortgang wordt automatisch bewaard, met een reserve van de vorige goede stand.')}</p>
    <p class="klein">Download regelmatig een back-up en vóór het wissen van browsergegevens. Het bestand bevat dieren, kleding, hoefijzers, leerresultaten en instellingen. Eigen muziek en stemopnames blijven op dit apparaat en zitten niet in deze back-up.</p>
    <button class="knop wit" data-export>Download voortgang</button><label for="backup-bestand">Herstel uit een back-up</label><input id="backup-bestand" type="file" accept=".json,application/json">
    <p data-importtekst class="feedback" aria-live="polite"></p><button class="knop" data-import hidden>Herstel deze voortgang</button>
    ${opVerder ? '<button class="knop wit" data-verder>Nog spelen vandaag toestaan</button>' : ''}
    <button class="knop wit" data-sluit>Terug</button></div>`);
  const feedback = s.querySelector<HTMLElement>('[data-feedback]')!;
  s.querySelector<HTMLButtonElement>('[data-bewaar]')!.onclick = () => {
    const gelezen = leesWeekwoorden(s.querySelector<HTMLTextAreaElement>('textarea')!.value);
    const categorieen = [...s.querySelectorAll<HTMLInputElement>('[data-categorie]:checked')].map((v) => v.value as Categorie);
    const alleen = s.querySelector<HTMLInputElement>('[data-alleen]')!.checked;
    if (gelezen.fouten.length || !categorieen.length || !oefenWoorden(gelezen.woorden, alleen, categorieen).length) {
      feedback.textContent = gelezen.fouten.join(' ') || 'Kies minstens één categorie met beschikbare woorden.';
      return;
    }
    stand.weekwoorden = gelezen.woorden; stand.categorieen = categorieen; stand.alleenWeekwoorden = alleen;
    stand.speeltijdMinuten = Number(s.querySelector<HTMLSelectElement>('#speelduur')!.value);
    stand.beeldkwaliteit = s.querySelector<HTMLSelectElement>('#kwaliteit')!.value as Spelstand['beeldkwaliteit'];
    stand.minderEffecten = s.querySelector<HTMLInputElement>('[data-rustig]')!.checked;
    const bewaard = bewaarStand(stand);
    opWijzig();
    feedback.textContent = bewaard ? 'Bewaard! De nieuwe woorden staan klaar in het dictee en in een nieuwe deurenronde.' : 'Instellingen werken nu, maar konden niet worden bewaard. Download een back-up.';
  };
  s.querySelector<HTMLButtonElement>('[data-export]')!.onclick = () => {
    const url = URL.createObjectURL(new Blob([exporteerStand(stand)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `nintes-wereld-${stand.dag.datum || 'voortgang'}.json`; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  let herstel: Spelstand | null = null;
  let importVersie = 0;
  const importtekst = s.querySelector<HTMLElement>('[data-importtekst]')!, importknop = s.querySelector<HTMLButtonElement>('[data-import]')!;
  const bestand = s.querySelector<HTMLInputElement>('#backup-bestand')!;
  bestand.onchange = async () => {
    const versie = ++importVersie;
    herstel = null; importknop.hidden = true;
    const file = bestand.files?.[0]; if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('Deze back-up is te groot.');
      const tekst = await file.text();
      if (versie !== importVersie || !s.isConnected) return;
      const gelezen = leesBackUp(tekst);
      herstel = gelezen;
      importtekst.textContent = `Gevonden: ${gelezen.speler}, ${gelezen.hoefijzers} hoefijzers, ${Object.keys(gelezen.dictee).length} geoefende dicteewoorden. Herstellen vervangt de huidige voortgang. Download die eerst als je haar wilt behouden.`;
      importknop.hidden = false;
    } catch (e) { if (versie === importVersie && s.isConnected) importtekst.textContent = e instanceof Error ? e.message : 'Het bestand kon niet worden gelezen.'; }
  };
  importknop.onclick = () => {
    if (!herstel) return;
    if (!bewaarStand(herstel)) { importtekst.textContent = 'Herstellen kon niet worden bewaard. Je huidige spel blijft open.'; return; }
    location.reload();
  };
  s.querySelector<HTMLButtonElement>('[data-sluit]')!.onclick = opSluit;
  if (opVerder) s.querySelector<HTMLButtonElement>('[data-verder]')!.onclick = opVerder;
}

export function dagAfsluiting(stand: Spelstand, opOuders: () => void) {
  const s = toon(`<div class="kaart leren"><h2>Goed gedaan vandaag!</h2><p>Je pony en puppy rusten uit. Morgen staat er weer een nieuw dierenavontuur klaar.</p>
    <p class="dagdoel">${dierenAantal(stand)} van 6 dierenwoorden</p><p>${stand.dag.woordenGoed} woorden meteen goed · ${stand.dag.verbeterd} woorden verbeterd.<br>
    ${stand.dag.sommenGoed} sommen meteen goed · ${stand.dag.hoefijzers} hoefijzers verdiend.<br>${Math.floor(stand.dag.speelSeconden / 60)} minuten gespeeld.</p>
    <p>Je mag het spel nu sluiten. Maak bij Voor ouders regelmatig een back-up.</p><button class="knop wit" data-ouders>Voor ouders</button></div>`);
  s.querySelector<HTMLButtonElement>('[data-ouders]')!.onclick = opOuders;
}

export function oefenDeur(opKlaar: () => void) {
  const s = toon('<div class="kaart leren"><h2>Je eerste oefendeur</h2><p>De hond speelt buiten. Kies de deur met het goed gespelde woord.</p><div class="oefendeuren"><button class="knop" data-goed>hond</button><button class="knop" data-fout>hont</button></div><p class="feedback" aria-live="polite"></p></div>');
  s.querySelector<HTMLButtonElement>('[data-fout]')!.onclick = () => {s.querySelector('.feedback')!.textContent = 'Maak het woord langer: honden. Je hoort de d. Probeer de andere deur!'; spreek('Maak het woord langer: honden. Je hoort de d.');};
  s.querySelector<HTMLButtonElement>('[data-goed]')!.onclick = opKlaar;
}
