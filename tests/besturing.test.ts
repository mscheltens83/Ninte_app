// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { Besturing } from '../src/spel/besturing';

it('laat menuknoppen en keuzevelden met het toetsenbord bedienen zonder de speler te bewegen', () => {
  const vlak = document.createElement('div'), spring = document.createElement('button');
  const besturing = new Besturing(vlak, spring, document.createElement('div'), document.createElement('div'));
  const knop = document.createElement('button'), keuze = document.createElement('select');
  document.body.replaceChildren(vlak, knop, keuze, spring);
  besturing.aan = false;
  const pauze = new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true });
  knop.dispatchEvent(pauze); expect(pauze.defaultPrevented).toBe(false);
  besturing.aan = true;
  keuze.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }));
  besturing.update(); expect(besturing.beweging.y).toBe(0);
  const spel = new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true });
  vlak.dispatchEvent(spel); expect(spel.defaultPrevented).toBe(true); expect(besturing.wilSpringen()).toBe(true);
  besturing.loslaten(); spring.click(); expect(besturing.wilSpringen()).toBe(true);
  besturing.aan = false;
});
