// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Fysica, type Lichaam } from '../src/spel/fysica';
import { Geheimen, WACHTWOORD } from '../src/wereld/geheimen';
import { sluitScherm, wachtwoordScherm } from '../src/ui/schermen';

// Alleen het tekenen van letters vergt een browsercanvas; de wereld en zones zijn echt.
vi.mock('../src/wereld/bouwstenen', async (origineel) => {
  const actual = await origineel<typeof import('../src/wereld/bouwstenen')>();
  const three = await import('three');
  return { ...actual, tekstBord: () => ({ mesh: new three.Mesh(new three.BoxGeometry(1, 1, 0.1)), zetTekst: vi.fn() }) };
});

beforeEach(() => { document.body.innerHTML = '<div id="schermen"></div>'; });

describe('wachtwoordscherm van de schatkist', () => {
  it('blijft dicht na Later, ook na veel gepauzeerde frames, en opent weer na weggaan en terugkomen', () => {
    const geheimen = new Geheimen(new THREE.Scene(), new Fysica(), new THREE.Vector3(90, 0, 0));
    const speler: Lichaam = { pos: { x: -23.3, y: 0, z: -3.1 }, snelheid: { x: 0, y: 0, z: 0 }, straal: 0.4, hoogte: 2.5, opGrond: true, grond: null };
    expect(geheimen.update(1 / 60, speler)).toContainEqual({ soort: 'kist' });
    const later = vi.fn(sluitScherm);
    wachtwoordScherm(() => false, later);
    for (let frame = 0; frame < 120; frame++) expect(geheimen.update(1 / 60, speler, false)).toEqual([]);
    document.querySelector<HTMLButtonElement>('[data-later]')!.click();
    expect(later).toHaveBeenCalledOnce();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    for (let frame = 0; frame < 120; frame++) expect(geheimen.update(1 / 60, speler)).not.toContainEqual({ soort: 'kist' });
    expect(geheimen.kistIsOpen).toBe(false);
    speler.pos.x = 0; geheimen.update(1 / 60, speler);
    speler.pos.x = -23.3;
    expect(geheimen.update(1 / 60, speler)).toContainEqual({ soort: 'kist' });
  });

  it('laat Later ook werken na een fout wachtwoord zonder de kist te openen', () => {
    const probeer = vi.fn(() => false);
    wachtwoordScherm(probeer, sluitScherm);
    document.querySelector<HTMLInputElement>('input')!.value = 'verkeerd';
    document.querySelector<HTMLButtonElement>('[data-open]')!.click();
    expect(probeer).toHaveBeenCalledExactlyOnceWith('verkeerd');
    expect(document.querySelector('.hint')!.textContent).toContain('Bijna!');
    document.querySelector<HTMLButtonElement>('[data-later]')!.click();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('kan de kist na een nieuwe poging nog steeds met het juiste wachtwoord openen', () => {
    const geheimen = new Geheimen(new THREE.Scene(), new Fysica(), new THREE.Vector3(90, 0, 0));
    wachtwoordScherm((tekst) => {
      if (tekst !== WACHTWOORD) return false;
      geheimen.openKist(); sluitScherm(); return true;
    }, sluitScherm);
    document.querySelector<HTMLInputElement>('input')!.value = WACHTWOORD;
    document.querySelector<HTMLButtonElement>('[data-open]')!.click();
    expect(geheimen.kistIsOpen).toBe(true);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
