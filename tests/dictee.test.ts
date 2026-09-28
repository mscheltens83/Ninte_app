// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/leren/voorlezen', () => ({ spreek: vi.fn() }));
import { exporteerStand, laadStand, nieuweStand } from '../src/opslag/opslag';
import { dicteeScherm, oudersScherm } from '../src/ui/lerenSchermen';

const klik = (selector: string) => document.querySelector<HTMLButtonElement>(selector)!.click();
const antwoord = (tekst: string) => {
  document.querySelector<HTMLInputElement>('#dictee-woord')!.value = tekst;
  document.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
};
beforeEach(() => { document.body.innerHTML = '<div id="schermen"></div>'; localStorage.clear(); });
describe('zelfstandig dictee', () => {
  it('toont een herstelvoorvertoning zonder vóór bevestiging de spelstand te vervangen', async () => {
    const stand = nieuweStand(), herstel = nieuweStand(); stand.hoefijzers = 10; herstel.hoefijzers = 432;
    oudersScherm(stand, vi.fn(), vi.fn());
    const input = document.querySelector<HTMLInputElement>('#backup-bestand')!;
    Object.defineProperty(input, 'files', { configurable: true, value: [new File([exporteerStand(herstel)], 'backup.json', { type: 'application/json' })] });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(document.querySelector('[data-importtekst]')!.textContent).toContain('432 hoefijzers'));
    expect(stand.hoefijzers).toBe(10);
    expect(document.querySelector<HTMLButtonElement>('[data-import]')!.hidden).toBe(false);
    const reload = vi.spyOn(location, 'reload').mockImplementation(() => {});
    klik('[data-import]');
    expect(laadStand().hoefijzers).toBe(432); expect(reload).toHaveBeenCalledOnce();
    reload.mockRestore();
    Object.defineProperty(input, 'files', { configurable: true, value: [new File(['{kapot'], 'backup.json')] });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(document.querySelector('[data-importtekst]')!.textContent).toContain('geen leesbare back-up'));
    expect(document.querySelector<HTMLButtonElement>('[data-import]')!.hidden).toBe(true);
    expect(stand.hoefijzers).toBe(10);
  });
  it('houdt fouten en verbetering apart, voorkomt dubbele beloning en hervat de taak', () => {
    const stand = nieuweStand(); stand.weekwoorden = [{ woord: 'robot', zin: 'De robot helpt.', categorie: 'schoolwoord' }];
    const beloon = vi.fn(), klaar = vi.fn();
    dicteeScherm(stand, 'voeren', beloon, klaar, vi.fn());
    expect(document.querySelector('.dictee-zin')!.textContent).toBe('De ___ helpt.');
    antwoord('robod'); antwoord('robo'); antwoord('ROBOT'); antwoord('robot');
    expect(stand.dictee.robot.fout).toBe(1); expect(stand.dictee.robot.goed).toBe(0);
    expect(stand.dag.verbeterd).toBe(1); expect(stand.dag.dieren.voeren).toBe(1);
    expect(beloon).toHaveBeenCalledExactlyOnceWith(1);
    dicteeScherm(stand, 'voeren', beloon, klaar, vi.fn());
    antwoord('robot'); klik('[data-verder]');
    expect(stand.dag.dieren.voeren).toBe(2); expect(klaar).toHaveBeenCalledOnce();
    expect(stand.dictee.robot.goed).toBe(1);
  });
  it('telt het bekijken van een woord als hulp en geeft het dagbonusje eenmaal', () => {
    const stand = nieuweStand(); stand.weekwoorden = [{ woord: 'robot', zin: 'De robot helpt.', categorie: 'schoolwoord' }];
    stand.dag.dieren = { voeren: 2, borstelen: 2, apporteren: 1 };
    const beloon = vi.fn(); dicteeScherm(stand, 'apporteren', beloon, vi.fn(), vi.fn());
    klik('[data-voorbeeld]'); expect(document.querySelector<HTMLInputElement>('input')!.disabled).toBe(true);
    klik('[data-voorbeeld]'); antwoord('robot'); antwoord('robot');
    expect(stand.dag.woordenGoed).toBe(0); expect(stand.dag.woordenFout).toBe(1);
    expect(beloon.mock.calls).toEqual([[1], [4]]);
  });
  it('weigert lege of uitgesloten weeklijsten zonder bestaande instellingen te verliezen', () => {
    const stand = nieuweStand(), wijzig = vi.fn(); oudersScherm(stand, wijzig, vi.fn());
    document.querySelector<HTMLTextAreaElement>('textarea')!.value = 'robot';
    document.querySelectorAll<HTMLInputElement>('[data-categorie]').forEach((c) => c.checked = c.value === 'ei-ij');
    klik('[data-bewaar]'); expect(wijzig).not.toHaveBeenCalled(); expect(stand.weekwoorden).toEqual([]);
    document.querySelector<HTMLInputElement>('[value="schoolwoord"]')!.checked = true;
    klik('[data-bewaar]'); expect(wijzig).toHaveBeenCalledOnce(); expect(stand.weekwoorden[0].woord).toBe('robot');
  });
});
