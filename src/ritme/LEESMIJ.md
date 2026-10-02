# Ritme: muziek en een wereld die meebeweegt

Standaard speelt het spel de MP3-nummers uit `src/muziek/`. In ⚙️ Instellingen kun je kiezen voor **Meespeel**: muziek die het spel zelf maakt en die meegroeit. Hoe meer Ninte goed doet, hoe meer instrumenten er meedoen.

| Bestand | Wat staat erin |
|---|---|
| `liedjes.ts` | Alle meespeelliedjes en welk liedje bij welke plek hoort (`PLEK_LIED`) |
| `instrumenten.ts` | De instrumenten (Web Audio, geen bestanden) |
| `patroon.ts` | Hoe je patronen schrijft (`x---x---` voor slagwerk, `0 . 2 - 4` voor tonen) |
| `motor.ts`, `klok.ts`, `energie.ts`, `theorie.ts` | Het afspelen, de maatklok, de energie (0–4) en de toonladders |
| `regie.ts` | Kiest tussen MP3-nummers en meespeelmuziek; het spel praat alleen hiermee |
| `dansen.ts` | Dingen die op de maat bewegen (`DANSSTIJLEN`) |
| `feestwereld.ts` | Lampjesslingers, dansbloemen en het discopodium |
| `beat.ts`, `beatScherm.ts` | De beatmaker op het podium, met reken-uitdagingen |
| `plek.ts`, `meter.ts`, `stand.ts` | Welke plek bij welke muziek hoort, de muziekmeter en wat er bewaard wordt |

## Uitbreiden

- **Nieuw liedje:** zet het in `LIEDJES` en koppel het in `PLEK_LIED`.
- **Nieuw instrument:** voeg een regel toe aan `INSTRUMENTEN`.
- **Iets laten dansen:** `dansvloer.voegToe(object, 'veer' | 'wip' | 'wieg' | 'knik' | 'pomp' | 'draai')`.
- **Nieuwe beat-uitdaging:** zet een regel in `UITDAGINGEN` (`beat.ts`).
- **Nieuwe actie in de wereld:** geef een interactie een `doe`-functie en zet hem in `avontuur.wereld.interacties`. Het discopodium en Bas de bouwer werken zo.
