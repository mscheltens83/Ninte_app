// Hoe druk de muziek is. Elke goede actie geeft punten; de punten bepalen hoeveel
// instrumenten er meedoen. Een fout kost nooit iets: na een tijdje rust zakt de
// muziek alleen langzaam terug naar het begin.

export const ENERGIE_MAX = 4;
/** Zoveel punten heb je nodig voor +1, +2, +3 en +4 energie. */
export const DREMPELS = [1, 3, 6, 10] as const;
const MAX_PUNTEN = 14;
/** Zo lang blijft de muziek op volle sterkte na de laatste goede actie (seconden). */
const RUST_VOOR_ZAKKEN = 45;
/** Daarna verdwijnt er elke zoveel seconden één punt. */
const SECONDEN_PER_PUNT = 12;

export class Energie {
  private punten = 0;
  private sindsGoed = 0;

  get aantalPunten(): number {
    return this.punten;
  }

  /** Iets goed gedaan. `gewicht` 1 = een goed antwoord, meer voor iets groots. */
  goed(gewicht = 1) {
    this.punten = Math.min(MAX_PUNTEN, this.punten + gewicht);
    this.sindsGoed = 0;
  }

  update(dt: number) {
    this.sindsGoed += dt;
    if (this.sindsGoed > RUST_VOOR_ZAKKEN) this.punten = Math.max(0, this.punten - dt / SECONDEN_PER_PUNT);
  }

  /** De energie (0..4) bovenop de basis van een liedje. */
  niveau(basis: number): number {
    const extra = DREMPELS.filter((d) => this.punten >= d).length;
    return Math.max(0, Math.min(ENERGIE_MAX, Math.round(basis) + extra));
  }

  reset() {
    this.punten = 0;
    this.sindsGoed = 0;
  }
}
