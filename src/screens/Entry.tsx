import { useApp } from '../app/state';
import { FileThumb, NavRow, NestedHeader, PhotoUpload } from '../components/ui';
import { CAT_BY_ID } from '../lib/constants';
import { live, nameOf, netOf, restoreRows, returnsOf, softDeleteRows } from '../lib/derive';
import { dayLabel, diffDays, money, nowIso, plural, short, stamp, today } from '../lib/format';
import type { FileRef } from '../lib/types';
import { catLabel } from './shared';

const BACK_LABELS: Record<string, string> = { list: 'Expenses', bin: 'Deleted', media: 'Photos', room: 'Room', workers: 'Workers', insights: 'Summary' };

export function Entry() {
  const { ui, data, me, put, flash, back, startAdd, startReturn, nav } = useApp();
  const e = data.expenses.find((x) => x.id === ui.entryId);
  if (!e) {
    return (
      <>
        <NestedHeader title="Not found" onBack={back} />
        <main className="main"><div className="empty">This entry is no longer here.</div></main>
      </>
    );
  }
  const active = live(data.expenses);
  const isReturn = e.kind === 'return';
  const rets = isReturn ? [] : returnsOf(active, e.id);
  const net = isReturn ? 0 : netOf(active, e.id);
  const crew = e.crewId ? data.crews.find((c) => c.id === e.crewId) : null;
  const fields: [string, string | null | undefined][] = [
    ['Date', dayLabel(e.date) + (diffDays(e.date, today()) > 1 ? '' : `, ${short(e.date)}`)],
    ['For', catLabel(e)],
    ['Material', e.cat === 'material' ? e.matType : ''],
    [isReturn ? 'Item returned' : 'Details', e.matNote],
    ['Crew', crew?.name],
    ['Room', e.room], ['Paid by', e.paidBy], ['Paid to', e.payee], ['Paid with', e.mode], ['Note', e.note]
  ];

  const del = () => {
    const changed = softDeleteRows(data.expenses, e.id, me, nowIso());
    const after = data.expenses.map((x) => changed.find((c) => c.id === x.id) ?? x);
    put('expenses', changed);
    back();
    flash(isReturn ? 'Return deleted' : 'Expense deleted', () => put('expenses', restoreRows(after, e.id, me, nowIso())));
  };

  const addReceipt = (ref: FileRef) => {
    const cur = data.expenses.find((x) => x.id === e.id)!;
    put('expenses', [{ ...cur, receipts: [...cur.receipts, ref], history: [...cur.history, { what: 'Receipt added', by: me, at: ref.at }] }]);
    flash('Photo saved');
  };

  const edit = () => startAdd({
    amount: String(e.amount), cat: e.cat, other: e.other, matType: e.matType, matNote: e.matNote, room: e.room,
    crew: e.crewId ?? 'none', date: e.date, dateMode: e.date === today() ? 'today' : 'pick',
    paidBy: e.paidBy, payee: e.payee, mode: e.mode, note: e.note, receipts: e.receipts, editingId: e.id, fromReview: true
  }, 5);

  return (
    <>
      <NestedHeader
        title={isReturn ? e.matNote || 'Returned item' : nameOf(e)}
        kicker={isReturn ? 'Return' : CAT_BY_ID[e.cat]?.label}
        backLabel={BACK_LABELS[ui.entryBack] ?? 'Back'}
        onBack={back}
      />
      <main className="main">
        <div className="stack g16">
          <div className="card pad stack g4">
            <div className="row wrap g8">
              <div className="big" style={{ color: isReturn ? 'var(--ok)' : undefined }}>{money(e.amount)}</div>
              {(isReturn || rets.length > 0) && <span className={`tag${isReturn ? ' return' : ''}`}>{isReturn ? 'Return' : plural(rets.length, 'return', 'returns')}</span>}
            </div>
            {rets.length > 0 && <div className="t16 muted">Counts as {money(net)} after returns</div>}
          </div>

          {e.deleted && (
            <div className="stack g12" style={{ padding: '1rem', borderRadius: 'var(--r-card)', background: 'var(--danger-bg)', color: '#7a2a1f' }}>
              <span className="t17 b7">Deleted by {e.deleted.by} on {stamp(e.deleted.at)}</span>
              <span className="t16">It doesn't count in any totals.</span>
              <button type="button" className="btn btn-primary" onClick={() => { put('expenses', restoreRows(data.expenses, e.id, me, nowIso())); flash('Expense restored'); }}>Restore</button>
            </div>
          )}

          <div className="list">
            {fields.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="kv"><span>{k}</span><span>{v}</span></div>
            ))}
          </div>

          {rets.length > 0 && (
            <section className="stack g8">
              <h2 className="group-label">Returned from this bill</h2>
              <div className="list">
                {rets.map((x) => (
                  <div key={x.id} className="row between g12" style={{ padding: '0.75rem 1rem' }}>
                    <span className="stack g2">
                      <span className="row-title">{x.matNote || 'Returned item'}</span>
                      <span className="row-sub">{short(x.date)}, added by {x.by}</span>
                    </span>
                    <span className="amount return">{money(x.amount)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!isReturn && !e.deleted && net > 0 && <NavRow onClick={() => startReturn(e.id)}>Add a return for this bill</NavRow>}
          {isReturn && e.returnOf && <NavRow onClick={() => nav({ screen: 'entry', entryId: e.returnOf, entryBack: ui.entryBack })}>See the original bill</NavRow>}

          <section className="stack g8">
            <h2 className="group-label">Receipt photos</h2>
            <div className="card stack g8" style={{ padding: '0.5rem' }}>
              {e.receipts.map((rc) => (
                <div key={rc.id} className="row g12">
                  <FileThumb file={rc} />
                  <span className="stack" style={{ minWidth: 0 }}>
                    <span className="t16 b7" style={{ overflowWrap: 'anywhere' }}>{rc.name}</span>
                    <span className="t15 muted">Added by {rc.by} on {stamp(rc.at)}</span>
                  </span>
                </div>
              ))}
              {!e.receipts.length && <p className="t16 muted" style={{ padding: '0.25rem 0.5rem' }}>No receipt yet. Add it when the bill arrives.</p>}
              {!e.deleted && <PhotoUpload folder="receipts" onSaved={addReceipt} />}
            </div>
          </section>

          <section className="stack g8">
            <h2 className="group-label">History</h2>
            <div className="list">
              {e.history.map((h, i) => (
                <div key={i} className="row between g12 t16" style={{ padding: '0.75rem 1rem' }}>
                  <span><span className="b7">{h.what}</span> by {h.by}</span>
                  <span className="muted nowrap">{stamp(h.at)}</span>
                </div>
              ))}
            </div>
          </section>

          {!isReturn && !e.deleted && <button type="button" className="btn btn-outline" onClick={edit}>Edit expense</button>}
          {!e.deleted && (
            <button type="button" className="btn btn-danger-text" style={{ marginTop: '1rem' }} onClick={del}>
              {isReturn ? 'Delete return' : 'Delete expense'}
            </button>
          )}
        </div>
      </main>
    </>
  );
}
