import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEMO, FAMILY } from '../config';
import { TEXT_SIZES } from '../lib/constants';
import type { CrewChoice } from '../lib/derive';
import { today } from '../lib/format';
import { storeMode, storeReady } from '../lib/store';
import { emptySnapshot } from '../lib/store/types';
import { getFamilyCode, setFamilyCode } from '../lib/store/familyCode';
import type { FileRef, RowOf, Snapshot, Table } from '../lib/types';

export type Screen = 'who' | 'tasks' | 'add' | 'return' | 'list' | 'entry' | 'bin' | 'insights' | 'room' | 'media' | 'workers';
export const TABS: Screen[] = ['tasks', 'list', 'insights', 'workers'];

export interface Ui {
  screen: Screen;
  step: number;
  sub: boolean;
  done: boolean;
  moreOpen: boolean;
  retStep: 1 | 2;
  retDone: boolean;
  entryId: string | null;
  entryBack: Screen;
  room: string | null;
  flowFrom: Screen;
}

export type DateMode = 'today' | 'yesterday' | 'pick';

export interface Draft {
  amount: string;
  cat: string | null;
  other: string;
  matType: string | null;
  matNote: string;
  room: string | null;
  crew: CrewChoice;
  date: string;
  dateMode: DateMode;
  paidBy: string | null;
  payee: string;
  mode: string | null;
  note: string;
  receipts: FileRef[];
  editingId: string | null;
  fromReview: boolean;
  /** Shown on the "Expense saved" screen. */
  savedText: string;
  linkedText: string;
}

export interface ReturnDraft {
  of: string | null;
  amount: string;
  what: string;
  date: string;
  dateMode: DateMode;
  filter: 'mat' | 'all';
  lastText: string;
  lastNet: string;
  lastOf: string | null;
}

export interface SheetSpec {
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm?: () => void;
  closeLabel: string;
  photo?: { name: string; url: string | null };
}

export interface Toast {
  msg: string;
  undo?: () => void;
}

export const blankDraft = (keep?: { date: string; dateMode: DateMode }): Draft => ({
  amount: '', cat: null, other: '', matType: null, matNote: '', room: null, crew: undefined,
  date: keep?.date ?? today(), dateMode: keep?.dateMode ?? 'today',
  paidBy: null, payee: '', mode: null, note: '', receipts: [], editingId: null, fromReview: false, savedText: '', linkedText: ''
});

export const blankReturn = (): ReturnDraft => ({
  of: null, amount: '', what: '', date: today(), dateMode: 'today', filter: 'mat', lastText: '', lastNet: '', lastOf: null
});

const initialUi: Ui = {
  screen: 'who', step: 1, sub: false, done: false, moreOpen: false, retStep: 1, retDone: false,
  entryId: null, entryBack: 'list', room: null, flowFrom: 'tasks'
};

const LS = { user: 'renovation-last-user', size: 'renovation-text-size' };
const lsGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

