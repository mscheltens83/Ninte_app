// Woordkaarten voor groep 6, ingedeeld volgens de categorieën van Staal.
// Elke zin bevat het woord precies zoals het gespeld moet worden.

export type Categorie = 'langermaakwoord' | 'ei-ij' | 'au-ou' | 'schoolwoord';

export interface Woordkaart {
  woord: string;
  categorie: Categorie;
  zin: string;
  /** Alleen bij langermaakwoorden: de langere vorm waarin je de d of t hoort. */
  langer?: string;
  /** Optioneel: een vaste foute spelling. Anders wordt die automatisch gemaakt. */
  fout?: string;
}

export const CATEGORIE_NAMEN: Record<Categorie, string> = {
  langermaakwoord: 'Langermaakwoord',
  'ei-ij': 'Weetwoord: ei of ij',
  'au-ou': 'Weetwoord: au of ou',
  schoolwoord: 'Overige schoolwoorden',
};

export const WOORDEN: Woordkaart[] = [
  // Langermaakwoorden met een d
  { woord: 'paard', categorie: 'langermaakwoord', langer: 'paarden', zin: 'Het paard staat in de stal.' },
  { woord: 'hond', categorie: 'langermaakwoord', langer: 'honden', zin: 'Mijn hond rent achter de bal aan.' },
  { woord: 'veld', categorie: 'langermaakwoord', langer: 'velden', zin: 'De pony galoppeert over het veld.' },
  { woord: 'hoofd', categorie: 'langermaakwoord', langer: 'hoofden', zin: 'Het veulen schudt met zijn hoofd.' },
  { woord: 'brood', categorie: 'langermaakwoord', langer: 'broden', zin: 'De bakker bakt vers brood.' },
  { woord: 'hand', categorie: 'langermaakwoord', langer: 'handen', zin: 'Het paard eet een wortel uit mijn hand.' },
  { woord: 'rood', categorie: 'langermaakwoord', langer: 'rode', zin: 'Mijn nieuwe zadel is rood.' },
  { woord: 'breed', categorie: 'langermaakwoord', langer: 'brede', zin: 'Het pad door het bos is breed.' },
  { woord: 'wild', categorie: 'langermaakwoord', langer: 'wilde', zin: 'Het jonge paard is nog een beetje wild.' },
  { woord: 'kind', categorie: 'langermaakwoord', langer: 'kinderen', zin: 'Elk kind mag een rondje op de pony.' },
  { woord: 'mand', categorie: 'langermaakwoord', langer: 'manden', zin: 'De puppy slaapt in zijn mand.' },

  // Langermaakwoorden met een t
  { woord: 'staart', categorie: 'langermaakwoord', langer: 'staarten', zin: 'Het paard zwiept met zijn staart.' },
  { woord: 'poot', categorie: 'langermaakwoord', langer: 'poten', zin: 'De hond geeft een poot.' },
  { woord: 'bot', categorie: 'langermaakwoord', langer: 'botten', zin: 'De hond knaagt op een bot.' },
  { woord: 'kat', categorie: 'langermaakwoord', langer: 'katten', zin: 'De kat slaapt in het hooi.' },
  { woord: 'sloot', categorie: 'langermaakwoord', langer: 'sloten', zin: 'De hond springt in de sloot.' },
  { woord: 'voet', categorie: 'langermaakwoord', langer: 'voeten', zin: 'Het paard stapt op mijn voet.' },
  { woord: 'rit', categorie: 'langermaakwoord', langer: 'ritten', zin: 'We maken een rit door het bos.' },
  { woord: 'wit', categorie: 'langermaakwoord', langer: 'witte', zin: 'Het veulen is helemaal wit.' },
  { woord: 'groot', categorie: 'langermaakwoord', langer: 'grote', zin: 'Een Fries is een groot paard.' },
  { woord: 'hert', categorie: 'langermaakwoord', langer: 'herten', zin: 'In het bos zien we een hert.' },

  // Weetwoorden met de korte ei
  { woord: 'wei', categorie: 'ei-ij', zin: 'De pony staat de hele dag in de wei.' },
  { woord: 'klein', categorie: 'ei-ij', zin: 'De puppy is nog heel klein.' },
  { woord: 'geit', categorie: 'ei-ij', zin: 'Naast de stal woont een geit.' },
  { woord: 'meisje', categorie: 'ei-ij', zin: 'Het meisje borstelt de manen van de pony.' },
  { woord: 'eik', categorie: 'ei-ij', zin: 'De hond ligt in de schaduw onder de eik.' },
  { woord: 'ei', categorie: 'ei-ij', zin: 'De kip legt een ei in het hooi.' },
  { woord: 'leiden', categorie: 'ei-ij', zin: 'Ik mag het paard naar de stal leiden.' },
  { woord: 'eigen', categorie: 'ei-ij', zin: 'Ik heb een eigen pony.' },

  // Weetwoorden met de lange ij
  { woord: 'rijden', categorie: 'ei-ij', zin: 'Vandaag ga ik op de pony rijden.' },
  { woord: 'blij', categorie: 'ei-ij', zin: 'De hond is blij als ik thuiskom.' },
  { woord: 'lijn', categorie: 'ei-ij', zin: 'De hond loopt netjes aan de lijn.' },
  { woord: 'boerderij', categorie: 'ei-ij', zin: 'Op de boerderij wonen veel dieren.' },
  { woord: 'ijs', categorie: 'ei-ij', zin: 'In de winter ligt er ijs op de sloot.' },
  { woord: 'prijs', categorie: 'ei-ij', zin: 'Mijn paard wint de eerste prijs.' },
  { woord: 'tijd', categorie: 'ei-ij', zin: 'Het is tijd om de dieren te voeren.' },
  { woord: 'kijken', categorie: 'ei-ij', zin: 'We gaan naar de veulens kijken.' },
  { woord: 'vijf', categorie: 'ei-ij', zin: 'Mijn pony is vijf jaar oud.' },
  { woord: 'stijgbeugel', categorie: 'ei-ij', zin: 'Zet je voet in de stijgbeugel.' },
  { woord: 'fijn', categorie: 'ei-ij', zin: 'Het is fijn om de pony te borstelen.' },

  // Weetwoorden met au
  { woord: 'blauw', categorie: 'au-ou', zin: 'Mijn pony krijgt een blauw halster.' },
  { woord: 'gauw', categorie: 'au-ou', zin: 'Kom gauw kijken naar het veulen!' },
  { woord: 'pauw', categorie: 'au-ou', zin: 'Op de boerderij loopt een pauw.' },
  { woord: 'auto', categorie: 'au-ou', zin: 'De paardentrailer hangt achter de auto.' },
  { woord: 'miauw', categorie: 'au-ou', zin: 'De kat in de stal zegt miauw.' },

  // Weetwoorden met ou
  { woord: 'touw', categorie: 'au-ou', zin: 'Het paard staat vast aan een touw.' },
  { woord: 'hout', categorie: 'au-ou', zin: 'De stal is gemaakt van hout.' },
  { woord: 'koud', categorie: 'au-ou', zin: 'In de winter is het koud in de stal.' },
  { woord: 'goud', categorie: 'au-ou', zin: 'Mijn paard wint een medaille van goud.' },
  { woord: 'oud', categorie: 'au-ou', zin: 'Mijn pony is al twaalf jaar oud.' },
  { woord: 'zout', categorie: 'au-ou', zin: 'Paarden likken graag aan een blok zout.' },
  { woord: 'vrouw', categorie: 'au-ou', zin: 'De vrouw van de manege geeft les.' },
];
