// @vitest-environment happy-dom
import {beforeEach,describe,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {Fysica,type Lichaam,overlapt} from '../src/spel/fysica';
import {AvontuurWereld} from '../src/avontuur/wereld';
import {Avontuur} from '../src/avontuur/schermen';
import {nieuweStand} from '../src/opslag/opslag';
import {GEBIEDEN,TOREN,VLIEG_ONDERDELEN,WERELD} from '../src/avontuur/inhoud';
import {beginMissie,controleerMissie,ontdekGebied,heeftVleugel,hoogsteBordes,landTorenVlucht,nieuwAvontuur,noteerBordes,pakVleugel,startTorenVlucht,valideerAvontuur,verzamel} from '../src/avontuur/logica';
import {bordesPunt,pasZweefSnelheidAan,terreinHoogte} from '../src/avontuur/landschap';
import type {Spel} from '../src/spel/Spel';
vi.mock('../src/wereld/bouwstenen',async origineel=>({...await origineel<typeof import('../src/wereld/bouwstenen')>(),tekstBord:()=>({mesh:new THREE.Mesh(new THREE.BoxGeometry(1,1,.1)),zetTekst:vi.fn()})}));
vi.mock('../src/leren/voorlezen',()=>({spreek:vi.fn()}));
beforeEach(()=>{document.body.innerHTML='<div id="schermen"></div><div id="hud"><div id="knoppen-rechts"></div></div>';localStorage.clear();});
function klaar(){const a=nieuwAvontuur();for(const p of VLIEG_ONDERDELEN)verzamel(a,'toren-vleugel',p.id);a.missies['toren-vleugel'].werk.keuze='0';expect(controleerMissie(a,'toren-vleugel').goed).toBe(true);expect(pakVleugel(a)).toBe(true);return a;}
function lichaam(x:number,y:number,z:number):Lichaam{return {pos:{x,y,z},snelheid:{x:0,y:0,z:0},straal:.4,hoogte:2.5,opGrond:true,grond:null};}
function loop(f:Fysica,s:Lichaam,x:number,z:number){
  const limiet=Math.ceil(Math.hypot(x-s.pos.x,z-s.pos.z)/.3)+50;
  for(let i=0;i<limiet;i++){const dx=x-s.pos.x,dz=z-s.pos.z,d=Math.hypot(dx,dz);if(d<.16)return;s.snelheid.x=dx/d*Math.min(6,d/.05);s.snelheid.z=dz/d*Math.min(6,d/.05);s.snelheid.y=-2;f.beweeg(s,.05);}
  expect(Math.hypot(x-s.pos.x,z-s.pos.z),`Geblokkeerde route naar ${x}, ${z}, voeten ${JSON.stringify(s.pos)}`).toBeLessThan(.2);
}
describe('ontdekken en veilige vliegbeloning',()=>{
  it('laat nieuwe plekken eerst ontdekken en migreert eerder gespeelde gebieden',()=>{
    const a=nieuwAvontuur();expect(a.ontdekt).toEqual(['dorp']);expect(ontdekGebied(a,'boomhut')).toBe(false);expect(ontdekGebied(a,'bos')).toBe(true);expect(ontdekGebied(a,'bos')).toBe(false);
    beginMissie(a,'winkel-budget');const oud=JSON.parse(JSON.stringify(a));delete oud.ontdekt;delete oud.missies['toren-vleugel'];delete oud.missies['toren-vlucht'];
    const r=valideerAvontuur(oud);expect(r.aangepast).toBe(false);expect(r.stand.ontdekt).toContain('winkel');expect(r.stand.missies['winkel-budget'].status).toBe('actief');expect(r.stand.missies['toren-vleugel'].status).toBe('beschikbaar');
  });
  it('weigert vleugels voor de voorbereiding en bewaart de beloning bij fouten',()=>{
    const a=nieuwAvontuur();expect(pakVleugel(a)).toBe(false);expect(heeftVleugel(a)).toBe(false);
    for(const p of VLIEG_ONDERDELEN)verzamel(a,'toren-vleugel',p.id);a.missies['toren-vleugel'].werk.keuze='1';expect(controleerMissie(a,'toren-vleugel').goed).toBe(false);expect(pakVleugel(a)).toBe(false);
    a.missies['toren-vleugel'].werk.keuze='0';expect(controleerMissie(a,'toren-vleugel').goed).toBe(true);pakVleugel(a);expect(startTorenVlucht(a,{x:90,y:10,z:-125})).toBe(false);
    expect(startTorenVlucht(a,{x:67,y:90,z:-125})).toBe(true);expect(landTorenVlucht(a,{x:0,y:0,z:-100})?.goed).toBe(false);expect(heeftVleugel(a)).toBe(true);expect(a.missies['toren-vlucht'].status).toBe('actief');
  });
  it('bewaart bordessen, onderdelen, ontdekking en vliegvoortgang bij herladen',()=>{
    const a=klaar();ontdekGebied(a,'toren');noteerBordes(a,bordesPunt(6));const r=valideerAvontuur(JSON.parse(JSON.stringify(a)));
    expect(r.aangepast).toBe(false);expect(hoogsteBordes(r.stand)).toBe(6);expect(heeftVleugel(r.stand)).toBe(true);expect(r.stand.ontdekt).toContain('toren');
  });
  it('laat een correcte echte landing de missie eenmaal voltooien',()=>{
    const a=klaar();startTorenVlucht(a,{x:67,y:90,z:-125});expect(landTorenVlucht(a,TOREN.landing)?.goed).toBe(true);expect(landTorenVlucht(a,TOREN.landing)).toBeNull();expect(a.beloningen.filter(x=>x==='toren-vlucht')).toHaveLength(1);
  });
  it('markeert een route zonder nieuwe plekken of verstopte materialen te teleporteren',()=>{
    const stand=nieuweStand(),spel={scene:new THREE.Scene(),fysica:new Fysica(),modus:'spelen',speler:{pos:{x:3,y:0,z:-53}},hud:{hud:document.getElementById('hud')!,toonBanner:vi.fn()},hervat:vi.fn(),pauzeer:vi.fn(),zetSpeler:vi.fn()} as unknown as Spel;
    const av=new Avontuur(spel,stand);av.toonKaart();document.querySelector<HTMLButtonElement>('[data-reis="bos"]')!.click();expect(spel.zetSpeler).not.toHaveBeenCalled();expect(av.wereld.routeBaken.visible).toBe(true);expect(stand.avontuur.ontdekt).not.toContain('bos');
    Object.assign(spel.speler.pos,av.wereld.reisPunt('bos'));av.update(.1);expect(stand.avontuur.ontdekt).toContain('bos');av.reis('bos');expect(spel.zetSpeler).toHaveBeenCalled();
  });
});
describe('ruime wereld, echte trappen en bewegende bewoners',()=>{
  it('heeft dertien keer zoveel vasteland en duidelijke afstand tussen voorzieningen',()=>{
    expect(2*WERELD.halfBreedte*(WERELD.zuid-WERELD.noord)/(70*51)).toBeGreaterThan(12);
    for(const a of GEBIEDEN.filter(g=>g.id!=='boomhut'))for(const b of GEBIEDEN.filter(g=>g.id!==a.id&&g.id!=='boomhut'))expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeGreaterThan(35);
  });
  it.each(GEBIEDEN.filter(g=>g.y>0))('loopt de echte trap naar $naam op en veilig weer af',g=>{
    const f=new Fysica();new AvontuurWereld(new THREE.Scene(),f,nieuwAvontuur());const z=g.z+18+g.y/.4*.95+3,s=lichaam(g.x,.02,z);
    loop(f,s,g.x,g.z+11);expect(s.pos.y).toBeCloseTo(g.y,2);loop(f,s,g.x,z);s.snelheid.x=s.snelheid.z=0;for(let i=0;i<20;i++){s.snelheid.y=-2;f.beweeg(s,.05);}expect(s.pos.y).toBeCloseTo(0,2);
  });
  it('loopt alle tien torentrappen op tot 90 meter met echte botsingen',()=>{
    const f=new Fysica();new AvontuurWereld(new THREE.Scene(),f,nieuwAvontuur());const s=lichaam(TOREN.x-11,.02,TOREN.z-4);
    for(let n=1;n<=10;n++){const p=bordesPunt(n),z=TOREN.z+(n%2===1?-4:4);loop(f,s,p.x,z);expect(s.pos.y,`bordes ${n}`).toBeCloseTo(n*9,2);loop(f,s,p.x,TOREN.z+(n%2===1?4:-4));}
    loop(f,s,TOREN.x-11,TOREN.z);loop(f,s,TOREN.x-19,TOREN.z);expect(s.pos.y).toBeCloseTo(90,2);
  });
  it('heeft één Fien en laat bewoners dichtbij hun erf lopen met passende interacties',()=>{
    const f=new Fysica(),w=new AvontuurWereld(new THREE.Scene(),f,nieuwAvontuur());expect(w.bewoners.filter(b=>b.naam==='Fien de vos')).toHaveLength(1);let bewogen=false;
    for(let i=0;i<100;i++){w.update(.3,{x:0,y:0,z:50});for(const b of w.bewoners){const p=b.groep.position;expect(Math.hypot(p.x-b.anker.x,p.z-b.anker.z)).toBeLessThan(3);expect(b.interactie.x).toBe(p.x);expect(b.interactie.y).toBe(p.y);expect(terreinHoogte(p.x,p.z)).toBeCloseTo(b.anker.y,2);bewogen ||= p.distanceTo(new THREE.Vector3(b.anker.x,b.anker.y,b.anker.z))>.5;const l=lichaam(p.x,p.y+.02,p.z);expect(f.botsers.some(botser=>botser.actief&&overlapt(botser,l)),`Vrij erf ${b.naam}`).toBe(false);}}
    expect(bewogen).toBe(true);const b=w.bewoners[0],voor=b.groep.position.clone();w.update(2,b.groep.position);expect(b.groep.position.equals(voor)).toBe(true);
  });
  it('zweeft met de echte wereldfysica rustig van 90 meter naar de juiste landing',()=>{
    const a=klaar(),f=new Fysica();new AvontuurWereld(new THREE.Scene(),f,a);const s=lichaam(67,90,-125);s.opGrond=false;startTorenVlucht(a,s.pos);
    let tijd=0;while(!s.opGrond&&tijd<40){s.snelheid.y-=28*.05;pasZweefSnelheidAan(s,.05,0,0,true);f.beweeg(s,.05);tijd+=.05;expect(s.snelheid.y).toBeGreaterThanOrEqual(-3.6);}
    expect(tijd).toBeGreaterThan(20);expect(tijd).toBeLessThan(35);expect(landTorenVlucht(a,s.pos)?.goed).toBe(true);
  });
  it('kan tijdens zweven vrij sturen in plaats van hulp te volgen',()=>{
    const s=lichaam(67,70,-125);s.snelheid.y=-30;pasZweefSnelheidAan(s,1,1,0,true);expect(s.snelheid.x).toBe(13);expect(s.snelheid.z).toBe(0);expect(s.snelheid.y).toBe(-3.6);
  });
});
