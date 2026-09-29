import { useEffect, useRef, type FormEvent } from 'react';
import { useApp, type Draft } from '../app/state';
import { BottomBar } from '../components/Chrome';
import { ChevronRight } from '../components/Icons';
import { Choice, DateChoice, DoneHero, FileThumb, NestedHeader, PhotoUpload } from '../components/ui';
import { FAMILY, ROOMS, SHARED_ROOM } from '../config';
import { CAT_BY_ID, CAT_GROUPS, MATERIALS, PAY_MODES } from '../lib/constants';
import { crewsFor, resolveCrew } from '../lib/derive';
import { cleanAmount, dayLabel, grouped, joinNames, lakhHint, money, nowIso, plural, short, uid } from '../lib/format';
import type { Expense } from '../lib/types';

export function AddFlow() {
  const app = useApp();
  const { ui, nav, back, draft: d, setDraft, data, me, put, setSheet, exitFlow, finishFlow, startAdd, startReturn } = app;
  const amt = parseFloat(d.amount);
  const matching = crewsFor(data.crews, d.cat, d.date);
  const subKind = d.cat === 'material' ? 'mat' : d.cat === 'other' ? 'other' : matching.length ? 'crew' : null;
  const crewById = Object.fromEntries(data.crews.map((c) => [c.id, c]));
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ui.step === 1 && !ui.done) amountRef.current?.focus();
  }, [ui.step, ui.done]);

  const valid = (() => {
    if (ui.step === 1) return amt > 0;
    if (ui.step === 2 && !ui.sub) return !!d.cat;
    if (ui.step === 2 && ui.sub) {
      return subKind === 'mat' ? !!d.matType : subKind === 'other' ? d.other.trim().length > 0 : subKind === 'crew' ? d.crew !== undefined : true;
    }
    if (ui.step === 3) return !!d.room;
    return true;
  })();

  const go = (step: number, sub = false, extra: Partial<typeof ui> = {}) => nav({ step, sub, ...extra });

  const save = () => {
    const crewId = resolveCrew(data.crews, d.cat, d.date, d.crew);
    const at = nowIso();
    const stampItem = { what: d.editingId ? 'Edited' : 'Added', by: me, at };
    const prev = d.editingId ? data.expenses.find((e) => e.id === d.editingId) : undefined;
    const entry: Expense = {
      id: d.editingId ?? uid(), kind: 'expense', date: d.date, amount: amt, cat: d.cat!,
      other: d.cat === 'other' ? d.other.trim() : '', matType: d.cat === 'material' ? d.matType : null,
      matNote: d.cat === 'material' ? d.matNote.trim() : '', room: d.room!, crewId, paidBy: d.paidBy || me,
      payee: d.payee.trim(), mode: d.mode, note: d.note.trim(), by: prev?.by ?? me, returnOf: null,
      receipts: d.receipts, deleted: null, history: [...(prev?.history ?? []), stampItem], sample: prev?.sample
    };
    const linkedReturns = prev
      ? data.expenses.filter((e) => e.returnOf === prev.id).map((e) => ({ ...e, cat: entry.cat, matType: entry.matType, room: entry.room, crewId: entry.crewId }))
      : [];
    put('expenses', [entry, ...linkedReturns]);
    const what = d.cat === 'material' ? d.matType : d.cat === 'other' ? d.other.trim() : CAT_BY_ID[d.cat!].label;
    const crew = crewId ? crewById[crewId] : null;
    setDraft({ savedText: `${money(amt)} for ${what}, ${d.room}`, linkedText: crew ? `Counted in ${crew.name}'s payments` : '' });
    finishFlow({ screen: 'add', done: true, step: 5, sub: false });
  };

  const next = (e?: FormEvent) => {
    e?.preventDefault();
    if (!valid) return;
    if (ui.step === 2 && !ui.sub && (subKind === 'mat' || subKind === 'other' || (subKind === 'crew' && matching.length > 1))) return go(2, true);
    if (ui.step === 5) return save();
    if (d.fromReview && d.room && d.cat) return go(5);
    go(ui.step + 1);
  };

  const cancel = () => {
    const dirty = !ui.done && (d.amount || d.cat || d.room);
    if (!dirty) return exitFlow();
    setSheet({ title: 'Discard this expense?', body: 'What you have entered so far will be lost.', confirmLabel: 'Discard', danger: true, onConfirm: exitFlow, closeLabel: 'Keep editing' });
  };

  // ---- saved ----
  if (ui.done) {
    return (
      <>
        <NestedHeader title="New expense" />
        <main className="main">
          <DoneHero title="Expense saved" lines={[
            { text: d.savedText },
            { text: d.linkedText, strong: true },
            { text: `${joinNames(FAMILY.filter((p) => p !== me))} can see it now.`, muted: true }
          ]} />
        </main>
        <BottomBar solid primary={{ label: 'Add another', onClick: () => startAdd() }} secondary={{ label: 'Done', onClick: exitFlow }} />
      </>
    );
  }

  const change = (step: number, sub = false, moreOpen = ui.moreOpen) => () => {
    setDraft({ fromReview: true });
    go(step, sub, { moreOpen });
  };
  const catText = d.cat ? (d.cat === 'other' ? d.other || 'Other' : CAT_BY_ID[d.cat].label) : '';
  const resolved = resolveCrew(data.crews, d.cat, d.date, d.crew);

  const review: { k: string; v: string; change: () => void }[] = [
    { k: 'Amount', v: amt > 0 ? money(amt) : '', change: change(1) },
    { k: 'For', v: catText, change: change(2) }
  ];
  if (d.cat === 'material') review.push({ k: 'Material', v: `${d.matType}${d.matNote ? `, ${d.matNote}` : ''}`, change: change(2, true) });
  if (matching.length) review.push({ k: 'Crew', v: resolved ? crewById[resolved]?.name ?? '' : 'Not part of a crew', change: change(2, true) });
  review.push({ k: 'Room', v: d.room ?? '', change: change(3) });
  review.push({ k: 'Date', v: dayLabel(d.date), change: change(4) });
  review.push({ k: 'Paid by', v: d.paidBy || me, change: change(4, false, true) });
  const extra = [d.payee, d.mode, d.note].filter(Boolean).join(', ');
  if (extra) review.push({ k: 'Details', v: extra, change: change(4, false, true) });

  const hints: Record<number, string> = {
    1: 'Enter the amount first',
    2: ui.sub ? (subKind === 'mat' ? 'Choose a material' : subKind === 'other' ? 'Write what it was for' : 'Choose a crew') : 'Choose what it was for',
    3: 'Choose a room'
  };
  const primaryLabel = ui.step === 5 ? (d.editingId ? 'Save changes' : 'Save expense') : d.fromReview && d.room && d.cat ? 'Back to check' : 'Next';
  const moreBits = [d.paidBy && d.paidBy !== me ? `Paid by ${d.paidBy}` : '', d.payee, d.mode, d.note].filter(Boolean);

  return (
    <>
      <NestedHeader
        title={d.editingId ? 'Edit expense' : 'New expense'}
        kicker={(ui.step === 5 ? (d.editingId ? 'Editing' : 'Last step') : `Step ${ui.step} of 4`) + (ui.step > 1 && amt > 0 ? `, ${money(amt)}` : '')}
        onBack={ui.step > 1 || ui.sub ? back : undefined}
        onCancel={cancel}
        progress={{ n: Math.min(ui.step, 4), of: 4 }}
      />
      <main className="main">
        <form className="stack g16 pt8" onSubmit={next} noValidate>
          {ui.step === 1 && (
            <>
              <h2 className="h-question">How much did you pay?</h2>
              <div className="card pad stack g8">
                <label htmlFor="amt" className="label muted">Amount in rupees</label>
                <div className="amount-field">
                  <span>₹</span>
                  <input id="amt" ref={amountRef} inputMode="decimal" enterKeyHint="next" autoComplete="off" placeholder="0"
                    value={grouped(d.amount)} onChange={(e) => setDraft({ amount: cleanAmount(e.target.value) })} />
                </div>
                <div className="t15 muted">{amt >= 100000 ? lakhHint(amt) : amt > 0 ? 'Next, choose what it was for' : 'Type the amount you paid'}</div>
              </div>
              <button type="button" className="dashed" style={{ minHeight: '4rem', borderStyle: 'solid' }} onClick={() => startReturn()}>
                <span className="stack g2">
                  <span className="t17 b7">Returned something to a shop?</span>
                  <span className="t15 muted">Add the money you got back</span>
                </span>
                <ChevronRight />
              </button>
            </>
          )}

          {ui.step === 2 && !ui.sub && (
            <>
              <h2 className="h-question">What was it for?</h2>
              {CAT_GROUPS.map(([title, ids]) => (
                <div key={title} className="stack g8">
                  <h3 className="group-label" style={{ padding: 0 }}>{title}</h3>
                  <div className="grid2">
                    {ids.map((id) => (
                      <Choice key={id} on={d.cat === id} onClick={() => setDraft({ cat: id, matType: id === 'material' ? d.matType : null, crew: id === d.cat ? d.crew : undefined })}>
                        {CAT_BY_ID[id].label}
                      </Choice>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {ui.step === 2 && ui.sub && subKind === 'mat' && (
            <>
              <h2 className="h-question">Which material?</h2>
              <div className="row wrap g8">
                {MATERIALS.map((m) => <Choice key={m} variant="pill" on={d.matType === m} onClick={() => setDraft({ matType: m })}>{m}</Choice>)}
              </div>
              <label className="stack g8">
                <span className="label">What exactly did you buy? <span className="optional">(optional)</span></span>
                <input className="input" enterKeyHint="next" placeholder="e.g. floor drain, 4 inch" value={d.matNote} onChange={(e) => setDraft({ matNote: e.target.value })} />
              </label>
            </>
          )}

          {ui.step === 2 && ui.sub && subKind === 'other' && (
            <>
              <h2 className="h-question">Write what it was for</h2>
              <label className="stack g8">
                <span className="label">In a few words</span>
                <input className="input" autoFocus enterKeyHint="next" placeholder="e.g. Pest control, society NOC fee" value={d.other} onChange={(e) => setDraft({ other: e.target.value })} />
              </label>
            </>
          )}

          {ui.step === 2 && ui.sub && subKind === 'crew' && (
            <>
              <div className="stack g4">
                <h2 className="h-question">Which crew is this for?</h2>
                <p className="t16 muted">The payment will show under that crew in Workers.</p>
              </div>
              <div className="stack g8">
                {matching.map((c) => (
                  <Choice key={c.id} on={d.crew === c.id} onClick={() => setDraft({ crew: c.id })} hint={`${plural(c.people, 'person', 'people')}, working since ${short(c.start)}`}>{c.name}</Choice>
                ))}
                <Choice on={d.crew === 'none'} onClick={() => setDraft({ crew: 'none' })} hint="A one-off payment">Not part of a crew</Choice>
              </div>
            </>
          )}

          {ui.step === 3 && (
            <>
              <h2 className="h-question">Where was it used?</h2>
              <div className="grid2">
                {ROOMS.map((r) => (
                  <Choice key={r} on={d.room === r} onClick={() => setDraft({ room: r })} hint={r === SHARED_ROOM ? 'Shared costs, like the designer' : ''}>{r}</Choice>
                ))}
              </div>
            </>
          )}

          {ui.step === 4 && (
            <>
              <h2 className="h-question">When did you pay?</h2>
              <DateChoice date={d.date} mode={d.dateMode} onChange={(p) => setDraft(p as Partial<Draft>)} />
              <button type="button" className="dashed" style={{ marginTop: '0.5rem', minHeight: '3.5rem' }} aria-expanded={ui.moreOpen} onClick={() => nav({ moreOpen: !ui.moreOpen }, 'replace')}>
                <span className="stack g2">
                  <span className="t17 b7">More details <span className="optional">(optional)</span></span>
                  <span className="t15 muted">{moreBits.length ? moreBits.join(', ') : `Paid by ${me}. Add who you paid, how, or a note.`}</span>
                </span>
                <span className="muted" style={{ fontSize: '1.5rem', lineHeight: 1 }}>{ui.moreOpen ? '−' : '+'}</span>
              </button>
              {ui.moreOpen && (
                <div className="stack g16">
                  <div className="stack g8">
                    <div id="paidby" className="label">Paid by</div>
                    <div role="group" aria-labelledby="paidby" className="grid3">
                      {FAMILY.map((p) => <Choice key={p} variant="center" on={(d.paidBy || me) === p} onClick={() => setDraft({ paidBy: p })}>{p}</Choice>)}
                    </div>
                  </div>
                  <label className="stack g8">
                    <span className="label">Paid to</span>
                    <input className="input" enterKeyHint="next" placeholder="Name or shop" value={d.payee} onChange={(e) => setDraft({ payee: e.target.value })} />
                  </label>
                  <div className="stack g8">
                    <div id="paidhow" className="label">How did you pay?</div>
                    <div role="group" aria-labelledby="paidhow" className="grid4">
                      {PAY_MODES.map((m) => <Choice key={m} variant="center" on={d.mode === m} onClick={() => setDraft({ mode: d.mode === m ? null : m })}>{m}</Choice>)}
                    </div>
                  </div>
                  <label className="stack g8">
                    <span className="label">Note</span>
                    <input className="input" enterKeyHint="done" placeholder="e.g. advance, rest due next week" value={d.note} onChange={(e) => setDraft({ note: e.target.value })} />
                  </label>
                </div>
              )}
            </>
          )}

          {ui.step === 5 && (
            <>
              <h2 className="h-question">{d.editingId ? 'Check your changes' : 'Check and save'}</h2>
              <div className="list">
                {review.map((r) => (
                  <div key={r.k} className="row between g12" style={{ padding: '0.5rem 0.5rem 0.5rem 1rem' }}>
                    <div className="stack" style={{ minWidth: 0 }}>
                      <span className="t15 muted">{r.k}</span>
                      <span className="t17 b7">{r.v}</span>
                    </div>
                    <button type="button" className="text-btn" aria-label={`Change ${r.k.toLowerCase()}`} onClick={r.change}>Change</button>
                  </div>
                ))}
              </div>
              <div className="stack g8">
                <h3 className="group-label">Receipt photo</h3>
                {d.receipts.map((rc) => (
                  <div key={rc.id} className="row g12 card" style={{ padding: '0.5rem' }}>
                    <FileThumb file={rc} />
                    <span className="stack grow">
                      <span className="t16 b7" style={{ overflowWrap: 'anywhere' }}>{rc.name}</span>
                      <span className="t15 muted">Saved with the expense</span>
                    </span>
                    <button type="button" className="text-btn" aria-label={`Remove ${rc.name}`} onClick={() => setDraft({ receipts: d.receipts.filter((x) => x.id !== rc.id) })}>Remove</button>
                  </div>
                ))}
                <PhotoUpload folder="receipts" onSaved={(ref) => setDraft((cur) => ({ receipts: [...cur.receipts, ref] }))} />
              </div>
              <div className="t15 muted">This will show as added by {me}.</div>
            </>
          )}
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </form>
      </main>
      <BottomBar solid hint={!valid ? hints[ui.step] : undefined} primary={{ label: primaryLabel, onClick: () => next(), disabled: !valid }} />
    </>
  );
}
