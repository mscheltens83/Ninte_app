# Nintes Wereld

Een Roblox-achtig leerspel voor Ninte (9 jaar, groep 6). Ze zorgt voor haar eigen pony en puppy, doet obby's en verdient hoefijzers door goed te spellen. De spelling sluit aan op **Staal**.

Het volledige plan staat in [PLAN.md](PLAN.md).

## Wat er nu in zit (fase 1)

- Een blokjeseiland in Roblox-stijl met een stal, een wei, een hondenhok en veel bomen.
- Een eigen **pony en puppy**. Ninte kiest de kleur en typt zelf de naam. Begint de naam met een kleine letter, dan krijgt ze de tip dat namen met een hoofdletter beginnen. De dieren lopen naast haar, en op de stal staat de naam van haar pony.
- De **Deuren-obby**: 6 poorten met steeds twee deuren. De ene deur heeft de goede spelling, de andere de foute (bijvoorbeeld `paard` of `paart`).
  - Kiest ze de goede deur, dan gaat die open en krijgt ze confetti en hoefijzers.
  - Kiest ze de foute, dan gaat er een valluik open en ploft ze zachtjes in het hooi. Daarna ziet ze het trucje van Staal ("Langermaakwoord! Maak het woord langer: paarden …") en mag ze het opnieuw proberen.
- Woorden uit drie Staal-categorieën: **langermaakwoord** (d/t), **weetwoord ei/ij** en **weetwoord au/ou**. Het zijn samen 53 woorden, allemaal over paarden, honden en de boerderij.
- **Herhaalbakjes:** woorden die ze fout spelt, komen vaker terug.
- **Voorlezen** met de Nederlandse stem van de iPad, net als bij een dictee: woord, zin, woord.
- Besturing zoals Roblox op de iPad: een joystick links, een springknop rechts en vegen om rond te kijken.
- Geen game-over, geen tijdsdruk, geen chat en geen aankopen. De voortgang blijft op de iPad zelf bewaard.
- **Echte muziek**: een vrolijk nummer op het eiland, een snel nummer in de obby en een grappig nummer op een geheime plek.
- **Instellingen** (⚙️): geluidjes en muziek aan of uit, zelf de mooiste voorleesstem kiezen en het tempo instellen.
- **Geheimen** (⭐): 9 easter eggs om te ontdekken. Het geheimenboek geeft hints. Spoiler: zie hieronder.

## Geheimen (spoiler, alleen voor ouders!)

| Geheim | Hoe vind je het? | Beloning |
|---|---|---|
| 5 gouden hoefijzers | Op de hooitoren in de wei, op het staldak, achter de kratten bij het dorp, op het palmeilandje en op het wolkeneiland | 5 hoefijzers per stuk |
| Magische pony | Alle 5 gouden hoefijzers vinden | De pony wordt een eenhoorn met regenboogmanen |
| Boing! | Op de trampoline achter de stal springen (zo kom je ook op het staldak) | Superhoge sprong |
| Palmeilandje | Via de stapstenen in de noordwesthoek naar het eilandje springen | Een gouden hoefijzer |
| Wolkeneiland | Bij de finish van de Deuren-obby het wolkenpad omhoog volgen | Regenboog, geheim muziekje, gouden hoefijzer |
| Schatkist | Het wachtwoord staat op de achterkant van het welkomstbord; de kist staat in de stal. Het wachtwoord moet ze goed spellen! | 20 hoefijzers en een regenboogspoor achter Ninte |
| Dansfeest | 12 seconden stilstaan | Ninte en de dieren dansen |
| Zoomies | 5 keer snel op de puppy tikken | De puppy rent rondjes |
| Steigeren | 5 keer snel op de pony tikken | De pony gaat op zijn achterbenen staan |

Daarnaast zijn er seizoensverrassingen: sneeuw en kerstmutsen in december, oranje vlaggetjes en een kroontje op Koningsdag, en pompoenen rond Halloween.

## Op de iPad spelen

### 1. Zet het spel eenmalig online (gratis)

De repository is privé. GitHub Pages werkt daarom alleen met een betaald account. Netlify is gratis en werkt wel:

