import { describe, expect, it } from 'vitest';
import { BRUG_VARIANTEN, MISSIES, ROBOT_ROUTES, WINKEL_VARIANTEN, type Missie } from '../src/avontuur/inhoud';
import { beginMissie, brugMaten, centen, controleerMissie, ontdekHut, euro, groei, leesAanwijzing, mandTotaal, nieuwAvontuur, pizzaEenheden, gelijkwaardig, plaatsBalk,
  plaatsDecoratie, robotStart, robotStap, terugleggen, tuinDag, valideerAvontuur, verzamel, voerRobotUit, vouwProgramma, winkelOpdracht } from '../src/avontuur/logica';
import { bewaarStand, exporteerStand, laadStand, leesBackUp, nieuweStand, valideerStand } from '../src/opslag/opslag';

function brugKlaar(niveau:1|2|3=1) {
  const a=nieuwAvontuur();a.niveaus.bouwen=niveau;beginMissie(a,'brug');
  for(const bron of ['labkrat','werf','bosrand'])verzamel(a,'brug',bron);
  const b=brugMaten(a);for(let i=0;i<b.doel/b.balk;i++)plaatsBalk(a);
  expect(controleerMissie(a,'brug').goed).toBe(true);return a;
}
const missie=(id:string):Missie=>MISSIES.find(m=>m.id===id)!;
describe('avontuurmissies en inventaris',()=>{
  it('doorloopt de proefmissie en keert niet dubbel een beloning uit',()=>{
    const a=nieuwAvontuur();expect(controleerMissie(a,'welkom').goed).toBe(false);
    expect(beginMissie(a,'welkom')).toBe(true);expect(a.missies.welkom.stap).toBe(1);
    expect(verzamel(a,'welkom','fout')).toBe(false);expect(verzamel(a,'welkom','vlag')).toBe(true);
    expect(verzamel(a,'welkom','vlag')).toBe(false);expect(a.missies.welkom.stap).toBe(2);
    expect(controleerMissie(a,'welkom').goed).toBe(true);expect(controleerMissie(a,'welkom').goed).toBe(false);
    expect(a.beloningen).toEqual(['welkom']);expect(a.decoraties).toEqual(['mat']);
  });
  it('verzamelt in elke volgorde, bevriest niveau en houdt fout herstelbaar',()=>{
    const a=nieuwAvontuur();a.niveaus.bouwen=2;expect(verzamel(a,'brug','bosrand')).toBe(true);
    a.niveaus.bouwen=3;expect(brugMaten(a)).toEqual(BRUG_VARIANTEN[1]);
    expect(plaatsBalk(a)).toBe(false);expect(controleerMissie(a,'brug').goed).toBe(false);
    verzamel(a,'brug','labkrat');verzamel(a,'brug','werf');
    for(let i=0;i<7;i++)plaatsBalk(a);expect(controleerMissie(a,'brug').goed).toBe(false);
    expect(plaatsBalk(a,true)).toBe(true);expect(controleerMissie(a,'brug').goed).toBe(true);
    expect(a.gebieden).toContain('boomhut');
  });
  it.each([1,2,3] as const)('bouwt een schaalvaste brug op niveau %s',n=>{
    const a=brugKlaar(n),b=brugMaten(a);expect(a.missies.brug.werk.balken*b.balk).toBe(b.doel);
  });
  it('ontgrendelt geen eiland voor voltooiing en blokkeert geen andere onderwerpen',()=>{
    const a=nieuwAvontuur();expect(ontdekHut(a)).toBe(false);expect(beginMissie(a,'hut')).toBe(false);
    a.onderwerpen=['lezen'];expect(beginMissie(a,'brug')).toBe(false);expect(beginMissie(a,'bos-sleutel')).toBe(true);
    expect(a.gebieden).toContain('lab');expect(a.gebieden).toContain('tuin');
  });
});
describe('boomhut en opslagmigratie',()=>{
  it('plaatst, verplaatst, verwijdert en herstelt een verdiend voorwerp',()=>{
    const a=brugKlaar();ontdekHut(a);
    expect(plaatsDecoratie(a,'plant',-1,0)).toBe(false);expect(plaatsDecoratie(a,'plant',3,2)).toBe(false);
    expect(plaatsDecoratie(a,'robot',0,0)).toBe(false);expect(plaatsDecoratie(a,'plant',0,0)).toBe(true);
    const id=a.inrichting[0].id;expect(plaatsDecoratie(a,'plant',1,1,id)).toBe(true);
    expect(a.missies.hut.status).toBe('voltooid');expect(a.decoraties).toContain('bank');
    expect(plaatsDecoratie(a,'kruk',1,1)).toBe(false);expect(plaatsDecoratie(a,'plant',2,2)).toBe(false);
    expect(valideerAvontuur(JSON.parse(JSON.stringify(a)))).toEqual({stand:a,aangepast:false});
    expect(terugleggen(a,id)).toBe(true);expect(a.decoraties).toContain('plant');expect(plaatsDecoratie(a,'plant',2,2)).toBe(true);
  });
  it('herstelt alle missiestappen, inrichting, instellingen en inventaris uit normale opslag en back-up',()=>{
    const stand=nieuweStand();stand.avontuur=brugKlaar(3);ontdekHut(stand.avontuur);plaatsDecoratie(stand.avontuur,'plant',2,2);
    beginMissie(stand.avontuur,'bos-sleutel');leesAanwijzing(stand.avontuur,'konijn');stand.avontuur.niveaus.geld=3;
    const data=new Map<string,string>(),opslag={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};
    expect(bewaarStand(stand,opslag)).toBe(true);expect(laadStand(opslag)).toEqual(stand);
    expect(leesBackUp(exporteerStand(stand))).toEqual(stand);
  });
  it('migreert oude spelstanden en back-ups zonder verloren schoolvoortgang',()=>{
    const oude={...nieuweStand()} as Partial<ReturnType<typeof nieuweStand>>;delete oude.avontuur;oude.hoefijzers=99;
    const r=valideerStand(oude);expect(r.aangepast).toBe(false);expect(r.stand.hoefijzers).toBe(99);expect(r.stand.avontuur).toEqual(nieuwAvontuur());
    expect(leesBackUp(JSON.stringify({formaat:'nintes-wereld-voortgang',versie:1,stand:oude})).hoefijzers).toBe(99);
  });
  it('beschermt tegen beschadigde arrays, onmogelijke tegels en onbegrensde robotblokken',()=>{
    const a=brugKlaar() as unknown as Record<string,unknown>;
    a.inrichting=[{id:1,item:'plant',x:999,z:3,draai:0}];a.niveaus={geld:99};
    const r=valideerAvontuur(a);expect(r.aangepast).toBe(true);expect(r.stand.inrichting).toHaveLength(0);expect(r.stand.niveaus.geld).toBe(1);
    expect(valideerAvontuur({versie:90}).aangepast).toBe(true);
    const b=nieuwAvontuur();b.missies['lab-route'].werk.programma=[{actie:'vooruit',herhaal:9999}];
    expect(valideerAvontuur(b).stand.missies['lab-route'].werk.programma).toEqual([]);
  });
});
describe('geldbedragen en winkelopdrachten',()=>{
  it.each([['4',400],['4,5',450],['4.50',450],['€ 0,01',1],['1,234',null],['-2',null],['2e3',null],['',null]] as const)('leest %s als gehele centen', (invoer,uit)=>expect(centen(invoer)).toBe(uit));
  it('houdt geld exact, ook bij meerdere centproducten',()=>{
    expect(mandTotaal([2,3,1],WINKEL_VARIANTEN[2].prijzen)).toBe(1375);expect(euro(1375)).toBe('€ 13,75');
  });
  it.each([1,2,3] as const)('lost alle drie winkelmissies op niveau %s op',n=>{
    const a=nieuwAvontuur();a.niveaus.geld=n;
    for(const id of ['winkel-aantallen','winkel-budget','winkel-wissel']){
      beginMissie(a,id);const m=missie(id),s=a.missies[id],v=winkelOpdracht(m,s);expect(controleerMissie(a,id).goed).toBe(false);
      s.werk.mand=[...v.nodig] as [number,number,number];s.werk.antwoord=euro((m.soort==='budget'?v.budget:v.betaald)-mandTotaal(v.nodig,v.prijzen));
      expect(controleerMissie(a,id).goed).toBe(true);
    }
  });
});
describe('verhalen en pizzafracties',()=>{
  it('vraagt drie aanwijzingen voor de logische oplossing en helpt na een verkeerde keuze',()=>{
    const a=nieuwAvontuur();beginMissie(a,'bos-sleutel');a.missies['bos-sleutel'].werk.keuze='0';expect(controleerMissie(a,'bos-sleutel').goed).toBe(false);
    for(const id of ['uil','konijn','vos'])leesAanwijzing(a,id);
    a.missies['bos-sleutel'].werk.keuze='2';expect(controleerMissie(a,'bos-sleutel').goed).toBe(false);
    a.missies['bos-sleutel'].werk.keuze='0';expect(controleerMissie(a,'bos-sleutel').goed).toBe(true);
    for(const id of ['bos-volgorde','bos-woord']){beginMissie(a,id);a.missies[id].werk.keuze='0';expect(controleerMissie(a,id).goed).toBe(true);}
  });
  it('herkent equivalentie als hoeveelheid en hanteert kleine stukken waar gevraagd',()=>{
    expect(gelijkwaardig(2,4,1,2)).toBe(true);expect(gelijkwaardig(3,8,1,2)).toBe(false);expect(gelijkwaardig(0,0,0,0)).toBe(false);
    const a=nieuwAvontuur();beginMissie(a,'pizza-bestelling');a.missies['pizza-bestelling'].werk.pizza=[{smaak:'kaas',noemer:4},{smaak:'kaas',noemer:4},{smaak:'tomaat',noemer:4}];
    expect(pizzaEenheden(a.missies['pizza-bestelling'].werk.pizza)).toBe(6);expect(controleerMissie(a,'pizza-bestelling').goed).toBe(true);
    beginMissie(a,'pizza-gelijk');a.missies['pizza-gelijk'].werk.pizza=[{smaak:'kaas',noemer:2}];expect(controleerMissie(a,'pizza-gelijk').goed).toBe(false);
    a.missies['pizza-gelijk'].werk.pizza=[{smaak:'kaas',noemer:4},{smaak:'kaas',noemer:4}];expect(controleerMissie(a,'pizza-gelijk').goed).toBe(true);
  });
  it.each([1,2,3] as const)('ondersteunt gelijke pizzaverdeling op niveau %s',n=>{
    const a=nieuwAvontuur();a.niveaus.breuken=n;beginMissie(a,'pizza-verdelen');a.missies['pizza-verdelen'].werk.verdeling=n===1?2:n===2?4:8;expect(controleerMissie(a,'pizza-verdelen').goed).toBe(true);
  });
});
describe('begrensde robotuitvoering',()=>{
  it.each(ROBOT_ROUTES.map((r,i)=>({r,i})))('heeft een uitvoerbare voorbeeldroute $i',({r})=>{
    const uit=voerRobotUit(r,r.oplossing);expect(uit.klaar).toBe(true);expect(uit.fout).toBe(null);
  });
  it('draait zonder verplaatsing en reset altijd naar dezelfde start',()=>{
    const r=ROBOT_ROUTES[0],start=robotStart(r),gedraaid=robotStap(r,start,'links');expect(gedraaid.x).toBe(start.x);expect(gedraaid.z).toBe(start.z);expect(gedraaid.richting).toBe(0);expect(robotStart(r)).toEqual(start);
    expect(voerRobotUit(r,[{actie:'interactie',herhaal:1}]).fout).toContain('ster');
    expect(voerRobotUit(r,[{actie:'vooruit',herhaal:8}]).fout).toContain('rand');
  });
  it('begrensde aantallen en herhaling voorkomen oneindige programma’s',()=>{
    expect(vouwProgramma([{actie:'vooruit',herhaal:Infinity}])).toEqual([]);
    expect(vouwProgramma(Array.from({length:33},()=>({actie:'vooruit' as const,herhaal:1})))).toEqual([]);
    const a=nieuwAvontuur();beginMissie(a,'lab-herhaal');a.missies['lab-herhaal'].werk.programma=ROBOT_ROUTES[2].oplossing;
    expect(controleerMissie(a,'lab-herhaal').goed).toBe(true);
  });
});
describe('tuinwaarnemingen',()=>{
  it('gebruikt een voorspelbaar groeimodel zonder echte wachttijd',()=>{
    expect(groei(2,2)).toBe(3);expect(groei(1,2)).toBe(1);expect(groei(4,2)).toBe(0);expect(groei(2,0)).toBe(0);
    const a=nieuwAvontuur();beginMissie(a,'tuin-verzorgen');const w=a.missies['tuin-verzorgen'].werk;w.planten[0].water=2;w.planten[0].licht=2;tuinDag(w);
    expect(w.planten[0].hoogte).toBe(5);expect(controleerMissie(a,'tuin-verzorgen').goed).toBe(true);
  });
  it('eist een eerlijke vergelijking en een onderbouwde conclusie',()=>{
    const a=nieuwAvontuur();beginMissie(a,'tuin-vergelijken');const w=a.missies['tuin-vergelijken'].werk;w.keuze='a';expect(controleerMissie(a,'tuin-vergelijken').goed).toBe(false);
    w.planten[0].water=2;w.planten[0].licht=2;w.planten[1].water=2;tuinDag(w);expect(w.metingen[0].a).toBe(5);expect(w.metingen[0].b).toBe(2);expect(controleerMissie(a,'tuin-vergelijken').goed).toBe(true);
  });
  it.each([1,2,3] as const)('meet correcte groei voor niveau %s',n=>{
    const a=nieuwAvontuur();a.niveaus.natuur=n;beginMissie(a,'tuin-meten');const w=a.missies['tuin-meten'].werk;w.planten[0].water=2;w.planten[0].licht=2;
    for(let i=0;i<n+1;i++)tuinDag(w);w.antwoord=String((n+1)*3);expect(controleerMissie(a,'tuin-meten').goed).toBe(true);
  });
});
