import { useApp } from '../app/state';
import { DEMO } from '../config';
import { CAT_BY_ID } from '../lib/constants';
import { nameOf, returnsOf, titleOf } from '../lib/derive';
import { dayLabel, money, plural, short } from '../lib/format';
import type { Expense } from '../lib/types';

/** Banner for demo mode, or for example entries left in a live database. */
export function SampleBanner() {
  const { mode, data, resetDemo, setSheet, removeRows } = useApp();
  if (DEMO || mode === 'demo') {
    return (
      <div className="banner">
        <span>Demo: your changes stay on this device.</span>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setSheet({
          title: 'Reset the demo?', body: 'Everything goes back to the example household.', confirmLabel: 'Reset demo', danger: true,
          onConfirm: resetDemo, closeLabel: 'Cancel'
        })}>Reset demo</button>
      </div>
    );
  }
  const sample = {
    expenses: data.expenses.filter((x) => x.sample).map((x) => x.id),
    tasks: data.tasks.filter((x) => x.sample).map((x) => x.id),
    crews: data.crews.filter((x) => x.sample).map((x) => x.id),
    photos: data.photos.filter((x) => x.sample).map((x) => x.id)
  };
  if (!Object.values(sample).some((ids) => ids.length)) return null;
  return (
    <div className="banner">
      <span>These are example entries.</span>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setSheet({
        title: 'Remove the example entries?', body: 'Only the examples are removed. Anything your family added stays.', confirmLabel: 'Remove examples', danger: true,
        onConfirm: () => (Object.keys(sample) as (keyof typeof sample)[]).forEach((t) => removeRows(t, sample[t])), closeLabel: 'Cancel'
      })}>Remove examples</button>
    </div>
  );
}

/** Title, second line, tag and amount for an expense row. */
export function rowInfo(e: Expense, active: Expense[], ctx: 'date' | 'room' | 'cat', crewName: (id: string | null) => string) {
  const isReturn = e.kind === 'return';
  const rc = isReturn ? 0 : returnsOf(active, e.id).length;
  const where = ctx === 'room' ? dayLabel(e.date) : ctx === 'date' ? e.room : `${e.room}, ${short(e.date)}`;
  const parts = isReturn
    ? [`From the ${nameOf(e)} bill`, where]
    : [where, e.matNote, crewName(e.crewId), e.paidBy ? `paid by ${e.paidBy}` : ''];
  return {
    title: titleOf(e),
    sub: parts.filter(Boolean).join(', '),
    amount: money(e.amount),
    isReturn,
    tag: isReturn ? 'Return' : rc ? plural(rc, 'return', 'returns') : undefined
  };
}

export const catLabel = (e: Expense) => (e.cat === 'other' ? e.other || 'Other' : CAT_BY_ID[e.cat]?.label ?? 'Other');
