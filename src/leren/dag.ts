import { legeDag, type Spelstand } from '../opslag/opslag';

export function dagDatum(nu = new Date()): string {
  return `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, '0')}-${String(nu.getDate()).padStart(2, '0')}`;
}

export function nieuweDag(stand: Spelstand, nu = new Date()): boolean {
  const datum = dagDatum(nu);
  if (stand.dag.datum === datum) return false;
  stand.dag = legeDag(datum);
  return true;
}

export function dierenAantal(stand: Spelstand): number {
  return Object.values(stand.dag.dieren).reduce((a, b) => a + b, 0);
}

export function tijdVoorbij(stand: Spelstand): boolean {
  return stand.speeltijdMinuten > 0 && stand.dag.speelSeconden >= stand.speeltijdMinuten * 60;
}

export function telSpeeltijd(stand: Spelstand, seconden: number, actief: boolean): boolean {
  if (actief && !stand.dag.klaar && Number.isFinite(seconden) && seconden > 0)
    stand.dag.speelSeconden += Math.min(seconden, 1);
  return tijdVoorbij(stand);
}
