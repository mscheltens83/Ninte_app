import { GEBIEDEN, TOREN } from './inhoud';
import type { Lichaam, Vec3 } from '../spel/fysica';

export interface LandBlok { x:number; z:number; top:number; b:number; d:number; h:number }
export const TERRASSEN:LandBlok[]=GEBIEDEN.filter(g=>g.y>0).map(g=>({x:g.x,z:g.z-2,top:g.y,b:42,d:40,h:g.y}));
export const HEUVEL_TRAPPEN:LandBlok[]=GEBIEDEN.filter(g=>g.y>0).flatMap(g=>{
  const n=Math.round(g.y/.4);return [1,-1].flatMap(kant=>Array.from({length:n},(_,i)=>({x:g.x,z:kant===1?g.z+18+(n-i-.5)*.95:g.z-22-(n-i-.5)*.95,top:(i+1)*.4,b:7,d:1,h:(i+1)*.4})));
});
export function terreinHoogte(x:number,z:number):number {
  return Math.max(0,...[...TERRASSEN,...HEUVEL_TRAPPEN].filter(b=>Math.abs(x-b.x)<=b.b/2&&Math.abs(z-b.z)<=b.d/2).map(b=>b.top));
}
export function torenTrappen():LandBlok[] {
  return Array.from({length:TOREN.bordessen},(_,ronde)=>Array.from({length:TOREN.treden},(_,i)=>({
    x:TOREN.x+(ronde%2===0?-9.5+i:9.5-i),z:TOREN.z+(ronde%2===0?-4:4),top:ronde*TOREN.stijging+(i+1)*TOREN.stap,b:1.04,d:3.2,h:.4,
  }))).flat();
}
export function bordesPunt(n:number):Vec3 {return {x:TOREN.x+(n%2===0?-11:11),y:n*TOREN.stijging,z:TOREN.z};}
/** Rust, een rondje over het eigen erf, dan weer rust. Geen willekeurige verre doelen. */
export function bewonerPos(anker:Vec3,t:number,straal=2.6):Vec3 {
  const fase=((t%28)+28)%28;if(fase<8)return {...anker};const a=(fase-8)/20*Math.PI*2;
  return {x:anker.x+Math.sin(a)*straal,y:anker.y,z:anker.z+(1-Math.cos(a))*straal*.4};
}
/** Zonder invoer helpt de vleugel naar de weide; sturen blijft volledig vrij. */
export function zweefRichting(p:Vec3,rx:number,rz:number):{x:number;z:number} {
  if(Math.hypot(rx,rz)>.08)return {x:rx*13,z:rz*13};
  const dx=TOREN.landing.x-p.x,dz=TOREN.landing.z-p.z,d=Math.hypot(dx,dz),v=Math.min(10,d*.7);
  return d>.1?{x:dx/d*v,z:dz/d*v}:{x:0,z:0};
}
export function pasZweefSnelheidAan(s:Lichaam,dt:number,rx:number,rz:number,helpt:boolean):void {
  const r=helpt?zweefRichting(s.pos,rx,rz):Math.hypot(rx,rz)>.08?{x:rx*13,z:rz*13}:{x:s.snelheid.x,z:s.snelheid.z};
  s.snelheid.x+=(r.x-s.snelheid.x)*Math.min(1,dt*3);s.snelheid.z+=(r.z-s.snelheid.z)*Math.min(1,dt*3);s.snelheid.y=Math.max(s.snelheid.y,-3.6);
}
