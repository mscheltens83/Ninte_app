// Grotere dingen bewaren op het apparaat (IndexedDB): eigen muziek en
// ingesproken zinnen. Alles blijft op de iPad; er gaat niets naar internet.

const NAAM = 'nintes-wereld';
const VERSIE = 1;
export type Winkel = 'muziek' | 'opnames';

let open: Promise<IDBDatabase> | null = null;

function database(): Promise<IDBDatabase> {
  open ??= new Promise<IDBDatabase>((ok, fout) => {
    const verzoek = indexedDB.open(NAAM, VERSIE);
    verzoek.onupgradeneeded = () => {
      const db = verzoek.result;
      if (!db.objectStoreNames.contains('muziek')) db.createObjectStore('muziek', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('opnames')) db.createObjectStore('opnames', { keyPath: 'sleutel' });
    };
    verzoek.onsuccess = () => {
      const db = verzoek.result;
      db.onversionchange = () => { db.close(); open = null; };
      ok(db);
    };
    verzoek.onerror = () => fout(verzoek.error);
    verzoek.onblocked = () => fout(new Error('Sluit andere geopende versies van het spel en probeer opnieuw.'));
  }).catch((error) => { open = null; throw error; });
  return open;
}

function wacht<T>(verzoek: IDBRequest<T>): Promise<T> {
  return new Promise((ok, fout) => {
    verzoek.onsuccess = () => ok(verzoek.result);
    verzoek.onerror = () => fout(verzoek.error);
  });
}

export async function alles<T>(winkel: Winkel): Promise<T[]> {
  try {
    const db = await database();
    return await wacht(db.transaction(winkel).objectStore(winkel).getAll() as IDBRequest<T[]>);
  } catch {
    return [];
  }
}

export async function bewaar(winkel: Winkel, waarde: unknown): Promise<boolean> {
  try {
    const db = await database();
    const transactie = db.transaction(winkel, 'readwrite');
    transactie.objectStore(winkel).put(waarde);
    await wachtOpBewaren(transactie);
    return true;
  } catch {
    return false;
  }
}

export async function verwijder(winkel: Winkel, sleutel: string): Promise<void> {
  try {
    const db = await database();
    const transactie = db.transaction(winkel, 'readwrite');
    transactie.objectStore(winkel).delete(sleutel);
    await wachtOpBewaren(transactie);
  } catch {
    // niet erg
  }
}

function wachtOpBewaren(transactie: IDBTransaction): Promise<void> {
  return new Promise((ok, fout) => {
    transactie.oncomplete = () => ok();
    transactie.onabort = () => fout(transactie.error ?? new Error('Het bewaren is afgebroken.'));
    transactie.onerror = () => fout(transactie.error ?? new Error('Het bewaren is mislukt.'));
  });
}
