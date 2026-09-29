import * as THREE from 'three';
import { botserUitBlok, type Botser, type Fysica, type Vec3 } from '../spel/fysica';
import { blok, blokOp, tekstBord, voegStatischSamen, type Tekstbord } from '../wereld/bouwstenen';
import { BOS_BEWONERS, DECORATIES, GEBIEDEN, MATERIAALPLEKKEN, MISSIES, type Gebied, type RobotRoute } from './inhoud';
import { brugMaten, type AvontuurStand, type RobotStand } from './logica';

export interface Interactie { id: string; naam: string; x: number; z: number; soort: 'gebied' | 'materiaal' | 'bewoner' | 'vlag'; gebied?: Gebied }
export const BRUG_START = -86;
export class AvontuurWereld {
  readonly groep = new THREE.Group();
  readonly interacties: Interactie[] = [];
  readonly brug = new THREE.Group();
  readonly eiland = new THREE.Group();
  readonly meubels = new THREE.Group();
  readonly vlag = new THREE.Group();
  readonly robot = new THREE.Group();
  private robotKisten = new THREE.Group();
  private robotDoel = blokOp(.65,.1,.65,'#f4ca50',20,0,-75);
  private tuinPlanten = [new THREE.Group(), new THREE.Group()];
  private brugBotser: Botser;
  private eilandBotser: Botser;
  private hutVloer: Botser;
  private hutWanden: Botser[] = [];
  private deurBotser: Botser;
  private bosDeur: THREE.Mesh;
  private meter: Tekstbord;
  private balken: THREE.Mesh[] = [];
  private kratten: THREE.Group[] = [];
  private borden = new Map<Gebied, Tekstbord>();
  private laatste = '';

