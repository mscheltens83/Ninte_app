// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Fysica, botserUitBlok, type Lichaam } from '../src/spel/fysica';
import { KAVEL, KAVEL_RAND, opKavel, ONDERDELEN, KLEUREN } from '../src/bouwen/onderdelen';
import {
  blokHoogte, draaiMeubel, haalBlokWeg, haalMuurWeg, meubelOp, muurOp, nieuweBouw, plaatsBlok, plaatsMeubel, plaatsMuur,
  plaatsVloer, valideerBouw, type BouwStand,
} from '../src/bouwen/stand';
import { hoogsteToren, isRechthoek, omtrek, plattegrond, zelfdeVorm } from '../src/bouwen/analyse';
import { BOUW_OPDRACHTEN, L_TEKENING, heeftOnderdeel, leesAntwoord, opdrachtKlaar, opdrachtOpen, volgendeOpdracht, opdrachtMetId } from '../src/bouwen/opdrachten';
import { BouwWereld, INGANG, celMidden, randBij, randMidden, vakjeBij } from '../src/bouwen/wereld';
import { BouwModus, tekeningSvg } from '../src/bouwen/bouwModus';
import { MEUBEL_MODELLEN, meubelModel } from '../src/bouwen/modellen';
import { bloemPlekken } from '../src/ritme/feestwereld';
import { kiesMuziekPlek } from '../src/ritme/plek';
import { leesBackUp, exporteerStand, nieuweStand, valideerStand } from '../src/opslag/opslag';
import { KAST, itemStatus, slotTekst } from '../src/figuren/uiterlijk';

vi.mock('../src/wereld/bouwstenen', async (origineel) => {
  const actual = await origineel<typeof import('../src/wereld/bouwstenen')>();
  return { ...actual, tekstBord: () => ({ mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1)), zetTekst: vi.fn() }) };
});

/** Een dichte rechthoekige kamer van b bij d vakjes met de hoek op (x, z). Eén muurstuk mag een deur zijn. */
function kamer(s: BouwStand, x: number, z: number, b: number, d: number, deur?: { r: 'h' | 'v'; x: number; z: number }) {
  for (let i = 0; i < b; i++) { plaatsMuur(s, 'h', x + i, z, 'muur', 'roze'); plaatsMuur(s, 'h', x + i, z + d, 'muur', 'roze'); }
  for (let i = 0; i < d; i++) { plaatsMuur(s, 'v', x, z + i, 'muur', 'roze'); plaatsMuur(s, 'v', x + b, z + i, 'muur', 'roze'); }
  if (deur) plaatsMuur(s, deur.r, deur.x, deur.z, 'deur', 'hout');
}

beforeEach(() => {
  document.body.innerHTML = '<div id="spel"><div id="vlak"></div><div id="schermen"></div></div>';
});

