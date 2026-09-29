/** Startinhoud voor groep 6. Getallen, uitleg en beloningen zijn hier aanpasbaar. */
export const ONDERWERPEN = ['bouwen', 'geld', 'lezen', 'breuken', 'programmeren', 'natuur'] as const;
export type Onderwerp = typeof ONDERWERPEN[number];
export type Niveau = 1 | 2 | 3;
export type Gebied = 'dorp' | 'brug' | 'winkel' | 'bos' | 'pizza' | 'lab' | 'tuin' | 'boomhut' | 'toren';
export const ONDERWERP_NAMEN: Record<Onderwerp, string> = {
  bouwen: 'Meten en bouwen', geld: 'Geld en hoeveelheden', lezen: 'Verhalen lezen',
  breuken: 'Breuken', programmeren: 'Robotroutes', natuur: 'Natuur onderzoeken',
};
export const GEBIEDEN: { id: Gebied; naam: string; icoon: string; kleur: string; x: number; y: number; z: number; bewoner: string; uitleg: string }[] = [
  { id: 'dorp', naam: 'Dorpsplein', icoon: '🏡', kleur: '#e9b650', x: 0, y: 0, z: -60, bewoner: 'Mila', uitleg: 'Begin hier. Help Mila met de dorpsvlag.' },
  { id: 'brug', naam: 'Brug en geheim eiland', icoon: '🌉', kleur: '#a87242', x: 0, y: 0, z: -230, bewoner: 'Bram', uitleg: 'Volg het noordelijke pad naar de rivier.' },
  { id: 'winkel', naam: 'Dorpswinkel', icoon: '🛒', kleur: '#cf5692', x: -60, y: 0, z: -80, bewoner: 'Sara', uitleg: 'Westelijk van het dorp ligt Sara haar winkel.' },
  { id: 'bos', naam: 'Verhalenbos', icoon: '🌲', kleur: '#337d57', x: -72, y: 4, z: -163, bewoner: 'De bosbewoners', uitleg: 'Volg de groene route naar de bosheuvel. Zoek Fien, Ubo en Kiki.' },
  { id: 'pizza', naam: 'Pizzacafé', icoon: '🍕', kleur: '#c66b36', x: 60, y: 2, z: -82, bewoner: 'Pip', uitleg: 'Op het oostelijke terras vind je Pip en zijn pizzaoven.' },
  { id: 'lab', naam: 'Uitvinderslab', icoon: '🤖', kleur: '#6565bd', x: 72, y: 6, z: -180, bewoner: 'Luca', uitleg: 'Het paarse pad klimt naar Luca zijn uitvindersheuvel.' },
  { id: 'tuin', naam: 'Natuurtuin', icoon: '🌻', kleur: '#4d8636', x: 0, y: 2, z: -150, bewoner: 'Noor', uitleg: 'Volg de zonnebloemen naar Noor haar verhoogde tuin.' },
  { id: 'boomhut', naam: 'Jouw boomhut', icoon: '🌳', kleur: '#86704e', x: 0, y: 0, z: -273, bewoner: 'Je eigen thuisplek', uitleg: 'Aan de overkant van de brug staat je boomhut.' },
  { id: 'toren', naam: 'Windtoren', icoon: '🗼', kleur: '#5a9eae', x: 90, y: 0, z: -125, bewoner: 'Ravi', uitleg: 'Een toren van 90 meter! Verdien een zweefvleugel en ontdek het uitzicht.' },
];
export const WERELD = { halfBreedte: 116, noord: -235, zuid: -35 } as const;
export const TOREN = { x: 90, z: -125, hoogte: 90, bordessen: 10, stijging: 9, treden: 20, stap: .45, landing: { x: 27, y: 0, z: -121, straal: 10 } } as const;
export const VLIEG_ONDERDELEN = [
  { id: 'doek', naam: 'Sterk doek', gebied: 'winkel' as Gebied, x: -72, y: 0, z: -89, tip: 'Sara bewaarde het doek achter de winkel, bij roze bloemen.' },
  { id: 'frame', naam: 'Licht frame', gebied: 'lab' as Gebied, x: 83, y: 6, z: -193, tip: 'Zoek op de labheuvel bij de paarse werkbank.' },
  { id: 'lint', naam: 'Windlint', gebied: 'tuin' as Gebied, x: 12, y: 2, z: -161, tip: 'Noor legde het lint naast de zonnebloemen, achter in de tuin.' },
] as const;

