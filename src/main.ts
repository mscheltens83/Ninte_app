import './stijl.css';
import { HOND_KLEUREN, PONY_KLEUREN } from './figuren/dieren';
import { initVoorlezen, spreek, stelStemIn } from './leren/voorlezen';
import { bewaarStand, laadStand } from './opslag/opslag';
import { Spel } from './spel/Spel';
import { dierKiezer, sluitScherm, titelScherm, uitlegScherm } from './ui/schermen';
import { seizoenGroet } from './wereld/seizoen';

const stand = laadStand();
stelStemIn(stand.stemNaam, stand.stemTempo);
initVoorlezen();

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const spel = new Spel(canvas, stand);
spel.start();

const computer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function welkom() {
  const tekst = spel.seizoen
    ? seizoenGroet(spel.seizoen, stand.speler)
    : `Hoi ${stand.speler}! Volg het bordje naar de Deuren-obby.`;
  spel.hud.toonBanner(tekst, () => spreek(tekst), { duur: 7000 });
  spreek(tekst);
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
  if (!stand.uitlegGezien) toonUitleg(welkom);
  else welkom();
}

function kiesDieren() {
  dierKiezer(
    'pony',
    PONY_KLEUREN,
    (naam, kleur) => {
      stand.pony = { naam, kleur };
      spel.geluid.goed();
      spreek(`${naam}. Wat een mooie naam!`);
      dierKiezer(
        'puppy',
        HOND_KLEUREN,
        (naam, kleur) => {
          stand.puppy = { naam, kleur };
          bewaarStand(stand);
          spel.maakDieren();
          spel.geluid.blaf();
          spreek(`${naam}. Wat een leuke naam!`);
          speelVerder();
        },
        () => spel.geluid.klik(),
      );
    },
    () => spel.geluid.klik(),
  );
}

titelScherm(() => {
  // iOS staat geluid en voorlezen pas toe na een tik.
  spel.startGeluid();
  spel.geluid.klik();
  if (!stand.pony || !stand.puppy) {
    spreek(`Hoi ${stand.speler}! Welkom in Nintes Wereld.`);
    kiesDieren();
  } else {
    speelVerder();
  }
});

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
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // Geen service worker: het spel werkt dan alleen online.
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