describe('bouwregels', () => {
  it('zet, vervangt en verwijdert muren alleen op geldige randen', () => {
    const s = nieuweBouw();
    expect(plaatsMuur(s, 'h', 0, 0, 'muur', 'roze')).toBe(true);
    expect(plaatsMuur(s, 'h', 0, 0, 'muur', 'roze')).toBe(false);
    expect(plaatsMuur(s, 'h', 0, 0, 'raam', 'wit')).toBe(true);
    expect(s.muren).toHaveLength(1);
    expect(muurOp(s, 'h', 0, 0)?.soort).toBe('raam');
    expect(plaatsMuur(s, 'h', KAVEL.breedte, 0, 'muur', 'roze')).toBe(false);
    expect(plaatsMuur(s, 'v', KAVEL.breedte, KAVEL.diepte - 1, 'muur', 'roze')).toBe(true);
    expect(plaatsMuur(s, 'v', 0, KAVEL.diepte, 'muur', 'roze')).toBe(false);
    expect(haalMuurWeg(s, 'h', 0, 0)).toBe(true);
    expect(haalMuurWeg(s, 'h', 0, 0)).toBe(false);
  });
  it('schuift meubels naar binnen, voorkomt overlap en draait alleen als het past', () => {
    const s = nieuweBouw();
    const bank = plaatsMeubel(s, 'bank', KAVEL.breedte - 1, 0, 0, 'blauw')!;
    expect(bank.x).toBe(KAVEL.breedte - 2);
    expect(meubelOp(s, KAVEL.breedte - 1, 0)).toBe(bank);
    expect(plaatsMeubel(s, 'stoel', KAVEL.breedte - 2, 0, 0, 'roze')).toBeNull();
    expect(draaiMeubel(s, bank)).toBe(true);
    expect(meubelOp(s, KAVEL.breedte - 2, 1)).toBe(bank);
    plaatsMeubel(s, 'stoel', KAVEL.breedte - 1, 0, 0, 'roze');
    plaatsMeubel(s, 'stoel', KAVEL.breedte - 1, 1, 0, 'roze');
    expect(draaiMeubel(s, bank)).toBe(false); // terugdraaien botst met de stoelen
  });
  it('stapelt blokken tot een maximum en houdt meubels en blokken uit elkaar', () => {
    const s = nieuweBouw();
    for (let i = 0; i < 12; i++) plaatsBlok(s, 3, 3, 'blauw');
    expect(blokHoogte(s, 3, 3)).toBe(10);
    expect(plaatsMeubel(s, 'tafel', 3, 3, 0, 'hout')).toBeNull();
    plaatsMeubel(s, 'tafel', 5, 5, 0, 'hout');
    expect(plaatsBlok(s, 5, 5, 'roze')).toBe(false);
    expect(haalBlokWeg(s, 3, 3)).toBe(true);
    expect(blokHoogte(s, 3, 3)).toBe(9);
    expect(plaatsBlok(s, -1, 0, 'roze')).toBe(false);
  });
});

describe('kamers lezen', () => {
  it('herkent een dichte kamer, ook met een deur', () => {
    const s = nieuweBouw();
    kamer(s, 2, 2, 4, 3, { r: 'h', x: 3, z: 5 });
    const p = plattegrond(s);
    expect(p.kamers).toHaveLength(1);
    expect(isRechthoek(p.kamers[0].vakjes, 4, 3)).toBe(true);
    expect(p.kamers[0].deurNaarBuiten).toBe(true);
    expect(omtrek(p.kamers[0].vakjes)).toBe(14);
  });
  it('telt een kamer met een gat of met een hekje niet als dicht', () => {
    const s = nieuweBouw();
    kamer(s, 2, 2, 3, 3);
    haalMuurWeg(s, 'h', 2, 2);
    expect(plattegrond(s).kamers).toHaveLength(0);
    plaatsMuur(s, 'h', 2, 2, 'hek', 'wit');
    expect(plattegrond(s).kamers).toHaveLength(0);
    plaatsMuur(s, 'h', 2, 2, 'raam', 'wit');
    expect(plattegrond(s).kamers).toHaveLength(1);
  });
  it('gebruikt de rand van de kavel niet als muur', () => {
    const s = nieuweBouw();
    for (let i = 0; i < 3; i++) plaatsMuur(s, 'h', i, 2, 'muur', 'roze');
    for (let i = 0; i < 2; i++) plaatsMuur(s, 'v', 3, i, 'muur', 'roze');
    expect(plattegrond(s).kamers).toHaveLength(0);
  });
  it('vindt twee kamers met een deur ertussen', () => {
    const s = nieuweBouw();
    kamer(s, 1, 1, 6, 3, { r: 'h', x: 2, z: 4 });
    for (let i = 0; i < 3; i++) plaatsMuur(s, 'v', 4, 1 + i, 'muur', 'roze');
    let p = plattegrond(s);
    expect(p.kamers).toHaveLength(2);
    expect(p.deurTussen).toEqual([]);
    plaatsMuur(s, 'v', 4, 2, 'deur', 'hout');
    p = plattegrond(s);
    expect(p.deurTussen).toHaveLength(1);
  });
  it('vergelijkt vormen, ook gedraaid', () => {
    const gedraaid = L_TEKENING.map(([x, z]) => [-z + 5, x + 1] as [number, number]);
    expect(zelfdeVorm(gedraaid, L_TEKENING)).toBe(true);
    const gespiegeld = L_TEKENING.map(([x, z]) => [3 - x, z] as [number, number]);
    expect(zelfdeVorm(gespiegeld, L_TEKENING)).toBe(false);
    expect(zelfdeVorm([[0, 0]], L_TEKENING)).toBe(false);
  });
  it('meet de hoogste toren', () => {
    const s = nieuweBouw();
    expect(hoogsteToren(s)).toBe(0);
    for (let i = 0; i < 3; i++) plaatsBlok(s, 1, 1, 'roze');
    plaatsBlok(s, 2, 2, 'roze');
    expect(hoogsteToren(s)).toBe(3);
  });
});

