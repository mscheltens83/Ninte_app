// Een vraag bij een poort in een obby: spelling of rekenen.

import { maakFouteVariant, tipVoor, voorleesTekst, zinMetGat } from './spelling';
import type { Woordkaart } from './woorden';

export interface Vraag {
  soort: 'spelling' | 'rekenen';
  /** Voor de herhaalbakjes: het woord, of de som (bijv. "6x7"). */
  sleutel: string;
  /** Tekst op het bord, met ___ op de plek van het antwoord. */
  tekst: string;
  goed: string;
  fout: string;
  /** Wat de stem voorleest. */
  voorlezen: string;
  /** Sleutel van een ingesproken opname (als die er is). */
  opname?: string;
  tip: string;
  tipTitel: string;
}

export function spellingVraag(kaart: Woordkaart): Vraag {
  return {
    soort: 'spelling',
    sleutel: kaart.woord,
    tekst: zinMetGat(kaart),
    goed: kaart.woord,
    fout: maakFouteVariant(kaart),
    voorlezen: voorleesTekst(kaart),
    opname: `woord-${kaart.woord}`,
    tip: tipVoor(kaart),
    tipTitel: 'De goede spelling is:',
  };
}
