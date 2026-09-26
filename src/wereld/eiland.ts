// Het eiland: gras, strand, water, bomen, de stal, de wei en het hondenhok.

import * as THREE from 'three';
import { Fysica, botserUitBlok } from '../spel/fysica';
import { blok, blokOp, dynamisch, tekstBord, voegStatischSamen, zaadRng, type Tekstbord } from './bouwstenen';
import { WACHTWOORD } from './geheimen';

export const EILAND_RAND = 35; // gras loopt van -35 tot 35
export const WATER_HOOGTE = -0.7;
export const STARTPUNT = new THREE.Vector3(0, 0, 10);

export interface Eiland {
  groep: THREE.Group;
  stalBord: Tekstbord;
  hokBord: Tekstbord;
  wolken: THREE.Group[];
}

/** Voegt een zichtbaar blok toe dat ook botst. */
function vastBlok(groep: THREE.Group, f: Fysica, b: number, h: number, d: number, kleur: string, x: number, y: number, z: number) {
  const mesh = blokOp(b, h, d, kleur, x, y, z);
  groep.add(mesh);
  f.voegToe(botserUitBlok(x, y + h / 2, z, b, h, d));
  return mesh;
}

/** Bord op twee paaltjes. `hoek` draait het bord om de y-as. */
function bordOpPalen(groep: THREE.Group, f: Fysica, tekst: string, x: number, z: number, hoek: number, b = 4, h = 1.6, achterTekst = tekst) {
  const bordGroep = new THREE.Group();
  bordGroep.position.set(x, 0, z);
  bordGroep.rotation.y = hoek;
  const hout = '#8a5a2b';
  const onder = 2.8; // hoog genoeg om eronder door te lopen
  bordGroep.add(blokOp(0.2, onder + h, 0.2, hout, -b / 2 + 0.3, 0, 0));
  bordGroep.add(blokOp(0.2, onder + h, 0.2, hout, b / 2 - 0.3, 0, 0));
  bordGroep.add(blok(b, h, 0.15, '#a0703d', 0, onder + h / 2, 0));
  const bord = tekstBord(tekst, b - 0.2, h - 0.2, { breedte: 640 });
  bord.mesh.position.set(0, onder + h / 2, 0.08);
  bordGroep.add(bord.mesh);
  const achter = tekstBord(achterTekst, b - 0.2, h - 0.2, { breedte: 640 });
  achter.mesh.position.set(0, onder + h / 2, -0.08);
  achter.mesh.rotation.y = Math.PI;
  bordGroep.add(achter.mesh);
  groep.add(bordGroep);
  // Botsers voor de paaltjes (in wereldcoördinaten)
  const c = Math.cos(hoek);
  const s = Math.sin(hoek);
  for (const px of [-b / 2 + 0.3, b / 2 - 0.3]) {
    f.voegToe(botserUitBlok(x + px * c, 1.5, z - px * s, 0.3, 3, 0.3));
  }
  return bord;
}

function boom(groep: THREE.Group, f: Fysica, x: number, z: number, rng: () => number) {
  const hoogte = 2.2 + rng() * 1.4;
  const groen = ['#4caf50', '#43a047', '#5cbf60', '#3d9a41'][Math.floor(rng() * 4)];
  groep.add(blokOp(0.6, hoogte, 0.6, '#7a4f2a', x, 0, z));
  const kruin = 2 + rng() * 0.8;
  groep.add(blokOp(kruin, kruin * 0.9, kruin, groen, x, hoogte - 0.3, z));
  groep.add(blokOp(kruin * 0.6, kruin * 0.5, kruin * 0.6, groen, x, hoogte - 0.3 + kruin * 0.9, z));
  f.voegToe(botserUitBlok(x, hoogte / 2, z, 0.7, hoogte, 0.7));
  f.voegToe(botserUitBlok(x, hoogte - 0.3 + kruin * 0.45, z, kruin, kruin * 0.9, kruin, 'kruin'));
}

