import './stijl.css';
import './avontuur/stijl.css';
import './ritme/stijl.css';
import './bouwen/stijl.css';
import './rijden/stijl.css';
import { HOND_KLEUREN, PONY_KLEUREN } from './figuren/dieren';
import { initVoorlezen, spreek, stelStemIn } from './leren/voorlezen';
import { bewaarStand, laadStand, opOpslagMelding } from './opslag/opslag';
import { Spel } from './spel/Spel';
import { dierKiezer, sluitScherm, titelScherm, uitlegScherm } from './ui/schermen';
import { seizoenGroet } from './wereld/seizoen';

const stand = laadStand();
stelStemIn(stand.stemNaam, stand.stemTempo);
initVoorlezen();

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
function maakSpel(): Spel {
  try { return new Spel(canvas, stand); }
  catch (error) {
    const schermen = document.getElementById('schermen')!;
    schermen.textContent = 'Het spel kon niet starten. Vernieuw de pagina en probeer opnieuw. Controleer of je browser 3D-versnelling ondersteunt.';
    schermen.className = 'startfout';
    throw error;
  }
}
const spel = maakSpel();
spel.start();

const computer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function welkom() {
  const tekst = spel.seizoen
    ? seizoenGroet(spel.seizoen, stand.speler)
    : `Hoi ${stand.speler}! Dit is het dorpsplein. Praat met Mila of kies een avontuur op de wereldkaart.`;
  const sleutel = spel.seizoen ? undefined : ['hoi', 'volg-bordjes'];
  spel.hud.toonBanner(tekst, () => spreek(tekst, sleutel), { duur: 7000 });
  spreek(tekst, sleutel);
}

function toonUitleg(daarna?: () => void) {
  spel.pauzeer();
  uitlegScherm(() => {
    spel.geluid.klik();
    stand.uitlegGezien = true;
    bewaarStand(stand);
    spel.hervat();
    daarna?.();
  }, computer);
}

function speelVerder() {
  sluitScherm();
  spel.begin();
  if (stand.dag.klaar) return;
  if (!stand.uitlegGezien) spel.toonDieren();
  else welkom();
}

function kiesDieren() {
  dierKiezer(
    'pony',
    PONY_KLEUREN,
    (naam, kleur) => {
      stand.pony = { naam, kleur };
      spel.geluid.goed();
      spreek(`${naam}. Wat een mooie naam!`, 'mooie-naam');
      dierKiezer(
        'puppy',
        HOND_KLEUREN,
        (naam, kleur) => {
          stand.puppy = { naam, kleur };
          bewaarStand(stand);
          spel.maakDieren();
          spel.geluid.blaf();
          spreek(`${naam}. Wat een leuke naam! En nu maak je je eigen poppetje.`, ['mooie-naam', 'maak-poppetje']);
          // Vooraf: eerst het poppetje aankleden, dan de uitleg.
          sluitScherm();
          spel.begin();
          spel.openKast('Maak je poppetje!', () => {
            if (!stand.uitlegGezien) spel.toonDieren();
            else welkom();
          });
        },
        () => spel.geluid.klik(),
      );
    },
    () => spel.geluid.klik(),
  );
}

function toonTitel() { titelScherm(() => {
  // iOS staat geluid en voorlezen pas toe na een tik.
  spel.startGeluid();
  spel.geluid.klik();
  if (!stand.pony || !stand.puppy) {
    spreek(`Hoi ${stand.speler}! Welkom in Nintes Wereld.`, ['hoi', 'welkom']);
    kiesDieren();
  } else {
    speelVerder();
  }
}, () => spel.toonOuders(() => { spel.modus = 'titel'; toonTitel(); })); }
toonTitel();

const opslagWaarschuwing = document.createElement('div');
opslagWaarschuwing.id = 'opslag-waarschuwing';
opslagWaarschuwing.setAttribute('role', 'status');
document.getElementById('spel')!.appendChild(opslagWaarschuwing);
opOpslagMelding((m) => {
  opslagWaarschuwing.replaceChildren();
  opslagWaarschuwing.hidden = m.soort === 'ok';
  if (m.soort === 'ok') return;
  const tekst = document.createElement('span'); tekst.textContent = m.tekst;
  const knop = document.createElement('button'); knop.textContent = 'Voor ouders';
  knop.onclick = () => { const titel = spel.modus === 'titel'; spel.toonOuders(titel ? () => { spel.modus = 'titel'; toonTitel(); } : undefined); };
  opslagWaarschuwing.append(tekst, knop);
});

spel.hud.kastKnop.addEventListener('click', () => spel.openKast());
spel.hud.geheimenKnop.addEventListener('click', () => spel.toonGeheimen());
spel.hud.instellingenKnop.addEventListener('click', () => spel.toonInstellingen());

spel.hud.uitlegKnop.addEventListener('click', () => {
  if (spel.modus !== 'spelen') return;
  spel.geluid.klik();
  toonUitleg();
});

// Werkt ook offline, en als app op het beginscherm van de iPad.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('./sw.js').then((registratie) => {
        // Terug in de app? Kijk of er een nieuwe versie is.
        document.addEventListener('visibilitychange', () => { if (!document.hidden) void registratie.update().catch(() => {}); });
      }).catch(() => {
        // Geen service worker: het spel werkt dan alleen online.
      });
      // Neemt een nieuwe versie het over, dan één keer herladen. Alleen als er al een oude versie draaide.
      const hadVersie = !!navigator.serviceWorker.controller;
      let herladen = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadVersie || herladen) return;
        herladen = true;
        bewaarStand(stand);
        location.reload();
      });
    } catch {
      // Sommige omgevingen (zoals een ingesloten pagina) staan dit niet toe.
    }
  });
}

// Voor geautomatiseerde tests: ?test in de adresbalk.
if (new URLSearchParams(location.search).has('test')) {
  (window as unknown as { __nintes: Spel }).__nintes = spel;
}