export const DECORATIES = [
  { id: 'mat', naam: 'Welkommat', icoon: '🟨', kleur: '#e7bb59', gebruik: 'Een zachte plek bij je voordeur.' },
  { id: 'kruk', naam: 'Houten kruk', icoon: '🪑', kleur: '#b78049', gebruik: 'Een zitplek in je boomhut.' },
  { id: 'plant', naam: 'Startplant', icoon: '🪴', kleur: '#65a745', gebruik: 'Zet wat groen bij het raam.' },
  { id: 'bank', naam: 'Leesbank', icoon: '🛋️', kleur: '#e08daf', gebruik: 'Een fijne hoek om verhalen te lezen.' },
  { id: 'kast', naam: 'Boekenkast', icoon: '📚', kleur: '#bf864b', gebruik: 'Bewaar denkbeeldige avonturenboeken.' },
  { id: 'klok', naam: 'Winkelklok', icoon: '🕰️', kleur: '#e6b853', gebruik: 'Een vrolijke klok, zonder tijdsdruk.' },
  { id: 'spaarpot', naam: 'Spaarpot', icoon: '🐷', kleur: '#df93a5', gebruik: 'Een herinnering aan je winkelavontuur.' },
  { id: 'varen', naam: 'Bosvaren', icoon: '🌿', kleur: '#418456', gebruik: 'Een stukje bos voor thuis.' },
  { id: 'lamp', naam: 'Boslamp', icoon: '🏮', kleur: '#f2c368', gebruik: 'Warm licht naast je leesbank.' },
  { id: 'schilderij', naam: 'Boshuisjeschilderij', icoon: '🖼️', kleur: '#6cab8a', gebruik: 'Hang je avontuur aan een fotostandaard.' },
  { id: 'tafel', naam: 'Cafétafel', icoon: '🍽️', kleur: '#d67f47', gebruik: 'Dek je eigen picknicktafel.' },
  { id: 'stoel', naam: 'Caféstoel', icoon: '🪑', kleur: '#cb654f', gebruik: 'Een stoel bij de tafel.' },
  { id: 'picknick', naam: 'Picknickkleed', icoon: '🧺', kleur: '#de7678', gebruik: 'Picknicken op de vloer.' },
  { id: 'robot', naam: 'Minirobot', icoon: '🤖', kleur: '#979de0', gebruik: 'Ro heeft een klein vriendje gemaakt.' },
  { id: 'raket', naam: 'Raketmodel', icoon: '🚀', kleur: '#92bdd7', gebruik: 'Een model om bij te dromen.' },
  { id: 'tandwiel', naam: 'Tandwielkunst', icoon: '⚙️', kleur: '#c6a56d', gebruik: 'Kunst uit het uitvinderslab.' },
  { id: 'bloem', naam: 'Zonnebloem', icoon: '🌻', kleur: '#efc957', gebruik: 'Je eigen gekweekte bloem.' },
  { id: 'pot', naam: 'Bloempot', icoon: '🏺', kleur: '#cc8668', gebruik: 'Een nieuwe pot voor je planten.' },
  { id: 'boom', naam: 'Miniboom', icoon: '🌱', kleur: '#6ca06b', gebruik: 'Een klein boompje voor je thuisplek.' },
  { id: 'windvaan', naam: 'Windvaan', icoon: '🚩', kleur: '#63b3c2', gebruik: 'Een herinnering aan je zelfgebouwde zweefvleugel.' },
  { id: 'wolkenlamp', naam: 'Wolkenlamp', icoon: '☁️', kleur: '#c4e9f2', gebruik: 'Je hoge vlucht krijgt een plek in je boomhut.' },
] as const;
export type Decoratie = typeof DECORATIES[number]['id'];

export const BRUG_VARIANTEN = [
  { doel: 24, balk: 4 }, { doel: 18, balk: 3 }, { doel: 30, balk: 5 },
] as const;
export const MATERIAALPLEKKEN = [
  { id: 'werf', naam: 'Bram zijn houtwerf', x: -43, y: 0, z: -101, gebied: 'winkel' as Gebied, tip: 'Zoek tussen de winkel en het eerste brugbord.' },
  { id: 'bosrand', naam: 'Hout bij het bos', x: -88, y: 4, z: -173, gebied: 'bos' as Gebied, tip: 'Klim naar de bosheuvel en kijk tussen de bomen aan de westkant.' },
  { id: 'labkrat', naam: 'Krat naast het lab', x: 82, y: 6, z: -175, gebied: 'lab' as Gebied, tip: 'Klim naar het lab. De krat staat rechts van het robotraster.' },
] as const;

