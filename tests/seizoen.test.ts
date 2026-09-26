import { describe, expect, it } from 'vitest';
import { seizoenOp } from '../src/wereld/seizoen';

const op = (jaar: number, maand: number, dag: number) => seizoenOp(new Date(jaar, maand - 1, dag));

describe('seizoenen', () => {
  it('sneeuwt in december en de eerste week van januari', () => {
    expect(op(2026, 12, 1)).toBe('winter');
    expect(op(2026, 12, 25)).toBe('winter');
    expect(op(2027, 1, 6)).toBe('winter');
    expect(op(2027, 1, 7)).toBeNull();
  });

  it('is oranje op Koningsdag', () => {
    expect(op(2027, 4, 27)).toBe('koningsdag');
    expect(op(2026, 4, 26)).toBe('koningsdag'); // 27 april valt dan op zondag
    expect(op(2027, 4, 28)).toBeNull();
  });

  it('heeft pompoenen in de laatste week van oktober', () => {
    expect(op(2026, 10, 31)).toBe('halloween');
    expect(op(2026, 10, 24)).toBeNull();
  });

  it('is gewoon op een normale dag', () => {
    expect(op(2026, 9, 26)).toBeNull();
  });
});
