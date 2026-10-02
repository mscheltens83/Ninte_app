// De muziekregie: kiest tussen de meespeelmuziek en de MP3-nummers, kiest het liedje
// bij de plek en geeft goede momenten door. Het spel praat alleen met deze klasse.

import type { Geluid } from '../geluid/geluid';
import type { Muziek, Plek } from '../geluid/muziek';
import type { Beat } from './beat';
import { liedVoor, type MuziekPlek } from './liedjes';
import { Meespeelmuziek, type Moment } from './motor';
import type { MuziekSoort, RitmeStand } from './stand';

/** Zo lang moet je op een nieuwe plek zijn voordat het liedje wisselt (seconden). */
const WISSEL_NA = 1.2;

/** De MP3-afspeellijsten kennen alleen het eiland, de obby's en de geheime plek. */
export function mp3Plek(plek: MuziekPlek): Plek {
  return plek === 'obby' || plek === 'geheim' ? plek : 'eiland';
}

export class Muziekregie {
  readonly live: Meespeelmuziek;
  private aan = true;
  private plek: MuziekPlek | null = null;
  private kandidaat: MuziekPlek | null = null;
  private kandidaatTijd = 0;
  private beatmaker = false;

  constructor(private geluid: Geluid, private mp3: Muziek, private stand: RitmeStand) {
    this.live = new Meespeelmuziek(() => geluid.context);
    this.live.zetEigenBeat(stand.beat);
  }

  get soort(): MuziekSoort {
    return this.stand.soort;
  }

  /** Speelt de meespeelmuziek nu (ook tijdelijk in de beatmaker)? */
  get meespeel(): boolean {
    return this.stand.soort === 'meespeel' || this.beatmaker;
  }

  get niveau(): number {
    return this.live.niveau;
  }

  get beatmakerOpen(): boolean {
    return this.beatmaker;
  }

  get stap(): number {
    return this.live.stap;
  }

  get tel(): number {
    return this.live.tel;
  }

  /** Naam van wat er nu speelt, voor in de instellingen. */
  get huidigeNaam(): string | null {
    return this.meespeel ? this.live.lied.naam : this.mp3.huidigNummer?.naam ?? null;
  }

  zetSoort(soort: MuziekSoort) {
    this.stand.soort = soort;
    this.pasToe();
  }

  zetAan(aan: boolean) {
    this.aan = aan;
    this.pasToe();
  }

  demp(ja: boolean) {
    this.mp3.demp(ja);
    this.live.demp(ja);
  }

  /** Het spel meldt elke beeldje waar Ninte is. */
  speel(plek: MuziekPlek) {
    if (this.beatmaker) plek = 'podium';
    if (this.plek === null) {
      this.wissel(plek);
      return;
    }
    if (plek === this.plek) {
      this.kandidaat = null;
      return;
    }
    if (plek !== this.kandidaat) {
      this.kandidaat = plek;
      this.kandidaatTijd = 0;
    }
  }

  moment(soort: Moment) {
    this.live.moment(soort);
  }

  /** Beatmaker open: altijd meespeelmuziek op het podium, met de beat die gemaakt wordt. */
  openBeatmaker(beat: Beat) {
    this.beatmaker = true;
    this.live.zetEigenBeat(beat);
    this.wissel('podium');
    this.pasToe();
  }

  /** Tijdens het maken: elke wijziging meteen horen. */
  wijzigBeat(beat: Beat) {
    this.live.zetEigenBeat(beat);
  }

  sluitBeatmaker() {
    this.beatmaker = false;
    this.live.zetEigenBeat(this.stand.beat);
    this.pasToe();
  }

  update(dt: number) {
    if (this.kandidaat) {
      this.kandidaatTijd += dt;
      if (this.kandidaatTijd >= WISSEL_NA) this.wissel(this.kandidaat);
    }
    // De MP3-speler wacht soms op de eerste tik (iOS); vraag het gewoon elk beeldje.
    if (!this.meespeel && this.plek) this.mp3.speel(mp3Plek(this.plek));
    this.live.update(dt);
  }

  private wissel(plek: MuziekPlek) {
    this.plek = plek;
    this.kandidaat = null;
    this.live.kies(liedVoor(plek));
    if (!this.meespeel) this.mp3.speel(mp3Plek(plek));
  }

  private pasToe() {
    const live = this.meespeel;
    // Tijdens het maken van een beat speelt de muziek altijd: daar gaat het juist om.
    const aan = this.aan || this.beatmaker;
    if (live) {
      this.mp3.stop();
      this.live.zetActief(true);
      this.live.zetAan(aan);
      this.geluid.stemming = (f) => this.live.stemming(f);
    } else {
      this.live.zetActief(false);
      this.geluid.stemming = null;
      this.mp3.zetAan(aan);
      if (this.plek) this.mp3.speel(mp3Plek(this.plek));
    }
  }
}