export interface WinkelOpdracht { prijzen: [number, number, number]; nodig: [number, number, number]; budget: number; betaald: number }
export const PRODUCTEN = ['Appels', 'Planken', 'Verfpotten'];
export const PRODUCT_EENHEDEN = ['appel', 'plank', 'verfpot'];
export const WINKEL_MANDEN = { budget: [0, 2, 1], wisselgeld: [1, 0, 1] } as const;
export const WINKEL_VARIANTEN: WinkelOpdracht[] = [
  { prijzen: [200, 300, 400], nodig: [2, 2, 1], budget: 1800, betaald: 2000 },
  { prijzen: [300, 400, 500], nodig: [3, 2, 1], budget: 2600, betaald: 3000 },
  { prijzen: [125, 250, 375], nodig: [2, 3, 1], budget: 1500, betaald: 2000 },
];

export const BOS_BEWONERS = [
  { id: 'vos', naam: 'Fien de vos', x: -82, y: 4, z: -154,
    tekst: 'Ik zag een dier bij de blauwe bank. Het hield de sleutel in zijn poot. Ik zag een lange pluimstaart.' },
  { id: 'uil', naam: 'Ubo de uil', x: -64, y: 4, z: -175,
    tekst: 'De eekhoorn en het konijn zaten eerst bij de boom. Het konijn ging daarna naar de vijver. De eekhoorn liep naar de blauwe bank.' },
  { id: 'konijn', naam: 'Kiki het konijn', x: -60, y: 4, z: -153,
    tekst: 'Toen ik bij de vijver kwam, hoorde ik de eekhoorn roepen: ik heb de sleutel gevonden! Zij bleef bij de blauwe bank.' },
] as const;
export const BOS_KEUZES = ['Eekhoorn bij de blauwe bank', 'Konijn bij de vijver', 'Uil bij de boom'];
export const VOLGORDE_TEKST = 'Eerst vond Evi de sleutel onder een blad. Daarna opende zij het boshuisje. Pas toen zette ze de lamp binnen aan.';
export const VOLGORDE_KEUZES = ['Sleutel vinden → huisje openen → lamp aan', 'Lamp aan → sleutel vinden → huisje openen', 'Huisje openen → lamp aan → sleutel vinden'];
export const WOORD_TEKST = 'Het pad was drassig. Evi haar laarzen zakten in de natte, zachte grond. Daarom koos ze het droge stenen paadje.';
export const WOORD_KEUZES = ['Nat en zacht', 'Hoog en steil', 'Droog en hard'];
export const BOS_OPLOSSINGEN = { sleutel: 0, volgorde: 0, woord: 0 } as const;
export const BOS_EXTRA_KEUZES = { sleutel: ['Vos bij de blauwe bank', 'Konijn bij de blauwe bank'], volgorde: ['Sleutel vinden → lamp aan → huisje openen', 'Huisje openen → sleutel vinden → lamp aan'], woord: ['Koud en bevroren', 'Glad en droog'] };
export const LEES_STEUN = { sleutel: 'Let op wie de sleutel heeft én op de plek. Lees alle drie de aanwijzingen samen.', volgorde: 'De woorden eerst, daarna en pas toen helpen je de volgorde te vinden.', woord: 'Lees de zin na het moeilijke woord. Die geeft je een aanwijzing.' };
export const PIZZA_INSTELLINGEN = { verdelingen: [2, 4, 8], kaas: [4, 4, 6], tomaatBestelling: 2, kaasBestelling: 4, kleineNoemers: [4, 4, 8] } as const;
export const TUIN_DAGEN = [2, 3, 4] as const;

