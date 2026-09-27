// Hoe Ninte's poppetje eruitziet, en wat er in de kledingkast hangt.
// Sommige dingen zijn gratis, sommige koop je met hoefijzers en sommige
// speel je vrij door een opdracht te doen of een geheim te vinden.

export type Kapsel = 'staart' | 'lang' | 'kort' | 'vlechten' | 'knot';
export type Hoed = 'geen' | 'strik' | 'bloemen' | 'oren' | 'rijcap' | 'cowboy' | 'kroon' | 'hoorn';
export type Extra = 'geen' | 'rugzak' | 'cape' | 'zonnebril' | 'vleugels';

export interface Uiterlijk {
  huid: string;
  haar: string;
  kapsel: Kapsel;
  shirt: string;
  broek: string;
  schoenen: string;
  hoed: Hoed;
  extra: Extra;
}

export const STANDAARD_UITERLIJK: Uiterlijk = {
  huid: '#f1c7a1',
  haar: '#6b3e1e',
  kapsel: 'staart',
  shirt: '#a35be0',
  broek: '#35508c',
  schoenen: '#f5f5f5',
  hoed: 'geen',
  extra: 'geen',
};

export const KLEUREN = {
  huid: ['#f7d7bd', '#f1c7a1', '#d9a27a', '#b07a52', '#7a4e32', '#4e3122'],
  haar: ['#2a1d14', '#6b3e1e', '#b5651d', '#e8c26b', '#f2e3b3', '#d94f4f', '#ff8fc7', '#7a5cff'],
  shirt: ['#a35be0', '#ff6f91', '#ffc75f', '#35c46a', '#3aa3e3', '#ffffff', '#2b2340', '#ff8a3d'],
  broek: ['#35508c', '#2b2340', '#8a5a2b', '#ffffff', '#ff6f91', '#35c46a'],
  schoenen: ['#f5f5f5', '#2b2340', '#8a5a2b', '#ff6f91', '#3aa3e3', '#ffc933'],
};

/** Wat er nodig is om iets te krijgen. */
export type Voorwaarde =
  | { soort: 'gratis' }
  | { soort: 'prijs'; hoefijzers: number }
  | { soort: 'obby'; obby: 'spelling' | 'rekenen' }
  | { soort: 'sterren' }
  | { soort: 'geheim'; geheim: string };

export interface KastItem {
  id: string;
  soort: 'kapsel' | 'hoed' | 'extra';
  waarde: Kapsel | Hoed | Extra;
  naam: string;
  voorwaarde: Voorwaarde;
}

const gratis: Voorwaarde = { soort: 'gratis' };
const prijs = (hoefijzers: number): Voorwaarde => ({ soort: 'prijs', hoefijzers });

