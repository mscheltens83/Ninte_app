# Nintes Wereld — de avonturenuitbreiding

## Starten op Windows

De projectmap is `C:\Users\Gebruiker\Documents\Nintes Wereld`. Open die map in Codex. Gebruik PowerShell:

```powershell
Set-Location -LiteralPath 'C:\Users\Gebruiker\Documents\Nintes Wereld'
& 'C:\Program Files\nodejs\npm.cmd' ci
& 'C:\Program Files\nodejs\npm.cmd' run dev -- --host 127.0.0.1 --port 5173
```

Open http://127.0.0.1:5173/ in de browser. Voor een tablet op hetzelfde wifi-netwerk start je `npm run dev -- --host 0.0.0.0` en gebruik je het netwerkadres dat Vite toont. Voor de productieversie: `npm run build`, daarna `npm run preview`.

Online adres: https://mscheltens83.github.io/Ninte_app/. De bestaande workflow `.github/workflows/pages.yml` bouwt met GitHub Actions na een push naar `claude/eloquent-ramanujan-keneh9`. Pages gebruikt GitHub Actions als bron en publiceert `dist`; de bron-`index.html` is niet de te publiceren website.

## Bediening en spelverloop

- Computer: WASD/pijltjes lopen, spatie springen, muis slepen voor de camera; E of de zichtbare interactieknop om dichtbij een bewoner of voorwerp te onderzoeken.
- Touch: joystick links, springknop rechts, vegen voor de camera. Tik op de duidelijke interactieknop bij een bewoner of object. Alle bouw- en leeracties gebruiken grote knoppen; slepen is niet verplicht.
- 🗺️ Wereldkaart: loop via de paden of reis meteen. Het dorp, winkel, bos, café, lab en tuin zijn meteen bereikbaar. De voltooide brug opent de boomhut. Dieren en oude obby's blijven via de kaart bereikbaar.
- 📖 Opdrachtenboek: bekijk missies, materialen, beloningen en eerdere uitleg. Het opdrachtpaneel in de wereld opent meteen je huidige taak. Je kunt elk menu sluiten en later doorgaan, ook na een fout.
- Hints: aanwijzing → visuele hulp → voorbeeld met uitleg. Er zijn geen strafpunten, geen missiedeadline en geen verlies van verdiende spullen. De optionele dagelijkse speeltijd staat bij de bestaande ouderinstellingen; kies Geen tijdslimiet als gewenst.
- Boomhut: kies een verdiend voorwerp en tik op een vrije tegel. Selecteer een geplaatst voorwerp om te verplaatsen, draaien of terugleggen. Terugleggen houdt het voorwerp in je voorraad. Twee kolommen blijven open als looproute naar de deur.
- Robot: voeg blokken toe, verplaats met ↑/↓ en verwijder met ✕. Kies bij Herhaal hoeveel keer het nieuwe blok wordt uitgevoerd. Stop zet Ro terug; Leeg programma begint de route opnieuw. Sluiten stopt uitvoering ook.
- Tuin: pas water/licht aan en druk op Laat een dag verlopen. Begin onderzoek opnieuw geeft schone metingen, zonder verdiende beloningen kwijt te raken.

## Leerinhoud aanpassen

`src/avontuur/inhoud.ts` bevat de gebieden, originele dialogen, opdrachten, drie hintstappen, decoratiebeloningen en de getallen/antwoordmodellen:

- `BRUG_VARIANTEN`: 24/4, 18/3, 30/5. Een wereldeenheid is één meter; de balken en rivieroversteek passen hun werkelijke lengte aan.
- `WINKEL_VARIANTEN`, `WINKEL_MANDEN`: prijzen en budgetten zijn **gehele centen**. Niveau 3 bevat eenvoudige centbedragen. `centen()` leest een ingevoerd eurobedrag zonder floatberekeningen.
- `BOS_BEWONERS`, `BOS_OPLOSSINGEN`, `LEES_STEUN`, `BOS_EXTRA_KEUZES`, de vervolgteksten: alle conclusies volgen uit de tekst. Externe dierenkennis is niet nodig.
- `PIZZA_INSTELLINGEN`: gelijke helften, kwarten en optionele achtsten. Hoeveelheden gebruiken achtste eenheden; de SVG-hoeken zijn precies 2π/noemer.
- `ROBOT_ROUTES`: start, richting (0 noord, 1 oost, 2 zuid, 3 west), doel, kisten en een gecontroleerde voorbeeldroute.
- `PLANT_MODEL`, `TUIN_DAGEN`: vereenvoudigd groeimodel, zonder echte wachttijd. Dit is geen algemene verzorgingsregel voor echte planten.

`missieVoorNiveau()` koppelt de meetopdracht en pizzaverdelingshints aan dezelfde getallenbank als de beoordeling. Pas bij andere wijzigingen aan getallen ook de verklarende teksten en hints aan en voer de tests uit. Dit is startinhoud voor groep 6, geen volledige officiële leerlijn. Bosniveau 1 geeft directe leessteun, niveau 2 laat meer zelf onderzoeken, en niveau 3 voegt extra afleiders toe. De originele aanwijzingen en logische oplossing blijven gelijk. Bij de robot bepaalt niveau ook of herhaling eerder beschikbaar is. De drie robotmissies verhogen zelf de routecomplexiteit.

