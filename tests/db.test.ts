import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { IDBDatabase } from 'fake-indexeddb';
import { alles, bewaar, verwijder } from '../src/opslag/db';

describe('duurzaam bewaren van muziek en opnames', () => {
  it('wacht op de commit en leest de bewaarde opname terug', async () => {
    expect(await bewaar('opnames', { sleutel: 'test', tekst: 'hond' })).toBe(true);
    expect(await alles('opnames')).toContainEqual({ sleutel: 'test', tekst: 'hond' });
    await verwijder('opnames', 'test'); expect(await alles('opnames')).toEqual([]);
  });
  it('meldt een afgebroken transactie als fout, ook nadat de put-request slaagt', async () => {
    const origineel = IDBDatabase.prototype.transaction;
    const spion = vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementation(function (this: IDBDatabase, ...args: Parameters<typeof origineel>) {
      const tx = origineel.apply(this, args);
      if (args[1] === 'readwrite') {
        const store = tx.objectStore('opnames'), put = store.put.bind(store);
        store.put = (...p: Parameters<typeof put>) => { const req = put(...p); req.addEventListener('success', () => tx.abort()); return req; };
      }
      return tx;
    });
    expect(await bewaar('opnames', { sleutel: 'abort', tekst: 'niet bewaard' })).toBe(false);
    spion.mockRestore(); expect(await alles('opnames')).toEqual([]);
  });
});
