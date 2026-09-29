import { BOS_BEWONERS, BOS_OPLOSSINGEN, BRUG_VARIANTEN, DECORATIES, GEBIEDEN, MATERIAALPLEKKEN, MISSIES, ONDERWERPEN, PIZZA_INSTELLINGEN, PLANT_MODEL, ROBOT_ROUTES, TUIN_DAGEN, WINKEL_MANDEN, WINKEL_VARIANTEN, missieMetId,
  type Decoratie, type Gebied, type Missie, type Niveau, type Onderwerp, type RobotBlok, type RobotRoute } from './inhoud';

export type MissieStatus = 'beschikbaar' | 'actief' | 'voltooid';
export interface PizzaStuk { smaak: 'kaas' | 'tomaat'; noemer: 2 | 4 | 8 }
export interface Plant { water: number; licht: number; hoogte: number }
export interface Meting { a: number; b: number; waterA: number; waterB: number; lichtA: number; lichtB: number }
export interface Werk {
  verzameld: string[]; balken: number; mand: [number, number, number]; gelezen: string[];
  keuze: string; antwoord: string; verdeling: number; pizza: PizzaStuk[]; programma: RobotBlok[];
  planten: [Plant, Plant]; metingen: Meting[];
}
export interface MissieStand { status: MissieStatus; stap: number; niveau: Niveau; pogingen: number; hint: number; werk: Werk }
export interface Inrichting { id: number; item: Decoratie; x: number; z: number; draai: number }
export interface AvontuurStand {
  versie: 1; missies: Record<string, MissieStand>; actief: string | null; beloningen: string[];
  decoraties: Decoratie[]; inrichting: Inrichting[]; volgendeId: number; gebieden: Gebied[];
  niveaus: Record<Onderwerp, Niveau>; onderwerpen: Onderwerp[]; huidigGebied: Gebied;
}
export const HUT_BREEDTE = 8, HUT_DIEPTE = 6;
export function leegWerk(): Werk {
  return { verzameld: [], balken: 0, mand: [0, 0, 0], gelezen: [], keuze: '', antwoord: '', verdeling: 0, pizza: [], programma: [],
    planten: [{ water: 0, licht: 0, hoogte: PLANT_MODEL.startHoogte }, { water: 0, licht: 0, hoogte: PLANT_MODEL.startHoogte }], metingen: [] };
}
export function nieuwAvontuur(): AvontuurStand {
  return { versie: 1, missies: Object.fromEntries(MISSIES.map(m => [m.id, { status: 'beschikbaar', stap: 0, niveau: 1, pogingen: 0, hint: 0, werk: leegWerk() }])),
    actief: null, beloningen: [], decoraties: [], inrichting: [], volgendeId: 1,
    gebieden: GEBIEDEN.filter(g => g.id !== 'boomhut').map(g => g.id),
    niveaus: { bouwen: 1, geld: 1, lezen: 1, breuken: 1, programmeren: 1, natuur: 1 }, onderwerpen: [...ONDERWERPEN], huidigGebied: 'dorp' };
}
export function magBeginnen(a: AvontuurStand, m: Missie): boolean {
  return a.gebieden.includes(m.gebied) && a.onderwerpen.includes(m.onderwerp);
}
export function beginMissie(a: AvontuurStand, id: string): boolean {
  const m = missieMetId(id), s = a.missies[id];
  if (!m || !s || !magBeginnen(a, m)) return false;
  if (s.status === 'voltooid') return false;
  if (s.status === 'beschikbaar') { s.status = 'actief'; s.stap = 1; s.niveau = a.niveaus[m.onderwerp]; }
  a.actief = id;
  return true;
}
function voltooi(a: AvontuurStand, m: Missie): boolean {
  const s = a.missies[m.id];
  if (s.status !== 'actief') return false;
  s.status = 'voltooid'; s.stap = m.stappen.length;
  if (!a.beloningen.includes(m.id)) { a.beloningen.push(m.id); if (!a.decoraties.includes(m.beloning)) a.decoraties.push(m.beloning); }
  if (a.actief === m.id) a.actief = null;
  if (m.soort === 'brug' && !a.gebieden.includes('boomhut')) a.gebieden.push('boomhut');
  return true;
}
export function ontdekHut(a: AvontuurStand): boolean {
  if (!a.gebieden.includes('boomhut')) return false;
  for (const d of ['mat', 'kruk', 'plant'] as const) if (!a.decoraties.includes(d)) a.decoraties.push(d);
  beginMissie(a, 'hut');
  return true;
}
export function verzamel(a: AvontuurStand, id: string, bron: string): boolean {
  const m = missieMetId(id); if (!m || !beginMissie(a, id)) return false;
  const s = a.missies[id];
  const geldig = id === 'brug' ? MATERIAALPLEKKEN.some(p => p.id === bron) : id === 'welkom' && bron === 'vlag';
  if (!geldig || s.werk.verzameld.includes(bron)) return false;
  s.werk.verzameld.push(bron);
  if ((id === 'brug' && s.werk.verzameld.length === 3) || id === 'welkom') s.stap = 2;
  return true;
}
export function leesAanwijzing(a: AvontuurStand, bewoner: string): boolean {
  if (!BOS_BEWONERS.some(b => b.id === bewoner) || !beginMissie(a, 'bos-sleutel')) return false;
  const s = a.missies['bos-sleutel']; if (!s.werk.gelezen.includes(bewoner)) s.werk.gelezen.push(bewoner);
  if (s.werk.gelezen.length === 3) s.stap = 2;
  return true;
}
export function brugMaten(a: AvontuurStand) { return BRUG_VARIANTEN[a.missies.brug.niveau - 1]; }
export function plaatsBalk(a: AvontuurStand, verwijderen = false): boolean {
  const s = a.missies.brug, { doel, balk } = brugMaten(a);
  if (s.status !== 'actief' || s.stap !== 2) return false;
  if (verwijderen) { if (!s.werk.balken) return false; s.werk.balken--; }
  else { if (s.werk.balken >= doel / balk + 1 || s.werk.balken >= s.werk.verzameld.length * 3) return false; s.werk.balken++; }
  return true;
}
/** Alle geldwaarden zijn gehele centen; geen afronding via floats. */
export function centen(tekst: string): number | null {
  const s = tekst.trim().replace(/^€\s*/, '').replace('.', ',');
  const m = /^(\d{1,5})(?:,(\d{1,2}))?$/.exec(s);
  return m ? Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0')) : null;
}
export function euro(n: number): string { return `€ ${Math.floor(n / 100)},${String(n % 100).padStart(2, '0')}`; }
export function mandTotaal(mand: readonly number[], prijzen: readonly number[]): number { return mand.reduce((som, aantal, i) => som + aantal * prijzen[i], 0); }
export function winkelOpdracht(m: Missie, s: MissieStand) {
  const v = WINKEL_VARIANTEN[s.niveau - 1];
  return { ...v, nodig: [...(m.soort === 'budget' ? WINKEL_MANDEN.budget : m.soort === 'wisselgeld' ? WINKEL_MANDEN.wisselgeld : v.nodig)] };
}
export function pizzaEenheden(stukken: readonly PizzaStuk[], smaak?: PizzaStuk['smaak']): number {
  return stukken.filter(s => !smaak || s.smaak === smaak).reduce((n, s) => n + 8 / s.noemer, 0);
}
export function gelijkwaardig(teller: number, noemer: number, t: number, n: number): boolean { return noemer > 0 && n > 0 && teller * n === t * noemer; }
export function pizzaDoel(m: Missie, s: MissieStand) {
  return { verdeling: PIZZA_INSTELLINGEN.verdelingen[s.niveau-1],
    kaas: m.soort === 'gelijk' ? PIZZA_INSTELLINGEN.kaas[s.niveau-1] : PIZZA_INSTELLINGEN.kaasBestelling, tomaat: m.soort === 'bestelling' ? PIZZA_INSTELLINGEN.tomaatBestelling : 0,
    kleineNoemer: PIZZA_INSTELLINGEN.kleineNoemers[s.niveau-1] };
}
export function robotRoute(m: Missie): RobotRoute { return ROBOT_ROUTES[m.soort === 'obstakel' ? 1 : m.soort === 'herhaal' ? 2 : 0]; }
export interface RobotStand { x: number; z: number; richting: number; klaar: boolean; fout: string | null }
export function robotStart(route: RobotRoute): RobotStand { return { x: route.start[0], z: route.start[1], richting: route.richting, klaar: false, fout: null }; }
export function robotStap(route: RobotRoute, stand: RobotStand, actie: RobotBlok['actie']): RobotStand {
  const s = { ...stand }; if (s.fout || s.klaar) return s;
  if (actie === 'links') s.richting = (s.richting + 3) % 4;
  else if (actie === 'rechts') s.richting = (s.richting + 1) % 4;
  else if (actie === 'interactie') {
    if (s.x === route.doel[0] && s.z === route.doel[1]) s.klaar = true;
    else s.fout = 'De knop staat bij de ster. Breng Ro daarheen en probeer opnieuw.';
  } else {
    const [dx, dz] = [[0, -1], [1, 0], [0, 1], [-1, 0]][s.richting];
    const x = s.x + dx, z = s.z + dz;
    if (x < 0 || z < 0 || x >= route.breedte || z >= route.hoogte || route.obstakels.some(([bx, bz]) => bx === x && bz === z))
      s.fout = 'Hier staat een rand of kist. Ro blijft veilig staan. Pas je route aan.';
    else { s.x = x; s.z = z; }
  }
  return s;
}
export function vouwProgramma(programma: readonly RobotBlok[]): { actie: RobotBlok['actie']; blok: number }[] {
  if (programma.length > 32 || programma.some(b => !['vooruit', 'links', 'rechts', 'interactie'].includes(b.actie) || !Number.isInteger(b.herhaal) || b.herhaal < 1 || b.herhaal > 8)) return [];
  return programma.flatMap((b, i) => Array.from({ length: b.herhaal }, () => ({ actie: b.actie, blok: i }))).slice(0, 128);
}
export function voerRobotUit(route: RobotRoute, programma: RobotBlok[]): RobotStand {
  let s = robotStart(route); const stappen = vouwProgramma(programma);
  if (!stappen.length) return { ...s, fout: 'Voeg eerst een geldig blok toe.' };
  for (const stap of stappen) { s = robotStap(route, s, stap.actie); if (s.fout || s.klaar) break; }
  return s;
}
export function groei(water: number, licht: number): number {
  if (water === PLANT_MODEL.waterIdeaal && licht === PLANT_MODEL.lichtIdeaal) return PLANT_MODEL.groeiIdeaal;
  return Math.abs(water - PLANT_MODEL.waterIdeaal) <= 1 && Math.abs(licht - PLANT_MODEL.lichtIdeaal) <= 1 ? PLANT_MODEL.groeiBijna : 0;
}
export function tuinDag(w: Werk): boolean {
  if (w.metingen.length >= 7) return false;
  for (const p of w.planten) p.hoogte += groei(p.water, p.licht);
  w.metingen.push({ a: w.planten[0].hoogte, b: w.planten[1].hoogte, waterA: w.planten[0].water, waterB: w.planten[1].water, lichtA: w.planten[0].licht, lichtB: w.planten[1].licht });
  return true;
}
export function vrijeTegel(x: number, z: number): boolean {
  // Twee tegels breed van de deur naar de achterwand: inrichting blokkeert nooit de uitgang.
  return Number.isInteger(x) && Number.isInteger(z) && x >= 0 && x < HUT_BREEDTE && z >= 0 && z < HUT_DIEPTE && x !== 3 && x !== 4;
}
export function plaatsDecoratie(a: AvontuurStand, item: Decoratie, x: number, z: number, bestaandId?: number): boolean {
  if (!a.gebieden.includes('boomhut') || !a.decoraties.includes(item) || !vrijeTegel(x, z)) return false;
  const bestaand = bestaandId === undefined ? undefined : a.inrichting.find(v => v.id === bestaandId && v.item === item);
  if (bestaandId !== undefined && !bestaand) return false;
  if (a.inrichting.some(v => v.id !== bestaandId && (v.item === item || (v.x === x && v.z === z)))) return false;
  if (bestaand) { bestaand.x = x; bestaand.z = z; }
  else a.inrichting.push({ id: a.volgendeId++, item, x, z, draai: 0 });
  const m = missieMetId('hut')!; if (a.missies.hut.status === 'actief') voltooi(a, m);
  return true;
}
export function terugleggen(a: AvontuurStand, id: number): boolean {
  const i = a.inrichting.findIndex(v => v.id === id); if (i < 0) return false;
  a.inrichting.splice(i, 1); return true;
}
export function controleerMissie(a: AvontuurStand, id: string): { goed: boolean; tekst: string } {
  const m = missieMetId(id), s = a.missies[id];
  if (!m || !s || s.status !== 'actief') return { goed: false, tekst: 'Kies eerst een beschikbare opdracht.' };
  const w = s.werk;
  let goed = false, tekst = 'Bijna! Bekijk je opdracht of vraag een hint. Je kunt veilig opnieuw proberen.';
  switch (m.soort) {
    case 'welkom': goed = s.stap === 2 && w.verzameld.includes('vlag'); break;
    case 'brug': { const b = brugMaten(a); goed = s.stap === 2 && w.balken * b.balk === b.doel; tekst = `Je brug is ${w.balken * b.balk} meter. Maak hem precies ${b.doel} meter. Verwijderen kan ook.`; break; }
    case 'hut': goed = a.inrichting.length > 0; break;
    case 'aantallen': case 'budget': case 'wisselgeld': {
      const v = winkelOpdracht(m, s), totaal = mandTotaal(w.mand, v.prijzen);
      goed = w.mand.every((n, i) => n === v.nodig[i]);
      if (m.soort === 'budget') goed &&= totaal <= v.budget && centen(w.antwoord) === v.budget - totaal;
      if (m.soort === 'wisselgeld') goed &&= centen(w.antwoord) === v.betaald - totaal;
      tekst = 'Controleer de aantallen in je mand. Reken daarna met de prijs van die mand. Er gaat geen echt geld af.'; break;
    }
    case 'sleutel': goed = s.stap === 2 && w.gelezen.length === 3 && w.keuze === String(BOS_OPLOSSINGEN.sleutel); tekst = 'Lees de aanwijzingen samen. Waar liep de eekhoorn heen? Wie riep dat zij de sleutel had?'; break;
    case 'volgorde': case 'woord': goed = w.keuze === String(BOS_OPLOSSINGEN[m.soort]); break;
    case 'verdelen': goed = w.verdeling === pizzaDoel(m, s).verdeling; break;
    case 'bestelling': case 'gelijk': {
      const d = pizzaDoel(m, s);
      goed = pizzaEenheden(w.pizza, 'kaas') === d.kaas && pizzaEenheden(w.pizza, 'tomaat') === d.tomaat;
      if (m.soort === 'gelijk') goed &&= w.pizza.every(p => p.noemer === d.kleineNoemer);
      tekst = 'Vergelijk de gevulde delen. Je kunt stukken terugleggen en andere pakken.'; break;
    }
    case 'route': case 'obstakel': case 'herhaal': {
      const r = voerRobotUit(robotRoute(m), w.programma); goed = r.klaar;
      if (m.soort === 'herhaal') goed &&= w.programma.some(b => b.herhaal > 1) && w.programma.length <= 5;
      tekst = r.fout ?? (m.soort === 'herhaal' ? 'Gebruik Herhaal en hoogstens vijf blokken. Eindig bij de ster met Interactie.' : 'Ro moet bij de ster de knop gebruiken met Interactie.'); break;
    }
    case 'verzorgen': goed = w.metingen.some(v => v.waterA === 2 && v.lichtA === 2); tekst = 'Kies 2 water en 2 licht en druk op Laat een dag verlopen.'; break;
    case 'vergelijken': goed = w.keuze === 'a' && w.metingen.some(v => v.waterA === 2 && v.waterB === 2 && v.lichtA === 2 && v.lichtB === 0); tekst = 'Geef beide planten 2 water; A krijgt 2 licht en B 0. Laat een dag verlopen en kies welke meer groeit.'; break;
    case 'meten': {
      const dagen = TUIN_DAGEN[s.niveau-1]; goed = w.metingen.length === dagen && w.metingen.every(v => v.waterA === PLANT_MODEL.waterIdeaal && v.lichtA === PLANT_MODEL.lichtIdeaal) && /^\d+$/.test(w.antwoord.trim()) && Number(w.antwoord) === dagen * PLANT_MODEL.groeiIdeaal;
      tekst = `Meet ${dagen} passende groeidagen. Trek de starthoogte van 2 cm van de eindhoogte af. Je kunt het onderzoek opnieuw starten.`; break;
    }
  }
  s.pogingen++;
  if (goed) { voltooi(a, m); tekst = `Gelukt! ${m.naam} is klaar. Je krijgt ${DECORATIES.find(d => d.id === m.beloning)!.naam.toLowerCase()} voor je boomhut.`; }
  return { goed, tekst };
}

