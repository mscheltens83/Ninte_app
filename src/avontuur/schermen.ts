import { veilig } from '../ui/hud';
import { sluitScherm, toon } from '../ui/schermen';
import { spreek } from '../leren/voorlezen';
import { bewaarStand, type Spelstand } from '../opslag/opslag';
import { BOS_BEWONERS, BOS_KEUZES, BOS_EXTRA_KEUZES, LEES_STEUN, DECORATIES, GEBIEDEN, MATERIAALPLEKKEN, MISSIES, ONDERWERPEN, ONDERWERP_NAMEN, PRODUCTEN, PRODUCT_EENHEDEN, VOLGORDE_KEUZES, VOLGORDE_TEKST, WOORD_KEUZES, WOORD_TEKST, missieVoorNiveau,
  type Decoratie, type Gebied, type Missie, type Onderwerp, type RobotActie } from './inhoud';
import { beginMissie, brugMaten, controleerMissie, ontdekHut, euro, HUT_BREEDTE, HUT_DIEPTE, leegWerk, leesAanwijzing, magBeginnen, mandTotaal, nieuwAvontuur,
  pizzaDoel, pizzaEenheden, plaatsBalk, plaatsDecoratie, robotRoute, robotStap, robotStart, terugleggen, tuinDag, vrijeTegel, vouwProgramma, winkelOpdracht, verzamel,
  type AvontuurStand, type MissieStand, type PizzaStuk, type RobotStand } from './logica';
import { AvontuurWereld, type Interactie } from './wereld';
import type { Spel } from '../spel/Spel';