describe('bouwopdrachten', () => {
  const met = (id: string) => opdrachtMetId(id)!;
  it('heeft unieke opdrachten met bestaande beloningen', () => {
    expect(new Set(BOUW_OPDRACHTEN.map((o) => o.id)).size).toBe(BOUW_OPDRACHTEN.length);
    for (const o of BOUW_OPDRACHTEN) {
      for (const id of o.beloning.onderdelen) expect(ONDERDELEN.some((x) => x.id === id)).toBe(true);
      expect(o.klopt(nieuweBouw()), o.id).toBe(false);
    }
  });
  it('controleert elk bouwwerk', () => {
    const a = nieuweBouw();
    kamer(a, 0, 0, 3, 4);
    expect(met('kamer-4-3').klopt(a)).toBe(true);
    const b = nieuweBouw();
    kamer(b, 0, 0, 2, 8);
    expect(met('kamer-16').klopt(b)).toBe(true);
    expect(met('kamer-4-3').klopt(b)).toBe(false);
    const c = nieuweBouw();
    kamer(c, 1, 1, 6, 3, { r: 'h', x: 2, z: 4 });
    for (let i = 0; i < 3; i++) plaatsMuur(c, 'v', 4, 1 + i, i === 1 ? 'deur' : 'muur', 'roze');
    expect(met('twee-kamers').klopt(c)).toBe(true);
    const zonderBuitendeur = nieuweBouw();
    kamer(zonderBuitendeur, 1, 1, 6, 3);
    for (let i = 0; i < 3; i++) plaatsMuur(zonderBuitendeur, 'v', 4, 1 + i, i === 1 ? 'deur' : 'muur', 'roze');
    expect(met('twee-kamers').klopt(zonderBuitendeur)).toBe(false);
    const d = nieuweBouw();
    // De L-vorm: 4 breed, 3 diep, met rechtsonder een hoekje eruit.
    for (const [r, x, z] of [['h', 0, 0], ['h', 1, 0], ['h', 2, 0], ['h', 3, 0], ['v', 4, 0], ['v', 4, 1], ['h', 3, 2], ['h', 2, 2], ['v', 2, 2], ['h', 1, 3], ['h', 0, 3], ['v', 0, 2], ['v', 0, 1], ['v', 0, 0]] as const) {
      plaatsMuur(d, r, x + 3, z + 3, 'muur', 'paars');
    }
    expect(met('plattegrond').klopt(d)).toBe(true);
    const e = nieuweBouw();
    for (let i = 0; i < 8; i++) plaatsBlok(e, 0, 0, 'geel');
    expect(met('toren').klopt(e)).toBe(true);
    plaatsBlok(e, 0, 0, 'geel');
    expect(met('toren').klopt(e)).toBe(false);
    const f = nieuweBouw();
    plaatsMeubel(f, 'zwembad', 2, 2, 0, 'lichtblauw');
    expect(met('zwembad').klopt(f)).toBe(true);
  });
  it('vraagt ook een goed antwoord als er een rekenvraag is', () => {
    const s = nieuweBouw();
    kamer(s, 0, 0, 4, 3);
    const o = met('kamer-4-3');
    expect(opdrachtKlaar(s, o)).toBe(false);
    s.antwoorden[o.id] = 13;
    expect(opdrachtKlaar(s, o)).toBe(false);
    s.antwoorden[o.id] = 14;
    expect(opdrachtKlaar(s, o)).toBe(true);
    expect(leesAntwoord('14 muurstukken')).toBe(14);
    expect(leesAntwoord('1,5')).toBe(1.5);
    expect(leesAntwoord('veel')).toBeNull();
  });
  it('geeft opdrachten op volgorde en ontgrendelt onderdelen', () => {
    const s = nieuweBouw();
    expect(volgendeOpdracht(s)?.id).toBe('kamer-4-3');
    expect(opdrachtOpen(s, met('kamer-16'))).toBe(false);
    expect(heeftOnderdeel(s, 'muur')).toBe(true);
    expect(heeftOnderdeel(s, 'raam')).toBe(false);
    s.voltooid.push('kamer-4-3');
    expect(heeftOnderdeel(s, 'raam')).toBe(true);
    expect(opdrachtOpen(s, met('kamer-16'))).toBe(true);
    expect(volgendeOpdracht(s)?.id).toBe('kamer-16');
  });
});

