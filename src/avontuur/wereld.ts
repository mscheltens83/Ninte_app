import * as THREE from 'three';
import { botserUitBlok, type Botser, type Fysica, type Vec3 } from '../spel/fysica';
import { blok, blokOp, tekstBord, voegStatischSamen, type Tekstbord } from '../wereld/bouwstenen';
import { BOS_BEWONERS, DECORATIES, GEBIEDEN, MATERIAALPLEKKEN, MISSIES, TOREN, VLIEG_ONDERDELEN, WERELD, type Gebied, type RobotRoute } from './inhoud';
import { brugMaten, heeftVleugel, type AvontuurStand, type RobotStand } from './logica';
import { TERRASSEN, HEUVEL_TRAPPEN, VASTELAND_HEUVELS, terreinHoogte, torenTrappen, bewonerPos } from './landschap';
import { bouwHeuvels } from '../wereld/heuvels';

/** Iets in de wereld waar je bij kunt drukken op E of de knop. Met `doe` kan elk onderdeel van het spel zijn eigen actie toevoegen. */
export interface Interactie { id: string; naam: string; x: number; y?:number; z: number; soort: 'gebied' | 'materiaal' | 'bewoner' | 'vlag' | 'onderdeel' | 'vleugel' | 'actie'; gebied?: Gebied; doe?: () => void; /** Hoe dichtbij je moet zijn (standaard 3,8 meter). */ straal?: number }
export const BRUG_START = WERELD.noord;
export function bouwVleugel():THREE.Group {
  const g=new THREE.Group();for(const kant of [-1,1]){const v=blok(4,.12,2.5,kant<0?'#72cadd':'#b0dcec',kant*2,0,0);v.rotation.z=kant*.16;g.add(v);}
  g.add(blok(.16,.15,3,'#b48653',0,-.2,0),blok(.14,1.5,.14,'#947553',0,-.8,0));return g;
}
export class AvontuurWereld {
  readonly groep = new THREE.Group();
  readonly interacties: Interactie[] = [];
  readonly brug = new THREE.Group();
  readonly eiland = new THREE.Group();
  readonly meubels = new THREE.Group();
  readonly vlag = new THREE.Group();
  readonly robot = new THREE.Group();
  readonly bewoners:{naam:string;groep:THREE.Group;anker:Vec3;interactie:Interactie;benen:THREE.Mesh[];tijd:number}[]=[];
  readonly routeBaken=new THREE.Group();
  private labels:THREE.Mesh[]=[];
  private onderdelen=new Map<string,THREE.Group>();
  private vliegRek=bouwVleugel();
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
    scene.add(this.groep, this.brug, this.eiland, this.vlag, this.robot, this.robotKisten, this.robotDoel, this.routeBaken, this.vliegRek, ...this.tuinPlanten);
    this.eiland.add(this.meubels);
    // Dit vasteland sluit zonder sprong aan op het oorspronkelijke strand.
    this.vast(this.groep, WERELD.halfBreedte*2, 3, WERELD.zuid-WERELD.noord, '#75b864', 0, -3, (WERELD.zuid+WERELD.noord)/2);
    for(const t of TERRASSEN)this.vast(this.groep,t.b,t.h,t.d,'#7db867',t.x,0,t.z);
    bouwHeuvels(this.groep,this.f,VASTELAND_HEUVELS);
    for(const t of HEUVEL_TRAPPEN)this.vast(this.groep,t.b,t.h,t.d,'#c5a779',t.x,0,t.z);
    this.pad(0,-36,0,-230,'#e6cfaa');
    for(const g of GEBIEDEN.filter(g=>!['dorp','boomhut','brug','tuin'].includes(g.id))){const n=Math.round(g.y/.4);this.pad(0,g.z+18+n*.95+3,g.x,g.z+18+n*.95+3,g.kleur);this.pad(g.x,g.z+18+n*.95+3,g.x,g.z+19+n*.95,g.kleur);}
    for(const g of GEBIEDEN.filter(g=>g.y>0))this.groep.add(blokOp(5,.035,39,g.kleur,g.x,g.y,g.z-2,false));
    this.groep.add(blokOp(24,.04,22,'#e9cc94',0,0,-60,false));
    this.groep.add(blokOp(3.5, .045, 32, '#efd7ab', 0, 0, -20, false));
    for (const g of GEBIEDEN.filter(g => g.id !== 'boomhut')) {
      this.groep.add(blokOp(16, .08, 14, g.kleur, g.x, g.y, g.z - 3, false));
      if (!['dorp','brug','bos','tuin','toren'].includes(g.id)) this.kraam(g.x, g.z - 6, g.kleur, g.id,g.y);
      const bord = this.bord(this.groep, `${g.icoon} ${g.naam}`, g.x-5, g.y+2.8, g.z+9, g.kleur);
      this.borden.set(g.id, bord);
      this.interacties.push({id:`bord-${g.id}`,naam:`Bekijk ${g.naam}`,x:g.x-5,y:g.y,z:g.z+9,soort:'gebied',gebied:g.id});
      if(g.id!=='bos')this.persoon(g.x+(g.id==='toren'?16:7.5),g.z+4.5,g.kleur,g.bewoner,{id:g.id,naam:`Praat met ${g.bewoner}`,x:0,y:g.y,z:0,soort:'gebied',gebied:g.id},g.y);
    }
    // Dorpsvlag: de proefmissie verandert de echte wereld.
    this.groep.add(blokOp(1.5, 1, 1.5, '#efd052', -9, 0, -56));
    this.bord(this.groep, '🎏 Vlag ophalen', -9, 2, -56, '#a07c25', 2.5);
    this.interacties.push({ id: 'vlag', naam: 'Onderzoek de gele kist · pak de vlag', x: -9, y:0,z: -56, soort: 'vlag' });
    this.vlag.add(blokOp(.15, 5, .15, '#846345', -3, 0, -64));
    this.vlag.add(blok(2, 1, .08, '#f4bd50', -2, 4.3, -64));
    this.vlag.add(blok(2, .3, .09, '#c96091', -2, 4.45, -64));
    // Hout is op drie afzonderlijke plekken te verzamelen, in elke volgorde.
    for (const p of MATERIAALPLEKKEN) {
      const k = new THREE.Group(); k.position.set(p.x,p.y,p.z);
      for (let i=0;i<3;i++) k.add(blokOp(2,.22,.65,'#bb884f',0,i*.24,0));
      this.groep.add(k); this.kratten.push(k);
      this.bord(this.groep, '🪵 3 balken', p.x, p.y+1.5, p.z, '#986638', 2.4);
      this.interacties.push({ id:p.id, naam:`Pak hout · ${p.naam}`, x:p.x, y:p.y,z:p.z, soort:'materiaal' });
    }
    // Bos, drie bewoners, bank en boshuisje met echte deur.
    for (const [x,z] of [[-87,-181],[-89,-161],[-77,-179],[-55,-178],[-58,-160],[-72,-164]]) this.boom(this.groep,x,z);
    for (const b of BOS_BEWONERS) {
      this.persoon(b.x,b.z,'#7c9861',b.naam,{id:b.id,naam:`Lees de aanwijzing van ${b.naam}`,x:b.x,y:b.y,z:b.z,soort:'bewoner'},b.y);
    }
    this.kraam(-72,-177,'#438464','bos',4);
    this.bosDeur = blokOp(2.5,2.7,.25,'#ad8751',-72,4,-175.2); this.groep.add(this.bosDeur);
    this.deurBotser = this.f.voegToe(botserUitBlok(-72,5.35,-175.2,2.5,2.7,.25));
    this.groep.add(blokOp(3,.7,.8,'#488cd2',-81,4,-171));
    // De tuin heeft twee echte, groeiende planten (gesynchroniseerd in sync).
    this.groep.add(blokOp(7,.15,5,'#8b623f',-8,2.02,-156));
    this.tuinPlanten.forEach((p,i)=>{p.position.set(-10+i*3,2,-156);p.add(blokOp(.12,1,.12,'#458342',0,0,0),blokOp(.6,.5,.6,'#e8c247',0,1,0));});
    this.robot.add(blokOp(.55,.6,.4,'#9299d3',0,0,0),blokOp(.5,.35,.5,'#d8def7',0,.6,0),blok(.08,.08,.04,'#334267',-.12,.8,.26),blok(.08,.08,.04,'#334267',.12,.8,.26));
    this.robot.position.set(67,6,-187);
    // Een herkenbaar robotraster naast het lab en een grote pizza boven het café.
    for (let x=0;x<6;x++) for(let z=0;z<6;z++) this.groep.add(blokOp(.9,.08,.9,(x+z)%2?'#e4e7fc':'#c3c8ee',66+x,6,-190+z,false));
    const pizza = new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,.15,24),new THREE.MeshStandardMaterial({color:'#f2c455'}));
    pizza.position.set(60,6.2,-88); this.groep.add(pizza);
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
    this.bord(this.groep,'↑ Tuin & rivier\n← Winkel   Café →',0,2.5,-94,'#547646',5);
    this.bord(this.groep,'↑ Rivier\n← Bosheuvel   Lab →',0,2.5,-206,'#547646',5);
    this.bord(this.groep,'↑ Dorpsplein\n↓ Dieren & deurenbanen',0,2.8,-40,'#b48b40',5);
    for(const p of VLIEG_ONDERDELEN){const g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.add(blokOp(1.1,.55,.9,p.id==='doek'?'#e894bb':p.id==='frame'?'#968ae0':'#e7cb61',0,0,0));g.userData.dynamisch=true;this.groep.add(g);this.onderdelen.set(p.id,g);this.bord(this.groep,`🪽 ${p.naam}`,p.x,p.y+1.6,p.z,'#598ca0',2.8);this.interacties.push({id:p.id,naam:`Onderzoek · ${p.naam}`,x:p.x,y:p.y,z:p.z,soort:'onderdeel'});}
    this.bouwToren();
    this.vliegRek.position.set(107,2,-115);this.vliegRek.scale.setScalar(.5);this.interacties.push({id:'zweefvleugel',naam:'Pak je zweefvleugel',x:107,y:0,z:-115,soort:'vleugel'});
    this.bord(this.groep,'🪽 Verdiende zweefvleugel',107,3.5,-115,'#579cae',3.8);
    for(let i=0;i<72;i++){const x=-106+(i*37%212),z=-106-(i*47%119);if(Math.abs(x)<8||Math.hypot(x-TOREN.landing.x,z-TOREN.landing.z)<18||GEBIEDEN.some(g=>Math.hypot(g.x-x,g.z-z)<29)||MATERIAALPLEKKEN.some(p=>Math.hypot(p.x-x,p.z-z)<6))continue;this.boom(this.groep,x,z);}
    for(let i=0;i<18;i++){const a=i/18*Math.PI*2,x=TOREN.landing.x+Math.cos(a)*10,z=TOREN.landing.z+Math.sin(a)*10;this.groep.add(blokOp(.12,.8,.12,'#548b47',x,0,z),blokOp(.7,.25,.7,'#f4d46b',x,.8,z));}
    this.bord(this.groep,'🌼 Landingsweide',TOREN.landing.x,2.3,TOREN.landing.z+12,'#e5c15c',4);
    this.routeBaken.add(blokOp(.18,13,.18,'#f8d675',0,0,0),blok(3,.5,3,'#ffea9e',0,1,0));this.routeBaken.visible=false;
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
    const t=tekstBord(tekst,b,1.25,{breedte:640,achtergrond:'#fff9e9',rand:kleur}); t.mesh.position.set(x,y,z);t.mesh.userData.dynamisch=true;g.add(t.mesh);this.labels.push(t.mesh);return t;
  }
  private persoon(x:number,z:number,kleur:string,naam:string,interactie:Interactie,y=0) {
    const g=new THREE.Group();g.userData.dynamisch=true;g.position.set(x,y,z);g.add(blokOp(.65,.8,.4,kleur,0,.7,0),blokOp(.55,.55,.5,'#efc097',0,1.5,0));
    const benen=[-.2,.2].map(dx=>blokOp(.22,.7,.28,'#566677',dx,0,0));g.add(...benen,blok(.08,.08,.04,'#283849',-.12,1.8,.26),blok(.08,.08,.04,'#283849',.12,1.8,.26));
    this.bord(g,`💬 ${naam}`,0,2.7,0,kleur,3.2);this.groep.add(g);Object.assign(interactie,{x,y,z});this.interacties.push(interactie);
    this.bewoners.push({naam,groep:g,anker:{x,y,z},interactie,benen,tijd:this.bewoners.length*3});
  }
  private boom(g:THREE.Group,x:number,z:number) {
    const y=terreinHoogte(x,z);g.add(blokOp(.65,3,.65,'#85613b',x,y,z),blokOp(3,2.5,3,'#47955c',x,y+2.7,z));
    this.f.voegToe(botserUitBlok(x,y+1.5,z,.65,3,.65));
  }
  private kraam(x:number,z:number,kleur:string,soort:string,y=0) {
    this.vast(this.groep,8,3,.25,kleur,x,y,z-2);
    this.vast(this.groep,.25,3,4,kleur,x-4,y,z);
    this.vast(this.groep,.25,3,4,kleur,x+4,y,z);
    this.groep.add(blokOp(9,.3,5,kleur,x,y+3.3,z));
    if(soort!=='bos')this.vast(this.groep,5,.8,.9,'#bc905a',x,y,z+.3);
    for(let i=0;i<3;i++)this.groep.add(blokOp(.6,.5,.6,['#de615b','#deb351','#63a875'][i],x-1.7+i*1.7,y+.8,z+.3));
    this.bord(this.groep,soort==='winkel'?'Appels · Planken · Verf':soort==='lab'?'RO · routeatelier':soort==='bos'?'Boshuisje':'KAAS · TOMAAT',x,y+2.2,z+.5,kleur,5);
  }
  private pad(x1:number,z1:number,x2:number,z2:number,kleur:string) {
    const b=blokOp(5,.035,Math.hypot(x2-x1,z2-z1),kleur,(x1+x2)/2,0,(z1+z2)/2,false);b.rotation.y=Math.atan2(x2-x1,z2-z1);this.groep.add(b);
  }
  private bouwToren() {
    const {x,z,hoogte}=TOREN;
    for(const dx of [-13,13])for(const dz of [-9,9])this.vast(this.groep,.8,hoogte+2,.8,'#5d8194',x+dx,0,z+dz);
    for(const t of torenTrappen())this.vast(this.groep,t.b,t.h,t.d,'#d0b589',t.x,t.top-t.h,t.z);
    for(let n=1;n<=TOREN.bordessen;n++){
      const bx=x+(n%2===0?-11:11),y=n*TOREN.stijging;
      this.vast(this.groep,3,.35,13,'#8bb9c6',bx,y-.35,z);
      this.bord(this.groep,`${y} m · bordes`,bx,y+2,z+1,'#648b9e',2.8);
      if(n!==TOREN.bordessen)this.vast(this.groep,.15,1,12,'#5b8c9e',bx+(n%2===0?-1.4:1.4),y,z);
    }
    this.vast(this.groep,10,.4,8,'#79c5d8',x-16,hoogte-.4,z);
    this.bord(this.groep,'🪽 Vliegdek · 90 meter\nSpring naar de bloemenweide',x-16,hoogte+3,z,'#54869d',6);
    for(const dz of [-4,4])this.vast(this.groep,9,1,.15,'#5a91a5',x-16,hoogte,z+dz);
  }
  update(dt:number,p:Vec3,camera?:Vec3,bewegen=true) {
    for(const b of this.bewoners){
      const nabij=Math.hypot(p.x-b.groep.position.x,p.z-b.groep.position.z)<5&&Math.abs(p.y-b.anker.y)<3;
      if(bewegen&&!nabij){b.tijd+=dt;const nieuw=bewonerPos(b.anker,b.tijd),loopt=b.groep.position.distanceTo(new THREE.Vector3(nieuw.x,nieuw.y,nieuw.z))>.001;b.groep.position.set(nieuw.x,nieuw.y,nieuw.z);b.benen.forEach((been,i)=>been.rotation.x=loopt?Math.sin(b.tijd*7+i*Math.PI)*.3:0);}
      else b.benen.forEach(been=>been.rotation.x=0);
      Object.assign(b.interactie,{x:b.groep.position.x,y:b.groep.position.y,z:b.groep.position.z});
    }
    for(const l of this.labels){const q=l.getWorldPosition(new THREE.Vector3());l.visible=Math.hypot(q.x-p.x,q.z-p.z)<28&&Math.abs(q.y-p.y)<18;if(l.visible&&camera)l.lookAt(camera.x,camera.y,camera.z);}
  }
  markeerRoute(p:Vec3|null){this.routeBaken.visible=!!p;if(p)this.routeBaken.position.set(p.x,p.y,p.z);}
  terreinHoogte(x:number,z:number){return terreinHoogte(x,z);}
  hutZ():number { return BRUG_START-brugMaten(this.stand).doel-12; }
  reisPunt(gebied:Gebied):Vec3 {
    const g=GEBIEDEN.find(v=>v.id===gebied)!;
    return gebied==='boomhut'?{x:0,y:0,z:this.hutZ()+5}:{x:g.x-2,y:g.y,z:g.z+8};
  }
  dichtst(p:Vec3):Interactie|undefined {
    return this.interacties.filter(i=>(i.id!=='boomhut'||this.stand.gebieden.includes('boomhut')) && Math.abs(p.y-(i.y??0))<2.8)
      .map(i=>({i,d:Math.hypot(i.x-p.x,i.z-p.z)/(i.straal??3.8)})).filter(v=>v.d<1).sort((a,b)=>a.d-b.d)[0]?.i;
  }
  isLand(x:number,z:number):boolean { return Math.abs(x)<=WERELD.halfBreedte&&z>=BRUG_START&&z<=WERELD.zuid || this.stand.gebieden.includes('boomhut')&&Math.abs(x)<=12&&Math.abs(z-this.hutZ())<=12 || this.stand.missies.brug.status==='voltooid'&&Math.abs(x)<=2&&z>=BRUG_START-brugMaten(this.stand).doel&&z<=BRUG_START; }
  robotBeeld(route:RobotRoute,s:RobotStand) {
    this.robot.position.set(66+s.x,6,-190+s.z);this.robot.rotation.y=-s.richting*Math.PI/2+Math.PI;
    this.robotDoel.position.set(66+route.doel[0],6.09,-190+route.doel[1]);
    const code=JSON.stringify(route.obstakels);
    if(this.robotKisten.userData.route!==code){this.robotKisten.userData.route=code;this.robotKisten.clear();for(const [x,z] of route.obstakels)this.robotKisten.add(blokOp(.8,.6,.8,'#ad865e',66+x,6.1,-190+z));}
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
    for(const [id,g] of this.onderdelen)g.visible=!a.missies['toren-vleugel'].werk.verzameld.includes(id);
    this.vliegRek.visible=!heeftVleugel(a);
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
