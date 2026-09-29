import { useState } from 'react';
import { useApp } from '../app/state';
import { BottomBar } from '../components/Chrome';
import { ChevronRight, Trash } from '../components/Icons';
import { ExpenseRow, NestedHeader, Segmented, TopHeader } from '../components/ui';
import { CAT_BY_ID } from '../lib/constants';
import { live, restoreRows, sortByDateDesc, sumOf, titleOf } from '../lib/derive';
import { dayLabel, money, nowIso, plural, stamp } from '../lib/format';
import type { Expense } from '../lib/types';
import { rowInfo, SampleBanner } from './shared';

export function Expenses() {
  const { data, nav, startAdd } = useApp();
  const [groupBy, setGroupBy] = useState<'date' | 'room' | 'cat'>('date');
  const active = live(data.expenses);
  const crewName = (id: string | null) => (id ? data.crews.find((c) => c.id === id)?.name ?? '' : '');
  const keyFn = (e: Expense) => (groupBy === 'room' ? e.room : groupBy === 'cat' ? CAT_BY_ID[e.cat]?.label ?? 'Other' : e.date);
  const map = new Map<string, Expense[]>();
  sortByDateDesc(active).forEach((e) => map.set(keyFn(e), [...(map.get(keyFn(e)) ?? []), e]));
  const groups = Array.from(map, ([k, items]) => ({ k, items, sum: sumOf(items) }));
  if (groupBy !== 'date') groups.sort((a, b) => b.sum - a.sum);
  const nExp = active.filter((e) => e.kind === 'expense').length;
  const nRet = active.length - nExp;
  const binCount = data.expenses.filter((e) => e.deleted && !e.deleted.with).length;

  return (
    <>
      <TopHeader title="Expenses" />
      <main className="main">
        <div className="stack g16">
          <SampleBanner />
          <div className="stack g2" style={{ padding: '0 0.25rem' }}>
            <span className="t17 b8 num">Total after returns: {money(sumOf(active))}</span>
            <span className="t15 muted">{plural(nExp, 'expense', 'expenses')}{nRet ? ` and ${plural(nRet, 'return', 'returns')}` : ''}</span>
          </div>
          <Segmented label="Group by" value={groupBy} options={[['date', 'Date'], ['room', 'Room'], ['cat', 'Category']]} onChange={setGroupBy} />
          {groups.length ? (
            <div className="stack g24">
              {groups.map((g) => (
                <section key={g.k} className="stack g8">
                  <div className="row between g8">
                    <h2 className="group-label">{groupBy === 'date' ? dayLabel(g.k) : g.k}</h2>
                    <span className="t15 b7 num">{money(g.sum)}</span>
                  </div>
                  <div className="list">
                    {g.items.map((e) => {
                      const info = rowInfo(e, active, groupBy, crewName);
                      return <ExpenseRow key={e.id} {...info} onOpen={() => nav({ screen: 'entry', entryId: e.id, entryBack: 'list' })} />;
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="empty stack g8">
              <div className="b8" style={{ fontSize: '1.25rem', color: 'var(--ink)' }}>No expenses yet</div>
              <p>Tap Add expense below to add the first one.</p>
            </div>
          )}
          {binCount > 0 && (
            <button type="button" className="dashed t16 b7" onClick={() => nav({ screen: 'bin' })}>
              <span className="row g12"><Trash /><span>Recently deleted ({binCount})</span></span>
              <ChevronRight />
            </button>
          )}
        </div>
      </main>
      <BottomBar primary={{ label: 'Add expense', plus: true, onClick: () => startAdd() }} />
    </>
  );
}

export function Deleted() {
  const { data, put, me, flash, nav, back } = useApp();
  const items = data.expenses.filter((e) => e.deleted && !e.deleted.with).sort((a, b) => (a.deleted!.at < b.deleted!.at ? 1 : -1));
  const restore = (e: Expense) => {
    put('expenses', restoreRows(data.expenses, e.id, me, nowIso()));
    flash('Expense restored');
  };
  return (
    <>
      <NestedHeader title="Recently deleted" backLabel="Expenses" onBack={back} />
      <main className="main">
        <div className="stack g16">
          <p className="t16 muted pretty">Deleted expenses stay here and don't count in totals. Anyone can put them back.</p>
          {items.length ? (
            <div className="list">
              {items.map((e) => (
                <div key={e.id} className="row g12" style={{ padding: '0.75rem 0.75rem 0.75rem 1rem' }}>
                  <button type="button" className="stack g2 grow" style={{ padding: 0, border: 0, background: 'none', textAlign: 'left' }} onClick={() => nav({ screen: 'entry', entryId: e.id, entryBack: 'bin' })}>
                    <span className="row-title">{titleOf(e)}, {money(e.amount)}</span>
                    <span className="row-sub">Deleted by {e.deleted!.by} on {stamp(e.deleted!.at)}</span>
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" aria-label={`Restore ${titleOf(e)}, ${money(e.amount)}`} onClick={() => restore(e)}>Restore</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">Nothing here. Deleted expenses will show up here.</div>
          )}
        </div>
      </main>
    </>
  );
}
