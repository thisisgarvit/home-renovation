import { useState } from 'react';
import { useApp } from '../app/state';
import { Choice, TopHeader } from '../components/ui';
import { CAT_BY_ID, CREW_CATS } from '../lib/constants';
import { crewStats, live } from '../lib/derive';
import { dayLabel, money, parse, plural, short, today, uid } from '../lib/format';
import type { Crew } from '../lib/types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function NewCrewForm({ onDone }: { onDone: (c: Crew | null) => void }) {
  const { me } = useApp();
  const [f, setF] = useState({ name: '', trade: null as string | null, people: '1', rate: '', start: today() });
  const ok = !!f.name.trim() && !!f.trade && parseInt(f.people, 10) > 0;
  return (
    <form className="card pad stack g16" onSubmit={(e) => {
      e.preventDefault();
      if (!ok) return;
      onDone({ id: uid(), trade: f.trade!, name: f.name.trim(), people: parseInt(f.people, 10), rate: parseFloat(f.rate) || 0, start: f.start, end: null, holidays: [], by: me });
    }}>
      <h2 className="h-section">New crew</h2>
      <label className="stack g8">
        <span className="label">Name</span>
        <input className="input" enterKeyHint="next" placeholder="e.g. Ramesh's team" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </label>
      <div className="stack g8">
        <div id="nctrade" className="label">Type of work</div>
        <p className="t15 muted">Payments you add under this type are counted for this crew.</p>
        <div role="group" aria-labelledby="nctrade" className="grid2">
          {CREW_CATS.map((c) => <Choice key={c.id} on={f.trade === c.id} onClick={() => setF({ ...f, trade: c.id })}>{c.label}</Choice>)}
        </div>
      </div>
      <div className="grid2" style={{ gap: '0.75rem' }}>
        <label className="stack g8">
          <span className="label">People</span>
          <input className="input" inputMode="numeric" value={f.people} onChange={(e) => setF({ ...f, people: e.target.value.replace(/\D/g, '') })} />
        </label>
        <label className="stack g8">
          <span className="label">₹ per person a day</span>
          <input className="input" inputMode="numeric" placeholder="e.g. 800" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value.replace(/\D/g, '') })} />
        </label>
      </div>
      <label className="stack g8">
        <span className="label">Start date</span>
        <input className="input" type="date" max={today()} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value || today() })} />
        <span className="t15 muted">You add the end date once the work is done.</span>
      </label>
      <div className="grid2" style={{ gap: '0.75rem' }}>
        <button type="button" className="btn btn-outline" onClick={() => onDone(null)}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={!ok}>Save crew</button>
      </div>
    </form>
  );
}

function CrewDetails({ crew }: { crew: Crew }) {
  const { put } = useApp();
  const [people, setPeople] = useState(String(crew.people));
  const [rate, setRate] = useState(String(crew.rate || ''));
  const commit = () => {
    const p = parseInt(people, 10) || 0;
    const r = parseFloat(rate) || 0;
    if (p !== crew.people || r !== crew.rate) put('crews', [{ ...crew, people: p, rate: r }]);
  };
  return (
    <details style={{ borderTop: '1px solid var(--line)', paddingTop: '0.5rem' }}>
      <summary className="t16 b7" style={{ minHeight: '2.75rem', display: 'flex', alignItems: 'center', color: 'var(--accent)', cursor: 'pointer' }}>Edit crew details</summary>
      <div className="grid2" style={{ gap: '0.75rem', paddingTop: '0.5rem' }}>
        <label className="stack g8">
          <span className="label">People</span>
          <input className="input sm" inputMode="numeric" value={people} onChange={(e) => setPeople(e.target.value.replace(/\D/g, ''))} onBlur={commit} />
        </label>
        <label className="stack g8">
          <span className="label">₹ per person a day</span>
          <input className="input sm" inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value.replace(/\D/g, ''))} onBlur={commit} />
        </label>
        <label className="stack g8" style={{ gridColumn: 'span 2' }}>
          <span className="label">Start date</span>
          <input className="input sm" type="date" max={today()} value={crew.start} onChange={(e) => e.target.value && put('crews', [{ ...crew, start: e.target.value }])} />
        </label>
      </div>
    </details>
  );
}