function stal(groep: THREE.Group, f: Fysica): Tekstbord {
  const rood = '#b8423a';
  const wit = '#f4efe6';
  const dak = '#5b3a2e';
  const H = 3.4;
  // Achterwand, zijwanden, voorkant met een grote deuropening (voorkant kijkt naar +x)
  vastBlok(groep, f, 0.4, H, 8, rood, -25, 0, -6);
  vastBlok(groep, f, 10, H, 0.4, rood, -20, 0, -10);
  vastBlok(groep, f, 10, H, 0.4, rood, -20, 0, -2);
  vastBlok(groep, f, 0.4, H, 2.5, rood, -15, 0, -8.75);
  vastBlok(groep, f, 0.4, H, 2.5, rood, -15, 0, -3.25);
  vastBlok(groep, f, 0.4, 0.8, 3, rood, -15, 2.6, -6);
  // Witte randen
  for (const [x, z] of [[-15, -10], [-15, -2], [-25, -10], [-25, -2], [-15, -7.5], [-15, -4.5]]) {
    groep.add(blokOp(0.5, H, 0.5, wit, x, 0, z));
  }
  groep.add(blok(0.5, 0.25, 3.2, wit, -15, 2.6, -6));
  // Kruis op de open staldeur
  const deur = blokOp(0.15, 2.4, 1.3, rood, -14.2, 0, -8.2);
  deur.rotation.y = -0.9;
  groep.add(deur);
  // Dak (twee schuine delen) en de driehoeken van de gevels
  const hoek = Math.atan2(1.8, 4.5);
  const lengte = Math.hypot(4.5, 1.8) + 0.3;
  const zuid = blok(11, 0.3, lengte, dak, -20, H + 0.95, -3.75);
  zuid.rotation.x = hoek;
  const noord = blok(11, 0.3, lengte, dak, -20, H + 0.95, -8.25);
  noord.rotation.x = -hoek;
  groep.add(zuid, noord);
  for (const x of [-15, -25]) {
    for (let i = 0; i < 4; i++) {
      groep.add(blokOp(0.36, 0.45, 7.6 - i * 2, rood, x, H + i * 0.45, -6));
    }
  }
  // Binnen: hooibalen en een waterbak
  vastBlok(groep, f, 1.6, 1, 1.2, '#e9c46a', -23.8, 0, -8.8);
  vastBlok(groep, f, 1.6, 1, 1.2, '#e9c46a', -23.8, 1, -8.8);
  vastBlok(groep, f, 1.6, 1, 1.2, '#e9c46a', -23.8, 0, -7.4);
  vastBlok(groep, f, 2.2, 0.7, 0.9, '#8d99a6', -21, 0, -2.8);
  groep.add(blokOp(2.0, 0.05, 0.7, '#4fb3e8', -21, 0.62, -2.8, false));
  // Bord boven de deur
  const bord = tekstBord('Stal', 4.2, 1.1, { breedte: 640 });
  bord.mesh.position.set(-14.7, H + 0.9, -6);
  bord.mesh.rotation.y = Math.PI / 2;
  groep.add(bord.mesh);
  return bord;
}

function wei(groep: THREE.Group, f: Fysica) {
  const x0 = -28;
  const x1 = -14;
  const z0 = 1;
  const z1 = 13;
  const hek = '#f4efe6';
  groep.add(blokOp(x1 - x0, 0.02, z1 - z0, '#8fd06a', (x0 + x1) / 2, 0, (z0 + z1) / 2, false));
  const zijde = (ax: number, az: number, bx: number, bz: number) => {
    const lengte = Math.hypot(bx - ax, bz - az);
    const langsX = Math.abs(bx - ax) > Math.abs(bz - az);
    const n = Math.round(lengte / 2);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      groep.add(blokOp(0.22, 1.3, 0.22, hek, ax + (bx - ax) * t, 0, az + (bz - az) * t));
    }
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    for (const y of [0.55, 1.0]) {
      groep.add(blok(langsX ? lengte : 0.12, 0.14, langsX ? 0.12 : lengte, hek, mx, y, mz));
    }
    f.voegToe(botserUitBlok(mx, 0.65, mz, langsX ? lengte : 0.3, 1.3, langsX ? 0.3 : lengte));
  };
  zijde(x0, z0, x1, z0);
  zijde(x0, z1, x1, z1);
  zijde(x0, z0, x0, z1);
  // Oostkant met een opening (hek staat open)
  zijde(x1, z0, x1, 5);
  zijde(x1, 9, x1, z1);
  // Voerbak in de wei
  vastBlok(groep, f, 1.8, 0.6, 0.8, '#8a5a2b', -24, 0, 10);
  groep.add(blokOp(1.6, 0.1, 0.6, '#9ccc65', -24, 0.55, 10, false));
}