export type RobotActie = 'vooruit' | 'links' | 'rechts' | 'interactie';
export interface RobotBlok { actie: RobotActie; herhaal: number }
export interface RobotRoute { breedte: number; hoogte: number; start: [number, number]; richting: number; doel: [number, number]; obstakels: [number, number][]; oplossing: RobotBlok[] }
const vooruit = (herhaal = 1): RobotBlok => ({ actie: 'vooruit', herhaal });
const rechts = (): RobotBlok => ({ actie: 'rechts', herhaal: 1 });
const interactie = (): RobotBlok => ({ actie: 'interactie', herhaal: 1 });
export const ROBOT_ROUTES: RobotRoute[] = [
  { breedte: 5, hoogte: 5, start: [0, 3], richting: 1, doel: [3, 3], obstakels: [], oplossing: [vooruit(3), interactie()] },
  { breedte: 5, hoogte: 5, start: [0, 3], richting: 0, doel: [3, 3], obstakels: [[1, 3], [2, 3]],
    oplossing: [vooruit(), rechts(), vooruit(3), rechts(), vooruit(), interactie()] },
  { breedte: 6, hoogte: 6, start: [0, 4], richting: 0, doel: [4, 0], obstakels: [],
    oplossing: [vooruit(4), rechts(), vooruit(4), interactie()] },
];
export const PLANT_MODEL = { waterIdeaal: 2, lichtIdeaal: 2, groeiIdeaal: 3, groeiBijna: 1, startHoogte: 2 };

