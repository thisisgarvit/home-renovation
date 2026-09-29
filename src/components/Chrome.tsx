import type { ReactNode } from 'react';
import { TABS, useApp, type Screen } from '../app/state';
import { Image, Plus, TabList, TabSummary, TabTasks, TabWorkers } from './Icons';

const TAB_META: Record<string, { label: string; icon: ReactNode }> = {
  tasks: { label: 'Tasks', icon: <TabTasks /> },
  list: { label: 'Expenses', icon: <TabList /> },
  insights: { label: 'Summary', icon: <TabSummary /> },
  workers: { label: 'Workers', icon: <TabWorkers /> }
};

const TAB_OF: Partial<Record<Screen, Screen>> = {
  tasks: 'tasks', list: 'list', bin: 'list', entry: 'list', insights: 'insights', room: 'insights', media: 'insights', workers: 'workers'
};

export function TabBar() {
  const { ui, goTab } = useApp();
  const current = TAB_OF[ui.screen];
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <button key={t} type="button" className={`tab${current === t ? ' on' : ''}`} aria-current={current === t ? 'page' : undefined} onClick={() => goTab(t)}>
          <span className="pill">{TAB_META[t].icon}</span>
          <span>{TAB_META[t].label}</span>
        </button>
      ))}
    </nav>
  );
}

export function BottomBar(props: {
  hint?: string;
  primary: { label: string; onClick: () => void; disabled?: boolean; plus?: boolean };
  secondary?: { label: string; onClick: () => void };
  solid?: boolean;
}) {
  return (
    <div className={`bar${props.solid ? ' solid' : ''}`}>
      {props.hint && <div className="t15 muted center" role="status">{props.hint}</div>}
      <div className="row g12">
        {props.secondary && (
          <button type="button" className="btn btn-outline" onClick={props.secondary.onClick}>{props.secondary.label}</button>
        )}
        <button type="button" className="btn btn-primary" disabled={props.primary.disabled} onClick={props.primary.onClick}>
          {props.primary.plus && <Plus />}
          <span>{props.primary.label}</span>
        </button>
      </div>
    </div>
  );
}

export function ToastView({ bottom }: { bottom: string }) {
  const { toast, runUndo } = useApp();
  if (!toast) return null;
  return (
    <div className="toast" role="status" style={{ bottom }}>
      <span>{toast.msg}</span>
      {toast.undo && <button type="button" onClick={runUndo}>Undo</button>}
    </div>
  );
}

export function SheetView() {
  const { sheet, setSheet } = useApp();
  if (!sheet) return null;
  const url = sheet.photo?.url ?? null;
  return (
    <div className="backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSheet(null); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="grab" />
        <h2 id="sheet-title">{sheet.title}</h2>
        {sheet.photo && (
          <div className="photo-view">
            {url ? <img src={url} alt={sheet.photo.name} /> : <><Image size={40} /><span className="t15 b7">{sheet.photo.name}</span></>}
          </div>
        )}
        {sheet.body && <p className="t17 muted pretty">{sheet.body}</p>}
        <div className="stack g8">
          {sheet.onConfirm && (
            <button type="button" className={`btn ${sheet.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { setSheet(null); sheet.onConfirm!(); }}>
              {sheet.confirmLabel}
            </button>
          )}
          <button type="button" className="btn btn-outline" onClick={() => setSheet(null)}>{sheet.closeLabel}</button>
        </div>
      </div>
    </div>
  );
}