describe('opslag van de bouwkavel', () => {
  it('bewaart een bouwwerk en leest het precies terug', () => {
    const stand = nieuweStand();
    kamer(stand.bouwen, 1, 1, 4, 3, { r: 'v', x: 1, z: 2 });
    plaatsVloer(stand.bouwen, 2, 2, 'roze');
    plaatsMeubel(stand.bouwen, 'bed', 2, 1, 1, 'paars');
    for (let i = 0; i < 4; i++) plaatsBlok(stand.bouwen, 9, 9, KLEUREN[i].id);
    stand.bouwen.dak = true;
    stand.bouwen.voltooid = ['kamer-4-3'];
    stand.bouwen.antwoorden = { 'kamer-4-3': 14 };
    const terug = leesBackUp(exporteerStand(stand));
    expect(terug.bouwen).toEqual(stand.bouwen);
  });
  it('opent oude spelstanden en herstelt kapotte bouwgegevens veilig', () => {
    const oud = nieuweStand() as unknown as Record<string, unknown>;
    delete oud.bouwen;
    expect(valideerStand(oud).aangepast).toBe(false);
    const r = valideerBouw({ muren: [{ r: 'x', x: 0, z: 0, soort: 'muur', kleur: 'roze' }, { r: 'h', x: 0, z: 0, soort: 'muur', kleur: 'roze' }],
      blokken: [{ x: 1, z: 1, y: 3, kleur: 'roze' }], meubels: [{ id: 'raket', x: 0, z: 0, draai: 0, kleur: 'roze' }], dak: 'ja' });
    expect(r.aangepast).toBe(true);
    expect(r.stand.muren).toHaveLength(1);
    expect(r.stand.blokken).toHaveLength(0);
    expect(r.stand.meubels).toHaveLength(0);
    expect(valideerBouw('kapot').aangepast).toBe(true);
  });
});

