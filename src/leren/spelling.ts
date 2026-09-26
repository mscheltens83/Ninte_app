import type { Woordkaart } from './woorden';

/** Maakt een foute spelling van het woord, passend bij de categorie. */
export function maakFouteVariant(kaart: Woordkaart): string {
  if (kaart.fout) return kaart.fout;
  const w = kaart.woord;
  switch (kaart.categorie) {
    case 'langermaakwoord': {
      const laatste = w.slice(-1);
      if (laatste === 'd') return w.slice(0, -1) + 't';
      if (laatste === 't') return w.slice(0, -1) + 'd';
      break;
    }
    case 'ei-ij':
      if (w.includes('ei')) return w.replace('ei', 'ij');
      if (w.includes('ij')) return w.replace('ij', 'ei');
      break;
    case 'au-ou':
      if (w.includes('au')) return w.replace('au', 'ou');
      if (w.includes('ou')) return w.replace('ou', 'au');
      break;
  }
  throw new Error(`Geen foute variant te maken voor "${w}"`);
}

const GAT = '___';

/** De voorbeeldzin met een gat op de plek van het woord. */
export function zinMetGat(kaart: Woordkaart): string {
  const patroon = new RegExp(`(^|[^a-zA-Z])${kaart.woord}(?![a-zA-Z])`, 'i');
  return kaart.zin.replace(patroon, (_m, voor: string) => voor + GAT);
}

/** Het trucje zoals ze het in de klas leert (Staal). */
export function tipVoor(kaart: Woordkaart): string {
  const w = kaart.woord;
  switch (kaart.categorie) {
    case 'langermaakwoord': {
      const letter = w.slice(-1);
      return `Langermaakwoord! Maak het woord langer: ${kaart.langer}. Dan hoor je een ${letter}. Dus: ${w}.`;
    }
    case 'ei-ij':
      return w.includes('ei')
        ? `Weetwoord! Je schrijft ${w} met de korte ei. Dat moet je onthouden.`
        : `Weetwoord! Je schrijft ${w} met de lange ij. Dat moet je onthouden.`;
    case 'au-ou':
      return w.includes('au')
        ? `Weetwoord! Je schrijft ${w} met au. Dat moet je onthouden.`
        : `Weetwoord! Je schrijft ${w} met ou. Dat moet je onthouden.`;
  }
}

/** Wat de voorleesstem zegt: woord, zin, woord (zoals bij een dictee). */
export function voorleesTekst(kaart: Woordkaart): string {
  return `${kaart.woord}. ${kaart.zin} ${kaart.woord}.`;
}
