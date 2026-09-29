import { useApp, type ReturnDraft } from '../app/state';
import { BottomBar } from '../components/Chrome';
import { DateChoice, DoneHero, NestedHeader, Segmented } from '../components/ui';
import { live, nameOf, netOf, sortByDateDesc } from '../lib/derive';
import { cleanAmount, grouped, money, nowIso, short, uid } from '../lib/format';
import type { Expense } from '../lib/types';

export function ReturnFlow() {
  const { ui, nav, back, ret: r, setRet, data, me, put, setSheet, exitFlow, finishFlow, startAdd } = useApp();
  const active = live(data.expenses);
  const orig = data.expenses.find((e) => e.id === r.of);
  const origNet = orig ? netOf(active, orig.id) : 0;
  const amt = parseFloat(r.amount);
  const tooMuch = amt > origNet;
  const valid = !!orig && amt > 0 && !tooMuch && r.what.trim().length > 0;
  const fromEntry = ui.flowFrom === 'entry';

  const cancel = () => {
    const dirty = !ui.retDone && (r.amount || r.what || (r.of && !fromEntry));
    if (!dirty) return exitFlow();
    setSheet({ title: 'Discard this return?', body: 'What you have entered so far will be lost.', confirmLabel: 'Discard', danger: true, onConfirm: exitFlow, closeLabel: 'Keep editing' });
  };

  const save = () => {
    if (!valid || !orig) return;
    const at = nowIso();
    const row: Expense = {
      id: uid(), kind: 'return', date: r.date, amount: -amt, cat: orig.cat, other: orig.other, matType: orig.matType,
      matNote: r.what.trim(), room: orig.room, crewId: orig.crewId, paidBy: null, payee: orig.payee, mode: null, note: '',
      by: me, returnOf: orig.id, receipts: [], deleted: null, history: [{ what: 'Added', by: me, at }]
    };
    put('expenses', [row]);
    setRet({ lastOf: orig.id, lastText: `${money(-amt)} for ${r.what.trim()}`, lastNet: `That bill now counts as ${money(origNet - amt)}.` });
    finishFlow({ screen: 'return', retDone: true, retStep: 2 });
  };

  if (ui.retDone) {
    const o = data.expenses.find((e) => e.id === r.lastOf);
    return (
      <>
        <NestedHeader title="Return" />
        <main className="main">
          <DoneHero title="Return saved" lines={[
            { text: r.lastText },
            { text: r.lastNet, muted: true },
            { text: 'Bought a replacement? Add it next. The room and material are already filled in.', muted: true }
          ]} />
        </main>
        <BottomBar
          solid
          primary={{
            label: 'Add replacement',
            onClick: () => startAdd(o ? { cat: o.cat, other: o.other, matType: o.matType, room: o.room, crew: o.crewId ?? 'none', fromReview: true } : {})
          }}
          secondary={{ label: 'Done', onClick: exitFlow }}
        />
      </>
    );
  }

  const bills = sortByDateDesc(active.filter((e) => e.kind === 'expense' && (r.filter === 'all' || e.cat === 'material') && netOf(active, e.id) > 0)).slice(0, 20);

  return (
    <>
      <NestedHeader title="Add a return" kicker={`Step ${ui.retStep} of 2`} onBack={back} onCancel={cancel} progress={{ n: ui.retStep, of: 2 }} />
      <main className="main">
        {ui.retStep === 1 ? (
          <div className="stack g16 pt8">
            <div className="stack g4">
              <h2 className="h-question">Which bill was the item on?</h2>
              <p className="t16 muted">The money comes off that bill.</p>
            </div>
            <Segmented label="Show" value={r.filter} options={[['mat', 'Materials'], ['all', 'All bills']]} onChange={(v) => setRet({ filter: v })} />
            {bills.length ? (
              <div className="list">
                {bills.map((e) => {
                  const n = netOf(active, e.id);
                  return (
                    <button key={e.id} type="button" className="row-btn" onClick={() => { setRet({ of: e.id, amount: '', what: '' }); nav({ retStep: 2 }); }}>
                      <span className="stack g2 grow">
                        <span className="row-title">{nameOf(e)}{e.matNote ? `, ${e.matNote}` : ''}</span>
                        <span className="row-sub">{short(e.date)}, {e.room}{n !== e.amount ? `. ${money(n)} left after returns` : ''}</span>
                      </span>
                      <span className="amount">{money(e.amount)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="empty">No bills to return against yet.</div>
            )}
          </div>
        ) : (
          <form className="stack g16 pt8" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
            {orig && (
              <div className="well stack g2">
                <span className="t15 b7 muted">Returning from</span>
                <div className="row between g12">
                  <span className="t17 b7">{nameOf(orig)}{orig.matNote ? `, ${orig.matNote}` : ''}</span>
                  <span className="t17 b7 num">{money(orig.amount)}</span>
                </div>
                <span className="t15 muted">{short(orig.date)}, {orig.room}{origNet !== orig.amount ? `. ${money(origNet)} after earlier returns` : ''}</span>
              </div>
            )}
            <div className="card pad stack g8">
              <label htmlFor="ramt" className="label">How much did you get back?</label>
              <div className="amount-field">
                <span style={{ fontSize: '1.875rem' }}>₹</span>
                <input id="ramt" autoFocus inputMode="decimal" enterKeyHint="next" autoComplete="off" placeholder="0" style={{ fontSize: '2.25rem' }}
                  value={grouped(r.amount)} onChange={(e) => setRet({ amount: cleanAmount(e.target.value) })} />
              </div>
              <div className="t15" style={{ color: tooMuch ? 'var(--danger)' : 'var(--ink-2)' }} role={tooMuch ? 'alert' : undefined}>
                {tooMuch ? `That is more than the bill. Enter up to ${money(origNet)}.` : `Up to ${money(origNet)}`}
              </div>
            </div>
            <label className="stack g8">
              <span className="label">What did you return?</span>
              <input className="input" enterKeyHint="done" placeholder="e.g. Floor drain" value={r.what} onChange={(e) => setRet({ what: e.target.value })} />
            </label>
            <div className="stack g8">
              <div className="label">When?</div>
              <DateChoice date={r.date} mode={r.dateMode} onChange={(p) => setRet(p as Partial<ReturnDraft>)} pickLabel="Return date" />
            </div>
            <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
          </form>
        )}
      </main>
      {ui.retStep === 2 && (
        <BottomBar
          solid
          hint={!valid ? (!(amt > 0) ? 'Enter the amount you got back' : tooMuch ? 'The amount is more than the bill' : 'Write what you returned') : undefined}
          primary={{ label: 'Save return', onClick: save, disabled: !valid }}
        />
      )}
    </>
  );
}
