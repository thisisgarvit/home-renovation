import { useState } from 'react';
import { useApp } from '../app/state';
import { ChevronRight, Image } from '../components/Icons';
import { ExpenseRow, NestedHeader, TopHeader } from '../components/ui';
import { SHARED_ROOM } from '../config';
import { TYPES, TYPE_COLORS } from '../lib/constants';
import { categoryTotals, live, materialTotals, roomTotals, sortByDateDesc, splitOf, sumOf, weeklyTotals } from '../lib/derive';
import { cleanAmount, grouped, money, ordinal, pct, plural, short } from '../lib/format';
import { rowInfo } from './shared';

function SplitBars({ segs, thick }: { segs: { key: string; grow: number; color: string }[]; thick?: boolean }) {
  return (
    <div className={`sbar${thick ? ' thick' : ''}`}>
      {segs.map((s) => <div key={s.key} style={{ flex: `${s.grow} 1 0`, background: s.color }} />)}
    </div>
  );
}

function SplitRows({ rows }: { rows: { name: string; color: string; amount: number; share: number }[] }) {
  return (
    <div className="stack">
      {rows.map((t) => (
        <div key={t.name} className="row g12 t16" style={{ minHeight: '2.5rem' }}>
          <span className="swatch" style={{ background: t.color }} />
          <span className="grow">{t.name}</span>
          <span className="b8 num">{money(t.amount)}</span>
          <span className="muted num" style={{ width: '2.75rem', textAlign: 'right' }}>{t.share}%</span>
        </div>
      ))}
    </div>
  );
}

