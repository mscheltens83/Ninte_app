// Grotere dingen bewaren op het apparaat (IndexedDB): eigen muziek en
// ingesproken zinnen. Alles blijft op de iPad; er gaat niets naar internet.

const NAAM = 'nintes-wereld';
const VERSIE = 1;
export type Winkel = 'muziek' | 'opnames';

let open: Promise<IDBDatabase> | null = null;

function database(): Promise<IDBDatabase> {
  open ??= new Promise((ok, fout) => {
    const verzoek = indexedDB.open(NAAM, VERSIE);
    verzoek.onupgradeneeded = () => {
      const db = verzoek.result;
      if (!db.objectStoreNames.contains('muziek')) db.createObjectStore('muziek', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('opnames')) db.createObjectStore('opnames', { keyPath: 'sleutel' });
    };
    verzoek.onsuccess = () => ok(verzoek.result);
    verzoek.onerror = () => fout(verzoek.error);
  });
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
    await wacht(db.transaction(winkel, 'readwrite').objectStore(winkel).put(waarde));
    return true;
  } catch {
    return false;
  }
}

export async function verwijder(winkel: Winkel, sleutel: string): Promise<void> {
  try {
    const db = await database();
    await wacht(db.transaction(winkel, 'readwrite').objectStore(winkel).delete(sleutel));
  } catch {
    // niet erg
  }
}