export function Workers() {
  const { data, put, flash, nav } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [finishing, setFinishing] = useState<string | null>(null);
  const crew = data.crews.find((c) => c.id === selected) ?? data.crews[0] ?? null;
  const active = live(data.expenses);
  const t0 = today();

  const update = (c: Crew, patch: Partial<Crew>) => put('crews', [{ ...c, ...patch }]);

  return (
    <>
      <TopHeader title="Workers" />
      <main className="main">
        <div className="stack g16">
          <p className="t16 muted pretty">For workers paid daily. Payments you add for them show up here.</p>
          <div className="row wrap g8">
            {data.crews.map((c) => <Choice key={c.id} variant="pill-sm" on={!!crew && c.id === crew.id && !adding} onClick={() => { setSelected(c.id); setAdding(false); setFinishing(null); }}>{c.name}</Choice>)}
            <button type="button" className="choice pill sm" style={{ borderStyle: 'dashed', borderColor: 'var(--control)', color: 'var(--accent)' }} onClick={() => { setAdding(true); setFinishing(null); }}>Add crew</button>
          </div>

          {adding && <NewCrewForm onDone={(c) => {
            setAdding(false);
            if (c) { put('crews', [c]); setSelected(c.id); flash('Crew saved'); }
          }} />}

          {!adding && crew && (() => {
            const st = crewStats(crew, active, t0);
            const catLabel = CAT_BY_ID[crew.trade]?.label ?? 'Labour';
            const others = data.crews.filter((c) => c.trade === crew.trade && c.id !== crew.id && !c.end).length;
            const toggle = (d: string, off: boolean) => update(crew, { holidays: off ? crew.holidays.filter((h) => h !== d) : [...crew.holidays, d] });
            const sundaysOff = () => {
              const sundays = st.days.filter((d) => parse(d.date).getDay() === 0).map((d) => d.date);
              const before = crew.holidays;
              update(crew, { holidays: Array.from(new Set([...crew.holidays, ...sundays])) });
              flash(`${plural(sundays.length, 'Sunday', 'Sundays')} marked as holidays`, () => update(crew, { holidays: before }));
            };
            return (
              <div className="stack g16">
                <section className="card stack g16" style={{ padding: '1rem 0.75rem' }}>
                  <div className="row between g8" style={{ alignItems: 'flex-start', padding: '0 0.25rem' }}>
                    <div className="stack g2">
                      <h2 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.01em' }}>{crew.name}</h2>
                      <span className="t15 muted">{catLabel}, {plural(crew.people, 'person', 'people')}, {money(crew.rate)} each a day</span>
                    </div>
                    <span className={`tag${crew.end ? '' : ' ok'}`}>{crew.end ? 'Finished' : 'Working'}</span>
                  </div>
                  <div className="stack g2" style={{ padding: '0 0.25rem' }}>
                    <span className="b8" style={{ fontSize: '1.25rem' }}>{plural(st.worked, 'day', 'days')} worked, {plural(st.holidays, 'holiday', 'holidays')}</span>
                    <span className="t15 muted">From {short(crew.start)} to {crew.end ? short(crew.end) : 'today'}</span>
                  </div>
                  <div className="stack g8">
                    <div className="cal">{WEEKDAYS.map((w) => <span key={w} className="cal-head">{w}</span>)}</div>
                    <div className="cal">
                      {Array.from({ length: st.lead }, (_, i) => <span key={`b${i}`} />)}
                      {st.days.map((d) => (
                        <button key={d.date} type="button" className={`cal-day${d.off ? ' off' : ''}`} aria-pressed={d.off}
                          aria-label={`${short(d.date)}, ${d.off ? 'holiday. Tap to mark as worked' : 'worked. Tap to mark as a holiday'}`}
                          onClick={() => toggle(d.date, d.off)}>
                          <b>{parse(d.date).getDate()}</b>
                          <small>{d.off ? 'Off' : d.isToday ? 'Today' : ''}</small>
                        </button>
                      ))}
                    </div>
                    <div className="legend" style={{ paddingTop: '0.25rem' }}>
                      <span><span className="swatch" style={{ background: 'var(--accent)', width: '0.875rem', height: '0.875rem' }} />Worked</span>
                      <span><span className="swatch" style={{ border: '1.5px dashed var(--danger)' }} />Holiday (marked Off)</span>
                    </div>
                    <p className="t15 muted" style={{ padding: '0 0.25rem' }}>Tap a day to mark it as a holiday. Tap again to undo.</p>
                    <button type="button" className="text-btn" style={{ alignSelf: 'flex-start' }} onClick={sundaysOff}>Mark all Sundays as holidays</button>
                  </div>
                  <div className="stack g12" style={{ borderTop: '1px solid var(--line)', padding: '0.75rem 0.25rem 0' }}>
                    {!crew.end && finishing !== crew.id && (
                      <button type="button" className="btn btn-outline" onClick={() => setFinishing(crew.id)}>Mark work finished</button>
                    )}
                    {!crew.end && finishing === crew.id && (
                      <FinishForm crew={crew} onCancel={() => setFinishing(null)} onConfirm={(end) => {
                        setFinishing(null);
                        update(crew, { end });
                        flash(`${crew.name} marked finished`, () => update(crew, { end: null }));
                      }} />
                    )}
                    {crew.end && (
                      <div className="row between g12 t16">
                        <span>Last working day: {dayLabel(crew.end)}</span>
                        <button type="button" className="text-btn" onClick={() => update(crew, { end: null })}>Reopen</button>
                      </div>
                    )}
                  </div>
                </section>

                <section className="card pad stack g12">
                  <h2 className="h-section">Money</h2>
                  <div className="row between g12 t16"><span className="stack g2"><span>Earned so far</span><span className="t14 muted">{plural(st.worked, 'day', 'days')} × {plural(crew.people, 'person', 'people')} × {money(crew.rate)}</span></span><span className="num nowrap">{money(st.earned)}</span></div>
                  <div className="row between g12 t16"><span className="stack g2"><span>Paid</span><span className="t14 muted">{plural(st.payments.length, 'payment', 'payments')}</span></span><span className="num nowrap">{money(st.paid)}</span></div>
                  <div className="row between g12 t16 b8" style={{ borderTop: '1px solid var(--line)', paddingTop: '0.5rem' }}><span>{st.balance >= 0 ? 'Still to pay' : 'Paid in advance'}</span><span className="num nowrap">{money(Math.abs(st.balance))}</span></div>
                  <h3 className="t15 b7 muted" style={{ marginTop: '0.5rem' }}>Payments</h3>
                  {st.payments.length > 0 && (
                    <div className="list" style={{ boxShadow: 'none', border: '1px solid var(--line)', borderRadius: 'var(--r-ctl)' }}>
                      {st.payments.map((e) => (
                        <button key={e.id} type="button" className="row-btn" style={{ minHeight: '3.5rem', alignItems: 'center' }} onClick={() => nav({ screen: 'entry', entryId: e.id, entryBack: 'workers' })}>
                          <span className="stack grow"><span className="t16 b7">{dayLabel(e.date)}</span><span className="t14 muted">{[e.paidBy ? `paid by ${e.paidBy}` : '', e.note].filter(Boolean).join(', ')}</span></span>
                          <span className="amount">{money(e.amount)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="t15 muted pretty">
                    {st.payments.length
                      ? `To add a payment, tap Add expense on Tasks or Expenses and choose ${catLabel}.${others ? " You'll be asked which crew." : ''}`
                      : `No payments yet. When you pay them, tap Add expense and choose ${catLabel}.`}
                  </p>
                  <CrewDetails key={crew.id} crew={crew} />
                </section>
              </div>
            );
          })()}

          {!adding && !crew && <div className="empty">No crews yet. Tap Add crew when painters or daily workers start.</div>}
        </div>
      </main>
    </>
  );
}

function FinishForm({ crew, onCancel, onConfirm }: { crew: Crew; onCancel: () => void; onConfirm: (end: string) => void }) {
  const [end, setEnd] = useState(today());
  return (
    <div className="stack g12">
      <label className="stack g8">
        <span className="label">Last working day</span>
        <input className="input" type="date" min={crew.start} max={today()} value={end} onChange={(e) => setEnd(e.target.value || today())} />
      </label>
      <div className="grid2" style={{ gap: '0.75rem' }}>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={() => onConfirm(end)}>Mark finished</button>
      </div>
    </div>
  );
}
