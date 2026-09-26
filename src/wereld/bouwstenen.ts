// Kleine hulpmiddelen om de blokjeswereld mee te bouwen.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const LETTERTYPE = '"Arial Rounded MT Bold", ui-rounded, "Nunito", system-ui, sans-serif';

const eenheidsblok = new THREE.BoxGeometry(1, 1, 1);
const materialen = new Map<string, THREE.MeshStandardMaterial>();

export function materiaal(kleur: string): THREE.MeshStandardMaterial {
  let m = materialen.get(kleur);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: kleur, roughness: 0.85, metalness: 0 });
    materialen.set(kleur, m);
  }
  return m;
}

/** Een blok met breedte (x), hoogte (y) en diepte (z), gecentreerd op (x, y, z). */
export function blok(
  b: number,
  h: number,
  d: number,
  kleur: string | THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  schaduw = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(eenheidsblok, typeof kleur === 'string' ? materiaal(kleur) : kleur);
  mesh.scale.set(b, h, d);
  mesh.position.set(x, y, z);
  mesh.castShadow = schaduw;
  mesh.receiveShadow = true;
  return mesh;
}

/** Een blok waarvan de onderkant op `y` staat in plaats van het midden. */
export function blokOp(
  b: number,
  h: number,
  d: number,
  kleur: string | THREE.Material,
  x: number,
  y: number,
  z: number,
  schaduw = true,
): THREE.Mesh {
  return blok(b, h, d, kleur, x, y + h / 2, z, schaduw);
}

export interface TekstOpties {
  breedte?: number; // pixels van het canvas
  hoogte?: number;
  achtergrond?: string | null;
  rand?: string | null;
  kleur?: string;
  lettergrootte?: number;
  vet?: boolean;
}

function afgerondeRechthoek(ctx: CanvasRenderingContext2D, x: number, y: number, b: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + b, y, x + b, y + h, r);
  ctx.arcTo(x + b, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + b, y, r);
  ctx.closePath();
}

/** Tekent tekst op een canvas; past de lettergrootte aan zodat alles past. */
export function tekenTekst(canvas: HTMLCanvasElement, tekst: string, o: TekstOpties = {}) {
  const ctx = canvas.getContext('2d')!;
  const b = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, b, h);
  if (o.achtergrond) {
    const r = Math.min(b, h) * 0.18;
    afgerondeRechthoek(ctx, 4, 4, b - 8, h - 8, r);
    ctx.fillStyle = o.achtergrond;
    ctx.fill();
    if (o.rand) {
      ctx.lineWidth = Math.max(6, h * 0.06);
      ctx.strokeStyle = o.rand;
      ctx.stroke();
    }
  }
  const regels = tekst.split('\n');
  let grootte = o.lettergrootte ?? Math.floor((h * 0.62) / regels.length);
  const gewicht = o.vet === false ? '500' : '700';
  const maxBreedte = b * 0.88;
  ctx.font = `${gewicht} ${grootte}px ${LETTERTYPE}`;
  const breedste = () => Math.max(...regels.map((r) => ctx.measureText(r).width));
  while (breedste() > maxBreedte && grootte > 10) {
    grootte -= 2;
    ctx.font = `${gewicht} ${grootte}px ${LETTERTYPE}`;
  }
  ctx.fillStyle = o.kleur ?? '#2b2340';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const regelHoogte = grootte * 1.15;
  const startY = h / 2 - ((regels.length - 1) * regelHoogte) / 2;
  regels.forEach((r, i) => ctx.fillText(r, b / 2, startY + i * regelHoogte));
}

export interface Tekstbord {
  mesh: THREE.Mesh;
  zetTekst(tekst: string): void;
}

/** Een plat bord met tekst. `b` en `h` zijn de afmetingen in de wereld. */
export function tekstBord(tekst: string, b: number, h: number, o: TekstOpties = {}): Tekstbord {
  const canvas = document.createElement('canvas');
  canvas.width = o.breedte ?? 512;
  canvas.height = o.hoogte ?? Math.round((canvas.width * h) / b);
  const opties = { achtergrond: '#fff8e7', rand: '#8a5a2b', ...o };
  tekenTekst(canvas, tekst, opties);
  const textuur = new THREE.CanvasTexture(canvas);
  textuur.colorSpace = THREE.SRGBColorSpace;
  textuur.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: textuur, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(b, h), mat);
  return {
    mesh,
    zetTekst(nieuw: string) {
      tekenTekst(canvas, nieuw, opties);
      textuur.needsUpdate = true;
    },
  };
}

/** Een naamkaartje dat altijd naar de camera kijkt (zoals boven pets in Roblox). */
export function naamkaartje(tekst: string, hoogte = 0.45): THREE.Sprite & { zetTekst(t: string): void } {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const opties: TekstOpties = { achtergrond: 'rgba(30,20,50,0.55)', rand: null, kleur: '#ffffff', lettergrootte: 38 };
  tekenTekst(canvas, tekst, opties);
  const textuur = new THREE.CanvasTexture(canvas);
  textuur.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: textuur, depthWrite: false })) as THREE.Sprite & {
    zetTekst(t: string): void;
  };
  sprite.scale.set(hoogte * 4, hoogte, 1);
  sprite.zetTekst = (t: string) => {
    tekenTekst(canvas, t, opties);
    textuur.needsUpdate = true;
  };
  return sprite;
}

/** Voorspelbare willekeur, zodat de wereld er elke keer hetzelfde uitziet. */
export function zaadRng(zaad: number): () => number {
  let s = zaad >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Markeer iets dat beweegt of verandert; dat wordt niet samengevoegd. */
export function dynamisch<T extends THREE.Object3D>(o: T): T {
  o.userData.dynamisch = true;
  return o;
}

/**
 * Voegt alle vaste blokken met hetzelfde materiaal samen tot één object.
 * Dat scheelt de iPad honderden tekenopdrachten per beeldje.
 */
export function voegStatischSamen(groep: THREE.Group) {
  groep.updateMatrixWorld(true);
  const inverse = groep.matrixWorld.clone().invert();
  const bakken = new Map<string, { materiaal: THREE.Material; schaduw: boolean; geos: THREE.BufferGeometry[] }>();
  const weg: THREE.Mesh[] = [];

  const bezoek = (o: THREE.Object3D) => {
    if (o.userData.dynamisch) return;
    if (o instanceof THREE.Mesh && !Array.isArray(o.material)) {
      const m = o.material as THREE.Material & { map?: THREE.Texture | null };
      if ((m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshLambertMaterial) && !m.map) {
        const sleutel = `${m.uuid}|${o.castShadow}`;
        let bak = bakken.get(sleutel);
        if (!bak) {
          bak = { materiaal: m, schaduw: o.castShadow, geos: [] };
          bakken.set(sleutel, bak);
        }
        const matrix = inverse.clone().multiply(o.matrixWorld);
        const geo = o.geometry.clone().applyMatrix4(matrix);
        bak.geos.push(geo.index ? geo.toNonIndexed() : geo);
        weg.push(o);
      }
    }
    for (const kind of o.children) bezoek(kind);
  };
  bezoek(groep);

  for (const o of weg) o.parent?.remove(o);
  for (const { materiaal, schaduw, geos } of bakken.values()) {
    const samen = mergeGeometries(geos, false);
    if (!samen) continue;
    const mesh = new THREE.Mesh(samen, materiaal);
    mesh.castShadow = schaduw;
    mesh.receiveShadow = true;
    groep.add(mesh);
    for (const g of geos) g.dispose();
  }
}
