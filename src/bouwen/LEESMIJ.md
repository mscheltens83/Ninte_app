# Bouwen

Ninte bouwt op haar eigen bouwkavel, naast het dorpsplein. Praat met Bas de bouwer (E of tikken) om de bouwmodus te openen.

| Bestand | Wat staat erin |
|---|---|
| `onderdelen.ts` | De kavel (plek en grootte), de kleuren en alle onderdelen: muren, vloer, blokken en meubels |
| `stand.ts` | Wat er gebouwd is, de bouwregels (plaatsen, weghalen, draaien) en het controleren van bewaarde gegevens |
| `analyse.ts` | Het bouwwerk lezen: dichte kamers, deuren, vormen en torenhoogte |
| `opdrachten.ts` | De bouwopdrachten van Bas, met rekenvragen en beloningen |
| `modellen.ts` | De 3D-modellen van muren, blokken en meubels |
| `wereld.ts` | De kavel in de wereld: bouwwerk, botsing, dak en Bas |
| `bouwModus.ts` | De bouwmodus: camera, tikken en slepen, knoppen en opdrachtkaart |

## Uitbreiden

- **Nieuw meubel:** zet een regel in `ONDERDELEN` (`onderdelen.ts`) en een model in `MEUBEL_MODELLEN` (`modellen.ts`) met dezelfde id. Zonder model krijgt het een gekleurd blok. Met `start: true` heeft Ninte het meteen; anders zet je de id bij `beloning.onderdelen` van een opdracht.
- **Nieuwe kleur:** voeg een regel toe aan `KLEUREN`.
- **Nieuwe opdracht:** zet een regel in `BOUW_OPDRACHTEN`. Met `klopt` controleer je het bouwwerk. Gebruik daarvoor `plattegrond`, `isRechthoek`, `zelfdeVorm` of `hoogsteToren` uit `analyse.ts`. Een `vraag` is een rekenvraag met een getal als antwoord. Opdrachten komen in deze volgorde.
- **Grotere kavel:** pas `KAVEL` aan. Wat buiten het nieuwe raster valt, verdwijnt bij het laden. Maak de kavel daarom alleen groter, nooit kleiner.

Bouwwerk, gehaalde opdrachten en antwoorden worden bewaard in `stand.bouwen` en zitten ook in de back-up.