/** Veilige migratie: ontbrekende avonturen worden nieuw, beschadigde velden gecontroleerd. */
export function valideerAvontuur(data: unknown): { stand: AvontuurStand; aangepast: boolean } {
  const uit = nieuwAvontuur(); if (data === undefined) return { stand: uit, aangepast: false };
  const rec = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
  const r = rec(data); let aangepast = false;
  if (r.versie !== 1) return { stand: uit, aangepast: true };
  const num = (v: unknown, min: number, max: number, basis = min): number => {
    if (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max) return v;
    if (v !== undefined) aangepast = true; return basis;
  };
  const lijst = <T extends string>(v: unknown, opties: readonly T[], basis: T[] = []): T[] => {
    if (v === undefined) return basis;
    if (!Array.isArray(v)) { aangepast = true; return basis; }
    const geldig = v.filter((x): x is T => typeof x === 'string' && opties.includes(x as T));
    if (geldig.length !== v.length || new Set(geldig).size !== geldig.length) aangepast = true;
    return [...new Set(geldig)];
  };
  const text = (v: unknown): string => { if (typeof v === 'string' && v.length <= 80) return v; if (v !== undefined) aangepast = true; return ''; };
  for (const o of ONDERWERPEN) uit.niveaus[o] = num(rec(r.niveaus)[o], 1, 3, 1) as Niveau;
  uit.onderwerpen = lijst(r.onderwerpen, ONDERWERPEN, [...ONDERWERPEN]);
  const missies = rec(r.missies);
  for (const m of MISSIES) {
    const s = rec(missies[m.id]), doel = uit.missies[m.id], w = rec(s.werk);
    if (s.status !== undefined && !['beschikbaar', 'actief', 'voltooid'].includes(s.status as string)) aangepast = true;
    else if (s.status) doel.status = s.status as MissieStatus;
    doel.stap = num(s.stap, 0, m.stappen.length); doel.niveau = num(s.niveau, 1, 3, 1) as Niveau;
    doel.pogingen = num(s.pogingen, 0, 100000); doel.hint = num(s.hint, 0, 3);
    if (doel.status === 'voltooid') doel.stap = m.stappen.length;
    else if (doel.status === 'beschikbaar') doel.stap = 0;
    else if (doel.stap === 0 || doel.stap >= m.stappen.length) { doel.stap = 1; aangepast = true; }
    const d = doel.werk;
    d.verzameld = lijst(w.verzameld, m.id === 'brug' ? MATERIAALPLEKKEN.map(p => p.id) : ['vlag']);
    d.gelezen = lijst(w.gelezen, BOS_BEWONERS.map(b => b.id));
    d.balken = num(w.balken, 0, 7); d.keuze = text(w.keuze); d.antwoord = text(w.antwoord); d.verdeling = num(w.verdeling, 0, 8);
    if (Array.isArray(w.mand) && w.mand.length === 3) d.mand = w.mand.map(v => num(v, 0, 20)) as Werk['mand']; else if (w.mand !== undefined) aangepast = true;
    if (Array.isArray(w.pizza) && w.pizza.length <= 8) {
      for (const v of w.pizza) { const p = rec(v); if (['kaas', 'tomaat'].includes(p.smaak as string) && [2,4,8].includes(p.noemer as number)) d.pizza.push(p as unknown as PizzaStuk); else aangepast = true; }
      if (pizzaEenheden(d.pizza) > 8) { d.pizza = []; aangepast = true; }
    } else if (w.pizza !== undefined) aangepast = true;
    if (Array.isArray(w.programma) && w.programma.length <= 32) {
      for (const v of w.programma) { const b = rec(v); if (['vooruit','links','rechts','interactie'].includes(b.actie as string) && typeof b.herhaal === 'number' && Number.isInteger(b.herhaal) && b.herhaal >= 1 && b.herhaal <= 8) d.programma.push({ actie: b.actie as RobotBlok['actie'], herhaal: b.herhaal }); else aangepast = true; }
    } else if (w.programma !== undefined) aangepast = true;
    if (Array.isArray(w.planten) && w.planten.length === 2) d.planten = w.planten.map(v => { const p = rec(v); return { water: num(p.water, 0, 4), licht: num(p.licht, 0, 4), hoogte: num(p.hoogte, 2, 23, 2) }; }) as Werk['planten']; else if (w.planten !== undefined) aangepast = true;
    if (Array.isArray(w.metingen) && w.metingen.length <= 7) d.metingen = w.metingen.map(v => { const p = rec(v); return { a: num(p.a, 2, 23, 2), b: num(p.b, 2, 23, 2), waterA: num(p.waterA, 0, 4), waterB: num(p.waterB, 0, 4), lichtA: num(p.lichtA, 0, 4), lichtB: num(p.lichtB, 0, 4) }; }); else if (w.metingen !== undefined) aangepast = true;
    // Herleid de meerstapsstatus; een beschadigde volgorde sluit verzamelen niet af.
    if (doel.status === 'actief' && m.id === 'brug') doel.stap = d.verzameld.length === 3 ? 2 : 1;
    if (doel.status === 'actief' && m.id === 'welkom') doel.stap = d.verzameld.includes('vlag') ? 2 : 1;
    if (doel.status === 'actief' && m.id === 'bos-sleutel') doel.stap = d.gelezen.length === 3 ? 2 : 1;
    if (doel.status === 'voltooid' && m.id === 'brug') {
      const b=BRUG_VARIANTEN[doel.niveau-1];
      if(d.balken!==b.doel/b.balk || d.verzameld.length!==3){d.balken=b.doel/b.balk;d.verzameld=MATERIAALPLEKKEN.map(p=>p.id);aangepast=true;}
    }
  }
  // Ontgrendelingen/beloningen afleiden uit voltooide opdrachten; nooit opnieuw uitbetalen.
  const klaar = MISSIES.filter(m => uit.missies[m.id].status === 'voltooid');
  uit.beloningen = klaar.map(m => m.id);
  uit.decoraties = lijst(r.decoraties, DECORATIES.map(d => d.id));
  for (const m of klaar) if (!uit.decoraties.includes(m.beloning)) uit.decoraties.push(m.beloning);
  if (uit.missies.brug.status === 'voltooid') { uit.gebieden.push('boomhut'); for (const d of ['mat','kruk','plant'] as const) if (!uit.decoraties.includes(d)) uit.decoraties.push(d); }
  const actief = typeof r.actief === 'string' && MISSIES.some(m => m.id === r.actief && uit.missies[m.id].status === 'actief') ? r.actief : null;
  uit.actief = actief; uit.huidigGebied = GEBIEDEN.some(g => g.id === r.huidigGebied && uit.gebieden.includes(g.id)) ? r.huidigGebied as Gebied : 'dorp';
  if (Array.isArray(r.inrichting) && r.inrichting.length <= DECORATIES.length) {
    for (const v of r.inrichting) {
      const p = rec(v);
      if(typeof p.id!=='number'||!Number.isInteger(p.id)||p.id<1||p.id>1000000||typeof p.x!=='number'||typeof p.z!=='number'||!vrijeTegel(p.x,p.z)){aangepast=true;continue;}
      const id = p.id, x = p.x, z = p.z, item = p.item as Decoratie;
      if (uit.gebieden.includes('boomhut') && uit.decoraties.includes(item) && vrijeTegel(x,z) && !uit.inrichting.some(i => i.id === id || i.item === item || (i.x === x && i.z === z)))
        uit.inrichting.push({ id, x, z, item, draai: num(p.draai, 0, 3) });
      else aangepast = true;
    }
  } else if (r.inrichting !== undefined) aangepast = true;
  uit.volgendeId = Math.max(num(r.volgendeId, 1, 1000001, 1), ...uit.inrichting.map(v => v.id + 1));
  return { stand: uit, aangepast };
}
