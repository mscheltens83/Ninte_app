# Uitbreiding van de leerwereld

## Uitgangspunten en aannames

- Bestaande Three.js/Vite/TypeScript-game; geen nieuwe afhankelijkheden. Touch, toetsenbord en muis blijven ondersteund.
- Bestaande spellen, dieren, instellingen en gecontroleerde lokale opslag blijven bruikbaar. Offline herstel blijft een latere opdracht.
- Nieuwe gebieden liggen ten noorden van het bestaande eiland, met korte paden en een reiskaart. Alleen het geheime eiland vraagt een gebouwde brug; andere onderwerpen blokkeren elkaar niet.
- Opdrachten zijn startinhoud voor groep 6, geen officiële leerlijn. Standaardniveau: 1, aanpasbaar per onderwerp. Een actieve opdracht houdt haar niveau tot voltooiing.
- Geen verplichte missietijd, straf of verlies van spullen. De bestaande optionele dagelijkse speeltijd kan door ouders op Geen tijdslimiet worden gezet.
- Werkmap: `C:\Users\Gebruiker\Documents\Nintes Wereld`, branch `claude/eloquent-ramanujan-keneh9`.
- Online publiceren is op 29 september 2026 gevraagd. Publicatie gebruikt de bestaande branch en `pages.yml`, die met GitHub Actions de Vite-build uit `dist` naar Pages stuurt. Er is geen nieuwe branch of pull request nodig.

## Taken en acceptatiecriteria

- [x] A — instructies, architectuur en start onderzoeken. Geen AGENTS.md aanwezig in project/ouders. Bestaande startflow werkt; 358 tests slagen.
- [x] B — gedeelde interacties, status/stappen, materialen, unieke beloningen, opdrachtenboek, drie hints en gegevensgestuurde inhoud. Proefmissie van ophalen tot zichtbaar plaatsen werkt.
- [x] C — drie materiaalplekken, verwijderbare balken en schaalvaste brug (24/4, 18/3, 30/5). Botsers openen de echte oversteek pas na voltooiing; herstel blijft begaanbaar.
- [x] D — startset, beperkte bouwgrond, kiezen/plaatsen/verplaatsen/terugleggen en persistent inrichten. Herladen toont dezelfde inrichting.
- [x] E — drie winkelopdrachten met mand, aantallen, budget en wisselgeld; alle bedragen als centen, ook niveau 3.
- [x] F — logisch sleutelverhaal met drie bewoners en herleesbare aanwijzingen, volgorde en woordbetekenis. Verkeerde keuzes blijven herstelbaar. Niveau verandert leessteun en afleiders.
- [x] G — drie pizzaopdrachten met correcte cirkelsectoren, verwijderbare stukken en gelijkwaardigheid; achtsten op hoger niveau.
- [x] H — drie robotroutes met blokken toevoegen/verwijderen/verplaatsen, draaien/interactie/herhaling, actieve stap, stop/reset en begrensde uitvoering.
- [x] I — drie tuinopdrachten met water/licht, vergelijking en meetgegevens; dagen verlopen met een knop, geen echte wachttijd. Opdrachttekst, hints en beoordeling volgen hetzelfde niveau.
- [x] J — acht gebieden, wegwijzers, kaart, herkenningspunten, reacties en blijvende projecten. Veilig heen en terug zonder lange lege routes.
- [x] K — versiegestuurde opslag, oude standen behouden, gecontroleerde invoer, onderwerpinstellingen, geluids/toegankelijkheidsopties, missieoverzicht en reset met bevestiging. Onderwerpen kunnen worden gepauzeerd zonder hun werk kwijt te raken.
- [x] L — gerichte logica- en interface-tests, productiebuild, visuele/interactieve controle op desktop/tablet/smal scherm, documentatie en dochterchecklist. De hardware- en kinderspeeltest hieronder staan nog open.

## Controles / voortgang

Implementatie A–L gereed in de werkmap. Speel lokaal op http://127.0.0.1:5173/. De ontwikkeling bleef op de bestaande Three.js/Vite/TypeScript-basis, zonder extra afhankelijkheden.

| Fase | Gebouwd en gecontroleerd | Nog open |
| --- | --- | --- |
| A | Projectinstructies gezocht, bestaande architectuur onderzocht, start/dieren/kleding/oefendeur in Chrome; 358 bestaande tests geslaagd. | Geen technische startblokkade. |
| B–D | Proefmissie, echte materiaalplekken, verwijderbare brugbalken, eilandtoegang en inrichting; echte botsingsfysica getest. Brug en plant op tegel 1,1 blijven na Chrome-herladen bestaan. | Begrip van de bouwmodus door Ninte. |
| E–I | Alle drie winkel-, bos-, pizza-, robot- en tuinopdrachten werken via controllers en knoppen; geld, breuken, logische aanwijzingen, veilige fouten en metingen getest. Representatieve opdrachten ook in Chrome uitgespeeld. | Speelduur en gewenste moeilijkheid bij Ninte. |
| J–K | Compacte wereld, kaart, terugreizen, onderwerpkeuze, niveaus, geluid/kwaliteit, missieoverzicht en beschermde reset. Opslag/migratie/back-up en behoud van werk bij uitzetten getest. | Werkelijke touch-/Safari-hardware. |
| L | 415 tests in 16 bestanden geslaagd; TypeScript en productiebuild geslaagd. Geen fouten bij `git diff --check`. Handleiding en speeltestchecklist toegevoegd. | Onderstaande praktische beperkingen. |