export type MissieSoort = 'welkom' | 'brug' | 'hut' | 'aantallen' | 'budget' | 'wisselgeld' | 'sleutel' | 'volgorde' | 'woord' | 'verdelen' | 'bestelling' | 'gelijk' | 'route' | 'obstakel' | 'herhaal' | 'verzorgen' | 'vergelijken' | 'meten' | 'vleugel' | 'vlucht';
export interface Missie {
  id: string; gebied: Gebied; onderwerp: Onderwerp; soort: MissieSoort;
  naam: string; verhaal: string; stappen: string[]; hints: [string, string, string]; beloning: Decoratie;
}
export const MISSIES: Missie[] = [
  { id: 'toren-vleugel', gebied: 'toren', onderwerp: 'bouwen', soort: 'vleugel', naam: 'Maak je zweefvleugel',
    verhaal: 'Ravi: Eerst maken we een veilige vleugel. Zoek doek, een frame en windlint. Kies daarna twee even zware kanten: samen zes blokjes.',
    stappen: ['Praat met Ravi bij de toren.', 'Zoek drie onderdelen in de wereld.', 'Kies een vleugel die in evenwicht is.'],
    hints: ['Elke kant moet even zwaar zijn.', '🪽 Links drie blokjes · rechts drie blokjes. 3 + 3 = 6.', 'Links 3 en rechts 3 werkt: beide kanten wegen evenveel en samen zijn het 6 blokjes. 2 en 4 is scheef. Daarna mag je de vleugel bij de toren pakken.'], beloning: 'windvaan' },
  { id: 'toren-vlucht', gebied: 'toren', onderwerp: 'bouwen', soort: 'vlucht', naam: 'Zweef naar de bloemenweide',
    verhaal: 'Ravi: Pak je verdiende zweefvleugel. Klim naar het dak van 90 meter. Loop naar de open rand van het blauwe vliegdek en spring naar de grote bloemencirkel.',
    stappen: ['Praat met Ravi.', 'Pak de zweefvleugel bij de toren.', 'Klim via de trappen naar het dak.', 'Spring van het blauwe vliegdek.', 'Land in de bloemencirkel.'],
    hints: ['Volg de trappen. Op ieder bordes onthouden we hoe hoog je kwam.', '🗼 Dak → 🪽 spring → 🌼 bloemencirkel. De vleugel opent vanzelf; WASD of de joystick stuurt.', 'Zonder stuurinvoer helpt de vleugel je richting de bloemenweide. Ze daalt rustig. Je verliest geen spullen bij een andere landing en kunt de lift naar je hoogste bordes gebruiken.'], beloning: 'wolkenlamp' },
  { id: 'welkom', gebied: 'dorp', onderwerp: 'bouwen', soort: 'welkom', naam: 'De vlag voor het dorp',
    verhaal: 'Mila: Welkom! De dorpsvlag ligt naast de gele kist. Wil jij hem ophalen en op het plein zetten?',
    stappen: ['Praat met Mila.', 'Haal de vlag bij de gele kist.', 'Plaats de vlag op het plein.'],
    hints: ['Kijk naar de gele kist bij Mila.', 'Op de kaart zie je het plein. De kist staat links ervan.', 'Haal eerst de vlag op. Plaats hem daarna bij Mila. Een voorwerp in je tas kun je op een andere plek gebruiken.'], beloning: 'mat' },
  { id: 'brug', gebied: 'brug', onderwerp: 'bouwen', soort: 'brug', naam: 'Help de bruggenbouwer',
    verhaal: 'Bram: Aan de overkant staat een boomhut voor jou. Haal hout op drie plekken en maak de brug lang genoeg.',
    stappen: ['Praat met Bram.', 'Haal balken op drie plekken.', 'Bouw tot de lengtemeter precies vol is.'],
    hints: ['Hoeveel meter ligt er al?', 'Bekijk de groepjes op de getallenlijn. Iedere balk is één groep.', 'Tel gelijke groepjes tot de overkant. De totale lengte gedeeld door de balklengte geeft het aantal balken.'], beloning: 'kruk' },
  { id: 'hut', gebied: 'boomhut', onderwerp: 'bouwen', soort: 'hut', naam: 'Maak het thuis gezellig',
    verhaal: 'Deze boomhut is van jou! Je krijgt een plant. Kies een voorwerp en zet het op een vrije vloertegel.',
    stappen: ['Ontdek je boomhut.', 'Plaats een voorwerp op de vloer.'],
    hints: ['Kies eerst een voorwerp uit je voorraad.', 'Vrije tegels zijn licht. De deur en het looppad blijven open.', 'Kies de plant en tik op een vrije tegel. Verplaatsen gaat door het voorwerp te kiezen en een andere tegel aan te wijzen.'], beloning: 'bank' },
  { id: 'winkel-aantallen', gebied: 'winkel', onderwerp: 'geld', soort: 'aantallen', naam: 'De dorpsbestelling',
    verhaal: 'Sara: Het dorp heeft appels, planken en verf nodig. Leg van elk product precies het gevraagde aantal in je mand.',
    stappen: ['Neem de bestelling aan.', 'Vul de mand met de juiste aantallen.'],
    hints: ['Vergelijk je mand met de bestelling.', 'Elke productrij toont gevraagd en in de mand.', 'Een teveel kun je terugleggen met min. Als ieder aantal klopt, is de bestelling compleet.'], beloning: 'kast' },
  { id: 'winkel-budget', gebied: 'winkel', onderwerp: 'geld', soort: 'budget', naam: 'Bouwen binnen je budget',
    verhaal: 'Sara: Kies twee planken en één verfpot. Je hebt een oefenbudget. Hoeveel blijft er over?',
    stappen: ['Bekijk je budget.', 'Kies materialen en reken uit wat overblijft.'],
    hints: ['Tel eerst de prijs van alles in de mand op.', 'Twee planken kosten twee keer de plankprijs. Voeg de verfprijs toe.', 'Trek de prijs van de mand van je budget af. Dat is het geld dat je overhoudt.'], beloning: 'klok' },
  { id: 'winkel-wissel', gebied: 'winkel', onderwerp: 'geld', soort: 'wisselgeld', naam: 'Het juiste wisselgeld',
    verhaal: 'Sara: Je koopt één appel en één verfpot. Je betaalt met een groter oefenbedrag. Welk bedrag krijg je terug?',
    stappen: ['Bekijk de kassa.', 'Maak de mand en bepaal het wisselgeld.'],
    hints: ['Wisselgeld is het betaalde bedrag min de prijs.', 'Tel vanaf de prijs omhoog naar het betaalde bedrag.', 'Wat je betaald hebt, is de prijs plus het wisselgeld. Trek daarom de prijs af van het betaalde bedrag.'], beloning: 'spaarpot' },
  { id: 'bos-sleutel', gebied: 'bos', onderwerp: 'lezen', soort: 'sleutel', naam: 'Wie heeft de sleutel?',
    verhaal: 'Fien: Het boshuisje zit op slot. Praat met ons alle drie. Wie heeft de sleutel, en waar is die?',
    stappen: ['Vraag Fien om hulp.', 'Lees de aanwijzingen van drie bosbewoners.', 'Kies wie de sleutel heeft en open het huisje.'],
    hints: ['Welke plek komt in meer dan één aanwijzing voor?', 'Volg de eekhoorn en het konijn ieder naar hun eigen plek.', 'De uil zegt dat de eekhoorn naar de blauwe bank ging. Het konijn hoorde juist daar dat zij de sleutel had. Dus de eekhoorn heeft hem bij de blauwe bank.'], beloning: 'varen' },
  { id: 'bos-volgorde', gebied: 'bos', onderwerp: 'lezen', soort: 'volgorde', naam: 'Licht in het boshuisje',
    verhaal: 'Ubo: Lees Evi haar verhaal. Wat gebeurde eerst, daarna en als laatste?',
    stappen: ['Lees het korte verhaal.', 'Zet de gebeurtenissen in de juiste volgorde.'],
    hints: ['Zoek de woorden eerst, daarna en pas toen.', 'Je hebt de sleutel nodig voordat je het huisje kunt openen.', 'Eerst de sleutel vinden, dan het huisje openen, dan de lamp aan. Zonder sleutel kan Evi de deur nog niet openen.'], beloning: 'lamp' },
  { id: 'bos-woord', gebied: 'bos', onderwerp: 'lezen', soort: 'woord', naam: 'Het drassige pad',
    verhaal: 'Kiki: Een lastig woord? Lees ook de zin erna. Daar staat een aanwijzing.',
    stappen: ['Onderzoek het woord drassig.', 'Kies de betekenis die bij de tekst past.'],
    hints: ['Waar zakten Evi haar laarzen in?', 'Natte, zachte grond is de uitleg in de volgende zin.', 'Drassig betekent hier nat en zacht. Evi kiest daarom het droge stenen pad. Je kunt de betekenis afleiden uit de zinnen eromheen.'], beloning: 'schilderij' },
  { id: 'pizza-verdelen', gebied: 'pizza', onderwerp: 'breuken', soort: 'verdelen', naam: 'Eerlijke pizzastukken',
    verhaal: 'Pip: Verdeel deze pizza in gelijke stukken. Iedereen krijgt evenveel.',
    stappen: ['Neem Pip zijn opdracht aan.', 'Kies de juiste verdeling van de hele pizza.'],
    hints: ['Het getal onder de streep zegt hoeveel gelijke stukken een hele pizza heeft.', 'Twee gelijke stukken zijn helften. Vier gelijke stukken zijn kwarten.', 'Bij vier gelijke stukken is ieder stuk 1/4: vier keer 1/4 vult één hele pizza.'], beloning: 'tafel' },
  { id: 'pizza-bestelling', gebied: 'pizza', onderwerp: 'breuken', soort: 'bestelling', naam: 'Kaas en tomaat',
    verhaal: 'Pip: Op dit bord wil de klant een halve pizza kaas en een kwart pizza tomaat. De rest van het bord blijft leeg.',
    stappen: ['Lees de bestelling.', 'Leg de gevraagde pizzastukken op het bord.'],
    hints: ['Controleer de breuk voor kaas en voor tomaat apart.', 'Een halve pizza is twee kwarten. De hele cirkel heeft vier kwarten.', '1/2 kaas plus 1/4 tomaat vult 3/4 van het bord. Twee kaas-kwarten en één tomaat-kwart werken ook, want 2/4 = 1/2.'], beloning: 'stoel' },
  { id: 'pizza-gelijk', gebied: 'pizza', onderwerp: 'breuken', soort: 'gelijk', naam: 'Een andere naam voor dezelfde pizza',
    verhaal: 'Pip: Vul hetzelfde deel als het voorbeeld, met kleinere gelijke stukken.',
    stappen: ['Bekijk het voorbeeldbord.', 'Maak evenveel pizza met kleinere stukken.'],
    hints: ['Vergelijk het gevulde oppervlak van beide borden.', 'Twee kwarten passen precies op één helft.', '2/4 en 1/2 hebben hetzelfde oppervlak: twee van vier gelijke stukken vullen de helft. De aantallen verschillen, de hoeveelheid niet.'], beloning: 'picknick' },
  ...(['route', 'obstakel', 'herhaal'] as const).map((soort, i): Missie => ({
    id: `lab-${soort}`, gebied: 'lab', onderwerp: 'programmeren', soort,
    naam: ['Ro vindt de knop', 'Ro gaat om de kist', 'Een korter robotprogramma'][i],
    verhaal: ['Luca: Stuur Ro naar de ster. Gebruik bij de ster het blok Interactie.', 'Luca: De kisten staan in de weg. Programmeer een veilige omweg naar de ster.', 'Luca: Beschrijf de lange rechte stukken korter met Herhaal. Eindig met Interactie bij de ster.'][i],
    stappen: ['Bekijk de route.', 'Maak en test een programma.'],
    hints: ['Ro kijkt in de richting van het pijltje. Links en rechts draaien veranderen alleen zijn richting.', 'Teken de route op het raster. Eén keer Vooruit verplaatst Ro één vak.', 'Het voorbeeld laat een veilige route zien. Een herhaling voert hetzelfde blok meerdere keren uit. Interactie werkt pas op het doel.'],
    beloning: (['robot', 'raket', 'tandwiel'] as const)[i],
  })),
  { id: 'tuin-verzorgen', gebied: 'tuin', onderwerp: 'natuur', soort: 'verzorgen', naam: 'Een fijne groeiplek',
    verhaal: 'Noor: Onze oefenplant houdt van twee bekers water en twee lampjes licht. Probeer dat en laat één dag verlopen.',
    stappen: ['Bekijk wat de plant nodig heeft.', 'Kies water en licht en onderzoek de groei.'],
    hints: ['Bekijk de plantkaart: 2 water en 2 licht is fijn.', 'De bekers en zonnetjes laten je gekozen hoeveelheden zien.', 'Bij 2 water en 2 licht groeit de oefenplant 3 cm per dag. Te weinig of te veel helpt minder. Dit is een eenvoudig spelmodel, geen verzorgingsregel voor alle echte planten.'], beloning: 'bloem' },
  { id: 'tuin-vergelijken', gebied: 'tuin', onderwerp: 'natuur', soort: 'vergelijken', naam: 'Wat doet het licht?',
    verhaal: 'Noor: Geef beide planten twee bekers water. Zet bij A twee lampjes en bij B nul. Laat een dag verlopen. Welke groeit meer?',
    stappen: ['Maak een eerlijke vergelijking.', 'Verander alleen het licht en vergelijk de groei.'],
    hints: ['Houd het water gelijk, anders weet je niet waardoor het verschil komt.', 'Plant A: 2 water, 2 licht. Plant B: 2 water, 0 licht.', 'A groeit meer. Beide kregen evenveel water; alleen het licht verschilde. In dit model helpt passend licht de groei.'], beloning: 'pot' },
  { id: 'tuin-meten', gebied: 'tuin', onderwerp: 'natuur', soort: 'meten', naam: 'Meten is weten',
    verhaal: 'Noor: Geef A passend water en licht. Meet na twee groeidagen hoeveel centimeter erbij kwam.',
    stappen: ['Lees de starthoogte.', 'Laat twee dagen verlopen en bereken de groei.'],
    hints: ['Groei is de eindhoogte min de starthoogte.', 'De plant begint op 2 cm. Twee passende dagen geven elk 3 cm erbij.', 'Na twee dagen is de plant 8 cm hoog: 2 + 3 + 3. Er kwam 8 − 2 = 6 cm bij.'], beloning: 'boom' },
];
export const missieMetId = (id: string): Missie | undefined => MISSIES.find(m => m.id === id);

