import { useState } from 'react';
import { useApp } from '../app/state';
import { BottomBar } from '../components/Chrome';
import { Check } from '../components/Icons';
import { Choice, Segmented, TopHeader } from '../components/ui';
import { ROOMS } from '../config';
import { TASK_PEOPLE } from '../lib/constants';
import { dayLabel, diffDays, short, today, uid } from '../lib/format';
import type { Task } from '../lib/types';
import { SampleBanner } from './shared';

const blankTask = () => ({ title: '', who: null as string | null, room: null as string | null, due: '' });

export function Tasks() {
  const { data, put, me, flash, startAdd } = useApp();
  const [draft, setDraft] = useState(blankTask());
  const [group, setGroup] = useState<'who' | 'room'>('who');
  const [showDone, setShowDone] = useState(false);
  const t0 = today();

  const toggle = (t: Task) => {
    const next: Task = t.done ? { ...t, done: false, doneBy: null, doneAt: null } : { ...t, done: true, doneBy: me, doneAt: t0 };
    put('tasks', [next]);
    if (!t.done) flash('Marked done', () => put('tasks', [t]));
  };

  const open = data.tasks.filter((t) => !t.done);
  const done = data.tasks.filter((t) => t.done).sort((a, b) => ((a.doneAt ?? '') < (b.doneAt ?? '') ? 1 : -1));
  const overdue = (t: Task) => !t.done && !!t.due && t.due < t0;
  const key = (t: Task) => (group === 'who' ? t.who : t.room || 'No room');
  const groups = new Map<string, Task[]>();
  open.slice().sort((a, b) => ((a.due || '9999') < (b.due || '9999') ? -1 : 1)).forEach((t) => {
    const k = key(t);
    groups.set(k, [...(groups.get(k) ?? []), t]);
  });
  const ordered = Array.from(groups, ([k, items]) => ({ k, items, late: items.some(overdue) }))
    .sort((a, b) => Number(b.late) - Number(a.late) || b.items.length - a.items.length);
  const nOverdue = open.filter(overdue).length;

  const dueText = (t: Task) => {
    if (!t.due) return '';
    const d = diffDays(t0, t.due);
    return d < 0 ? `was due ${short(t.due)}` : d === 0 ? 'due today' : `due ${dayLabel(t.due)}`;
  };

  const canAdd = draft.title.trim().length > 0 && !!draft.who;
  const add = () => {
    if (!canAdd) return;
    put('tasks', [{ id: uid(), title: draft.title.trim(), who: draft.who!, room: draft.room, due: draft.due || null, done: false, doneBy: null, doneAt: null, by: me }]);
    setDraft(blankTask());
    flash('Task added');
  };

  const row = (t: Task) => {
    const sub = t.done
      ? `Done by ${t.doneBy ?? 'someone'} on ${t.doneAt ? short(t.doneAt) : ''}`
      : [group === 'who' ? t.room : t.who, dueText(t)].filter(Boolean).join(', ');
    return (
      <div key={t.id} className={`task${t.done ? ' done' : ''}`}>
        <button type="button" className={`tick${t.done ? ' on' : ''}`} aria-pressed={t.done} aria-label={`${t.done ? 'Mark as not done' : 'Mark done'}: ${t.title}`} onClick={() => toggle(t)}>
          <span><Check /></span>
        </button>
        <div className="stack g4 grow" style={{ padding: '0.25rem 0' }}>
          <span className="row-title">{t.title}</span>
          <span className="row wrap g8 row-sub">
            {overdue(t) && <span className="tag overdue">Overdue</span>}
            <span>{sub}</span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <TopHeader title="Tasks" />
      <main className="main">
        <div className="stack g16">
          <div className="t16 b7 muted">{open.length} to do{nOverdue ? `, ${nOverdue} overdue` : ''}</div>
          <SampleBanner />
          <form className="card pad stack g12" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <label className="stack g8">
              <span className="label">New task</span>
              <input className="input" placeholder="e.g. Order the kitchen sink" value={draft.title} enterKeyHint="done" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </label>
            {draft.title.trim() && (
              <div className="stack g16">
                <div className="stack g8">
                  <div id="twho" className="label">Who needs to do it?</div>
                  <div role="group" aria-labelledby="twho" className="row wrap g8">
                    {TASK_PEOPLE.map((p) => <Choice key={p} variant="pill-sm" on={draft.who === p} onClick={() => setDraft({ ...draft, who: p })}>{p}</Choice>)}
                  </div>
                </div>
                <div className="stack g8">
                  <div id="troom" className="label">Room <span className="optional">(optional)</span></div>
                  <div role="group" aria-labelledby="troom" className="row wrap g8">
                    {ROOMS.map((r) => <Choice key={r} variant="pill-sm" on={draft.room === r} onClick={() => setDraft({ ...draft, room: draft.room === r ? null : r })}>{r}</Choice>)}
                  </div>
                </div>
                <label className="row between g12">
                  <span className="label">Due by <span className="optional">(optional)</span></span>
                  <input className="input sm" style={{ width: 'auto' }} type="date" min={t0} value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} />
                </label>
                {!canAdd && <p className="t15 muted">Choose who needs to do it.</p>}
                <div className="grid2" style={{ gap: '0.75rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setDraft(blankTask())}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={!canAdd}>Add task</button>
                </div>
              </div>
            )}
          </form>

          <Segmented label="Group tasks" value={group} options={[['who', 'By person'], ['room', 'By room']]} onChange={setGroup} />

          {ordered.map((g) => (
            <section key={g.k} className="stack g8">
              <div className="row between">
                <h2 className="group-label">{group === 'who' ? `Waiting on ${g.k}` : g.k}</h2>
                <span className="t15 muted">{g.items.length} to do</span>
              </div>
              <div className="list">{g.items.map(row)}</div>
            </section>
          ))}
          {open.length === 0 && <div className="empty">Nothing to do right now. Add a task above when something comes up.</div>}

          {done.length > 0 && (
            <button type="button" className="dashed t16 b7" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>
              <span>{showDone ? 'Hide' : 'Show'} done tasks ({done.length})</span>
              <span className="muted" style={{ fontSize: '1.375rem', lineHeight: 1 }}>{showDone ? '−' : '+'}</span>
            </button>
          )}
          {showDone && <div className="list">{done.map(row)}</div>}
        </div>
      </main>
      <BottomBar primary={{ label: 'Add expense', plus: true, onClick: () => startAdd() }} />
    </>
  );
}