  constructor(scene: THREE.Scene, private f: Fysica, private stand: AvontuurStand) {
    scene.add(this.groep, this.brug, this.eiland, this.vlag, this.robot, this.robotKisten, this.robotDoel, ...this.tuinPlanten);
    this.eiland.add(this.meubels);
    // Dit vasteland sluit zonder sprong aan op het oorspronkelijke strand.
    this.vast(this.groep, 70, 3, 51, '#75b864', 0, -3, -60.5);
    this.groep.add(blokOp(6, .035, 51, '#efd7ab', 0, 0, -60.5, false));
    for (const z of [-49, -70]) this.groep.add(blokOp(58, .04, 4, '#efd7ab', 0, 0, z, false));
    this.groep.add(blokOp(14, .04, 12, '#e9cc94', 0, 0, -43, false));
    this.groep.add(blokOp(3.5, .045, 32, '#efd7ab', 0, 0, -20, false));
    for (const g of GEBIEDEN.filter(g => g.id !== 'boomhut')) {
      this.groep.add(blokOp(10, .08, 9, g.kleur, g.x, 0, g.z - 3, false));
      if (!['dorp','brug','bos','tuin'].includes(g.id)) this.kraam(g.x, g.z - 4, g.kleur, g.id);
      const bord = this.bord(this.groep, `${g.icoon} ${g.naam}`, g.x, 3.5, g.z - 3.8, g.kleur);
      this.borden.set(g.id, bord);
      this.persoon(g.x + 3.4, g.z - .5, g.kleur, g.bewoner);
      this.interacties.push({ id: g.id, naam: `Praat met ${g.bewoner}`, x: g.x + 3.4, z: g.z - .5, soort: 'gebied', gebied: g.id });
    }
    // Dorpsvlag: de proefmissie verandert de echte wereld.
    this.groep.add(blokOp(1.5, 1, 1.5, '#efd052', -6, 0, -40));
    this.bord(this.groep, '🎏 Vlag ophalen', -6, 2, -40, '#a07c25', 2.5);
    this.interacties.push({ id: 'vlag', naam: 'Onderzoek de gele kist · pak de vlag', x: -6, z: -40, soort: 'vlag' });
    this.vlag.add(blokOp(.15, 5, .15, '#846345', -3, 0, -47));
    this.vlag.add(blok(2, 1, .08, '#f4bd50', -2, 4.3, -47));
    this.vlag.add(blok(2, .3, .09, '#c96091', -2, 4.45, -47));
    // Hout is op drie afzonderlijke plekken te verzamelen, in elke volgorde.
    for (const p of MATERIAALPLEKKEN) {
      const k = new THREE.Group(); k.position.set(p.x,0,p.z);
      for (let i=0;i<3;i++) k.add(blokOp(2,.22,.65,'#bb884f',0,i*.24,0));
      this.groep.add(k); this.kratten.push(k);
      this.bord(this.groep, '🪵 3 balken', p.x, 1.5, p.z, '#986638', 2.4);
      this.interacties.push({ id:p.id, naam:`Pak hout · ${p.naam}`, x:p.x, z:p.z, soort:'materiaal' });
    }
    // Bos, drie bewoners, bank en boshuisje met echte deur.
    for (const [x,z] of [[-30,-80],[-29,-75],[-13,-80],[-13,-75],[-30,-65]]) this.boom(this.groep,x,z);
    for (const b of BOS_BEWONERS) {
      this.persoon(b.x,b.z,'#7c9861',b.naam);
      this.interacties.push({id:b.id,naam:`Lees de aanwijzing van ${b.naam}`,x:b.x,z:b.z,soort:'bewoner'});
    }
    this.kraam(-21,-82,'#438464','bos');
    this.bosDeur = blokOp(2.5,2.7,.25,'#ad8751',-21,0,-80.2); this.groep.add(this.bosDeur);
    this.deurBotser = this.f.voegToe(botserUitBlok(-21,1.35,-80.2,2.5,2.7,.25));
    this.groep.add(blokOp(3,.7,.8,'#488cd2',-27,0,-76));
    // De tuin heeft twee echte, groeiende planten (gesynchroniseerd in sync).
    this.groep.add(blokOp(4,.15,4,'#8b623f',-3,.02,-75));
    this.tuinPlanten.forEach((p,i)=>{p.position.set(-4+i*2,0,-75);p.add(blokOp(.12,1,.12,'#458342',0,0,0),blokOp(.6,.5,.6,'#e8c247',0,1,0));});
    this.robot.add(blokOp(.55,.6,.4,'#9299d3',0,0,0),blokOp(.5,.35,.5,'#d8def7',0,.6,0),blok(.08,.08,.04,'#334267',-.12,.8,.26),blok(.08,.08,.04,'#334267',.12,.8,.26));
    this.robot.position.set(17,0,-75);
    // Een herkenbaar robotraster naast het lab en een grote pizza boven het café.
    for (let x=0;x<6;x++) for(let z=0;z<6;z++) this.groep.add(blokOp(.9,.08,.9,(x+z)%2?'#e4e7fc':'#c3c8ee',17+x,0,-78+z,false));
    const pizza = new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,.15,24),new THREE.MeshStandardMaterial({color:'#f2c455'}));
    pizza.position.set(21,4.2,-55); this.groep.add(pizza);
    this.groep.add(blokOp(.18,2,.18,'#886440',-2,0,BRUG_START+1));
    this.groep.add(blokOp(.18,2,.18,'#886440',2,0,BRUG_START+1));
    this.meter=this.bord(this.groep,'Brug: 0 / 24 m',0,3,BRUG_START+1,'#9d693e',4);
    for(let i=0;i<7;i++){ const balk=blokOp(4,.25,4,'#bc8a58',0,-.25,0);this.brug.add(balk);this.balken.push(balk); }
    this.brugBotser=this.f.voegToe(botserUitBlok(0,-.2,-98,4,.4,24));
    this.eilandBotser=this.f.voegToe(botserUitBlok(0,-1.5,-122,24,3,24));
    this.eiland.add(blokOp(24,3,24,'#80be69',0,-3,0,false));
    this.eiland.add(blokOp(4,.035,10,'#efd7ab',0,0,9,false));
    // Een boomhut op een lage houten vlonder: zelfstandig begaanbaar met de bestaande opstapfysica.
    this.eiland.add(blokOp(10,.35,8,'#cb9c6b',0,0,0));
    this.hutVloer=this.f.voegToe(botserUitBlok(0,.175,0,10,.35,8));
    this.eiland.add(blokOp(1.4,6,1.4,'#826044',0,0,-5));
    this.eiland.add(blokOp(9,2,7,'#4d9a5e',0,5,-4));
    for(const [x,z,b,d] of [[-4.8,0,.2,7.6],[4.8,0,.2,7.6],[0,-3.8,9.6,.2],[-3.2,3.8,3.2,.2],[3.2,3.8,3.2,.2]]) {
      this.eiland.add(blokOp(b,1.1,d,'#9e744b',x,.35,z));
      this.hutWanden.push(this.f.voegToe(botserUitBlok(x,.9,z,b,1.1,d)));
    }
    for(let x=0;x<8;x++) for(let z=0;z<6;z++) this.eiland.add(blokOp(.95,.015,.95,(x===3||x===4)?'#efce97':(x+z)%2?'#e4bc8b':'#d9ae7b',x-3.5,.35,z-2.5,false));
    this.bord(this.eiland,'🌳 Jouw boomhut',0,2,4,'#8d7048',4);
    this.interacties.push({id:'boomhut',naam:'Richt je boomhut in',x:0,z:0,soort:'gebied',gebied:'boomhut'});
    this.bord(this.groep,'↑ Brug & boomhut\n← Bos   Lab →',0,2.5,-64,'#547646',5);
    this.bord(this.groep,'← Winkel   Café →\n↓ Dieren & obby’s',0,2.8,-38,'#b48b40',5);
    this.sync(true);
    // Samenvoegen geldt alleen voor decor; dynamische onderdelen blijven afzonderlijk.
    this.bosDeur.userData.dynamisch = true;
    for(const k of this.kratten) k.userData.dynamisch=true;
    for(const b of this.borden.values()) b.mesh.userData.dynamisch=true;
    this.meter.mesh.userData.dynamisch=true;
    voegStatischSamen(this.groep);
  }
  private vast(g:THREE.Group,b:number,h:number,d:number,kleur:string,x:number,y:number,z:number) {
    g.add(blokOp(b,h,d,kleur,x,y,z));return this.f.voegToe(botserUitBlok(x,y+h/2,z,b,h,d));
  }
  private bord(g:THREE.Group,tekst:string,x:number,y:number,z:number,kleur:string,b=5):Tekstbord {
    const t=tekstBord(tekst,b,1.25,{breedte:640,achtergrond:'#fff9e9',rand:kleur}); t.mesh.position.set(x,y,z); g.add(t.mesh);return t;
  }
  private persoon(x:number,z:number,kleur:string,naam:string) {
    this.groep.add(blokOp(.65,.8,.4,kleur,x,.7,z),blokOp(.55,.55,.5,'#efc097',x,1.5,z));
    for(const dx of [-.2,.2])this.groep.add(blokOp(.22,.7,.28,'#566677',x+dx,0,z));
    this.groep.add(blok(.08,.08,.04,'#283849',x-.12,1.8,z+.26),blok(.08,.08,.04,'#283849',x+.12,1.8,z+.26));
    this.bord(this.groep,`💬 ${naam}`,x,2.5,z,kleur,3.2);
  }
  private boom(g:THREE.Group,x:number,z:number) {
    g.add(blokOp(.65,3,.65,'#85613b',x,0,z),blokOp(3,2.5,3,'#47955c',x,2.7,z));
    this.f.voegToe(botserUitBlok(x,1.5,z,.65,3,.65));
  }
  private kraam(x:number,z:number,kleur:string,soort:string) {
    this.vast(this.groep,8,3,.25,kleur,x,0,z-2);
    this.vast(this.groep,.25,3,4,kleur,x-4,0,z);
    this.vast(this.groep,.25,3,4,kleur,x+4,0,z);
    this.groep.add(blokOp(9,.3,5,kleur,x,3.3,z));
    this.vast(this.groep,5,.8,.9,'#bc905a',x,0,z+.3);
    for(let i=0;i<3;i++)this.groep.add(blokOp(.6,.5,.6,['#de615b','#deb351','#63a875'][i],x-1.7+i*1.7,.8,z+.3));
    this.bord(this.groep,soort==='winkel'?'Appels · Planken · Verf':soort==='lab'?'RO · routeatelier':soort==='bos'?'Boshuisje':'KAAS · TOMAAT',x,2.2,z+.5,kleur,5);
  }
  hutZ():number { return BRUG_START-brugMaten(this.stand).doel-12; }
  reisPunt(gebied:Gebied):Vec3 {
    const g=GEBIEDEN.find(v=>v.id===gebied)!;
    return gebied==='boomhut'?{x:0,y:0,z:this.hutZ()+5}:{x:g.x+2,y:0,z:g.z+2};
  }
  dichtst(p:Vec3):Interactie|undefined {
    return this.interacties.filter(i=>(i.id!=='boomhut'||this.stand.gebieden.includes('boomhut')) && Math.abs(p.y)<3)
      .map(i=>({i,d:Math.hypot(i.x-p.x,i.z-p.z)})).filter(v=>v.d<4.8).sort((a,b)=>a.d-b.d)[0]?.i;
  }
  isLand(x:number,z:number):boolean { return Math.abs(x)<=35&&z>=BRUG_START&&z<=-35 || this.stand.gebieden.includes('boomhut')&&Math.abs(x)<=12&&Math.abs(z-this.hutZ())<=12 || this.stand.missies.brug.status==='voltooid'&&Math.abs(x)<=2&&z>=BRUG_START-brugMaten(this.stand).doel&&z<=BRUG_START; }
  robotBeeld(route:RobotRoute,s:RobotStand) {
    this.robot.position.set(17+s.x,0,-78+s.z);this.robot.rotation.y=-s.richting*Math.PI/2+Math.PI;
    this.robotDoel.position.set(17+route.doel[0],.09,-78+route.doel[1]);
    const code=JSON.stringify(route.obstakels);
    if(this.robotKisten.userData.route!==code){this.robotKisten.userData.route=code;this.robotKisten.clear();for(const [x,z] of route.obstakels)this.robotKisten.add(blokOp(.8,.6,.8,'#ad865e',17+x,.1,-78+z));}
  }
  sync(force=false) {
    const a=this.stand, signature=JSON.stringify([a.missies,a.inrichting]);if(!force&&signature===this.laatste)return;this.laatste=signature;
    const {doel,balk}=brugMaten(a),klaar=a.missies.brug.status==='voltooid';
    this.brugBotser.min.z=BRUG_START-doel;this.brugBotser.max.z=BRUG_START;this.brugBotser.actief=klaar;
    this.balken.forEach((b,i)=>{b.visible=i<(klaar?doel/balk:a.missies.brug.werk.balken);b.scale.z=balk-.035;b.position.z=BRUG_START-balk*(i+.5);});
    this.meter.zetTekst(`Brug: ${a.missies.brug.werk.balken*balk} / ${doel} m${klaar?' · open!':''}`);
    const hz=this.hutZ();this.eiland.position.z=hz;
    this.eilandBotser.min.z=hz-12;this.eilandBotser.max.z=hz+12;
    this.hutVloer.min.z=hz-4;this.hutVloer.max.z=hz+4;
    this.hutWanden.forEach((b,i)=>{const z=i===2?-3.8:i>2?3.8:0;const d=i<2?7.6:.2;b.min.z=hz+z-d/2;b.max.z=hz+z+d/2;});
    const hut=this.interacties.find(i=>i.id==='boomhut')!;hut.z=hz+5;
    this.vlag.visible=a.missies.welkom.status==='voltooid';
    this.kratten.forEach((k,i)=>k.visible=!a.missies.brug.werk.verzameld.includes(MATERIAALPLEKKEN[i].id));
    this.bosDeur.visible=a.missies['bos-sleutel'].status!=='voltooid';this.deurBotser.actief=this.bosDeur.visible;
    for(const g of GEBIEDEN.filter(g=>g.id!=='boomhut')) {
      const gedaan=MISSIES.filter(m=>m.gebied===g.id&&a.missies[m.id].status==='voltooid').length;
      this.borden.get(g.id)?.zetTekst(`${g.icoon} ${g.naam}${gedaan?` · ${gedaan} ✓`:''}`);
    }
    const tuinId=a.actief?.startsWith('tuin-')?a.actief:['tuin-meten','tuin-vergelijken','tuin-verzorgen'].find(id=>a.missies[id].werk.metingen.length>0);
    const planten=a.missies[tuinId??'tuin-verzorgen'].werk.planten;
    this.tuinPlanten.forEach((p,i)=>{p.scale.y=.6+planten[i].hoogte*.08;});
    // Gedeelde blokgeometrie/materialen: wisselen kost geen nieuwe GPU-geometrie.
    this.meubels.clear();
    for(const v of a.inrichting){const d=DECORATIES.find(d=>d.id===v.item)!;const g=new THREE.Group();g.position.set(v.x-3.5,.37,v.z-2.5);g.rotation.y=v.draai*Math.PI/2;
      const plat=['mat','picknick'].includes(v.item),plant=['plant','varen','bloem','boom','pot'].includes(v.item);
      g.add(blokOp(.75,plat?.035:.65,.75,d.kleur,0,0,0));
      if(plant){g.add(blokOp(.15,.65,.15,'#548a43',0,.5,0),blokOp(.65,.35,.6,d.kleur,0,.9,0));}
      else if(v.item==='robot'){g.add(blokOp(.55,.35,.5,'#e0e3fc',0,.65,0),blok(.09,.1,.03,'#323e68',-.15,.85,.26),blok(.09,.1,.03,'#323e68',.15,.85,.26));}
      else if(['stoel','kruk','bank'].includes(v.item))g.add(blokOp(.75,.65,.12,d.kleur,0,.5,-.3));
      else if(v.item==='tafel')g.add(blokOp(.95,.12,.95,'#e8c6a3',0,.65,0));
      else if(v.item==='kast'){for(const y of [.2,.65,1.1]){g.add(blokOp(.78,.08,.48,d.kleur,0,y,.15));for(let j=0;j<4;j++)g.add(blokOp(.12,.25,.22,['#b65a68','#779ad2','#e7bf57','#6ba383'][j],-.25+j*.17,y+.08,.2));}}
      else if(v.item==='lamp'){g.add(blokOp(.1,.7,.1,'#795e47',0,.4,0),blokOp(.7,.4,.7,'#f3d584',0,1.05,0));}
      else if(v.item==='klok'){g.add(blokOp(.7,.7,.15,'#f9eaca',0,.3,.3),blok(.06,.35,.04,'#3d4851',0,.68,.4),blok(.25,.06,.04,'#3d4851',.1,.55,.4));}
      else if(v.item==='schilderij'){g.add(blokOp(.9,.65,.12,'#8a6341',0,.45,0),blokOp(.75,.5,.13,'#91c6df',0,.53,.02),blokOp(.4,.2,.14,'#65a06a',.12,.53,.03));}
      else if(v.item==='raket'){g.add(blokOp(.4,.9,.4,'#d4e9ed',0,.4,0),blokOp(.25,.25,.25,'#b35452',0,1.3,0));for(const dx of [-.3,.3])g.add(blokOp(.18,.4,.5,'#b35452',dx,.5,0));}
      else if(v.item==='spaarpot'){g.add(blok(.25,.2,.15,'#eab0b6',0,.55,.42),blok(.3,.02,.05,'#704b55',0,.66,0));}
      this.meubels.add(g);
    }
  }
}