describe('de bouwkavel in de wereld', () => {
  function wereld() {
    const f = new Fysica();
    f.voegToe(botserUitBlok(-30, -1.5, -50, 200, 3, 200));
    const stand = nieuweBouw();
    const w = new BouwWereld(new THREE.Scene(), f, stand);
    return { f, stand, w };
  }
  function loop(f: Fysica, l: Lichaam, vx: number, vz: number, seconden: number, spring = false) {
    if (spring) l.snelheid.y = 10.5;
    for (let t = 0; t < seconden; t += 1 / 60) {
      l.snelheid.x = vx;
      l.snelheid.z = vz;
      l.snelheid.y = Math.max(l.snelheid.y - 28 / 60, -32);
      f.beweeg(l, 1 / 60);
    }
  }
  it('rekent vakjes en randen om naar de wereld en terug', () => {
    const m = celMidden(3, 4);
    expect(vakjeBij(m.x, m.z)).toEqual([3, 4]);
    const r = randMidden('v', 5, 2);
    expect(randBij(r.x + 0.1, r.z + 0.4)).toEqual(['v', 5, 2]);
    expect(randBij(r.x + 0.4, r.z, 'h')?.[0]).toBe('h');
    expect(randBij(KAVEL.x0 - 30, KAVEL.z0)).toBeNull();
    expect(opKavel(INGANG.x, INGANG.z)).toBe(false);
  });
  it('laat je door een deur naar binnen lopen, maar niet door een muur', () => {
    const { f, stand, w } = wereld();
    kamer(stand, 4, 4, 3, 3, { r: 'h', x: 5, z: 7 });
    w.sync();
    const binnen = celMidden(5, 5);
    const voorDeur = celMidden(5, 8);
    const l: Lichaam = { pos: { x: voorDeur.x, y: 0, z: voorDeur.z }, snelheid: { x: 0, y: 0, z: 0 }, straal: 0.4, hoogte: 2.5, opGrond: true, grond: null };
    loop(f, l, 0, -4, 1);
    expect(l.pos.z).toBeLessThan(binnen.z + 0.5);
    const naastDeur = celMidden(4, 8);
    const m: Lichaam = { ...l, pos: { x: naastDeur.x, y: 0, z: naastDeur.z }, snelheid: { x: 0, y: 0, z: 0 } };
    loop(f, m, 0, -4, 1);
    expect(m.pos.z).toBeGreaterThan(KAVEL.z0 + 7 * KAVEL.cel);
  });
  it('ruimt oude botsingen op als je iets weghaalt', () => {
    const { f, stand, w } = wereld();
    const voor = f.botsers.length;
    kamer(stand, 0, 0, 2, 2);
    w.sync();
    expect(f.botsers.length).toBe(voor + 8);
    stand.muren = [];
    w.sync();
    expect(f.botsers.length).toBe(voor);
  });
  it('laat je op een blok springen en geeft een dak boven kamers', () => {
    const { f, stand, w } = wereld();
    plaatsBlok(stand, 2, 2, 'roze');
    w.sync();
    const blok = celMidden(2, 2);
    const l: Lichaam = { pos: { x: blok.x - 2, y: 0, z: blok.z }, snelheid: { x: 0, y: 0, z: 0 }, straal: 0.4, hoogte: 2.5, opGrond: true, grond: null };
    loop(f, l, 4, 0, 0.6, true);
    loop(f, l, 0, 0, 0.5);
    expect(l.pos.y).toBeCloseTo(KAVEL.cel, 1);
    kamer(stand, 6, 6, 2, 2);
    stand.dak = true;
    w.sync();
    w.update({ x: INGANG.x, y: 0, z: INGANG.z });
    expect(w['dak'].visible).toBe(true);
    const binnen = celMidden(6, 6);
    w.update({ x: binnen.x, y: 0, z: binnen.z });
    expect(w['dak'].visible).toBe(false);
  });
  it('vindt het blok dat je aantikt', () => {
    const { stand, w } = wereld();
    for (let i = 0; i < 3; i++) plaatsBlok(stand, 5, 5, 'roze');
    const m = celMidden(5, 5);
    const straal = new THREE.Ray(new THREE.Vector3(m.x, 30, m.z), new THREE.Vector3(0, -1, 0));
    expect(w.raakBlok(straal)).toMatchObject({ x: 5, z: 5, y: 2 });
    expect(w.raakBlok(new THREE.Ray(new THREE.Vector3(m.x + 10, 30, m.z), new THREE.Vector3(0, -1, 0)))).toBeNull();
  });
  it('heeft voor elk meubel een model en houdt bloemen weg van de kavel', () => {
    for (const o of ONDERDELEN.filter((x) => x.soort === 'meubel')) {
      expect(MEUBEL_MODELLEN[o.id], o.id).toBeTypeOf('function');
      expect(meubelModel(o.id, 'roze', 1, 1).children.length).toBeGreaterThan(0);
    }
    expect(bloemPlekken(300).every((b) => !opKavel(b.x, b.z, 2))).toBe(true);
    expect(kiesMuziekPlek({ pos: { x: KAVEL.x0 + 5, y: 0, z: KAVEL.z0 + 5 }, opWolken: false, inObby: false })).toBe('kavel');
  });
});

