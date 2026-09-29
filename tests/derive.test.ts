import { describe, expect, it } from 'vitest';
import { crewStats, crewsFor, live, materialTotals, netOf, resolveCrew, restoreRows, roomTotals, softDeleteRows, splitOf, sumOf } from '../src/lib/derive';
import { cleanAmount, grouped, lakhHint, money, ordinal } from '../src/lib/format';
import { fromRow, toRow } from '../src/lib/store/supabase';
import type { Crew, Expense } from '../src/lib/types';

const base: Omit<Expense, 'id' | 'amount'> = {
  kind: 'expense', date: '2026-09-10', cat: 'material', other: '', matType: 'Sanitaryware', matNote: '', room: 'Bathroom',
  crewId: null, paidBy: 'Anil', payee: '', mode: null, note: '', by: 'Anil', returnOf: null, receipts: [], deleted: null, history: []
};
const exp = (id: string, amount: number, extra: Partial<Expense> = {}): Expense => ({ ...base, id, amount, ...extra });

const crew = (id: string, extra: Partial<Crew> = {}): Crew => ({
  id, trade: 'painter', name: id, people: 2, rate: 800, start: '2026-09-01', end: null, holidays: [], by: 'Anil', ...extra
});

describe('returns', () => {
  const bill = exp('bill', 14200);
  const ret = exp('ret', -1400, { kind: 'return', returnOf: 'bill' });
  const other = exp('other', 400);
  const all = [bill, ret, other];

  it('nets a bill against its returns', () => {
    expect(netOf(all, 'bill')).toBe(12800);
    expect(sumOf(all)).toBe(13200);
  });

  it('soft-deletes a bill together with its returns and restores both', () => {
    const changed = softDeleteRows(all, 'bill', 'Sunita', '2026-09-20T10:00:00Z');
    expect(changed.map((e) => e.id).sort()).toEqual(['bill', 'ret']);
    expect(changed.find((e) => e.id === 'ret')!.deleted!.with).toBe('bill');
    const after = all.map((e) => changed.find((c) => c.id === e.id) ?? e);
    expect(live(after).map((e) => e.id)).toEqual(['other']);
    const restored = restoreRows(after, 'bill', 'Anil', '2026-09-21T10:00:00Z');
    expect(restored.map((e) => e.id).sort()).toEqual(['bill', 'ret']);
    expect(restored.every((e) => e.deleted === null && e.history.at(-1)!.what === 'Restored')).toBe(true);
  });

  it('shows returns under the material they came from', () => {
    const m = materialTotals(all);
    expect(m[0]).toMatchObject({ name: 'Sanitaryware', sum: 13200, returns: 1 });
  });
});

describe('crew linking', () => {
  it('links automatically when one crew of that trade is working', () => {
    const crews = [crew('ramesh')];
    expect(resolveCrew(crews, 'painter', '2026-09-05', undefined)).toBe('ramesh');
  });

  it('does not guess when two crews overlap', () => {
    const crews = [crew('ramesh'), crew('sonu', { start: '2026-09-03' })];
    expect(crewsFor(crews, 'painter', '2026-09-05')).toHaveLength(2);
    expect(resolveCrew(crews, 'painter', '2026-09-05', undefined)).toBeNull();
    expect(resolveCrew(crews, 'painter', '2026-09-05', 'sonu')).toBe('sonu');
  });

  it('respects "Not part of a crew", other trades and finished crews', () => {
    const crews = [crew('ramesh', { end: '2026-09-04' })];
    expect(resolveCrew(crews, 'painter', '2026-09-03', 'none')).toBeNull();
    expect(resolveCrew(crews, 'plumber', '2026-09-03', undefined)).toBeNull();
    expect(resolveCrew(crews, 'painter', '2026-09-10', undefined)).toBeNull();
  });

  it('works out days, earnings and balance', () => {
    const c = crew('ramesh', { start: '2026-09-01', holidays: ['2026-09-03'] });
    const pay = exp('p1', 5000, { cat: 'painter', crewId: 'ramesh' });
    const st = crewStats(c, [pay], '2026-09-05');
    expect(st.days).toHaveLength(5);
    expect(st.worked).toBe(4);
    expect(st.holidays).toBe(1);
    expect(st.earned).toBe(4 * 2 * 800);
    expect(st.paid).toBe(5000);
    expect(st.balance).toBe(1400);
  });
});

describe('analytics', () => {
  it('keeps shared costs apart from rooms', () => {
    const all = [exp('a', 45000, { cat: 'designer', room: 'Whole house' }), exp('b', 20000), exp('c', 5000, { cat: 'plumber', room: 'Kitchen' })];
    const rt = roomTotals(all);
    expect(rt.rooms.map((r) => r.name)).toEqual(['Bathroom', 'Kitchen']);
    expect(rt.shared.total).toBe(45000);
    expect(rt.max).toBe(45000);
  });

  it('splits by type in a fixed colour order', () => {
    const sp = splitOf([exp('a', 100, { cat: 'plumber' }), exp('b', 300)]);
    expect(sp.segs.map((s) => s.key)).toEqual(['Labour', 'Raw material']);
    expect(sp.rows[0]).toMatchObject({ name: 'Raw material', share: 75 });
  });
});

describe('formatting', () => {
  it('formats rupees the Indian way', () => {
    expect(money(125000)).toBe('₹1,25,000');
    expect(money(-1400)).toBe('−₹1,400');
    expect(grouped('125000.5')).toBe('1,25,000.5');
    expect(cleanAmount('1,25,000.456')).toBe('125000.45');
    expect(lakhHint(125000)).toBe('1.25 lakh rupees');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(12)).toBe('12th');
  });
});

describe('database mapping', () => {
  it('round-trips camelCase fields through snake_case columns', () => {
    const c = crew('x', { holidays: ['2026-09-03'] });
    const row = toRow(c) as Record<string, unknown>;
    expect(row).toMatchObject({ start_date: '2026-09-01', end_date: null, added_by: 'Anil', holidays: ['2026-09-03'] });
    expect(fromRow<Crew>({ ...row, rate: '800.00', created_at: 'x', updated_at: 'y' })).toEqual(c);
    const e = exp('e', 10, { matType: 'Tiles', returnOf: null });
    expect(toRow(e)).toMatchObject({ mat_type: 'Tiles', return_of: null, crew_id: null, paid_by: 'Anil' });
  });
});