1. Maak een account op [netlify.com](https://www.netlify.com) (inloggen met GitHub kan).
2. Kies **Add new site → Import an existing project → GitHub** en geef Netlify toegang tot `Ninte_app`.
3. Kies de branch met het spel. De instellingen staan al in `netlify.toml`: bouwcommando `npm run build`, map `dist`.
4. Klik op **Deploy**. Je krijgt een adres, bijvoorbeeld `https://nintes-wereld.netlify.app`.

Elke keer dat er iets nieuws op die branch komt, zet Netlify de nieuwe versie vanzelf online.

### 2. Zet het als app op de iPad

1. Open het adres in **Safari** op de iPad.
2. Tik op de deelknop (vierkantje met pijl) en kies **Zet op beginscherm**.
3. Nu opent Nintes Wereld schermvullend, als een echte app. Het werkt ook zonder internet.

Speel altijd via het icoon op het beginscherm. Safari kan bewaarde gegevens van gewone websites wissen als ze een tijd niet gebruikt zijn. Voor apps op het beginscherm gebeurt dat niet.

### 3. Handige instellingen op de iPad

- **Autocorrectie uit.** Ga naar Instellingen → Algemeen → Toetsenbord en zet *Autocorrectie* en *Voorspellend* uit. Anders verbetert de iPad haar spelling en leert ze minder. Het spel zet dit zelf ook al uit in zijn tekstvakken.
- **Mooiere voorleesstem.** Ga naar Instellingen → Toegankelijkheid → Gesproken materiaal → Stemmen → Nederlands en download een stem met *(Verbeterd)* of *(Premium)* achter de naam (bijvoorbeeld *Xander* of *Claire*). Het spel kiest die dan vanzelf. In het spel kun je onder ⚙️ ook zelf een stem kiezen en het tempo instellen.
- **Liggend spelen** werkt het fijnst, net als bij Roblox.

## Voor ontwikkelaars

Je hebt Node.js 20 of nieuwer nodig.

```bash
npm install
npm run dev        # start op http://localhost:5173 (ook bereikbaar vanaf de iPad op hetzelfde wifi)
npm test           # unit tests (spelling, herhaalbakjes, botsingen, opslag)
npm run build      # typecheck + productieversie in dist/
```

Voor geautomatiseerde tests kun je `?test` achter het adres zetten. Het spel is dan bereikbaar als `window.__nintes`.

### Mappen

```
src/
  main.ts            opstarten, titelscherm, dieren kiezen
  spel/              het spel zelf, besturing (touch + toetsenbord), botsingen
  wereld/            eiland, Deuren-obby, bouwblokjes, confetti
  figuren/           avatar, pony en puppy (uit blokjes)
  leren/             woordkaarten, spelling-trucjes, herhaalbakjes, voorlezen
  ui/                balk bovenin en schermen (tip, finish, uitleg)
  opslag/            voortgang bewaren op het apparaat
public/              app-icoon, manifest, service worker (offline)
tests/               unit tests
```

### Woorden toevoegen

De woorden staan in `src/leren/woorden.ts`. Een woordkaart ziet er zo uit:

```ts
{ woord: 'paard', categorie: 'langermaakwoord', langer: 'paarden', zin: 'Het paard staat in de stal.' }
```

De foute variant voor de deur (`paart`) en het trucje maakt het spel zelf. `npm test` controleert of elk woord letterlijk in zijn zin staat en of er een foute variant van te maken is.

## Muziek

De muziek is van Kevin MacLeod ([incompetech.com](https://incompetech.com)) en valt onder de licentie [Creative Commons Naamsvermelding 4.0](https://creativecommons.org/licenses/by/4.0/):

- `public/muziek/eiland.mp3`: "Carefree"
- `public/muziek/obby.mp3`: "Monkeys Spinning Monkeys"
- `public/muziek/geheim.mp3`: "Fluffing a Duck"

De bestanden zijn omgezet naar mono MP3 (64 kbps), zodat ze snel laden en weinig geheugen gebruiken op de iPad.