export function Summary() {
  const { data, nav, put, me } = useApp();
  const active = live(data.expenses);
  const net = sumOf(active);
  const nExp = active.filter((e) => e.kind === 'expense').length;
  const nRet = active.length - nExp;
  const returned = -sumOf(active.filter((e) => e.kind === 'return'));
  const rt = roomTotals(active);
  const wk = weeklyTotals(active);
  const [week, setWeek] = useState(wk.current);
  const saved = data.settings.find((x) => x.id === 'budget')?.value ?? '';
  const [draftBudget, setDraftBudget] = useState<string | null>(null);
  const budget = draftBudget ?? saved;
  const commitBudget = () => {
    if (draftBudget !== null && draftBudget !== saved) put('settings', [{ id: 'budget', value: draftBudget, by: me }]);
    setDraftBudget(null);
  };
  const b = parseFloat(saved);
  const receipts = active.reduce((n, e) => n + e.receipts.length, 0);

  const roomBar = (x: { name: string; total: number; es: typeof active }) => {
    const sp = splitOf(x.es);
    return (
      <button key={x.name} type="button" className="bar-btn" aria-label={`${x.name}, ${money(x.total)}, ${pct(x.total, net)} percent. ${sp.spoken}. Opens the room`} onClick={() => nav({ screen: 'room', room: x.name })}>
        <div className="row between g8 t16" style={{ width: '100%' }}>
          <span className="b7">{x.name}</span>
          <span className="row g4 num nowrap"><span><span className="b8">{money(x.total)}</span><span className="muted">, {pct(x.total, net)}%</span></span><ChevronRight size={18} color="var(--ink-2)" /></span>
        </div>
        <div style={{ width: `${Math.max(0, (x.total / rt.max) * 100)}%` }}><SplitBars segs={sp.segs} /></div>
      </button>
    );
  };

  return (
    <>
      <TopHeader title="Summary" />
      <main className="main">
        <div className="stack g16">
          <section className="card pad stack g12">
            <div className="stack g2">
              <div className="label muted">Total after returns</div>
              <div className="bigger">{money(net)}</div>
              <div className="t15 muted">{plural(nExp, 'expense', 'expenses')}{nRet ? ` and ${plural(nRet, 'return', 'returns')}` : ''}</div>
            </div>
            {b > 0 && (
              <div className="stack g8">
                <div style={{ height: '0.625rem', borderRadius: 999, background: 'var(--well)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (net / b) * 100)}%`, borderRadius: 999, background: 'var(--accent)' }} />
                </div>
                <div className="row between g8 t15">
                  <span>{pct(net, b)}% of {money(b)} used</span>
                  <span className="b7">{b - net >= 0 ? `${money(b - net)} left` : `${money(net - b)} over`}</span>
                </div>
              </div>
            )}
            <label className="row between g12" style={{ borderTop: '1px solid var(--line)', paddingTop: '0.75rem' }}>
              <span className="label">Total budget</span>
              <span className="row g4 input sm" style={{ width: 'auto', minHeight: '2.75rem' }}>
                <span>₹</span>
                <input inputMode="numeric" autoComplete="off" placeholder="Set budget" enterKeyHint="done" value={grouped(budget)} onChange={(e) => setDraftBudget(cleanAmount(e.target.value).split('.')[0])}
                  onBlur={commitBudget} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  style={{ width: '7.5rem', border: 0, background: 'transparent', fontWeight: 700, padding: 0 }} />
              </span>
            </label>
          </section>

          <div className="grid2">
            <div className="card stack" style={{ padding: '0.75rem 1rem' }}>
              <span className="t14 b7 muted">This week</span>
              <span className="num b8" style={{ fontSize: '1.5rem' }}>{money(wk.sums[wk.current])}</span>
            </div>
            <div className="card stack" style={{ padding: '0.75rem 1rem' }}>
              <span className="t14 b7 muted">Got back from returns</span>
              <span className="num b8" style={{ fontSize: '1.5rem' }}>{money(returned)}</span>
            </div>
          </div>

          <button type="button" className="nav-row" style={{ minHeight: '4.5rem' }} onClick={() => nav({ screen: 'media' })}>
            <span className="row g16">
              <span className="rthumb" style={{ width: '3rem', height: '3rem', background: 'var(--well)' }}><Image /></span>
              <span className="stack">
                <span className="t17 b7">Photos and receipts</span>
                <span className="t15 muted" style={{ fontWeight: 500 }}>{plural(receipts, 'receipt', 'receipts')}, {plural(data.photos.length, 'site photo', 'site photos')}</span>
              </span>
            </span>
            <ChevronRight />
          </button>

          <section className="card stack g12" style={{ padding: '1rem 0.75rem 0.75rem' }}>
            <div className="stack g2" style={{ padding: '0 0.25rem' }}>
              <h2 className="h-section">Spending by room</h2>
              <p className="t16 b7">{rt.rooms.length ? `Most spent: ${rt.rooms[0].name}, ${money(rt.rooms[0].total)}` : 'No room has any spending yet.'}</p>
              <p className="t15 muted">Tap a room to see where its money went.</p>
            </div>
            <div className="legend">
              {TYPES.map((k) => <span key={k}><span className="swatch" style={{ background: TYPE_COLORS[k] }} />{k}</span>)}
            </div>
            {rt.rooms.map(roomBar)}
            {rt.shared.total > 0 && (
              <div className="stack g4" style={{ borderTop: '1px solid var(--line)', paddingTop: '0.5rem' }}>
                <span className="t14 b7 muted" style={{ padding: '0 0.25rem' }}>Shared by all rooms</span>
                {roomBar(rt.shared)}
              </div>
            )}
            {rt.empty.length > 0 && <p className="t15 muted" style={{ padding: '0.25rem 0.25rem 0.5rem' }}>Nothing spent yet: {rt.empty.join(', ')}</p>}
          </section>

          <section className="card pad stack g12">
            <div className="stack g2">
              <h2 className="h-section">Spending by type</h2>
              <p className="t15 muted">All rooms together</p>
            </div>
            {(() => { const sp = splitOf(active); return <><SplitBars segs={sp.segs} thick /><SplitRows rows={sp.rows} /></>; })()}
          </section>

          <section className="card pad stack g12">
            <div className="stack g2">
              <h2 className="h-section">Spending each week</h2>
              <p className="t16 b7 num">{week === wk.current ? 'This week' : `Week of ${short(week)}`}: {money(wk.sums[week] ?? 0)}</p>
              <p className="t15 muted">Tap a week to see its total.</p>
            </div>
            <div className="stack g4">
              <div className="t13 muted num" style={{ textAlign: 'right' }}>Highest week: {money(wk.max)}</div>
              <div className="weeks">
                {wk.weeks.map((w) => (
                  <button key={w} type="button" aria-pressed={w === week} aria-label={`Week of ${short(w)}, ${money(wk.sums[w])}`} onClick={() => setWeek(w)}>
                    <span style={{ height: `${Math.max(0, (wk.sums[w] / wk.max) * 100)}%`, background: w === week ? 'var(--accent)' : '#8c959c' }} />
                  </button>
                ))}
              </div>
              <div className="week-labels">
                {wk.weeks.map((w, i) => <span key={w} className={w === week ? 'on' : ''}>{w === week || i % 2 === 1 ? short(w) : ''}</span>)}
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export function Room() {
  const { ui, data, nav, back } = useApp();
  const active = live(data.expenses);
  const net = sumOf(active);
  const rt = roomTotals(active);
  const name = ui.room ?? rt.rooms[0]?.name ?? SHARED_ROOM;
  const agg = rt.agg.find((x) => x.name === name) ?? { name, es: [], total: 0 };
  const rank = rt.rooms.findIndex((x) => x.name === name);
  const sp = splitOf(agg.es);
  const cats = categoryTotals(agg.es);
  const mats = materialTotals(agg.es);
  const crewName = (id: string | null) => (id ? data.crews.find((c) => c.id === id)?.name ?? '' : '');
  const shareText = agg.total <= 0 ? 'Nothing spent here yet'
    : `${pct(agg.total, net)}% of all spending. ${name === SHARED_ROOM ? 'These costs are shared by all rooms.' : rank === 0 ? 'The most of any room.' : `${ordinal(rank + 1)} highest of ${rt.rooms.length} rooms.`}`;

  return (
    <>
      <NestedHeader title={name} kicker="Room" backLabel="Summary" onBack={back} />
      <main className="main">
        <div className="stack g16">
          <section className="card pad stack g12">
            <div className="stack g2">
              <div className="big">{money(agg.total)}</div>
              <div className="t16 muted">{shareText}</div>
            </div>
            <SplitBars segs={sp.segs} thick />
            <SplitRows rows={sp.rows} />
          </section>

          {cats.rows.length > 0 && (
            <section className="card pad stack g12">
              <h2 className="h-section">By category</h2>
              {cats.rows.map((c) => (
                <div key={c.name} className="stack g8">
                  <div className="row between g8 t16">
                    <span>{c.name}</span>
                    <span className="num nowrap"><span className="b8">{money(c.sum)}</span><span className="muted">, {pct(c.sum, agg.total)}%</span></span>
                  </div>
                  <div className="hbar" style={{ width: `${(c.sum / cats.max) * 100}%`, background: TYPE_COLORS[c.type] }} />
                </div>
              ))}
            </section>
          )}

          {mats.length > 0 && (
            <section className="card pad stack g12">
              <h2 className="h-section">Raw materials, after returns</h2>
              {mats.map((m) => (
                <div key={m.name} className="row between g12" style={{ alignItems: 'flex-start' }}>
                  <div className="stack g2" style={{ minWidth: 0 }}>
                    <span className="t17 b7">{m.name}</span>
                    <span className="t15 muted">{m.notes.join('; ')}{m.returns ? `${m.notes.length ? '. ' : ''}${plural(m.returns, 'return', 'returns')} taken off` : ''}</span>
                  </div>
                  <span className="amount">{money(m.sum)}</span>
                </div>
              ))}
            </section>
          )}

          {agg.es.length > 0 && (
            <section className="stack g8">
              <h2 className="group-label">Every entry for this room</h2>
              <div className="list">
                {sortByDateDesc(agg.es).map((e) => (
                  <ExpenseRow key={e.id} {...rowInfo(e, active, 'room', crewName)} onOpen={() => nav({ screen: 'entry', entryId: e.id, entryBack: 'room' })} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
