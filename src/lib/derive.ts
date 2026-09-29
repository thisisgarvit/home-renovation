import { ROOMS, SHARED_ROOM } from '../config';
import { CAT_BY_ID, TYPES, TYPE_COLORS, type SpendType } from './constants';
import { addDays, diffDays, money, parse, pct, today, weekStart } from './format';
import type { Crew, Expense } from './types';

export const live = (all: Expense[]) => all.filter((e) => !e.deleted);
export const sumOf = (es: Expense[]) => es.reduce((a, e) => a + e.amount, 0);

export const typeOf = (e: Expense): SpendType => CAT_BY_ID[e.cat]?.type ?? 'Other';

/** What the entry is, in a few words: the material, the typed "Other" text, or the category. */
export const nameOf = (e: Expense) =>
  e.cat === 'material' && e.matType ? e.matType : e.cat === 'other' && e.other ? e.other : CAT_BY_ID[e.cat]?.label ?? 'Other';

export const titleOf = (e: Expense) => (e.kind === 'return' ? `Returned: ${e.matNote || 'item'}` : nameOf(e));

export const returnsOf = (active: Expense[], id: string) => active.filter((x) => x.returnOf === id);

/** A bill's amount after the returns linked to it. */
export const netOf = (active: Expense[], id: string) =>
  active.filter((x) => x.id === id || x.returnOf === id).reduce((a, x) => a + x.amount, 0);

export const sortByDateDesc = <T extends { date: string }>(xs: T[]) =>
  xs.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

// ---- crews ----

export const crewsFor = (crews: Crew[], cat: string | null, date: string) =>
  cat ? crews.filter((c) => c.trade === cat && c.start <= date && (!c.end || c.end >= date)) : [];

/** 'none' means the person said "Not part of a crew"; undefined means not asked. */
export type CrewChoice = string | 'none' | undefined;

export const resolveCrew = (crews: Crew[], cat: string | null, date: string, choice: CrewChoice) => {
  if (choice === 'none') return null;
  if (choice) return choice;
  const m = crewsFor(crews, cat, date);
  return m.length === 1 ? m[0].id : null;
};

export interface CrewDay {
  date: string;
  off: boolean;
  isToday: boolean;
}

export const crewStats = (crew: Crew, active: Expense[], now = today()) => {
  const last = crew.end || now;
  const span = Math.min(120, Math.max(0, diffDays(crew.start, last)));
  const days: CrewDay[] = [];
  for (let i = 0; i <= span; i++) {
    const d = addDays(crew.start, i);
    days.push({ date: d, off: crew.holidays.includes(d), isToday: d === now });
  }
  const worked = days.filter((d) => !d.off).length;
  const holidays = days.length - worked;
  const earned = worked * crew.people * crew.rate;
  const payments = sortByDateDesc(active.filter((e) => e.crewId === crew.id));
  const paid = sumOf(payments);
  return { days, worked, holidays, earned, payments, paid, balance: earned - paid, lead: (parse(crew.start).getDay() + 6) % 7 };
};

// ---- analytics ----

export const splitOf = (es: Expense[]) => {
  const t: Record<SpendType, number> = { Labour: 0, 'Raw material': 0, 'Interior designer': 0, Other: 0 };
  es.forEach((e) => { t[typeOf(e)] += e.amount; });
  const total = Math.max(0, sumOf(es));
  const keys = TYPES.filter((k) => t[k] > 0);
  const ranked = keys.slice().sort((a, b) => t[b] - t[a]);
  return {
    segs: keys.map((k) => ({ key: k, grow: t[k], color: TYPE_COLORS[k] })),
    rows: ranked.map((k) => ({ name: k, color: TYPE_COLORS[k], amount: t[k], share: pct(t[k], total) })),
    spoken: ranked.map((k) => `${k} ${money(t[k])}`).join(', ')
  };
};

export const roomTotals = (active: Expense[]) => {
  const agg = ROOMS.map((name) => {
    const es = active.filter((e) => e.room === name);
    return { name, es, total: sumOf(es) };
  });
  const rooms = agg.filter((x) => x.total > 0 && x.name !== SHARED_ROOM).sort((a, b) => b.total - a.total);
  const shared = agg.find((x) => x.name === SHARED_ROOM)!;
  const empty = agg.filter((x) => x.total <= 0 && x.name !== SHARED_ROOM).map((x) => x.name);
  const max = Math.max(1, rooms[0]?.total ?? 0, shared.total);
  return { agg, rooms, shared, empty, max };
};

export const weeklyTotals = (active: Expense[], count = 8, now = today()) => {
  const cur = weekStart(now);
  const weeks = Array.from({ length: count }, (_, i) => addDays(cur, -7 * (count - 1 - i)));
  const sums: Record<string, number> = Object.fromEntries(weeks.map((w) => [w, 0]));
  active.forEach((e) => {
    const k = weekStart(e.date);
    if (k in sums) sums[k] += e.amount;
  });
  const max = Math.max(1, ...weeks.map((w) => sums[w]));
  return { weeks, sums, max, current: cur };
};

export const categoryTotals = (es: Expense[]) => {
  const m = new Map<string, { sum: number; type: SpendType }>();
  es.forEach((e) => {
    const c = CAT_BY_ID[e.cat];
    const k = c?.label ?? 'Other';
    m.set(k, { sum: (m.get(k)?.sum ?? 0) + e.amount, type: c?.type ?? 'Other' });
  });
  const rows = Array.from(m, ([name, v]) => ({ name, ...v })).filter((x) => x.sum > 0).sort((a, b) => b.sum - a.sum);
  return { rows, max: rows[0]?.sum ?? 1 };
};

export const materialTotals = (es: Expense[]) => {
  const m = new Map<string, { sum: number; notes: string[]; returns: number }>();
  es.filter((e) => e.cat === 'material').forEach((e) => {
    const k = e.matType || 'Not specified';
    const v = m.get(k) ?? { sum: 0, notes: [], returns: 0 };
    v.sum += e.amount;
    if (e.kind === 'return') v.returns += 1;
    else if (e.matNote) v.notes.push(e.matNote);
    m.set(k, v);
  });
  return Array.from(m, ([name, v]) => ({ name, ...v })).sort((a, b) => b.sum - a.sum);
};

// ---- soft delete ----

/** Marks a bill and its live returns as deleted. Returns the rows that changed. */
export const softDeleteRows = (all: Expense[], id: string, by: string, at: string): Expense[] =>
  all
    .filter((e) => e.id === id || (e.returnOf === id && !e.deleted))
    .map((e) => ({
      ...e,
      deleted: { by, at, with: e.id === id ? null : id },
      history: [...e.history, { what: 'Deleted', by, at }]
    }));

/** Restores a row and anything deleted together with it. Returns the rows that changed. */
export const restoreRows = (all: Expense[], id: string, by: string, at: string): Expense[] => {
  const target = all.find((e) => e.id === id);
  const root = target?.deleted?.with ?? id;
  return all
    .filter((e) => e.id === root || e.deleted?.with === root)
    .map((e) => ({ ...e, deleted: null, history: [...e.history, { what: 'Restored', by, at }] }));
};