## Nieuwe missie toevoegen

1. Voeg een unieke `id` toe aan `MISSIES` in `inhoud.ts`: gebied, onderwerp, bestaande `soort`, naam, verhaal, stappen, drie hints en decoratiebeloning.
2. Bij een bestaande opdrachtsoort (bijvoorbeeld een pizza- of winkelopdracht) hergebruikt de missie de bestaande bediening en getallenbank. Bij een nieuw interactietype voeg je één type en de eigen beoordeling toe aan `logica.ts`, en het paneel/binding aan `schermen.ts`.
3. Nieuwe missies worden automatisch beschikbaar in het gebied en boek. Oudere opslag krijgt automatisch de ontbrekende missiestand. Gebruik geen nieuwe opslagkey per missie.
4. Voeg een test toe die een verkeerde poging, de oplossing, herstel en een tweede beloningspoging controleert. Laat wereldwijzigingen in `wereld.ts` reageren op de missiestatus.

`Avontuur` koppelt de bestaande `Spel`-lus en dialogen aan de zuivere logica. `AvontuurWereld` maakt de echte geometrie en botsers. Onveranderlijke blokken worden met het bestaande samenvoegen per materiaal geoptimaliseerd; veranderende brugdelen, deur, planten, robot en inrichting blijven apart.

## Voortgang en ouders

De bestaande key `nintes-wereld` blijft gebruikt. Het nieuwe veld `avontuur` heeft versie 1 binnen de bestaande spelstand. Opgeslagen worden status/stap/niveau per missie, werk (mand, balken, aanwijzingen, pizza, programma, meetboek), pogingen/hints, ontgrendelingen, unieke beloningen, inrichting, onderwerpkeuze en moeilijkheid. Een actieve missie bewaart het gekozen niveau; een wijziging geldt voor nog niet begonnen missies.

Oudere standen en volledige back-ups zonder avonturenveld blijven bruikbaar en behouden dieren, kleding en schoolvoortgang. Ongeldige waarden worden gecontroleerd. Bij beschadiging probeert de bestaande opslag eerst de vorige goede reservekopie. Een fout bij bewaren wordt zichtbaar gemeld; in het ouderpaneel kan een JSON-back-up worden gedownload/hersteld. Een ander tabblad mag voortgang niet stil overschrijven.

**Opslag is lokaal en gebonden aan dit apparaat én deze browser én het siteadres.** De localhost-versie en GitHub Pages hebben verschillende opslag. Gebruik een back-up bij overstappen. Wissen van browsergegevens kan voortgang verwijderen. Een back-up bevat nu ook alle avonturen en inrichting; eigen muziek en stemopnames zijn apart en worden niet meegenomen.

Voor ouders → Avonturen: kies onderwerpen/niveau, geluid, muziek, rustige effecten en beeldkwaliteit. Bekijk gespeelde/voltooide missies, controles en gebruikte hints. Voltooiing geeft geen oordeel over schoolniveau of beheersing. Opnieuw beginnen vereist bewust `OPNIEUW` typen; het wist alleen deze avonturen en inrichting. Maak eerst een back-up. De bestaande school- en dierinstellingen blijven in het gewone ouderpaneel.

## Controleren

```powershell
& 'C:\Program Files\nodejs\npm.cmd' test
& 'C:\Program Files\nodejs\npm.cmd' run build
```

Tests controleren missies, unieke beloningen, opslaan/migreren, inrichting, geld, breuken, brugmaten en echte oversteekfysica, robotroutes/stop/reset en tuinonderzoek. Een interfacetestsuite speelt alle 18 opdrachten uit via dezelfde controllers en knoppen die in de browser gebruikt worden.

De actuele controle-uitkomsten en beperkingen staan in `UITBREIDING.md`. Offline herstel blijft uitgesteld. Echte iPad/Safari-hardwarecontrole en de speeltest door Ninte zijn apart van de implementatie.

## Korte speeltest met Ninte

Doe één of twee avonturen per keer. Dit is een checklist voor observatie, geen toets.

- Vind je Mila en begrijp je wat zij nodig heeft zonder extra uitleg?
- Kun je een voorwerp pakken, je huidige opdracht terugvinden en een hint openen?
- Welke plek wil je uit jezelf ontdekken? Wat vind je leuk of saai?
- Begrijp je de lengtemeter? Kun je een balk weghalen en daarna de brug oversteken?
- Kun je een plant in de boomhut plaatsen, verplaatsen en na heropenen terugvinden?
- Lukt één winkel-, pizza- of robotopdracht? Wanneer wordt het te makkelijk of te lastig?
- Helpt een hint om zelf verder te denken? Begrijp je waarom het voorbeeld werkt?
- Kun je een menu sluiten, de kaart gebruiken en terug naar het dorp? Werkt dit ook met touch?
- Kun je alle woorden lezen en knoppen aantikken? Zijn geluid en effecten prettig?

Noteer het gebruikte onderwerp/niveau en één concrete wijzigingswens. Pas standaardwaarden aan zonder de andere gebieden te blokkeren.