function hondenhok(groep: THREE.Group, f: Fysica): Tekstbord {
  const x = -9;
  const z = -9;
  vastBlok(groep, f, 2.4, 1.6, 2.2, '#4f86c6', x, 0, z);
  groep.add(blokOp(1.0, 1.1, 0.05, '#2a2340', x, 0, z + 1.11, false)); // opening
  const hoek = 0.55;
  const links = blok(1.6, 0.18, 2.6, '#d9534f', x - 0.62, 2.0, z);
  links.rotation.z = hoek;
  const rechts = blok(1.6, 0.18, 2.6, '#d9534f', x + 0.62, 2.0, z);
  rechts.rotation.z = -hoek;
  groep.add(links, rechts);
  groep.add(blokOp(0.8, 0.18, 0.8, '#c0c7d0', x + 2, 0, z + 1.6)); // etensbak
  groep.add(blokOp(0.6, 0.06, 0.6, '#a0652b', x + 2, 0.18, z + 1.6, false));
  const bord = tekstBord('Hok', 2.2, 0.7, { breedte: 512 });
  bord.mesh.position.set(x, 1.9, z + 1.36);
  groep.add(bord.mesh);
  return bord;
}

function dorpBinnenkort(groep: THREE.Group, f: Fysica) {
  bordOpPalen(groep, f, 'Binnenkort:\nhet dorp!', 0, -27, 0, 4.4, 2);
  const oranje = '#ff8a3d';
  for (const [x, z] of [[-3, -29], [3, -29], [-1.5, -31], [1.8, -31.5]]) {
    groep.add(blokOp(0.5, 0.8, 0.5, oranje, x, 0, z));
    groep.add(blokOp(0.52, 0.12, 0.52, '#ffffff', x, 0.45, z, false));
  }
  vastBlok(groep, f, 1.2, 1.2, 1.2, '#b07a45', -4.5, 0, -31);
  vastBlok(groep, f, 1.2, 1.2, 1.2, '#b07a45', -4.5, 1.2, -31);
  vastBlok(groep, f, 1.2, 1.2, 1.2, '#b07a45', -3.2, 0, -31.5);
}

const wolkMateriaal = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#dfe9f5', fog: false });

function wolk(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const n = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const s = 3 + rng() * 4;
    g.add(blok(s * 1.6, s * 0.7, s, wolkMateriaal, i * 3 - n * 1.5, rng() * 1.2, (rng() - 0.5) * 3, false));
  }
  g.position.set((rng() - 0.5) * 220, 30 + rng() * 12, (rng() - 0.5) * 220);
  return g;
}

/** Plekken waar geen bomen mogen staan (stal, wei, paden, obby-start, ...). */
const VRIJE_ZONES: [number, number, number, number][] = [
  [-27, -12, -12, 0], // stal en hondenhok
  [-30, -12, 0, 15], // wei
  [-7, 7, -2, 16], // startplek en welkomstbord
  [-12, 6, -9, -2], // pad naar de stal
  [-35, -26, -9, -3], // trampoline achter de stal
  [-35, -30, -28, -20], // begin van de stapstenen
  [0, 35, 3, 12], // pad naar de obby
  [24, 35, -8, 10], // start van de obby
  [-8, 8, -34, -24], // dorp (binnenkort)
];

function inVrijeZone(x: number, z: number): boolean {
  return VRIJE_ZONES.some(([x0, x1, z0, z1]) => x > x0 - 1.5 && x < x1 + 1.5 && z > z0 - 1.5 && z < z1 + 1.5);
}