export const KAST: KastItem[] = [
  { id: 'kapsel-staart', soort: 'kapsel', waarde: 'staart', naam: 'Paardenstaart', voorwaarde: gratis },
  { id: 'kapsel-lang', soort: 'kapsel', waarde: 'lang', naam: 'Lang haar', voorwaarde: gratis },
  { id: 'kapsel-kort', soort: 'kapsel', waarde: 'kort', naam: 'Kort haar', voorwaarde: gratis },
  { id: 'kapsel-vlechten', soort: 'kapsel', waarde: 'vlechten', naam: 'Vlechtjes', voorwaarde: prijs(15) },
  { id: 'kapsel-knot', soort: 'kapsel', waarde: 'knot', naam: 'Knotje', voorwaarde: prijs(15) },

  { id: 'hoed-geen', soort: 'hoed', waarde: 'geen', naam: 'Niks op', voorwaarde: gratis },
  { id: 'hoed-strik', soort: 'hoed', waarde: 'strik', naam: 'Strik', voorwaarde: prijs(10) },
  { id: 'hoed-bloemen', soort: 'hoed', waarde: 'bloemen', naam: 'Bloemenkrans', voorwaarde: prijs(25) },
  { id: 'hoed-oren', soort: 'hoed', waarde: 'oren', naam: 'Konijnenoren', voorwaarde: prijs(35) },
  { id: 'hoed-rijcap', soort: 'hoed', waarde: 'rijcap', naam: 'Rijcap', voorwaarde: { soort: 'obby', obby: 'spelling' } },
  { id: 'hoed-cowboy', soort: 'hoed', waarde: 'cowboy', naam: 'Cowboyhoed', voorwaarde: { soort: 'obby', obby: 'rekenen' } },
  { id: 'hoed-kroon', soort: 'hoed', waarde: 'kroon', naam: 'Gouden kroon', voorwaarde: { soort: 'sterren' } },
  { id: 'hoed-hoorn', soort: 'hoed', waarde: 'hoorn', naam: 'Eenhoornhoorn', voorwaarde: { soort: 'geheim', geheim: 'eenhoorn' } },

  { id: 'extra-geen', soort: 'extra', waarde: 'geen', naam: 'Niks', voorwaarde: gratis },
  { id: 'extra-rugzak', soort: 'extra', waarde: 'rugzak', naam: 'Rugzak', voorwaarde: prijs(20) },
  { id: 'extra-cape', soort: 'extra', waarde: 'cape', naam: 'Cape', voorwaarde: prijs(40) },
  { id: 'extra-zonnebril', soort: 'extra', waarde: 'zonnebril', naam: 'Zonnebril', voorwaarde: { soort: 'geheim', geheim: 'eilandje' } },
  { id: 'extra-vleugels', soort: 'extra', waarde: 'vleugels', naam: 'Vleugels', voorwaarde: { soort: 'geheim', geheim: 'wolkeneiland' } },
];

/** Het stukje van de spelstand dat bepaalt wat je al hebt. */
export interface KastStand {
  bezit: string[];
  gehaald: string[];
  drieSterren: boolean;
  geheimen: string[];
  hoefijzers: number;
}

export type ItemStatus = 'beschikbaar' | 'kopen' | 'op-slot';

export function itemStatus(item: KastItem, stand: KastStand): ItemStatus {
  const v = item.voorwaarde;
  switch (v.soort) {
    case 'gratis':
      return 'beschikbaar';
    case 'prijs':
      return stand.bezit.includes(item.id) ? 'beschikbaar' : 'kopen';
    case 'obby':
      return stand.gehaald.includes(v.obby) ? 'beschikbaar' : 'op-slot';
    case 'sterren':
      return stand.drieSterren ? 'beschikbaar' : 'op-slot';
    case 'geheim':
      return stand.geheimen.includes(v.geheim) ? 'beschikbaar' : 'op-slot';
  }
}

/** Uitleg bij iets dat nog op slot zit. */
export function slotTekst(item: KastItem): string {
  const v = item.voorwaarde;
  switch (v.soort) {
    case 'obby':
      return v.obby === 'spelling' ? 'Haal de Deuren-obby' : 'Haal de Reken-obby';
    case 'sterren':
      return 'Haal een obby met alle deuren in één keer goed';
    case 'geheim':
      return 'Vind een geheim';
    case 'prijs':
      return `Kost ${v.hoefijzers} hoefijzers`;
    case 'gratis':
      return '';
  }
}

/** Alles wat je nu mag dragen (om te zien wat er nieuw bij is gekomen). */
export function beschikbareItems(stand: KastStand): Set<string> {
  return new Set(KAST.filter((i) => itemStatus(i, stand) === 'beschikbaar').map((i) => i.id));
}

/** Iets kopen met hoefijzers. Geeft false als het niet kan. */
export function koop(item: KastItem, stand: KastStand): boolean {
  if (item.voorwaarde.soort !== 'prijs' || stand.bezit.includes(item.id)) return false;
  if (stand.hoefijzers < item.voorwaarde.hoefijzers) return false;
  stand.hoefijzers -= item.voorwaarde.hoefijzers;
  stand.bezit.push(item.id);
  return true;
}
