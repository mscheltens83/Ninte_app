// De muziekmeter naast de hoefijzers: vier balkjes die laten zien hoe druk de muziek
// is, en die op de maat meedansen. Tikken vertelt welk liedje er speelt.

import { ENERGIE_NAMEN } from './liedjes';

export class Muziekmeter {
  readonly knop = document.createElement('button');
  private balkjes: HTMLSpanElement[] = [];
  private niveau = -1;

  constructor(houder: HTMLElement, opKlik: () => void) {
    this.knop.id = 'muziekmeter';
    this.knop.type = 'button';
    for (let i = 0; i < 4; i++) {
      const b = document.createElement('span');
      b.style.setProperty('--i', String(i));
      this.balkjes.push(b);
      this.knop.append(b);
    }
    this.knop.addEventListener('click', opKlik);
    houder.append(this.knop);
  }

  zet(niveau: number, liedNaam: string) {
    if (niveau === this.niveau && this.knop.dataset.lied === liedNaam) return;
    this.niveau = niveau;
    this.knop.dataset.lied = liedNaam;
    this.balkjes.forEach((b, i) => b.classList.toggle('aan', i < niveau));
    this.knop.classList.toggle('feest', niveau >= 4);
    const tekst = `Muziek: ${liedNaam} · ${ENERGIE_NAMEN[Math.max(0, Math.min(4, niveau))]}`;
    this.knop.setAttribute('aria-label', tekst);
    this.knop.title = tekst;
  }

  /** 0..1, 1 precies op de tel. */
  puls(p: number) {
    this.knop.style.setProperty('--puls', p.toFixed(2));
  }

  zichtbaar(ja: boolean) {
    this.knop.hidden = !ja;
  }
}