export function bouwEiland(scene: THREE.Scene, f: Fysica): Eiland {
  const groep = new THREE.Group();
  scene.add(groep);

  // Grond: gras met een zandrand, daaromheen water
  groep.add(blokOp(EILAND_RAND * 2, 3, EILAND_RAND * 2, '#6cc24a', 0, -3, 0, false));
  f.voegToe(botserUitBlok(0, -1.5, 0, EILAND_RAND * 2, 3, EILAND_RAND * 2));
  const zand = EILAND_RAND * 2 + 7;
  groep.add(blokOp(zand, 2.85, zand, '#f2d59b', 0, -3, 0, false));
  f.voegToe(botserUitBlok(0, -1.575, 0, zand, 2.85, zand));
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshStandardMaterial({ color: '#3aa3e3', roughness: 0.3, metalness: 0.05, transparent: true, opacity: 0.9 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_HOOGTE;
  water.receiveShadow = true;
  groep.add(water);

  // Pad van de startplek naar de obby
  const pad = '#e9cf98';
  groep.add(blokOp(3, 0.03, 8, pad, 0, 0, 10, false));
  groep.add(blokOp(30, 0.03, 3, pad, 15, 0, 7.5, false));
  groep.add(blokOp(3, 0.03, 12, pad, -6, 0, 0, false));
  groep.add(blokOp(9, 0.03, 3, pad, -10.5, 0, -6, false));

  // Borden
  // Op de achterkant staat het geheime wachtwoord voor de schatkist.
  bordOpPalen(groep, f, 'Welkom in\nNintes Wereld!', 0, 3, 0, 5, 2, `Psst... het geheime\nwachtwoord is:\n${WACHTWOORD}`);
  bordOpPalen(groep, f, 'Deuren-obby  →', 5.5, 4.5, 0, 4.2, 1.1);
  bordOpPalen(groep, f, '←  Stal', -5, 4.5, 0, 3, 1.1);

  const stalBord = stal(groep, f);
  wei(groep, f);
  const hokBord = hondenhok(groep, f);
  dorpBinnenkort(groep, f);

  // Bomen, bloemen en stenen op vaste (maar willekeurig ogende) plekken
  const rng = zaadRng(2026);
  let bomen = 0;
  for (let poging = 0; poging < 400 && bomen < 48; poging++) {
    const x = (rng() - 0.5) * (EILAND_RAND * 2 - 4);
    const z = (rng() - 0.5) * (EILAND_RAND * 2 - 4);
    if (inVrijeZone(x, z)) continue;
    boom(groep, f, x, z, rng);
    bomen++;
  }
  const bloemKleuren = ['#ff6fa8', '#ffd23f', '#ffffff', '#b57bff', '#ff8a3d'];
  for (let i = 0; i < 140; i++) {
    const x = (rng() - 0.5) * (EILAND_RAND * 2 - 2);
    const z = (rng() - 0.5) * (EILAND_RAND * 2 - 2);
    if (inVrijeZone(x, z) && rng() > 0.25) continue;
    groep.add(blokOp(0.06, 0.3, 0.06, '#3d8b37', x, 0, z, false));
    groep.add(blokOp(0.22, 0.18, 0.22, bloemKleuren[i % bloemKleuren.length], x, 0.3, z, false));
  }
  for (let i = 0; i < 10; i++) {
    const x = (rng() - 0.5) * (EILAND_RAND * 2 - 6);
    const z = (rng() - 0.5) * (EILAND_RAND * 2 - 6);
    if (inVrijeZone(x, z)) continue;
    const s = 0.6 + rng() * 0.8;
    groep.add(blokOp(s * 1.3, s * 0.7, s, '#9aa3ab', x, 0, z));
  }

  const wolken: THREE.Group[] = [];
  const wolkRng = zaadRng(7);
  for (let i = 0; i < 14; i++) {
    const w = dynamisch(wolk(wolkRng));
    wolken.push(w);
    groep.add(w);
  }

  voegStatischSamen(groep);

  return { groep, stalBord, hokBord, wolken };
}