function useAppState() {
  // ---- data ----
  const [data, setData] = useState<Snapshot>(emptySnapshot());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needCode, setNeedCode] = useState(!DEMO && !getFamilyCode());
  const pending = useRef(0);

  const reload = useCallback(async () => {
    if (pending.current > 0) return;
    try {
      const snap = await (await storeReady).load();
      setData(snap);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (needCode) { setLoading(false); return; }
    reload();
    const onVis = () => { if (document.visibilityState === 'visible') reload(); };
    document.addEventListener('visibilitychange', onVis);
    const timer = window.setInterval(() => { if (!DEMO && document.visibilityState === 'visible') reload(); }, 30000);
    return () => { document.removeEventListener('visibilitychange', onVis); window.clearInterval(timer); };
  }, [needCode, reload]);

  // ---- toast ----
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const flash = useCallback((msg: string, undo?: () => void) => {
    window.clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  }, []);
  const runUndo = useCallback(() => {
    const u = toast?.undo;
    window.clearTimeout(toastTimer.current);
    setToast(null);
    u?.();
  }, [toast]);

  const put = useCallback(<T extends Table>(table: T, rows: RowOf<T>[]) => {
    setData((d) => {
      const list = (d[table] as RowOf<T>[]).slice();
      rows.forEach((row) => {
        const i = list.findIndex((x) => x.id === row.id);
        if (i >= 0) list[i] = row;
        else list.unshift(row);
      });
      return { ...d, [table]: list };
    });
    pending.current += 1;
    storeReady.then((st) => st.save(table, rows))
      .catch(() => { flash("Couldn't save. Check your internet and try again."); })
      .finally(() => { pending.current -= 1; if (pending.current === 0 && !DEMO) reload(); });
  }, [flash, reload]);

  const removeRows = useCallback((table: Table, ids: string[]) => {
    setData((d) => ({ ...d, [table]: (d[table] as { id: string }[]).filter((x) => !ids.includes(x.id)) }));
    pending.current += 1;
    storeReady.then((st) => st.remove(table, ids))
      .catch(() => flash("Couldn't save. Check your internet and try again."))
      .finally(() => { pending.current -= 1; });
  }, [flash]);

  const resetDemo = useCallback(async () => {
    setData(await (await storeReady).reset());
    flash('Demo reset');
  }, [flash]);

  // ---- people and text size ----
  const [me, setMeState] = useState<string>(() => {
    const last = lsGet(LS.user);
    return last && FAMILY.includes(last) ? last : FAMILY[0];
  });
  const [lastUser, setLastUser] = useState<string | null>(() => lsGet(LS.user));
  const setMe = useCallback((p: string) => { setMeState(p); setLastUser(p); lsSet(LS.user, p); }, []);

  const [textSize, setTextSizeState] = useState<string>(() => lsGet(LS.size) || 'normal');
  useEffect(() => {
    const scale = TEXT_SIZES.find((s) => s.id === textSize)?.scale ?? 1;
    document.documentElement.style.fontSize = `${16 * scale}px`;
  }, [textSize]);
  const setTextSize = useCallback((id: string) => { setTextSizeState(id); lsSet(LS.size, id); }, []);

  const submitCode = useCallback(async (code: string) => {
    setFamilyCode(code);
    try {
      const ok = await (await storeReady).checkCode();
      if (ok) { setNeedCode(false); setLoading(true); }
      return ok;
    } catch {
      return false;
    }
  }, []);

  // ---- navigation (mirrors browser history so the phone's back gesture works) ----
  const [ui, setUi] = useState<Ui>(initialUi);
  const stack = useRef<Ui[]>([initialUi]);
  const idx = useRef(0);
  const pendingTarget = useRef<Ui | null>(null);
  const pendingThen = useRef<(() => void) | null>(null);
  const flowBase = useRef(0);
  const flowBaseUi = useRef<Ui>({ ...initialUi, screen: 'tasks' });
  const uiRef = useRef(ui);
  uiRef.current = ui;

  useEffect(() => {
    history.replaceState({ i: 0 }, '');
    const onPop = (e: PopStateEvent) => {
      const i = typeof e.state?.i === 'number' ? e.state.i : 0;
      idx.current = i;
      stack.current.length = i + 1;
      if (pendingTarget.current) {
        stack.current[i] = pendingTarget.current;
        pendingTarget.current = null;
      }
      const next = stack.current[i] ?? initialUi;
      uiRef.current = next;
      setUi(next);
      const then = pendingThen.current;
      pendingThen.current = null;
      then?.();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const nav = useCallback((patch: Partial<Ui>, mode: 'push' | 'replace' = 'push') => {
    const next = { ...uiRef.current, ...patch };
    if (mode === 'push') {
      idx.current += 1;
      stack.current.length = idx.current;
      stack.current.push(next);
      history.pushState({ i: idx.current }, '');
    } else {
      stack.current[idx.current] = next;
      history.replaceState({ i: idx.current }, '');
    }
    uiRef.current = next;
    setUi(next);
  }, []);

  /** Jump back to an earlier history entry, show `target` there, then run `then`. */
  const rewindTo = useCallback((base: number, target: Ui, then?: () => void) => {
    const steps = idx.current - base;
    if (steps > 0) {
      pendingTarget.current = target;
      pendingThen.current = then ?? null;
      history.go(-steps);
    } else {
      stack.current[idx.current] = target;
      history.replaceState({ i: idx.current }, '');
      uiRef.current = target;
      setUi(target);
      then?.();
    }
  }, []);

  const back = useCallback(() => {
    if (idx.current > 0) history.back();
  }, []);

  const goTab = useCallback((screen: Screen) => {
    rewindTo(0, { ...initialUi, screen });
  }, [rewindTo]);

  // ---- flows ----
  const [draft, setDraftState] = useState<Draft>(blankDraft());
  const setDraft = useCallback((p: Partial<Draft> | ((d: Draft) => Partial<Draft>)) =>
    setDraftState((d) => ({ ...d, ...(typeof p === 'function' ? p(d) : p) })), []);
  const [ret, setRetState] = useState<ReturnDraft>(blankReturn());
  const setRet = useCallback((p: Partial<ReturnDraft>) => setRetState((r) => ({ ...r, ...p })), []);

  const markFlowBase = () => {
    flowBase.current = idx.current;
    flowBaseUi.current = uiRef.current;
  };
  const inFlow = () => uiRef.current.screen === 'add' || uiRef.current.screen === 'return';

  /** Opens the Add expense flow. Inside a flow (e.g. "Add replacement") it replaces the current screen. */
  const startAdd = useCallback((patch?: Partial<Draft>, step = 1) => {
    const within = inFlow();
    if (!within) markFlowBase();
    setDraftState((d) => ({ ...blankDraft({ date: d.date, dateMode: d.dateMode }), ...(patch || {}) }));
    nav({ screen: 'add', step, sub: false, done: false, moreOpen: false, flowFrom: flowBaseUi.current.screen }, within ? 'replace' : 'push');
  }, [nav]);

  const startReturn = useCallback((of?: string) => {
    if (!inFlow()) markFlowBase();
    setRetState({ ...blankReturn(), of: of ?? null });
    nav({ screen: 'return', retStep: of ? 2 : 1, retDone: false, flowFrom: flowBaseUi.current.screen });
  }, [nav]);

  /** Leaves a flow and returns to the screen it was opened from. */
  const exitFlow = useCallback(() => {
    setDraftState((d) => blankDraft({ date: d.date, dateMode: d.dateMode }));
    setRetState(blankReturn());
    setSheet(null);
    rewindTo(flowBase.current, flowBaseUi.current);
  }, [rewindTo]);

  /** After saving: drop the flow's steps from history, then show the result screen on top of the starting screen. */
  const finishFlow = useCallback((patch: Partial<Ui>) => {
    rewindTo(flowBase.current, flowBaseUi.current, () => nav(patch, 'push'));
  }, [rewindTo, nav]);

  // ---- sheet ----
  const [sheet, setSheet] = useState<SheetSpec | null>(null);

  const active = useMemo(() => data.expenses.filter((e) => !e.deleted), [data.expenses]);

  return {
    mode: storeMode, data, active, loading, loadError, reload, needCode, submitCode, resetDemo,
    put, removeRows, toast, flash, runUndo, sheet, setSheet,
    me, setMe, lastUser, textSize, setTextSize,
    ui, nav, back, goTab, startAdd, startReturn, exitFlow, finishFlow,
    draft, setDraft, ret, setRet
  };
}

export type AppState = ReturnType<typeof useAppState>;
const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const value = useAppState();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}
