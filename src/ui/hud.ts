// De balk bovenop het spel: hoefijzers, knoppen, de vraag-banner en meldingen.

const HOEFIJZER_SVG =
  '<svg viewBox="0 0 64 64"><path d="M14 8 C6 26 8 50 32 56 C56 50 58 26 50 8" fill="none" stroke="#e0a800" stroke-width="12" stroke-linecap="round"/><path d="M14 8 C6 26 8 50 32 56 C56 50 58 26 50 8" fill="none" stroke="#ffcf33" stroke-width="7" stroke-linecap="round"/></svg>';

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export class Hud {
  readonly hud = el<HTMLDivElement>('hud');
  readonly kastKnop = el<HTMLButtonElement>('knop-kast');
  readonly geheimenKnop = el<HTMLButtonElement>('knop-geheimen');
  readonly instellingenKnop = el<HTMLButtonElement>('knop-instellingen');
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

  /** Gouden hoefijzertjes die vanaf een plek op het scherm naar de teller vliegen. */
  vliegHoefijzers(x: number, y: number, aantal: number) {
    const doel = this.hoefijzers.getBoundingClientRect();
    const dx = doel.left + 30;
    const dy = doel.top + doel.height / 2;
    for (let i = 0; i < Math.min(aantal, 8); i++) {
      const el = document.createElement('div');
      el.className = 'vlieg-hoefijzer';
      el.innerHTML = HOEFIJZER_SVG;
      const sx = x + (Math.random() - 0.5) * 60;
      const sy = y + (Math.random() - 0.5) * 60;
      el.style.left = `${sx}px`;
      el.style.top = `${sy}px`;
      el.style.transitionDelay = `${i * 60}ms`;
      document.body.appendChild(el);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          el.style.transform = `translate(${dx - sx}px, ${dy - sy}px) scale(0.6)`;
          el.style.opacity = '0.2';
        }),
      );
      window.setTimeout(() => el.remove(), 900 + i * 60);
    }
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
