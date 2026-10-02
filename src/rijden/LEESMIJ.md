# Rijden en het Rijland

Ninte rijdt op haar pony of op dieren die ze zelf uitbroedt. Eieren liggen vooral in het **Rijland**: een eigen wereld achter de regenboogpoort op het dorpsplein. Alle dieren en de wereld zijn eigen ontwerpen.

| Bestand | Wat staat erin |
|---|---|
| `dieren.ts` | Alle rijdieren (met bouwplan), zeldzaamheden, kleurvarianten, eieren en kansen |
| `stand.ts` | Wat er bewaard wordt: dieren, eieren, lege eierplekken, het dier waarop je rijdt, racetijd |
| `model.ts` | De 3D-dieren (paard, kat, vogel, draak, schildpad) en eieren, gebouwd uit het bouwplan |
| `rijland.ts` | De wereld: Reuzenboom, ranch, vier gebieden met snelheidspoorten, klimtorens, springkussens, snelstroken, racebaan |
| `eieren.ts` | De eierplekken en het oppakken en terugkomen van eieren |
| `race.ts` | De race door de ringen, met brons, zilver en goud |
| `schermen.ts` | Broedhuis (uitbroeden, met een leervraag bij blauwe en gouden eieren) en het dierenboek |

## Uitbreiden

- **Nieuw dier:** zet een regel in `RIJDIEREN` (`dieren.ts`). Het model wordt vanzelf gebouwd uit het bouwplan: kies een `vorm` en eventueel oren, staart, hoorn, gewei, vleugels, strepen, vlekken of sterren.
- **Nieuwe eierplek:** zet een regel in `EI_PLEKKEN` (`eieren.ts`). Leg het ei op de grond (`y: 0`) of bovenop een klimtoren (`torenTop(...)`). Een test controleert dat elk ei bereikbaar is.
- **Ander gebied of andere poort:** pas `BIOMEN` aan (`rijland.ts`); `minSnelheid` is de snelheid die je dier nodig heeft.
- **Meer springkussens, snelstroken of klimtorens:** de lijsten `SPRINGKUSSENS`, `SNELSTROKEN` en `KLIMTORENS`.
- **Kansen:** `kansen` per ei en `VARIANT_KANSEN` in `dieren.ts`.