describe('bouwmodus', () => {
  function open() {
    const f = new Fysica();
    const stand = nieuweBouw();
    const w = new BouwWereld(new THREE.Scene(), f, stand);
    const camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 500);
    const vlak = document.getElementById('vlak')!;
    vlak.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) });
    const voltooid: string[] = [];
    const klaar = vi.fn();
    const modus = new BouwModus({
      wereld: w, stand, camera, vlak, houder: document.getElementById('spel')!,
      geluid: { klik: vi.fn(), plaats: vi.fn(), weg: vi.fn(), fout: vi.fn() },
      spreek: vi.fn(), opVoltooid: (o) => voltooid.push(o.id), opBewaar: vi.fn(), opKlaar: klaar,
    });
    modus.start();
    modus.update(5);
    camera.updateMatrixWorld();
    const tik = (wereldPunt: THREE.Vector3) => {
      const p = wereldPunt.clone().project(camera);
      const x = ((p.x + 1) / 2) * 800, y = ((1 - p.y) / 2) * 600;
      vlak.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 1 }));
      vlak.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId: 1 }));
    };
    const klik = (sel: string) => document.querySelector<HTMLButtonElement>(sel)!.click();
    return { stand, w, modus, tik, klik, voltooid, klaar };
  }
  it('plaatst een muur waar je tikt en haalt hem weg als je nog eens tikt', () => {
    const { stand, tik } = open();
    const r = randMidden('h', 4, 3);
    tik(new THREE.Vector3(r.x, 0, r.z));
    expect(muurOp(stand, 'h', 4, 3)).toBeDefined();
    tik(new THREE.Vector3(r.x, 0, r.z));
    expect(muurOp(stand, 'h', 4, 3)).toBeUndefined();
  });
  it('bouwt met blokken, meubels, kleur, gum en ongedaan maken', () => {
    const { stand, tik, klik } = open();
    klik('[data-cat="blokken"]');
    klik('[data-kleur="geel"]');
    const m = celMidden(6, 6);
    tik(new THREE.Vector3(m.x, 0, m.z));
    tik(new THREE.Vector3(m.x, KAVEL.cel, m.z));
    expect(blokHoogte(stand, 6, 6)).toBe(2);
    expect(stand.blokken.every((b) => b.kleur === 'geel')).toBe(true);
    klik('[data-cat="binnen"]');
    klik('[data-item="bed"]');
    const b = celMidden(2, 2);
    tik(new THREE.Vector3(b.x, 0, b.z));
    expect(meubelOp(stand, 2, 2)?.id).toBe('bed');
    expect(document.querySelector<HTMLButtonElement>('[data-item="bank"]')!.disabled).toBe(true);
    klik('[data-cat="gum"]');
    tik(new THREE.Vector3(m.x, KAVEL.cel * 1.5, m.z));
    expect(blokHoogte(stand, 6, 6)).toBe(1);
    klik('[data-terug]');
    expect(blokHoogte(stand, 6, 6)).toBe(2);
  });
  it('haalt een opdracht met bouwen én het goede antwoord', () => {
    const { stand, klik, voltooid } = open();
    kamer(stand, 1, 1, 4, 3);
    const veld = document.querySelector<HTMLInputElement>('[data-vraag] input')!;
    veld.value = '12';
    document.querySelector<HTMLFormElement>('[data-vraag]')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(voltooid).toEqual([]);
    document.querySelector<HTMLInputElement>('[data-vraag] input')!.value = '14';
    document.querySelector<HTMLFormElement>('[data-vraag]')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(voltooid).toEqual(['kamer-4-3']);
    expect(document.querySelector('.bouw-melding')!.textContent).toContain('Raam');
    klik('[data-cat="muren"]');
    expect(document.querySelector<HTMLButtonElement>('[data-item="raam"]')!.disabled).toBe(false);
  });
  it('stopt met Klaar en toont een tekening bij de plattegrond-opdracht', () => {
    const { klik, klaar, w } = open();
    expect(w.bouwmodus).toBe(true);
    klik('[data-klaar]');
    expect(klaar).toHaveBeenCalled();
    expect(w.bouwmodus).toBe(false);
    expect(tekeningSvg(L_TEKENING)).toContain('10 vakjes');
  });
});

describe('bouwhelm', () => {
  it('ligt in de kast voor wie alle bouwopdrachten haalt', () => {
    const item = KAST.find((i) => i.id === 'hoed-bouwhelm')!;
    const basis = { bezit: [], gehaald: [], drieSterren: false, hoefijzers: 0 };
    expect(itemStatus(item, { ...basis, geheimen: [] })).toBe('op-slot');
    expect(slotTekst(item)).toContain('bouwopdrachten');
    expect(itemStatus(item, { ...basis, geheimen: ['bouwmeester'] })).toBe('beschikbaar');
    expect(KAVEL_RAND.x1).toBeGreaterThan(KAVEL.x0);
  });
});
