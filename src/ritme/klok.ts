// De maatklok: plant elke 16e noot iets vooruit, precies op de klok van de audio.
// Zo blijft de muziek strak, ook als het beeld even hapert. Dezelfde klok vertelt de
// wereld waar in de maat we zijn, zodat bloemen en lampjes op de maat bewegen.

export const STAPPEN_PER_TEL = 4;
export const STAPPEN_PER_MAAT = 16;
/** Zoveel seconden plannen we vooruit. */
export const VOORUIT = 0.5;

/** Wordt aangeroepen voor elke stap. Mag `klok.bpm` aanpassen; dat geldt dan vanaf deze stap. */
export type Planner = (stap: number, tijd: number) => void;

export class Klok {
  bpm: number;
  private volgendeTijd = 0;
  private volgendeStap = 0;
  private anker = { tijd: 0, stap: 0, bpm: 120 };
  private loopt = false;

  constructor(private plan: Planner, bpm = 112) {
    this.bpm = bpm;
    this.anker.bpm = bpm;
  }

  get aanHetLopen(): boolean {
    return this.loopt;
  }

  /** Duur van één 16e stap in seconden. */
  get stapDuur(): number {
    return 60 / this.bpm / STAPPEN_PER_TEL;
  }

  start(nu: number) {
    this.loopt = true;
    // Begin netjes op een nieuwe maat.
    this.volgendeStap = Math.ceil(this.volgendeStap / STAPPEN_PER_MAAT) * STAPPEN_PER_MAAT;
    this.volgendeTijd = nu + 0.06;
    this.anker = { tijd: this.volgendeTijd, stap: this.volgendeStap, bpm: this.bpm };
  }

  stop() {
    this.loopt = false;
  }

  /**
   * Plan alle stappen die binnen `vooruit` seconden vallen. Zo vaak mogelijk aanroepen
   * (timer én elk beeldje). Ruim vooruit plannen voorkomt gaten als het beeld even hapert.
   */
  tik(nu: number, vooruit = VOORUIT) {
    if (!this.loopt) return;
    // Lang achterop geraakt (tabblad verborgen, apparaat sliep)? Dan niet alles inhalen.
    if (this.volgendeTijd < nu - 1) {
      this.volgendeTijd = nu + 0.02;
      this.anker = { tijd: this.volgendeTijd, stap: this.volgendeStap, bpm: this.bpm };
    }
    // Een beetje achter? Sla de gemiste stappen over, in de maat, in plaats van ze allemaal tegelijk te spelen.
    while (this.volgendeTijd < nu - 0.05) {
      this.volgendeTijd += this.stapDuur;
      this.volgendeStap++;
    }
    let veiligheid = 64;
    while (this.volgendeTijd < nu + vooruit && veiligheid-- > 0) {
      const oudBpm = this.bpm;
      this.plan(this.volgendeStap, this.volgendeTijd);
      if (this.bpm !== oudBpm) this.anker = { tijd: this.volgendeTijd, stap: this.volgendeStap, bpm: this.bpm };
      this.volgendeTijd += this.stapDuur;
      this.volgendeStap++;
    }
  }

  /** Waar in de muziek we zijn op `tijd`, in 16e stappen (met decimalen). */
  stapOp(tijd: number): number {
    return this.anker.stap + ((tijd - this.anker.tijd) * this.anker.bpm * STAPPEN_PER_TEL) / 60;
  }
}
