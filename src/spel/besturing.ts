// Besturing zoals Roblox op de iPad: joystick links (verschijnt waar je duim
// komt), springknop rechts, vegen om de camera te draaien, knijpen om te zoomen.
// Op een computer: WASD of pijltjes, spatie, en slepen met de muis.

const STRAAL = 60; // pixels die de joystick-knop maximaal beweegt
const DODE_ZONE = 0.12;

export class Besturing {
  /** x = naar rechts, y = vooruit; beide tussen -1 en 1. */
  readonly beweging = { x: 0, y: 0 };
  aan = true;

  private toetsen = new Set<string>();
  private joystickId: number | null = null;
  private joystickStart = { x: 0, y: 0 };
  private joystickVector = { x: 0, y: 0 };
  private camPunten = new Map<number, { x: number; y: number }>();
  private camDelta = { x: 0, y: 0, zoom: 0 };
  private springKnop = false;
  private springVraag = false;
  /** Waar en wanneer elke vinger neerkwam, om tikken te herkennen. */
  private neergezet = new Map<number, { x: number; y: number; t: number; ver: boolean }>();
  private tikken: { x: number; y: number }[] = [];

  constructor(
    private vlak: HTMLElement,
    private springKnopEl: HTMLElement,
    private basisEl: HTMLElement,
    private knopEl: HTMLElement,
  ) {
    vlak.addEventListener('pointerdown', (e) => this.omlaag(e));
    vlak.addEventListener('pointermove', (e) => this.beweeg(e));
    vlak.addEventListener('pointerup', (e) => this.omhoog(e));
    vlak.addEventListener('pointercancel', (e) => this.omhoog(e));
    vlak.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camDelta.zoom += e.deltaY * 0.01;
    }, { passive: false });

    const drukSpring = (e: Event) => {
      e.preventDefault();
      this.springKnop = true;
      this.springVraag = true;
      springKnopEl.classList.add('ingedrukt');
    };
    const laatSpring = () => {
      this.springKnop = false;
      springKnopEl.classList.remove('ingedrukt');
    };
    springKnopEl.addEventListener('pointerdown', drukSpring);
    springKnopEl.addEventListener('pointerup', laatSpring);
    springKnopEl.addEventListener('pointercancel', laatSpring);
    springKnopEl.addEventListener('pointerleave', laatSpring);

    window.addEventListener('keydown', (e) => {
      if (this.isTypveld(e.target)) return;
      this.toetsen.add(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
        this.springVraag = true;
      }
    });
    window.addEventListener('keyup', (e) => this.toetsen.delete(e.code));
    window.addEventListener('blur', () => this.loslaten());

    // iOS: voorkom zoomen en scrollen van de pagina tijdens het spelen.
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    this.zetKnop(0, 0);
  }

  private isTypveld(doel: EventTarget | null): boolean {
    return doel instanceof HTMLInputElement || doel instanceof HTMLTextAreaElement;
  }

  /** Alles loslaten, bijvoorbeeld als er een scherm over het spel komt. */
  loslaten() {
    this.toetsen.clear();
    this.joystickId = null;
    this.joystickVector = { x: 0, y: 0 };
    this.camPunten.clear();
    this.neergezet.clear();
    this.tikken = [];
    this.springKnop = false;
    this.springVraag = false;
    this.springKnopEl.classList.remove('ingedrukt');
    this.basisEl.classList.remove('actief');
    this.zetKnop(0, 0);
  }

  private omlaag(e: PointerEvent) {
    if (!this.aan) return;
    e.preventDefault();
    this.neergezet.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), ver: false });
    const links = e.clientX < window.innerWidth * 0.45;
    if (e.pointerType !== 'mouse' && links && this.joystickId === null) {
      this.joystickId = e.pointerId;
      this.joystickStart = { x: e.clientX, y: e.clientY };
      this.basisEl.style.left = `${e.clientX}px`;
      this.basisEl.style.top = `${e.clientY}px`;
      this.basisEl.classList.add('actief');
      this.zetKnop(0, 0);
    } else {
      this.camPunten.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    try {
      this.vlak.setPointerCapture(e.pointerId);
    } catch {
      // niet erg
    }
  }

  private beweeg(e: PointerEvent) {
    const start = this.neergezet.get(e.pointerId);
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 12) start.ver = true;
    if (e.pointerId === this.joystickId) {
      let dx = (e.clientX - this.joystickStart.x) / STRAAL;
      let dy = (e.clientY - this.joystickStart.y) / STRAAL;
      const lengte = Math.hypot(dx, dy);
      if (lengte > 1) {
        dx /= lengte;
        dy /= lengte;
      }
      this.joystickVector = { x: dx, y: -dy };
      this.zetKnop(dx * STRAAL, dy * STRAAL);
      return;
    }
    const vorige = this.camPunten.get(e.pointerId);
    if (!vorige) return;
    if (this.camPunten.size >= 2) {
      const [a, b] = [...this.camPunten.values()];
      const oud = Math.hypot(a.x - b.x, a.y - b.y);
      this.camPunten.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [c, d] = [...this.camPunten.values()];
      const nieuw = Math.hypot(c.x - d.x, c.y - d.y);
      this.camDelta.zoom += (oud - nieuw) * 0.03;
    } else {
      this.camDelta.x += e.clientX - vorige.x;
      this.camDelta.y += e.clientY - vorige.y;
      this.camPunten.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
  }

  private omhoog(e: PointerEvent) {
    const start = this.neergezet.get(e.pointerId);
    this.neergezet.delete(e.pointerId);
    if (start && !start.ver && performance.now() - start.t < 350 && e.type === 'pointerup') {
      this.tikken.push({ x: e.clientX, y: e.clientY });
    }
    if (e.pointerId === this.joystickId) {
      this.joystickId = null;
      this.joystickVector = { x: 0, y: 0 };
      this.basisEl.classList.remove('actief');
      this.zetKnop(0, 0);
    }
    this.camPunten.delete(e.pointerId);
  }

  private zetKnop(x: number, y: number) {
    this.knopEl.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  /** Eén keer per frame aanroepen. */
  update() {
    let x = 0;
    let y = 0;
    if (this.aan) {
      if (this.joystickId !== null) {
        x = this.joystickVector.x;
        y = this.joystickVector.y;
      } else {
        const t = this.toetsen;
        if (t.has('KeyW') || t.has('ArrowUp')) y += 1;
        if (t.has('KeyS') || t.has('ArrowDown')) y -= 1;
        if (t.has('KeyD') || t.has('ArrowRight')) x += 1;
        if (t.has('KeyA') || t.has('ArrowLeft')) x -= 1;
        const l = Math.hypot(x, y);
        if (l > 1) {
          x /= l;
          y /= l;
        }
      }
    }
    if (Math.hypot(x, y) < DODE_ZONE) {
      x = 0;
      y = 0;
    }
    this.beweging.x = x;
    this.beweging.y = y;
  }

  /** Wil de speler springen? (knop ingedrukt, of kort geleden getikt) */
  wilSpringen(): boolean {
    if (!this.aan) return false;
    const vraag = this.springVraag;
    this.springVraag = false;
    return vraag || this.springKnop || this.toetsen.has('Space');
  }

  /** Korte tikjes op het scherm (om dieren te aaien). */
  neemTikken(): { x: number; y: number }[] {
    const t = this.tikken;
    this.tikken = [];
    return t;
  }

  /** Hoeveel de camera gedraaid en gezoomd is sinds de vorige keer. */
  neemCameraDelta() {
    const d = { ...this.camDelta };
    this.camDelta = { x: 0, y: 0, zoom: 0 };
    return d;
  }
}
