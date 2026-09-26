// De balk bovenop het spel: hoefijzers, knoppen, de vraag-banner en meldingen.

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export class Hud {
  readonly hud = el<HTMLDivElement>('hud');
  readonly geluidKnop = el<HTMLButtonElement>('knop-geluid');
  readonly uitlegKnop = el<HTMLButtonElement>('knop-uitleg');
  private hoefijzers = el<HTMLDivElement>('hoefijzers');
  private aantal = el<HTMLSpanElement>('aantal');
  private banner = el<HTMLDivElement>('banner');
  private bannerTekst = el<HTMLParagraphElement>('banner-tekst');
  private bannerSpreek = el<HTMLButtonElement>('banner-spreek');
  private melding = el<HTMLDivElement>('melding');
  private bannerTimer: number | undefined;
  private spreekActie: (() => void) | null = null;

  constructor() {
    this.bannerSpreek.addEventListener('click', () => this.spreekActie?.());
  }

  zichtbaar(ja: boolean) {
    this.hud.classList.toggle('verborgen', !ja);
  }

  zetHoefijzers(n: number, erbij = false) {
    this.aantal.textContent = String(n);
    if (erbij) {
      this.hoefijzers.classList.remove('plus');
      void this.hoefijzers.offsetWidth;
      this.hoefijzers.classList.add('plus');
    }
  }

  zetGeluid(aan: boolean) {
    this.geluidKnop.textContent = aan ? '🔊' : '🔇';
  }

  /** Toon een tekst bovenin. Met `spreek` verschijnt er een luidsprekerknop. */
  toonBanner(html: string, spreek: (() => void) | null, opties: { goed?: boolean; duur?: number } = {}) {
    window.clearTimeout(this.bannerTimer);
    this.bannerTekst.innerHTML = html;
    this.spreekActie = spreek;
    this.bannerSpreek.hidden = !spreek;
    this.banner.classList.toggle('goed', !!opties.goed);
    this.banner.hidden = false;
    if (opties.duur) this.bannerTimer = window.setTimeout(() => this.verbergBanner(), opties.duur);
  }

  verbergBanner() {
    window.clearTimeout(this.bannerTimer);
    this.banner.hidden = true;
    this.spreekActie = null;
  }

  meld(tekst: string) {
    this.melding.textContent = tekst;
    this.melding.classList.remove('zichtbaar');
    void this.melding.offsetWidth;
    this.melding.classList.add('zichtbaar');
  }
}

/** Maakt tekst veilig om in HTML te zetten. */
export function veilig(tekst: string): string {
  return tekst.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