const knop = (tekst:string,attrs='') => `<button class="knop klein" ${attrs}>${tekst}</button>`;
const smaken = { kaas:'#edbf42',tomaat:'#d66752' };
/** Cirkelsectoren: de hoek is exact 2π/noemer, dus het oppervlak is de juiste breuk. */
export function pizzaSvg(stukken:readonly PizzaStuk[], verdeling=0):string {
  let hoek=-Math.PI/2;
  const delen=stukken.map(s=>{
    const eind=hoek+2*Math.PI/s.noemer,x1=100+85*Math.cos(hoek),y1=100+85*Math.sin(hoek),x2=100+85*Math.cos(eind),y2=100+85*Math.sin(eind);
    const path=`<path d="M100 100 L${x1} ${y1} A85 85 0 ${eind-hoek>Math.PI?1:0} 1 ${x2} ${y2} Z" fill="${smaken[s.smaak]}" stroke="#fff9e8" stroke-width="2"/>`;
    hoek=eind;return path;
  }).join('');
  const lijnen=verdeling?Array.from({length:verdeling},(_,i)=>{const h=2*Math.PI*i/verdeling-Math.PI/2;return `<line x1="100" y1="100" x2="${100+85*Math.cos(h)}" y2="${100+85*Math.sin(h)}" stroke="#5c4933" stroke-width="2"/>`;}).join(''):'';
  return `<svg class="pizza-beeld" viewBox="0 0 200 200" role="img" aria-label="${verdeling?`Een hele pizza in ${verdeling} gelijke stukken`:`Pizzabord: ${pizzaEenheden(stukken)} van 8 delen gevuld`}"><circle cx="100" cy="100" r="91" fill="#eedbbd"/><circle cx="100" cy="100" r="85" fill="${verdeling?'#edbf42':'#fff9e8'}"/>${delen}${lijnen}</svg>`;
}
export class Avontuur {
  readonly wereld:AvontuurWereld;
  readonly interactieKnop=document.createElement('button');
  readonly taakKnop=document.createElement('button');
  readonly kaartKnop=document.createElement('button');
  readonly boekKnop=document.createElement('button');
  private dichtbij:Interactie|undefined;
  private huidigScherm:HTMLElement|null=null;
  private uitvoering=0;
  private laatsteTaak='';
  private laatstDichtbij='';
  private opAfsluiten:(()=>void)|null=null;
  aanHetOefenen=false;
  get a():AvontuurStand{return this.stand.avontuur;}
  constructor(private spel:Spel,private stand:Spelstand) {
    this.wereld=new AvontuurWereld(spel.scene,spel.fysica,this.a);
    this.kaartKnop.id='avontuur-kaart';this.kaartKnop.className='ronde-knop';this.kaartKnop.textContent='🗺️';this.kaartKnop.setAttribute('aria-label','Wereldkaart');this.kaartKnop.onclick=()=>{if(spel.modus==='spelen')this.toonKaart();};
    this.boekKnop.className='ronde-knop';this.boekKnop.textContent='📖';this.boekKnop.setAttribute('aria-label','Opdrachten en inventaris');this.boekKnop.onclick=()=>{if(spel.modus==='spelen')this.toonBoek();};
    document.getElementById('knoppen-rechts')!.prepend(this.kaartKnop,this.boekKnop);
    this.taakKnop.id='avontuur-taak';this.taakKnop.className='paneel';this.taakKnop.onclick=()=>{if(this.a.actief)this.toonMissie(this.a.actief);else this.toonBoek();};spel.hud.hud.append(this.taakKnop);
    this.interactieKnop.id='avontuur-interactie';this.interactieKnop.className='knop';this.interactieKnop.hidden=true;this.interactieKnop.onclick=()=>this.interactie();spel.hud.hud.append(this.interactieKnop);
    window.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&this.huidigScherm?.isConnected){e.preventDefault();(this.opAfsluiten??(()=>this.sluit()))();}
      if(e.code==='KeyE'&&spel.modus==='spelen'&&!(e.target instanceof HTMLElement&&e.target.closest('button,input,textarea,select'))){e.preventDefault();this.interactie();}
    });
    this.bewaar(false);
  }
  update() {
    const spelen=this.spel.modus==='spelen';this.interactieKnop.hidden=!spelen;
    if(!spelen)return;
    this.dichtbij=this.wereld.dichtst(this.spel.speler.pos);
    this.interactieKnop.hidden=!this.dichtbij;
    if(this.dichtbij?.id!==this.laatstDichtbij){this.laatstDichtbij=this.dichtbij?.id??'';this.interactieKnop.textContent=this.dichtbij?`${this.dichtbij.naam} · E / tik`:'';}
    const m=missie(this.a.actief,this.a),s=m?this.a.missies[m.id]:null;
    const tekst=m&&s?`${GEBIEDEN.find(g=>g.id===m.gebied)!.icoon} ${m.stappen[s.stap]} · Hulp`:'📖 Kies een avontuur · opdrachten en hulp';
    if(tekst!==this.laatsteTaak){this.taakKnop.textContent=tekst;this.laatsteTaak=tekst;}
  }
  stop(){this.uitvoering++;this.aanHetOefenen=false;this.huidigScherm=null;this.opAfsluiten=null;}
  private sluit(){this.stop();sluitScherm();this.spel.hervat();}
  private scherm(titel:string,inhoud:string,leren=false):HTMLDivElement {
    const zelfde=this.huidigScherm?.querySelector('h2')?.textContent===titel;
    const scroll=zelfde?this.huidigScherm?.scrollTop??0:0;
    const focus=zelfde&&this.huidigScherm?.contains(document.activeElement)&&document.activeElement instanceof HTMLElement
      ? [...document.activeElement.attributes].filter(a=>a.name.startsWith('data-')).map(a=>`[${a.name}="${CSS.escape(a.value)}"]`).join('') : '';
    this.uitvoering++;this.aanHetOefenen=leren;this.spel.pauzeer();
    this.opAfsluiten=null;
    const s=toon(`<div class="kaart avontuur"><header><h2>${veilig(titel)}</h2><button class="av-sluiten" aria-label="Sluiten en verder ontdekken" data-sluit>✕</button></header>${inhoud}<footer><button class="knop wit klein" data-sluit>Later verder · terug naar de wereld</button></footer></div>`,'avontuur-scherm');
    this.huidigScherm=s;s.querySelectorAll<HTMLButtonElement>('[data-sluit]').forEach(b=>b.onclick=()=>this.sluit());
    if(scroll||focus)requestAnimationFrame(()=>{if(!s.isConnected)return;if(scroll)s.scrollTop=scroll;const doel=focus?s.querySelector<HTMLElement>(focus):null;if(doel&&!doel.hasAttribute('disabled'))doel.focus({preventScroll:true});});return s;
  }
  private bewaar(opslaan=true){this.wereld.sync();if(opslaan)bewaarStand(this.stand);this.laatsteTaak='';}
  interactie() {
    if(this.spel.modus!=='spelen'||!this.dichtbij)return;
    const i=this.dichtbij;
    if(i.soort==='materiaal'||i.soort==='vlag'){
      const id=i.soort==='vlag'?'welkom':'brug',goed=verzamel(this.a,id,i.id);this.bewaar();
      this.spel.hud.toonBanner(goed?(id==='welkom'?'🎏 De vlag zit in je tas. Breng hem naar Mila!':`🪵 Drie balken in je tas! ${this.a.missies.brug.werk.verzameld.length}/3 plekken bezocht.`):'Dit materiaal zit al in je tas, of het onderwerp staat uit bij Voor ouders.',null,{duur:5500});
      return;
    }
    if(i.soort==='bewoner') {this.toonBewoner(i.id);return;}
    if(i.gebied==='boomhut'){ontdekHut(this.a);this.bewaar();this.toonHut();return;}
    this.toonGebied(i.gebied!);
  }
  toonKaart() {
    const s=this.scherm('🗺️ Kies een plek',`<p>Volg de gekleurde paden of reis meteen. Je kunt altijd terug naar het dorp.</p><div class="gebieden">${GEBIEDEN.map(g=>`<article style="--gebied:${g.kleur}"><h3>${g.icoon} ${g.naam}</h3><p>${veilig(g.uitleg)}</p>${knop(this.a.gebieden.includes(g.id)?'Reis hierheen':'Bouw eerst de brug',`data-reis="${g.id}" ${this.a.gebieden.includes(g.id)?'':'disabled'}`)}</article>`).join('')}</div>${knop('🐴 Dieren en oude obby’s','data-oud')}`);
    s.querySelectorAll<HTMLButtonElement>('[data-reis]').forEach(b=>b.onclick=()=>this.reis(b.dataset.reis as Gebied));
    s.querySelector<HTMLButtonElement>('[data-oud]')!.onclick=()=>{this.sluit();this.spel.zetSpeler({x:0,y:0,z:10},Math.PI);};
  }
  reis(g:Gebied) {
    if(!this.a.gebieden.includes(g))return;
    this.sluit();this.a.huidigGebied=g;this.spel.zetSpeler(this.wereld.reisPunt(g),Math.PI);this.bewaar();
    if(g==='boomhut'){ontdekHut(this.a);this.bewaar();this.spel.hud.toonBanner('🌳 Jouw boomhut! Praat bij de ingang om meubels te plaatsen. Je startset ligt klaar.',null,{duur:6000});}
  }
  toonGebied(g:Gebied) {
    const gebied=GEBIEDEN.find(v=>v.id===g)!,lijst=MISSIES.filter(m=>m.gebied===g);
    const klaar=lijst.filter(m=>this.a.missies[m.id].status==='voltooid').length;
    const s=this.scherm(`${gebied.icoon} ${gebied.naam}`,`<p><b>${veilig(gebied.bewoner)}:</b> ${klaar?'Bedankt voor je hulp! Je werk blijft hier zichtbaar. Kies gerust iets anders om te ontdekken.':veilig(gebied.uitleg)}</p><div class="missie-lijst">${lijst.map(m=>this.missieRij(m)).join('')}</div>${knop('Bekijk de wereldkaart','data-kaart')}${g==='bos'?'<p>Praat in het bos ook met Fien, Ubo en Kiki. Hun aanwijzingen komen in je boek.</p>':''}`);
    this.bindMissies(s);s.querySelector<HTMLButtonElement>('[data-kaart]')!.onclick=()=>this.toonKaart();
  }
  private missieRij(m:Missie):string {
    const s=this.a.missies[m.id],uit=!magBeginnen(this.a,m),beloning=DECORATIES.find(d=>d.id===m.beloning)!;
    return `<article><div><h3>${veilig(m.naam)}</h3><p>${s.status==='voltooid'?'✓ Voltooid':s.status==='actief'?`Actief · stap ${s.stap+1}/${m.stappen.length}`:'Beschikbaar · ongeveer 5–10 minuten'} · ${beloning.icoon} ${beloning.naam}</p></div>${knop(s.status==='voltooid'?'Bekijk resultaat':s.status==='actief'?'Verder':'Begin',`data-missie="${m.id}" ${uit&&s.status!=='voltooid'?'disabled':''}`)}${uit?'<small>Dit onderwerp staat uit of het gebied is nog gesloten.</small>':''}</article>`;
  }
  private bindMissies(s:HTMLElement){s.querySelectorAll<HTMLButtonElement>('[data-missie]').forEach(b=>b.onclick=()=>this.toonMissie(b.dataset.missie!));}
  toonBoek() {
    const m=missie(this.a.actief,this.a),huidig=m?`<aside><h3>Nu: ${veilig(m.naam)}</h3><p>${veilig(m.stappen[this.a.missies[m.id].stap])}</p>${knop('Open opdracht en hints',`data-missie="${m.id}"`)}</aside>`:'<p>Kies zelf waar je wilt helpen. Een lastige opdracht mag je later afmaken.</p>';
    const brug=this.a.missies.brug;
    const s=this.scherm('📖 Opdrachten en je tas',`${huidig}<details open><summary>Mijn materialen en verdiende spullen</summary><p>🎏 Vlag: ${this.a.missies.welkom.werk.verzameld.includes('vlag')?(this.a.missies.welkom.status==='voltooid'?'staat op het plein':'in je tas · voor Mila'):'nog bij de gele kist'}<br>🪵 Balken: ${brug.werk.verzameld.length*3-brug.werk.balken} in je tas · voor de brug.</p><div class="spullen">${this.a.decoraties.map(id=>{const d=DECORATIES.find(d=>d.id===id)!;return `<article><b>${d.icoon} ${d.naam}</b><p>${d.gebruik}</p></article>`;}).join('')||'<p>Help bewoners om spullen voor je boomhut te verdienen.</p>'}</div></details><h3>Alle avonturen</h3><div class="missie-lijst">${MISSIES.map(v=>this.missieRij(v)).join('')}</div>${knop('Wereldkaart','data-kaart')}`);
    this.bindMissies(s);s.querySelector<HTMLButtonElement>('[data-kaart]')!.onclick=()=>this.toonKaart();
  }
  private toonBewoner(id:string) {
    const b=BOS_BEWONERS.find(v=>v.id===id)!;const gelezen=leesAanwijzing(this.a,id);this.bewaar();
    const s=this.scherm(`💬 ${b.naam}`,`<p class="verhaal">${veilig(b.tekst)}</p><p>Pluimstaart = een staart met veel zachte haren.</p><p>${gelezen?'De aanwijzing staat in je opdrachtenboek.':''}</p>${knop('🔊 Lees voor','data-luister')}${knop('Bekijk het mysterie','data-mysterie')}`);
    s.querySelector<HTMLButtonElement>('[data-luister]')!.onclick=()=>spreek(b.tekst);
    s.querySelector<HTMLButtonElement>('[data-mysterie]')!.onclick=()=>this.toonMissie('bos-sleutel');
  }
  toonMissie(id:string,feedback='') {
    let m=missie(id);if(!m)return;
    const s=this.a.missies[id];
    if(s.status!=='voltooid'&&!magBeginnen(this.a,m)){this.toonBoek();return;}
    if(s.status==='beschikbaar'&&!beginMissie(this.a,id))return;
    m=missieVoorNiveau(m,s.niveau);
    if(s.status==='actief')this.a.actief=id;
    this.bewaar();
    if(s.status==='voltooid'){
      const v=this.scherm(`✓ ${m.naam}`,`<p>${veilig(feedback||'Bedankt voor je hulp! Je resultaat en beloning blijven bewaard.')}</p><p>${DECORATIES.find(d=>d.id===m.beloning)!.icoon} ${DECORATIES.find(d=>d.id===m.beloning)!.naam} staat in je boomhutvoorraad.</p>${knop('Meer avonturen','data-meer')}${knop(m.gebied==='brug'?'Ontdek de boomhut':'Naar je boomhut',`data-hut ${this.a.gebieden.includes('boomhut')?'':'disabled'}`)}<details><summary>Uitleg nog eens lezen</summary><p>${veilig(m.verhaal)}</p>${this.hintInhoud(m,{...s,hint:3})}</details>`);
      v.querySelector<HTMLButtonElement>('[data-meer]')!.onclick=()=>this.toonGebied(m.gebied);
      v.querySelector<HTMLButtonElement>('[data-hut]')!.onclick=()=>this.reis('boomhut');return;
    }
    const inhoud=this.missieInhoud(m,s);
    const v=this.scherm(`${GEBIEDEN.find(g=>g.id===m.gebied)!.icoon} ${m.naam}`,`<p class="verhaal">${veilig(m.verhaal)}</p><p class="opdracht"><b>Nu:</b> ${veilig(m.stappen[s.stap])}</p><div class="missie-werk">${inhoud}</div><p class="feedback" data-feedback aria-live="polite">${veilig(feedback)}</p><div class="acties">${knop('🔊 Lees opdracht voor','data-luister')}${knop('💡 Volgende hint','data-hint')}${knop('Controleer mijn werk','data-controleer')}${knop('Kaart · verder ontdekken','data-kaart')}</div><details ${s.hint?'open':''}><summary>Uitleg en hulp opnieuw lezen</summary><p>${veilig(m.verhaal)}</p>${this.hintInhoud(m,s)}</details>`,true);
    this.bindWerk(v,m,s);
    v.querySelector<HTMLButtonElement>('[data-luister]')!.onclick=()=>spreek(`${m.verhaal} ${m.stappen[s.stap]}`);
    v.querySelector<HTMLButtonElement>('[data-hint]')!.onclick=()=>{s.hint=Math.min(3,s.hint+1);this.bewaar();this.toonMissie(id);};
    v.querySelector<HTMLButtonElement>('[data-controleer]')!.onclick=()=>{const antwoord=v.querySelector<HTMLInputElement>('[data-antwoord]');if(antwoord)s.werk.antwoord=antwoord.value;const r=controleerMissie(this.a,id);this.bewaar();this.toonMissie(id,r.tekst);};
    v.querySelector<HTMLButtonElement>('[data-kaart]')!.onclick=()=>this.toonKaart();
  }
  private hintInhoud(m:Missie,s:MissieStand):string {
    let extra='';
    if(s.hint>=2&&m.soort==='welkom')extra='<p class="opdracht" role="img" aria-label="Vlag uit kist naar plein">🎏 Gele kist → 🎒 Je tas → 🏡 Mila haar plein</p>';
    if(s.hint>=2&&['aantallen','budget','wisselgeld'].includes(m.soort)){const v=winkelOpdracht(m,s);extra=`<div class="getallenlijn">${v.nodig.map((n,i)=>`<span>${['🍎','🪵','🎨'][i]} ${n} ×<small>${euro(v.prijzen[i])}</small></span>`).join('')}</div>`;}
    if(s.hint>=2&&m.soort==='sleutel')extra='<p class="opdracht">🐿️ Boom → blauwe bank<br>🐇 Boom → vijver<br>🔑 Waar hoorde Kiki het roepen?</p>';
    if(s.hint>=2&&m.soort==='volgorde')extra='<p class="opdracht">🔑 Eerst … → 🚪 Daarna … → 💡 Pas toen …</p>';
    if(s.hint>=2&&m.soort==='woord')extra='<p class="opdracht">💧 Nat + 👣 zachte grond → drassig</p>';
    if(s.hint>=2&&m.soort==='hut')extra='<p class="opdracht">🪴 Kies → ▦ vrije tegel → ✓ bewaard</p>';
    if(s.hint>=2&&['route','obstakel','herhaal'].includes(m.soort))extra=`${this.robotRaster(m,robotStart(robotRoute(m)))}<p>🤖 ${['↑','→','↓','←'][robotRoute(m).richting]} Start · 📦 kist · ⭐ doel. Teken met je vinger een route over vrije vakken.</p>`;
    if(s.hint>=2&&['verzorgen','vergelijken','meten'].includes(m.soort))extra=`<p class="opdracht">A: 💧💧 + ☀️☀️ → +3 cm per dag<br>${m.soort==='vergelijken'?'B: 💧💧 + geen licht → +0 cm':`2 cm start → ${s.niveau+1} dagen → eindhoogte`}</p>`;
    if(s.hint>=2&&m.soort==='brug'){
      const {doel,balk}=brugMaten(this.a);extra=`<div class="getallenlijn" role="img" aria-label="Zes groepjes van ${balk} meter vormen ${doel}">${Array.from({length:doel/balk+1},(_,i)=>`<span>${i*balk}<small>${i<doel/balk?`+${balk} →`:''}</small></span>`).join('')}</div>`;
      if(s.hint===3)extra+=`<p>${doel/balk} × ${balk} = ${doel}. Je hebt ${doel/balk} balken nodig. Elke balk overbrugt ${balk} meter.</p>`;
    }
    if(s.hint===3&&['aantallen','budget','wisselgeld'].includes(m.soort)){
      const v=winkelOpdracht(m,s),t=mandTotaal(v.nodig,v.prijzen);extra+=`<p>${v.nodig.map((n,i)=>`${n} × ${euro(v.prijzen[i])}`).join(' + ')} = ${euro(t)}.${m.soort==='aantallen'?'':` ${euro(m.soort==='budget'?v.budget:v.betaald)} − ${euro(t)} = ${euro((m.soort==='budget'?v.budget:v.betaald)-t)}.`}</p>`;
    }
    if(s.hint===3&&m.soort==='verdelen'){const d=pizzaDoel(m,s).verdeling;extra=`<p>${d} gelijke stukken: elk stuk is 1/${d}, want ${d} × 1/${d} = 1 hele pizza.</p>${pizzaSvg([],d)}`;}
    if(s.hint>=2&&m.soort==='gelijk') {const d=pizzaDoel(m,s);extra=`${pizzaSvg(Array.from({length:d.kaas/(8/d.kleineNoemer)},()=>({smaak:'kaas',noemer:d.kleineNoemer as 4|8})))}<p>${d.kaas/(8/d.kleineNoemer)}/${d.kleineNoemer} = ${d.kaas===6?'3/4':'1/2'}: hetzelfde gevulde oppervlak.</p>`;}
    if(s.hint===3&&['route','obstakel','herhaal'].includes(m.soort)){extra+=`<p>Een veilige route: ${robotRoute(m).oplossing.map(b=>`${b.herhaal>1?`Herhaal ${b.herhaal} × `:''}${b.actie}`).join(' → ')}. Draaien verplaatst Ro niet; Vooruit doet dat wel.</p>`;}
    if(s.hint===3&&m.soort==='meten'){const n=s.niveau+1;extra=`<p>${n} dagen × 3 cm = ${n*3} cm groei. Eindhoogte: 2 + ${n*3} = ${2+n*3} cm. De starthoogte tel je niet als nieuwe groei.</p>`;}
    return `${s.hint?m.hints.slice(0,s.hint).map((h,i)=>`<p><b>${['Aanwijzing','Visuele hulp','Voorbeeld met uitleg'][i]}:</b> ${veilig(m.soort==='meten'&&s.niveau>1&&i>0?'Bekijk de meetwaarden. De groei per passende dag is 3 cm. Tel alleen wat erbij kwam.':m.soort==='gelijk'&&s.niveau===3&&i>0?'Vergelijk 3/4 en 6/8: ieder kwart kun je in twee achtsten splitsen. Zo veranderen de namen, maar blijft het oppervlak gelijk.':h)}</p>`).join(''):'<p>Vraag een hint als je hulp wilt. Je verdiende spullen blijven veilig.</p>'}${extra}`;
  }
  private missieInhoud(m:Missie,s:MissieStand):string {
    const w=s.werk;
    if(m.soort==='welkom')return `<p>🎏 ${w.verzameld.includes('vlag')?'De vlag zit in je tas. Je kunt hem nu op het plein plaatsen.':'Loop naar de gele kist naast Mila en tik op Onderzoek.'}</p>${w.verzameld.includes('vlag')?knop('Plaats de vlag op het plein','data-plaatsvlag'):knop('Ga naar de gele kist','data-vlagreis')}`;
    if(m.soort==='brug'){
      const b=brugMaten(this.a);return `<p><b>Oversteek: ${b.doel} meter. Iedere balk: ${b.balk} meter.</b></p><ul>${MATERIAALPLEKKEN.map(p=>`<li>${w.verzameld.includes(p.id)?'✓':'🪵'} ${p.naam} ${knop('Ga naar deze plek',`data-materiaalreis="${p.id}"`)}</li>`).join('')}</ul><div class="brug-maat"><progress max="${b.doel}" value="${Math.min(b.doel,w.balken*b.balk)}" aria-label="Bruglengte"></progress><b>${w.balken*b.balk} / ${b.doel} meter</b></div><div class="balken-beeld" role="img" aria-label="${w.balken} balken van ${b.balk} meter">${Array.from({length:w.balken},()=>`<span>${b.balk} m</span>`).join('')}</div><p>In je tas: ${w.verzameld.length*3-w.balken} balken. Na controle wordt de brug begaanbaar.</p>${knop(`Plaats ${b.balk} meter`,`data-balk ${s.stap===2?'':'disabled'}`)}${knop('Haal laatste balk weg',`data-wegbalk ${w.balken&&s.stap===2?'':'disabled'}`)}`;
    }
    if(m.soort==='hut')return knop('Open de bouwmodus','data-inrichten');
    if(['aantallen','budget','wisselgeld'].includes(m.soort)){
      const v=winkelOpdracht(m,s),t=mandTotaal(w.mand,v.prijzen);
      return `<p>${m.soort==='budget'?`Je budget: <b>${euro(v.budget)}</b>.`:m.soort==='wisselgeld'?`Je betaalt: <b>${euro(v.betaald)}</b>.`:'Sara haar bestelling:'}</p><div class="producten">${PRODUCTEN.map((p,i)=>`<article><b>${['🍎','🪵','🎨'][i]} ${p}</b><p>${euro(v.prijzen[i])} per stuk<br>Gevraagd: ${v.nodig[i]} · Mand: <b>${w.mand[i]}</b></p>${knop('−',`data-mand="${i}" data-delta="-1" aria-label="Leg één ${PRODUCT_EENHEDEN[i]} terug"`)}${knop('+',`data-mand="${i}" data-delta="1" aria-label="Pak één ${PRODUCT_EENHEDEN[i]}"`)}</article>`).join('')}</div><p class="mandtotaal">🧺 Totaal: <b>${euro(t)}</b> ${m.soort==='budget'&&t>v.budget?'· Kijk nog eens naar je budget.':''}</p>${m.soort==='aantallen'?'':`<label for="av-antwoord">${m.soort==='budget'?'Hoeveel euro houd je over?':'Hoeveel euro wisselgeld krijg je?'}</label><input id="av-antwoord" data-antwoord inputmode="decimal" autocomplete="off" placeholder="Bijvoorbeeld 4,50" value="${veilig(w.antwoord)}">`}`;
    }
    if(m.soort==='sleutel')return `${s.niveau===1?`<p class="opdracht">${LEES_STEUN.sleutel}</p>`:''}<div class="aanwijzingen">${BOS_BEWONERS.map(b=>`<article><h3>${b.naam}</h3>${w.gelezen.includes(b.id)?`<p>${veilig(b.tekst)}</p>`:`<p>Deze aanwijzing moet je nog ophalen.</p>${knop('Ga naar deze bewoner',`data-bosreis="${b.id}"`)}`}</article>`).join('')}</div><details ${s.niveau===1?'open':''}><summary>Moeilijke woorden</summary><p>Pluimstaart: een staart met veel zachte haren. Daarna: wat na iets anders gebeurt.</p></details>${this.keuzes([...BOS_KEUZES,...(s.niveau===3?BOS_EXTRA_KEUZES.sleutel:[])],w.keuze)}`;
    if(m.soort==='volgorde'||m.soort==='woord')return `${s.niveau===1?`<p class="opdracht">${LEES_STEUN[m.soort]}</p>`:''}<p class="verhaal">${m.soort==='volgorde'?VOLGORDE_TEKST:WOORD_TEKST}</p>${this.keuzes([...(m.soort==='volgorde'?VOLGORDE_KEUZES:WOORD_KEUZES),...(s.niveau===3?BOS_EXTRA_KEUZES[m.soort]:[])],w.keuze)}`;
    if(m.soort==='verdelen')return `<p>Verdeel de pizza in <b>${pizzaDoel(m,s).verdeling} gelijke stukken</b>. Elk stuk is 1/${pizzaDoel(m,s).verdeling}.</p>${pizzaSvg([],w.verdeling||1)}<div class="acties">${[2,4,...(s.niveau===3?[8]:[])].map(n=>knop(`${n} gelijke stukken`,`data-snij="${n}" aria-pressed="${w.verdeling===n}"`)).join('')}</div>`;
    if(m.soort==='bestelling'||m.soort==='gelijk'){
      const d=pizzaDoel(m,s),breuk=d.kaas===6?'3/4':'1/2';
      return `<p>${m.soort==='bestelling'?'Bestelling: <b>1/2 kaas en 1/4 tomaat</b>.':`Vul <b>${breuk} pizza</b> met ${d.kleineNoemer===8?'achtsten':'kwarten'}.`}</p><div class="pizza-borden">${m.soort==='gelijk'?`<div>${pizzaSvg(d.kaas===6?[{smaak:'kaas',noemer:2},{smaak:'kaas',noemer:4}]:[{smaak:'kaas',noemer:2}])}<p>Voorbeeld: ${breuk}</p></div>`:''}<div>${pizzaSvg(w.pizza)}<p>Jouw bord: ${pizzaEenheden(w.pizza, 'kaas')}/8 kaas · ${pizzaEenheden(w.pizza,'tomaat')}/8 tomaat</p></div></div><div class="acties">${(['kaas',...(m.soort==='bestelling'?['tomaat']:[])] as PizzaStuk['smaak'][]).flatMap(smaak=>(m.soort==='gelijk'?[d.kleineNoemer]:[2,4,...(s.niveau===3?[8]:[])]).map(n=>knop(`${smaak==='kaas'?'🧀':'🍅'} 1/${n} ${smaak}`,`data-pizza="${smaak}" data-noemer="${n}"`))).join('')}</div><div class="acties">${w.pizza.map((p,i)=>knop(`Terug: 1/${p.noemer} ${p.smaak}`,`data-pizzaterug="${i}"`)).join('')}</div>`;
    }
    if(['route','obstakel','herhaal'].includes(m.soort))return this.robotInhoud(m,s);
    return this.tuinInhoud(m,s);
  }
  private keuzes(keuzes:string[],gekozen:string):string {return `<div class="keuzes">${keuzes.map((k,i)=>knop(veilig(k),`data-keuze="${i}" aria-pressed="${gekozen===String(i)}"`)).join('')}</div>`;}
  private bindWerk(v:HTMLElement,m:Missie,s:MissieStand) {
    const w=s.werk,herteken=()=>{this.bewaar();this.toonMissie(m.id);};
    const bind=(sel:string,fn:(b:HTMLButtonElement)=>void)=>v.querySelectorAll<HTMLButtonElement>(sel).forEach(b=>b.onclick=()=>fn(b));
    const antwoord=v.querySelector<HTMLInputElement>('[data-antwoord]');if(antwoord)antwoord.oninput=()=>{w.antwoord=antwoord.value;this.bewaar();};
    bind('[data-plaatsvlag]',()=>{const r=controleerMissie(this.a,m.id);this.bewaar();this.toonMissie(m.id,r.tekst);});
    bind('[data-vlagreis]',()=>{this.sluit();this.spel.zetSpeler({x:-4.5,y:0,z:-38.5},Math.PI);});
    bind('[data-materiaalreis]',b=>{const p=MATERIAALPLEKKEN.find(p=>p.id===b.dataset.materiaalreis)!;this.sluit();this.spel.zetSpeler({x:p.x+1.6,y:0,z:p.z+1.5},Math.PI);});
    bind('[data-bosreis]',b=>{const p=BOS_BEWONERS.find(p=>p.id===b.dataset.bosreis)!;this.sluit();this.spel.zetSpeler({x:p.x+1.5,y:0,z:p.z+1.5},Math.PI);});
    bind('[data-balk]',()=>{plaatsBalk(this.a);herteken();});bind('[data-wegbalk]',()=>{plaatsBalk(this.a,true);herteken();});
    bind('[data-inrichten]',()=>this.toonHut());
    bind('[data-mand]',b=>{const i=Number(b.dataset.mand);w.mand[i]=Math.max(0,Math.min(20,w.mand[i]+Number(b.dataset.delta)));herteken();});
    bind('[data-keuze]',b=>{w.keuze=b.dataset.keuze!;herteken();});bind('[data-snij]',b=>{w.verdeling=Number(b.dataset.snij);herteken();});
    bind('[data-pizza]',b=>{const p:PizzaStuk={smaak:b.dataset.pizza as PizzaStuk['smaak'],noemer:Number(b.dataset.noemer) as PizzaStuk['noemer']};if(pizzaEenheden(w.pizza)+8/p.noemer<=8)w.pizza.push(p);herteken();});
    bind('[data-pizzaterug]',b=>{w.pizza.splice(Number(b.dataset.pizzaterug),1);herteken();});
    if(['route','obstakel','herhaal'].includes(m.soort))this.bindRobot(v,m,s);
    if(['verzorgen','vergelijken','meten'].includes(m.soort))this.bindTuin(v,m,s);
  }
  toonHut(gekozen:Decoratie|null=null,bestaandId?:number,feedback='') {
    if(!ontdekHut(this.a))return;this.bewaar();
    const s=this.scherm('🌳 Bouwmodus · jouw boomhut',`<p>Kies een voorwerp en tik op een vrije vloertegel. Tik op een geplaatst voorwerp om het te verplaatsen, te draaien of terug te leggen. Je looppad blijft vrij.</p><div class="hut-layout"><div class="hut-raster" role="group" aria-label="Boomhutvloer met acht kolommen en zes rijen">${Array.from({length:HUT_DIEPTE},(_,z)=>Array.from({length:HUT_BREEDTE},(_,x)=>{const v=this.a.inrichting.find(v=>v.x===x&&v.z===z),d=DECORATIES.find(d=>d.id===v?.item);return `<button class="tegel ${vrijeTegel(x,z)?'':'pad'} ${bestaandId&&v?.id===bestaandId?'gekozen':''}" ${vrijeTegel(x,z)?'':'disabled'} data-x="${x}" data-z="${z}" aria-label="${d?`${d.naam}, `:''}tegel ${x+1}, ${z+1}${vrijeTegel(x,z)?'':', vrij looppad'}">${d?.icoon??(vrijeTegel(x,z)?'·':'↓')}</button>`;}).join('')).join('')}</div><div><h3>Mijn voorraad</h3><div class="hut-spullen">${this.a.decoraties.map(id=>{const d=DECORATIES.find(d=>d.id===id)!;return knop(`${d.icoon} ${d.naam}`,`data-item="${id}" aria-pressed="${gekozen===id}"`);}).join('')}</div></div></div><p class="feedback" aria-live="polite">${veilig(feedback|| (gekozen?`Gekozen: ${DECORATIES.find(d=>d.id===gekozen)!.naam}. Tik op een vrije tegel.`:'Je startset en alle beloningen staan klaar.'))}</p>${bestaandId?`${knop('Draai voorwerp','data-draai')}${knop('Leg terug in voorraad','data-terug')}`:''}<p class="klein">Terugleggen verwijdert alleen de plaatsing. Je verdiende voorwerp blijft van jou. Alles wordt automatisch bewaard.</p>`);
    s.querySelectorAll<HTMLButtonElement>('[data-item]').forEach(b=>b.onclick=()=>{const id=b.dataset.item as Decoratie,v=this.a.inrichting.find(v=>v.item===id);this.toonHut(id,v?.id);});
    s.querySelectorAll<HTMLButtonElement>('[data-x]').forEach(b=>b.onclick=()=>{
      const x=Number(b.dataset.x),z=Number(b.dataset.z),v=this.a.inrichting.find(v=>v.x===x&&v.z===z);
      if(v){this.toonHut(v.item,v.id);return;}
      if(!gekozen){this.toonHut(null,undefined,'Kies eerst een voorwerp uit je voorraad.');return;}
      const goed=plaatsDecoratie(this.a,gekozen,x,z,bestaandId);this.bewaar();this.toonHut(goed?null:gekozen,undefined,goed?'Geplaatst en bewaard! Je ziet het ook in de 3D-boomhut.':'Deze plek kan niet. Kies een vrije tegel.');
    });
    const v=bestaandId?this.a.inrichting.find(v=>v.id===bestaandId):undefined;
    if(v){s.querySelector<HTMLButtonElement>('[data-draai]')!.onclick=()=>{v.draai=(v.draai+1)%4;this.bewaar();this.toonHut(v.item,v.id,'Een kwartslag gedraaid en bewaard.');};s.querySelector<HTMLButtonElement>('[data-terug]')!.onclick=()=>{terugleggen(this.a,v.id);this.bewaar();this.toonHut(null,undefined,'Terug in je voorraad. Je kunt het weer plaatsen.');};}
  }
  private robotInhoud(m:Missie,s:MissieStand):string {
    return `<p>Breng Ro naar ⭐ en gebruik <b>Interactie</b>. ${m.soort==='herhaal'?'Gebruik Herhaal en hoogstens vijf blokken.':''}</p><div class="robot-layout"><div data-raster>${this.robotRaster(m,robotStart(robotRoute(m)))}</div><div><h3>Jouw programma</h3><ol class="programma">${s.werk.programma.map((b,i)=>`<li data-blok="${i}"><b>${b.herhaal>1?`${b.herhaal} × `:''}${b.actie}</b><div>${knop('↑',`data-blokactie="omhoog" data-index="${i}" aria-label="Blok ${i+1} omhoog"`)}${knop('↓',`data-blokactie="omlaag" data-index="${i}" aria-label="Blok ${i+1} omlaag"`)}${knop('✕',`data-blokactie="weg" data-index="${i}" aria-label="Blok ${i+1} verwijderen"`)}</div></li>`).join('')||'<li>Voeg hieronder je eerste blok toe.</li>'}</ol></div></div><div class="acties">${(['vooruit','links','rechts','interactie'] as const).map(a=>knop(a==='vooruit'?'↑ Vooruit':a==='links'?'↶ Links draaien':a==='rechts'?'↷ Rechts draaien':'✋ Interactie',`data-robot="${a}"`)).join('')}${m.soort==='herhaal'||s.niveau>1?'<label>Herhaal <select data-herhaal aria-label="Aantal herhalingen">'+Array.from({length:8},(_,i)=>`<option value="${i+1}">${i+1} ×</option>`).join('')+'</select></label>':''}</div><div class="acties">${knop('▶ Voer programma uit','data-run')}${knop('⏹ Stop en zet Ro terug','data-stop')}${knop('↺ Leeg programma','data-leeg')}</div><p data-robotstatus aria-live="polite">Ro staat op zijn startplek. Elke pijl in het raster toont zijn kijkrichting.</p>`;
  }
  private robotRaster(m:Missie,s:RobotStand):string {
    const r=robotRoute(m);return `<div class="robot-raster" style="--kolommen:${r.breedte}" role="img" aria-label="Ro op vak ${s.x+1}, ${s.z+1}, kijkt ${['noord','oost','zuid','west'][s.richting]}">${Array.from({length:r.hoogte},(_,z)=>Array.from({length:r.breedte},(_,x)=>`<div class="robot-vak ${r.obstakels.some(([bx,bz])=>bx===x&&bz===z)?'obstakel':''}">${s.x===x&&s.z===z?`🤖${['↑','→','↓','←'][s.richting]}`:r.obstakels.some(([bx,bz])=>bx===x&&bz===z)?'📦':r.doel[0]===x&&r.doel[1]===z?'⭐':'·'}</div>`).join('')).join('')}</div>`;
  }
  private bindRobot(v:HTMLElement,m:Missie,s:MissieStand) {
    const w=s.werk,teken=()=>{this.bewaar();this.toonMissie(m.id);};
    v.querySelectorAll<HTMLButtonElement>('[data-robot]').forEach(b=>b.onclick=()=>{if(w.programma.length>=32)return;const herhaal=Number(v.querySelector<HTMLSelectElement>('[data-herhaal]')?.value??1);w.programma.push({actie:b.dataset.robot as RobotActie,herhaal});teken();});
    v.querySelectorAll<HTMLButtonElement>('[data-blokactie]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.index),soort=b.dataset.blokactie;if(soort==='weg')w.programma.splice(i,1);else {const j=i+(soort==='omhoog'?-1:1);if(j>=0&&j<w.programma.length)[w.programma[i],w.programma[j]]=[w.programma[j],w.programma[i]];}teken();});
    v.querySelector<HTMLButtonElement>('[data-leeg]')!.onclick=()=>{w.programma=[];teken();};
    const status=v.querySelector<HTMLElement>('[data-robotstatus]')!,r=robotRoute(m);
    let robot=robotStart(r),running=false;
    const paint=()=>{v.querySelector('[data-raster]')!.innerHTML=this.robotRaster(m,robot);this.wereld.robotBeeld(r,robot);};
    paint();
    const zetRun=(aan:boolean)=>{running=aan;v.querySelectorAll<HTMLButtonElement>('[data-robot],[data-blokactie],[data-leeg],[data-run],[data-controleer],[data-hint]').forEach(b=>b.disabled=aan);};
    v.querySelector<HTMLButtonElement>('[data-stop]')!.onclick=()=>{this.uitvoering++;zetRun(false);robot=robotStart(r);paint();v.querySelectorAll('[data-blok]').forEach(b=>b.classList.remove('bezig'));status.textContent='Gestopt. Ro is terug op zijn startplek. Je programma blijft staan.';};
    v.querySelector<HTMLButtonElement>('[data-run]')!.onclick=()=>{
      if(running)return;const stappen=vouwProgramma(w.programma);if(!stappen.length){status.textContent='Voeg eerst een blok toe.';return;}
      robot=robotStart(r);paint();zetRun(true);const token=++this.uitvoering;let index=0;
      const stap=()=>{
        if(token!==this.uitvoering||!v.isConnected)return;
        const b=stappen[index];if(!b){zetRun(false);status.textContent='Programma klaar. Staat Ro bij de ster? Eindig met Interactie.';return;}
        v.querySelectorAll('[data-blok]').forEach(el=>el.classList.toggle('bezig',Number((el as HTMLElement).dataset.blok)===b.blok));
        robot=robotStap(r,robot,b.actie);paint();status.textContent=`Stap ${index+1}/${stappen.length}: ${b.actie}.`;index++;
        if(robot.fout){zetRun(false);status.textContent=robot.fout;return;}
        if(robot.klaar){zetRun(false);const resultaat=controleerMissie(this.a,m.id);this.bewaar();this.toonMissie(m.id,resultaat.tekst);return;}
        window.setTimeout(stap,this.stand.minderEffecten?180:450);
      };stap();
    };
  }
  private tuinInhoud(m:Missie,s:MissieStand):string {
    const w=s.werk;return `<p class="klein">Oefenmodel: 2 bekers water en 2 lampjes licht → 3 cm groei per dag. Eén afwijking → 1 cm; grotere afwijking → 0 cm. Geen echte wachttijd.</p>${m.soort==='meten'?`<p>Onderzoek <b>${s.niveau+1} dagen</b> met passend water en licht.</p>`:''}<div class="planten">${w.planten.map((p,i)=>`<article><h3>Plant ${i?'B':'A'}</h3><div class="plant-beeld" role="img" aria-label="Plant ${i?'B':'A'} is ${p.hoogte} centimeter hoog"><div class="plant-stam" style="height:${20+p.hoogte*4}px">🌻</div><div class="plant-pot">🪴 ${p.hoogte} cm</div></div>${(['water','licht'] as const).map(soort=>`<label for="plant-${i}-${soort}">${soort==='water'?'💧 Bekers water':'☀️ Lampjes licht'}</label><select id="plant-${i}-${soort}" data-plant="${i}" data-soort="${soort}">${[0,1,2,3,4].map(n=>`<option value="${n}" ${p[soort]===n?'selected':''}>${n} ${soort==='water'?'bekers':'lampjes'}</option>`).join('')}</select>`).join('')}</article>`).join('')}</div>${knop('Laat een dag verlopen','data-dag')}${knop('Begin onderzoek opnieuw','data-tuinreset')}<div class="tabel-scroll"><table><caption>Meetboek · starthoogte 2 cm</caption><thead><tr><th>Dag</th><th>A: cm</th><th>B: cm</th></tr></thead><tbody><tr><td>Start</td><td>2</td><td>2</td></tr>${w.metingen.map((v,i)=>`<tr><td>${i+1}</td><td>${v.a}</td><td>${v.b}</td></tr>`).join('')}</tbody></table></div>${m.soort==='vergelijken'?`<p>Welke plant groeit meer bij dit lichtonderzoek?</p><div class="keuzes">${knop('Plant A',`data-plantkeuze="a" aria-pressed="${w.keuze==='a'}"`)}${knop('Plant B',`data-plantkeuze="b" aria-pressed="${w.keuze==='b'}"`)}</div>`:''}${m.soort==='meten'?`<label for="av-antwoord">Hoeveel centimeter is A gegroeid sinds de start?</label><input id="av-antwoord" data-antwoord inputmode="numeric" value="${veilig(w.antwoord)}">`:''}`;
  }
  private bindTuin(v:HTMLElement,m:Missie,s:MissieStand) {
    const w=s.werk,herteken=()=>{this.bewaar();this.toonMissie(m.id);};
    v.querySelectorAll<HTMLSelectElement>('[data-plant]').forEach(b=>b.onchange=()=>{w.planten[Number(b.dataset.plant)][b.dataset.soort as 'water'|'licht']=Number(b.value);this.bewaar();});
    v.querySelector<HTMLButtonElement>('[data-dag]')!.onclick=()=>{const ok=tuinDag(w);this.bewaar();this.toonMissie(m.id,ok?'Een groeidag is voorbij. Bekijk je meetboek.':'Je hebt zeven dagen gemeten. Begin het onderzoek opnieuw als je iets anders wilt proberen.');};
    v.querySelector<HTMLButtonElement>('[data-tuinreset]')!.onclick=()=>{const leeg=leegWerk();w.planten=leeg.planten;w.metingen=[];w.antwoord='';w.keuze='';herteken();};
    v.querySelectorAll<HTMLButtonElement>('[data-plantkeuze]').forEach(b=>b.onclick=()=>{w.keuze=b.dataset.plantkeuze!;herteken();});
  }
  /** Apart ouderpaneel, bereikbaar vanuit de bestaande ouderinstellingen. */
  toonOuderAvonturen(terug:()=>void) {
    const s=this.scherm('Voor ouders · avonturen',`<p>Dit is startinhoud voor groep 6, geen volledige officiële leerlijn. Voltooiing zegt op zichzelf niets over beheersing of schoolniveau. Een actieve missie houdt het niveau waarmee ze begon.</p><div class="onderwerpen">${ONDERWERPEN.map(o=>`<fieldset><legend>${ONDERWERP_NAMEN[o]}</legend><label><input type="checkbox" data-onderwerp="${o}" ${this.a.onderwerpen.includes(o)?'checked':''}> Opdrachten beschikbaar</label><label for="niveau-${o}">Moeilijkheid</label><select id="niveau-${o}" data-niveau="${o}">${[1,2,3].map(n=>`<option value="${n}" ${this.a.niveaus[o]===n?'selected':''}>${n===1?'1 · Begin':n===2?'2 · Meer uitdaging':'3 · Extra uitdaging'}</option>`).join('')}</select></fieldset>`).join('')}</div><p>Niveau beïnvloedt brugmaten, geldbedragen, pizzaverdeling, robotherhaling en meetdagen. Bij lezen verandert de hoeveelheid directe leessteun en het aantal afleiders. De aanwijzingen blijven logisch gelijk.</p><label><input type="checkbox" data-geluid ${this.stand.geluidAan?'checked':''}> Geluid aan</label><label><input type="checkbox" data-muziek ${this.stand.muziekAan?'checked':''}> Muziek aan</label><label><input type="checkbox" data-rustig ${this.stand.minderEffecten?'checked':''}> Rustige effecten</label><label for="av-kwaliteit">Beeldkwaliteit</label><select id="av-kwaliteit"><option value="mooi" ${this.stand.beeldkwaliteit==='mooi'?'selected':''}>Mooi</option><option value="zuinig" ${this.stand.beeldkwaliteit==='zuinig'?'selected':''}>Zuinig</option></select>${knop('Bewaar instellingen','data-ouderbewaar')}<p class="feedback" data-feedback aria-live="polite"></p><h3>Gespeelde en voltooide missies</h3><div class="tabel-scroll"><table><thead><tr><th>Missie</th><th>Status</th><th>Stap</th><th>Controles</th><th>Hints</th></tr></thead><tbody>${MISSIES.map(m=>{const v=this.a.missies[m.id];return `<tr><td>${veilig(m.naam)}</td><td>${v.status}</td><td>${Math.min(m.stappen.length,v.stap+1)}/${m.stappen.length}</td><td>${v.pogingen}</td><td>${v.hint}/3</td></tr>`;}).join('')}</tbody></table></div><details><summary>Avonturen bewust opnieuw beginnen</summary><p>Dit wist de avonturenmissies, nieuwe decoraties en boomhutinrichting. Dieren, kleding en eerder geoefende schoolwoorden blijven behouden. Download eerst een back-up in het gewone ouderpaneel.</p><label for="reset-avontuur">Typ OPNIEUW om te bevestigen</label><input id="reset-avontuur" autocomplete="off"><button class="knop klein wit" data-reset>Begin avonturen opnieuw</button></details>${knop('Terug naar ouderinstellingen','data-ouderterug')}`);
    s.querySelector<HTMLButtonElement>('[data-ouderbewaar]')!.onclick=()=>{
      this.a.onderwerpen=[...s.querySelectorAll<HTMLInputElement>('[data-onderwerp]:checked')].map(v=>v.dataset.onderwerp as Onderwerp);
      const actieve=missie(this.a.actief);if(actieve&&!this.a.onderwerpen.includes(actieve.onderwerp))this.a.actief=null;
      s.querySelectorAll<HTMLSelectElement>('[data-niveau]').forEach(v=>this.a.niveaus[v.dataset.niveau as Onderwerp]=Number(v.value) as 1|2|3);
      this.stand.geluidAan=s.querySelector<HTMLInputElement>('[data-geluid]')!.checked;this.stand.muziekAan=s.querySelector<HTMLInputElement>('[data-muziek]')!.checked;this.stand.minderEffecten=s.querySelector<HTMLInputElement>('[data-rustig]')!.checked;
      this.stand.beeldkwaliteit=s.querySelector<HTMLSelectElement>('#av-kwaliteit')!.value as Spelstand['beeldkwaliteit'];
      this.spel.geluid.aan=this.stand.geluidAan;this.spel.muziek.zetAan(this.stand.muziekAan);this.spel.pasKwaliteitAan();
      const ok=bewaarStand(this.stand);s.querySelector('[data-feedback]')!.textContent=ok?'Instellingen bewaard. Je kunt per onderwerp zelf kiezen.':'Deze instellingen werken nu. Maak een back-up: automatisch bewaren is niet gelukt.';
    };
    s.querySelector<HTMLButtonElement>('[data-reset]')!.onclick=()=>{
      if(s.querySelector<HTMLInputElement>('#reset-avontuur')!.value!=='OPNIEUW'){s.querySelector('[data-feedback]')!.textContent='Typ precies OPNIEUW om bewust te bevestigen.';return;}
      const vorig=this.stand.avontuur;this.stand.avontuur=nieuwAvontuur();
      if(bewaarStand(this.stand))location.reload();else {this.stand.avontuur=vorig;s.querySelector('[data-feedback]')!.textContent='Opnieuw beginnen kon niet worden bewaard. Je voortgang blijft behouden.';}
    };
    s.querySelector<HTMLButtonElement>('[data-ouderterug]')!.onclick=()=>{this.stop();terug();};
    this.opAfsluiten=()=>{this.stop();terug();};
    s.querySelectorAll<HTMLButtonElement>('[data-sluit]').forEach(b=>b.onclick=()=>{this.stop();terug();});
  }
}
function missie(id:string|null,a?:AvontuurStand):Missie|undefined{const m=MISSIES.find(m=>m.id===id);return m&&a?missieVoorNiveau(m,a.missies[m.id].niveau):m;}
