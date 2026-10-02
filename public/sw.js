// Service worker: bewaart het spel op de iPad zodat het ook zonder internet werkt.
// Pagina's: eerst online proberen (zo krijg je updates), anders de bewaarde versie.
// Overige bestanden: bewaarde versie gebruiken (ze hebben unieke namen per versie).

// Verhoog dit nummer als de manier van bewaren verandert.
const CACHE = 'nintes-wereld-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const verzoek = event.request;
  if (verzoek.method !== 'GET' || new URL(verzoek.url).origin !== location.origin) return;

  if (verzoek.mode === 'navigate') {
    event.respondWith(
      // Altijd vers ophalen (niet uit de browsergeheugen), zodat een update meteen zichtbaar is.
      fetch(verzoek.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then((antwoord) => {
          const kopie = antwoord.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', kopie));
          return antwoord;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(verzoek).then(
      (bewaard) =>
        bewaard ||
        fetch(verzoek).then((antwoord) => {
          if (antwoord.ok) {
            const kopie = antwoord.clone();
            caches.open(CACHE).then((c) => c.put(verzoek, kopie));
          }
          return antwoord;
        }),
    ),
  );
});
