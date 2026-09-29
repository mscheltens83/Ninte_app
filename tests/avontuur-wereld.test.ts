// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Fysica, type Lichaam } from '../src/spel/fysica';
import { nieuwAvontuur, beginMissie, verzamel, plaatsBalk, controleerMissie, plaatsDecoratie, ontdekHut, leesAanwijzing } from '../src/avontuur/logica';
import { AvontuurWereld, BRUG_START } from '../src/avontuur/wereld';
import { Avontuur, pizzaSvg } from '../src/avontuur/schermen';
import { nieuweStand } from '../src/opslag/opslag';
import { MISSIES, ROBOT_ROUTES, GEBIEDEN, LEES_STEUN, TUIN_DAGEN } from '../src/avontuur/inhoud';
import type { Spel } from '../src/spel/Spel';
vi.mock('../src/wereld/bouwstenen',async origineel=>{
  const actual=await origineel<typeof import('../src/wereld/bouwstenen')>();
  return {...actual,tekstBord:()=>({mesh:new THREE.Mesh(new THREE.BoxGeometry(1,1,.1)),zetTekst:vi.fn()})};
});
vi.mock('../src/leren/voorlezen',()=>({spreek:vi.fn()}));
beforeEach(()=>{document.body.innerHTML='<div id="schermen"></div><div id="hud"><div id="knoppen-rechts"></div></div><div id="vlak"></div>';localStorage.clear();});
function fixture(){
  const stand=nieuweStand();const spel={scene:new THREE.Scene(),fysica:new Fysica(),modus:'spelen',speler:{pos:{x:0,y:0,z:-43}},hud:{hud:document.getElementById('hud')!,meld:vi.fn(),toonBanner:vi.fn()},
    pauzeer:vi.fn(),hervat:vi.fn(),zetSpeler:vi.fn(),geluid:{aan:false},muziek:{zetAan:vi.fn()},pasKwaliteitAan:vi.fn()} as unknown as Spel;
  const av=new Avontuur(spel,stand);return {stand,spel,av};
}
function click(sel:string){const b=document.querySelector<HTMLButtonElement>(sel);expect(b).not.toBeNull();b!.click();}
describe('werkende missieinterfaces',()=>{
  it('opent een beschikbare opdracht vanuit het boek en toont drie hints',()=>{
    const {av,stand}=fixture();av.toonBoek();click('[data-missie="welkom"]');
    expect(stand.avontuur.missies.welkom.status).toBe('actief');expect(document.querySelector('h2')!.textContent).toContain('De vlag');
    click('[data-hint]');click('[data-hint]');click('[data-hint]');expect(stand.avontuur.missies.welkom.hint).toBe(3);
    expect(document.body.textContent).toContain('Voorbeeld met uitleg');
  });
  it('gebruikt materialen en unieke beloningen van ophalen tot zichtbaar resultaat',()=>{
    const {av,stand}=fixture();av.toonMissie('welkom');verzamel(stand.avontuur,'welkom','vlag');av.toonMissie('welkom');click('[data-plaatsvlag]');
    expect(stand.avontuur.missies.welkom.status).toBe('voltooid');expect(av.wereld.vlag.visible).toBe(true);
  });
  it('bouwt/verwijdert echte brugbalken via de interface',()=>{
    const {av,stand}=fixture();for(const p of ['werf','bosrand','labkrat'])verzamel(stand.avontuur,'brug',p);av.toonMissie('brug');
    for(let i=0;i<7;i++)click('[data-balk]');click('[data-controleer]');expect(stand.avontuur.missies.brug.status).toBe('actief');
    click('[data-wegbalk]');click('[data-controleer]');expect(stand.avontuur.missies.brug.status).toBe('voltooid');
  });
  it('bewaart het winkelantwoord tijdens het veranderen van de mand',()=>{
    const {av,stand}=fixture();av.toonMissie('winkel-budget');const veld=document.querySelector<HTMLInputElement>('[data-antwoord]')!;veld.value='8';veld.dispatchEvent(new Event('input'));
    click('[data-mand="1"][data-delta="1"]');expect(document.querySelector<HTMLInputElement>('[data-antwoord]')!.value).toBe('8');expect(stand.avontuur.missies['winkel-budget'].werk.antwoord).toBe('8');
  });
  it('plaatst en verplaatst boomhutspullen via tegels zonder het looppad te blokkeren',()=>{
    const {av,stand}=fixture();for(const p of ['werf','bosrand','labkrat'])verzamel(stand.avontuur,'brug',p);for(let i=0;i<6;i++)plaatsBalk(stand.avontuur);controleerMissie(stand.avontuur,'brug');
    av.toonHut();click('[data-item="plant"]');click('[data-x="0"][data-z="0"]');expect(stand.avontuur.inrichting[0]).toMatchObject({item:'plant',x:0,z:0});
    click('[data-x="0"][data-z="0"]');click('[data-x="1"][data-z="1"]');expect(stand.avontuur.inrichting[0]).toMatchObject({x:1,z:1});
    expect(document.querySelector<HTMLButtonElement>('[data-x="3"][data-z="1"]')!.disabled).toBe(true);
    click('[data-x="1"][data-z="1"]');click('[data-terug]');expect(stand.avontuur.inrichting).toHaveLength(0);expect(stand.avontuur.decoraties).toContain('plant');
  });
  it('tekent echte sectoren en voorkomt overvolle pizzaborden',()=>{
    const {av,stand}=fixture();av.toonMissie('pizza-bestelling');click('[data-pizza="kaas"][data-noemer="2"]');click('[data-pizza="tomaat"][data-noemer="4"]');click('[data-controleer]');expect(stand.avontuur.missies['pizza-bestelling'].status).toBe('voltooid');
    const html=pizzaSvg([{smaak:'kaas',noemer:4}]);expect(html).toContain('A85 85 0 0 1');expect(html).toContain('2 van 8');
  });
  it('stopt een robotprogramma bij het sluiten van de dialoog',()=>{
    vi.useFakeTimers();const {av,stand}=fixture();av.toonMissie('lab-route');for(let i=0;i<3;i++)click('[data-robot="vooruit"]');click('[data-robot="interactie"]');click('[data-run]');
    click('[data-sluit]');vi.runAllTimers();expect(stand.avontuur.missies['lab-route'].status).toBe('actief');vi.useRealTimers();
  });
  it('speelt alle 18 missies via de gekoppelde controllers en knoppen uit',()=>{
    vi.useFakeTimers();const {av,stand}=fixture();const a=stand.avontuur;
    av.toonMissie('welkom');verzamel(a,'welkom','vlag');av.toonMissie('welkom');click('[data-plaatsvlag]');
    for(const p of ['werf','bosrand','labkrat'])verzamel(a,'brug',p);av.toonMissie('brug');for(let i=0;i<6;i++)click('[data-balk]');click('[data-controleer]');
    av.toonHut();click('[data-item="plant"]');click('[data-x="0"][data-z="0"]');
    for(const id of ['winkel-aantallen','winkel-budget','winkel-wissel']){
      av.toonMissie(id);const aantallen=id==='winkel-aantallen'?[2,2,1]:id==='winkel-budget'?[0,2,1]:[1,0,1];
      aantallen.forEach((n,i)=>{for(let j=0;j<n;j++)click(`[data-mand="${i}"][data-delta="1"]`);});
      const input=document.querySelector<HTMLInputElement>('[data-antwoord]');if(input){input.value=id==='winkel-budget'?'8':'14';input.dispatchEvent(new Event('input'));}click('[data-controleer]');
    }
    for(const b of ['vos','uil','konijn'])leesAanwijzing(a,b);for(const id of ['bos-sleutel','bos-volgorde','bos-woord']){av.toonMissie(id);click('[data-keuze="0"]');click('[data-controleer]');}
    av.toonMissie('pizza-verdelen');click('[data-snij="2"]');click('[data-controleer]');
    av.toonMissie('pizza-bestelling');click('[data-pizza="kaas"][data-noemer="2"]');click('[data-pizza="tomaat"][data-noemer="4"]');click('[data-controleer]');
    av.toonMissie('pizza-gelijk');for(let i=0;i<2;i++)click('[data-pizza="kaas"][data-noemer="4"]');click('[data-controleer]');
    for(const [i,id] of ['lab-route','lab-obstakel','lab-herhaal'].entries()){
      beginMissie(a,id);a.missies[id].werk.programma=ROBOT_ROUTES[i].oplossing.map(b=>({...b}));av.toonMissie(id);click('[data-run]');vi.runAllTimers();
    }
    for(const id of ['tuin-verzorgen','tuin-vergelijken','tuin-meten']){
      av.toonMissie(id);
      const zet=(i:number,soort:string,n:number)=>{const select=document.querySelector<HTMLSelectElement>(`[data-plant="${i}"][data-soort="${soort}"]`)!;select.value=String(n);select.dispatchEvent(new Event('change'));};
      zet(0,'water',2);zet(0,'licht',2);if(id==='tuin-vergelijken')zet(1,'water',2);
      click('[data-dag]');if(id==='tuin-meten'){click('[data-dag]');const input=document.querySelector<HTMLInputElement>('[data-antwoord]')!;input.value='6';input.dispatchEvent(new Event('input'));}
      if(id==='tuin-vergelijken')click('[data-plantkeuze="a"]');click('[data-controleer]');
    }
    expect(MISSIES.map(m=>[m.id,a.missies[m.id].status])).toEqual(MISSIES.map(m=>[m.id,'voltooid']));expect(a.beloningen).toHaveLength(18);vi.useRealTimers();
  });
  it('verandert de robotvolgorde, stopt en reset zonder vastlopende timers',()=>{
    vi.useFakeTimers();const {av,stand}=fixture();av.toonMissie('lab-route');click('[data-robot="vooruit"]');click('[data-robot="rechts"]');click('[data-blokactie="omhoog"][data-index="1"]');
    expect(stand.avontuur.missies['lab-route'].werk.programma.map(b=>b.actie)).toEqual(['rechts','vooruit']);click('[data-run]');click('[data-stop]');vi.runAllTimers();
    expect(document.querySelector('[data-robotstatus]')!.textContent).toContain('startplek');click('[data-leeg]');expect(stand.avontuur.missies['lab-route'].werk.programma).toEqual([]);vi.useRealTimers();
  });
  it('weigert reset zonder bewuste bevestiging en bewaart instellingen per onderwerp',()=>{
    const {av,stand}=fixture();av.toonOuderAvonturen(vi.fn());click('[data-reset]');expect(stand.avontuur).toEqual(nieuwAvontuur());expect(document.body.textContent).toContain('Typ precies OPNIEUW');
    const input=document.querySelector<HTMLInputElement>('[data-onderwerp="geld"]')!;input.checked=false;const niveau=document.querySelector<HTMLSelectElement>('[data-niveau="breuken"]')!;niveau.value='3';click('[data-ouderbewaar]');
    expect(stand.avontuur.onderwerpen).not.toContain('geld');expect(stand.avontuur.niveaus.breuken).toBe(3);
  });
  it.each([1,2,3] as const)('past leessteun en afleiders aan niveau %s aan',niveau=>{
    const {av,stand}=fixture();stand.avontuur.niveaus.lezen=niveau;av.toonMissie('bos-sleutel');
    expect(document.querySelectorAll('[data-keuze]')).toHaveLength(niveau===3?5:3);
    expect(document.body.textContent!.includes(LEES_STEUN.sleutel)).toBe(niveau===1);
    for(const b of ['vos','uil','konijn'])leesAanwijzing(stand.avontuur,b);av.toonMissie('bos-sleutel');
    click('[data-keuze="1"]');click('[data-controleer]');expect(stand.avontuur.missies['bos-sleutel'].status).toBe('actief');
    click('[data-keuze="0"]');click('[data-controleer]');expect(stand.avontuur.missies['bos-sleutel'].status).toBe('voltooid');
  });
  it.each([1,2,3] as const)('houdt tuinopdracht, hints en beoordeling gelijk op niveau %s',niveau=>{
    const {av,stand}=fixture();stand.avontuur.niveaus.natuur=niveau;av.toonMissie('tuin-meten');const dagen=TUIN_DAGEN[niveau-1];
    expect(document.body.textContent).toContain(`na ${dagen} groeidagen`);expect(document.body.textContent).toContain(`Laat ${dagen} dagen verlopen`);
    for(let i=0;i<3;i++)click('[data-hint]');expect(document.body.textContent).toContain(`${dagen} dagen × 3 cm`);
    for(const soort of ['water','licht']){const v=document.querySelector<HTMLSelectElement>(`[data-plant="0"][data-soort="${soort}"]`)!;v.value='2';v.dispatchEvent(new Event('change'));}
    for(let i=0;i<dagen;i++)click('[data-dag]');const antwoord=document.querySelector<HTMLInputElement>('[data-antwoord]')!;antwoord.value=String(dagen*3);antwoord.dispatchEvent(new Event('input'));
    click('[data-controleer]');expect(stand.avontuur.missies['tuin-meten'].status).toBe('voltooid');
  });
  it('onderbreekt een uitgezet onderwerp zonder werk of gekozen niveau te verliezen',()=>{
    const {av,stand}=fixture();av.toonMissie('winkel-budget');click('[data-mand="1"][data-delta="1"]');av.toonOuderAvonturen(vi.fn());
    document.querySelector<HTMLInputElement>('[data-onderwerp="geld"]')!.checked=false;document.querySelector<HTMLSelectElement>('[data-niveau="geld"]')!.value='3';click('[data-ouderbewaar]');
    expect(stand.avontuur.actief).toBeNull();av.toonMissie('winkel-budget');expect(document.querySelector('[data-mand]')).toBeNull();
    expect(document.querySelector<HTMLButtonElement>('[data-missie="winkel-budget"]')!.disabled).toBe(true);
    av.toonOuderAvonturen(vi.fn());document.querySelector<HTMLInputElement>('[data-onderwerp="geld"]')!.checked=true;click('[data-ouderbewaar]');av.toonMissie('winkel-budget');
    expect(stand.avontuur.missies['winkel-budget'].werk.mand).toEqual([0,1,0]);expect(stand.avontuur.missies['winkel-budget'].niveau).toBe(1);
  });
});
describe('echte wereldgeometrie en fysica',()=>{
  it('heeft geen oversteek voor voltooiing en wel een begaanbaar brugdek erna',()=>{
    const a=nieuwAvontuur(),f=new Fysica(),w=new AvontuurWereld(new THREE.Scene(),f,a);
    const maak=():Lichaam=>({pos:{x:0,y:.02,z:BRUG_START+1},snelheid:{x:0,y:0,z:-8},straal:.4,hoogte:2.5,opGrond:true,grond:null});
    const voor=maak();for(let i=0;i<25;i++){voor.snelheid.y=-3;f.beweeg(voor,.1);}expect(voor.pos.y).toBeLessThan(-1);
    beginMissie(a,'brug');for(const p of ['werf','bosrand','labkrat'])verzamel(a,'brug',p);for(let i=0;i<6;i++)plaatsBalk(a);controleerMissie(a,'brug');w.sync();
    const na=maak();for(let i=0;i<42;i++){na.snelheid.z=-8;na.snelheid.y=-3;f.beweeg(na,.1);}expect(na.pos.z).toBeLessThan(BRUG_START-24);expect(na.pos.y).toBeGreaterThanOrEqual(0);
    expect(w.brug.children.filter(b=>b.visible)).toHaveLength(6);
  });
  it('bouwt herstelde inrichting zichtbaar op dezelfde coördinaten',()=>{
    const a=nieuwAvontuur();beginMissie(a,'brug');for(const p of ['werf','bosrand','labkrat'])verzamel(a,'brug',p);for(let i=0;i<6;i++)plaatsBalk(a);controleerMissie(a,'brug');ontdekHut(a);plaatsDecoratie(a,'plant',2,1);
    const w=new AvontuurWereld(new THREE.Scene(),new Fysica(),a);expect(w.meubels.children[0].position.x).toBe(-1.5);expect(w.meubels.children[0].position.z).toBe(-1.5);expect(w.hutZ()).toBe(-122);
  });
  it('houdt alle reisplekken bereikbaar, droog en dicht bij een interactie',()=>{
    const a=nieuwAvontuur(),f=new Fysica(),w=new AvontuurWereld(new THREE.Scene(),f,a);
    for(const g of GEBIEDEN.filter(g=>g.id!=='boomhut')){
      const p=w.reisPunt(g.id),s:Lichaam={pos:{...p,y:.3},snelheid:{x:0,y:-2,z:0},straal:.4,hoogte:2.5,opGrond:false,grond:null};
      f.beweeg(s,.5);expect(s.pos.y,`Droge reisplek ${g.id}`).toBeGreaterThanOrEqual(0);expect(w.dichtst(p),`Interactie bij ${g.id}`).toBeDefined();
    }
  });
});