### Uitgevoerde controles

- `npm test -- --reporter=dot`: **415 geslaagde tests**. Nieuwe tests spelen alle **18 missies** uit via de gekoppelde interfacecontrollers; dit is geen claim dat alle 18 handmatig in Chrome zijn uitgespeeld.
- `npm run build`: geslaagd. Productiescript ongeveer 807 kB (223 kB gzip), CSS ongeveer 21 kB. Geen nieuwe afhankelijkheden of wijzigingen aan de dependencybestanden.
- Logica: missiestappen, ontgrendeling, beloning één keer, beide fout/herstelroutes, alle bruggetallen, gehele-centberekeningen, geldinvoer, breukgelijkwaardigheid, robotlimieten en oplossingen, groeimodel, alle meetniveaus, inrichting binnen grenzen.
- Opslag: oude complete standen zonder avonturenveld, roundtrip met missiewerk/inrichting, beschadigde gegevens, reservekopie, bescherming tegen overschrijven door een tweede tab. Een ongeldige meubelpositie verdwijnt uit de vloer, maar het voorwerp blijft in de voorraad.
- Echte Three.js-geometrie en bestaande Fysica: geen brugoversteek vóór voltooiing; begaanbaar dek erna; droge kaartbestemmingen met nabijgelegen interactie; herstelde meubels op dezelfde coördinaten.
- Chrome: welkomvlag, ophalen op drie plekken, te lange brug corrigeren, eiland/boomhut, plant plaatsen/verplaatsen en terugvinden na herladen, winkelmand, pizza-oppervlak, verkeerde en juiste robotroute, drie bosbewoners en fout/herstel van het mysterie, tuinmeting en ouderpaneel.
- Responsive controle in Chrome op desktop (1366 pixels breed), tabletformaat 1024×768 en smal scherm 390×844. Geen horizontale pagina-overloop; dialogen sluiten, scrollen en terugreizen bereikbaar. Tijdelijke viewportinstelling teruggezet.
- De nieuwe missiepanelen blijven stil bij hertekenen en houden toetsenbordfocus/scrollpositie vast. Contrast van witte tekst op groene actieknoppen verbeterd.
- Tijdens de stabiele browsercontroles geen nieuwe consolefouten. Tijdens ontwikkeling gevonden fouten zijn hersteld vóór de eindcontrole.

### Resterende beperkingen

- Echte iPad/Safari, daadwerkelijke touchbewegingen, geluid via hardware en snelheid op oudere apparaten zijn niet gecontroleerd. Chrome met een kleiner venster vervangt die controle niet. De bestaande optie Zuinig blijft beschikbaar.
- Missies zijn korte avonturen met ruimte voor lopen, proberen en inrichten. De beoogde 5–10 minuten zijn nog niet met een kind gemeten; sommige opdrachten kunnen bij snelle antwoorden korter duren.
- Nintes feedback over plezier, woorden, moeilijkheid en bediening ontbreekt nog. Instelbare standaardwaarden laten de overige activiteiten doorgaan.
- Het tuinmodel is bewust vereenvoudigd. Voltooide opdrachten geven geen beoordeling van schoolniveau of beheersing.
- Voortgang is lokaal per apparaat, browser en siteadres. Maak een JSON-back-up voor overstappen. Offline herstel blijft uitgesteld.
- Publicatieadres: https://mscheltens83.github.io/Ninte_app/. Elke push naar de bestaande branch start de publicatieworkflow; een geslaagde run publiceert de gebouwde versie. De runresultaten staan bij de GitHub Actions van de repository.

## Exacte eerstvolgende acties

De gevraagde implementatie is klaar. Er is geen onafgemaakte implementatiefase die opnieuw gestart moet worden.

1. Voor verder spelen: start volgens `HANDLEIDING.md` en open http://127.0.0.1:5173/.
2. Doe de korte checklist uit `HANDLEIDING.md` met Ninte; noteer concreet onderwerp/niveau en gewenste aanpassing.
3. Controleer daarna op het gebruikte echte tablet: lopen, camera, gesprekken sluiten, één robotprogramma, inrichting herladen en geluid/Zuinig.
4. Nieuwe wijzigingen: controleer tests en build en publiceer daarna via de bestaande branch en GitHub Actions. Offline herstel blijft een latere opdracht.
