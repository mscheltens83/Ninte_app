// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { bewaarStand, nieuweStand, opslagMelding } from '../src/opslag/opslag';

it('overschrijft geen voortgang die inmiddels door een ander tabblad is gewijzigd', () => {
  const stand = nieuweStand(); stand.hoefijzers = 10;
  expect(bewaarStand(stand)).toBe(true);
  const elders = { ...stand, hoefijzers: 40 };
  localStorage.setItem('nintes-wereld', JSON.stringify(elders));
  window.dispatchEvent(new StorageEvent('storage', { key: 'nintes-wereld', newValue: JSON.stringify(elders) }));
  expect(bewaarStand(stand)).toBe(false);
  expect(JSON.parse(localStorage.getItem('nintes-wereld')!).hoefijzers).toBe(40);
  expect(opslagMelding().tekst).toContain('ander tabblad');
});
