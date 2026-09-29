import { useState, type ReactNode } from 'react';
import { useApp } from '../app/state';
import { dayLabel, longDate, today, daysAgo } from '../lib/format';
import { photoUrl, savePhoto } from '../lib/photos';
import type { FileRef } from '../lib/types';
import { Camera, Check, ChevronLeft, ChevronRight, Receipt } from './Icons';

// ---- header ----

export function TopHeader({ title }: { title: string }) {
  const { me, nav } = useApp();
  return (
    <header className="hdr">
      <div className="hdr-top">
        <h1>{title}</h1>
        <button type="button" className="user-chip" aria-label={`Using the app as ${me}. Switch person or text size`} onClick={() => nav({ screen: 'who' })}>
          <span className="avatar">{me[0]}</span>
          <span>{me}</span>
        </button>
      </div>
    </header>
  );
}

export function NestedHeader(props: {
  title: string;
  kicker?: string;
  backLabel?: string;
  onBack?: () => void;
  onCancel?: () => void;
  progress?: { n: number; of: number };
}) {
  const { me, nav } = useApp();
  return (
    <header className="hdr">
      <div className="hdr-nav">
        <div className="row">
          {props.onBack && (
            <button type="button" className="back-btn" onClick={props.onBack}>
              <ChevronLeft />
              <span>{props.backLabel ?? 'Back'}</span>
            </button>
          )}
        </div>
        {props.onCancel ? (
          <button type="button" className="text-btn t17" onClick={props.onCancel}>Cancel</button>
        ) : (
          <button type="button" className="icon-btn" aria-label={`Using the app as ${me}. Switch person or text size`} onClick={() => nav({ screen: 'who' })}>
            <span className="avatar">{me[0]}</span>
          </button>
        )}
      </div>
      <div className="stack g2">
        {props.kicker && <div className="kicker">{props.kicker}</div>}
        <h1 className="hdr-title">{props.title}</h1>
      </div>
      {props.progress && (
        <div className="progress" aria-hidden="true">
          {Array.from({ length: props.progress.of }, (_, i) => <span key={i} className={i < props.progress!.n ? 'on' : ''} />)}
        </div>
      )}
    </header>
  );
}

// ---- controls ----

export function Choice(props: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  hint?: string;
  variant?: 'tile' | 'pill' | 'pill-sm' | 'center';
}) {
  const v = props.variant ?? 'tile';
  const cls = ['choice', props.on && 'on', (v === 'pill' || v === 'pill-sm') && 'pill', v === 'pill-sm' && 'sm', v === 'center' && 'centered'].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} aria-pressed={props.on} onClick={props.onClick}>
      {props.on && <span className="check"><Check size={v === 'tile' ? 18 : 16} /></span>}
      {props.hint !== undefined ? (
        <span className="stack g2">
          <span>{props.children}</span>
          {props.hint && <span className="hint">{props.hint}</span>}
        </span>
      ) : (
        <span>{props.children}</span>
      )}
    </button>
  );
}

export function Segmented<T extends string>(props: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={props.label} style={{ gridTemplateColumns: `repeat(${props.options.length}, minmax(0, 1fr))` }}>
      {props.options.map(([id, label]) => (
        <button key={id} type="button" className={props.value === id ? 'on' : ''} aria-pressed={props.value === id} onClick={() => props.onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function DateChoice(props: {
  date: string;
  mode: 'today' | 'yesterday' | 'pick';
  onChange: (p: { date?: string; dateMode: 'today' | 'yesterday' | 'pick' }) => void;
  pickLabel?: string;
}) {
  const t = today();
  const opts: ['today' | 'yesterday' | 'pick', string, string | null][] = [['today', 'Today', t], ['yesterday', 'Yesterday', daysAgo(1)], ['pick', 'Other day', null]];
  return (
    <div className="stack g8">
      <div className="grid3">
        {opts.map(([id, label, val]) => (
          <Choice key={id} variant="center" on={props.mode === id} onClick={() => props.onChange(val ? { dateMode: id, date: val } : { dateMode: id })}>
            {label}
          </Choice>
        ))}
      </div>
      {props.mode === 'pick' ? (
        <label className="stack g8">
          <span className="label">{props.pickLabel ?? 'Choose the date'}</span>
          <input className="input" type="date" value={props.date} max={t} onChange={(e) => props.onChange({ date: e.target.value || t, dateMode: 'pick' })} />
        </label>
      ) : (
        <div className="t16 muted">{longDate(props.date)}</div>
      )}
    </div>
  );
}

export function PhotoUpload(props: { folder: 'receipts' | 'site'; onSaved: (ref: FileRef) => void; label?: string }) {
  const { me, flash } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <label className={`upload${busy ? ' busy' : ''}`}>
      <Camera />
      <span>{busy ? 'Saving photo…' : props.label ?? 'Add photo'}</span>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setBusy(true);
          try {
            props.onSaved(await savePhoto(file, me, props.folder));
          } catch {
            flash('Not uploaded. Check your internet and try again.');
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}

export function FileThumb({ file }: { file: { provider: string; fileId: string | null; name: string } }) {
  const url = photoUrl(file);
  return <span className="rthumb">{url ? <img src={url} alt="" loading="lazy" /> : <Receipt />}</span>;
}

export function ExpenseRow(props: {
  title: string;
  sub: string;
  amount: string;
  isReturn?: boolean;
  tag?: string;
  onOpen: () => void;
}) {
  return (
    <button type="button" className="row-btn" onClick={props.onOpen}>
      <span className="stack g2 grow">
        <span className="row wrap g8">
          <span className="row-title">{props.title}</span>
          {props.tag && <span className={`tag${props.isReturn ? ' return' : ''}`}>{props.tag}</span>}
        </span>
        <span className="row-sub">{props.sub}</span>
      </span>
      <span className={`amount${props.isReturn ? ' return' : ''}`}>{props.amount}</span>
    </button>
  );
}

export function NavRow({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="nav-row" onClick={onClick}>
      <span>{children}</span>
      <ChevronRight />
    </button>
  );
}

export function DoneHero({ title, lines }: { title: string; lines: { text: string; strong?: boolean; muted?: boolean }[] }) {
  return (
    <div className="done-hero">
      <div className="badge"><Check size={36} /></div>
      <h2>{title}</h2>
      {lines.filter((l) => l.text).map((l, i) => (
        <p key={i} className={`${l.strong ? 'b7 ' : ''}${l.muted ? 'muted t16' : 't17'} pretty`}>{l.text}</p>
      ))}
    </div>
  );
}

export const whenLabel = (date: string) => dayLabel(date);