/** De uitleg gebruikt dezelfde getallenbank als de beoordeling. */
export function missieVoorNiveau(m: Missie, niveau: Niveau): Missie {
  if (m.soort === 'meten') {
    const dagen = TUIN_DAGEN[niveau - 1], groei = PLANT_MODEL.groeiIdeaal, start = PLANT_MODEL.startHoogte;
    return { ...m,
      verhaal: `Noor: Geef A passend water en licht. Meet na ${dagen} groeidagen hoeveel centimeter erbij kwam.`,
      stappen: ['Lees de starthoogte.', `Laat ${dagen} dagen verlopen en bereken de groei.`],
      hints: ['Groei is de eindhoogte min de starthoogte.',
        `De plant begint op ${start} cm. ${dagen} passende dagen geven elk ${groei} cm erbij.`,
        `Na ${dagen} dagen is de plant ${start + dagen * groei} cm hoog: ${start} + ${dagen} × ${groei}. Er kwam ${dagen * groei} cm bij, want je trekt de starthoogte van de eindhoogte af.`] };
  }
  if (m.soort === 'verdelen') {
    const delen = PIZZA_INSTELLINGEN.verdelingen[niveau - 1];
    return { ...m, hints: ['Het getal onder de streep zegt hoeveel gelijke stukken een hele pizza heeft.',
      `Kies ${delen} gelijke stukken. Ieder stuk is even groot.`,
      `Bij ${delen} gelijke stukken is ieder stuk 1/${delen}: ${delen} keer 1/${delen} vult één hele pizza.`] };
  }
  return m;
}
