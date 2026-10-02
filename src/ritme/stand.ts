// Wat er van de muziek bewaard wordt: welke soort muziek, de eigen beat en de
// voltooide beat-uitdagingen. Oude spelstanden zonder dit veld blijven werken.

import { UITDAGINGEN, valideerBeat, type Beat } from './beat';

export type MuziekSoort = 'meespeel' | 'nummers';

export interface RitmeStand {
  /** meespeel = muziek die meegroeit met het spel; nummers = de MP3-afspeellijsten */
  soort: MuziekSoort;
  /** De eigen beat van het discopodium. */
  beat: Beat | null;
  /** Ids van voltooide beat-uitdagingen. */
  uitdagingen: string[];
}

export function nieuwRitme(): RitmeStand {
  return { soort: 'nummers', beat: null, uitdagingen: [] };
}

export function valideerRitme(data: unknown): { stand: RitmeStand; aangepast: boolean } {
  const stand = nieuwRitme();
  if (data === undefined) return { stand, aangepast: false };
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { stand, aangepast: true };
  const r = data as Record<string, unknown>;
  let aangepast = false;
  if (r.soort === 'meespeel' || r.soort === 'nummers') stand.soort = r.soort;
  else if (r.soort !== undefined) aangepast = true;
  if (r.beat !== undefined && r.beat !== null) {
    const beat = valideerBeat(r.beat);
    if (beat) stand.beat = beat;
    else aangepast = true;
  }
  if (Array.isArray(r.uitdagingen)) {
    const bekend = new Set(UITDAGINGEN.map((u) => u.id));
    const netjes = r.uitdagingen.filter((u): u is string => typeof u === 'string' && /^[a-z0-9-]{1,40}$/.test(u));
    if (netjes.length !== r.uitdagingen.length || netjes.length > 100) aangepast = true;
    // Een uitdaging die later uit het spel verdwijnt, valt stilletjes weg.
    stand.uitdagingen = [...new Set(netjes.filter((u) => bekend.has(u)))];
  } else if (r.uitdagingen !== undefined) aangepast = true;
  return { stand, aangepast };
}
