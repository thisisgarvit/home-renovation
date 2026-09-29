export type Provider = 'drive' | 'supabase' | 'local';

export interface HistoryItem {
  what: string;
  by: string;
  at: string;
}

export interface FileRef {
  id: string;
  name: string;
  by: string;
  at: string;
  provider: Provider;
  /** Drive file id, Supabase Storage path, or (demo) a small data URL. */
  fileId: string | null;
}

export interface DeletedMark {
  by: string;
  at: string;
  /** Set when the row was deleted together with the bill it belongs to. */
  with: string | null;
}

export interface Expense {
  id: string;
  kind: 'expense' | 'return';
  date: string;
  /** Negative for returns. */
  amount: number;
  cat: string;
  other: string;
  matType: string | null;
  matNote: string;
  room: string;
  crewId: string | null;
  paidBy: string | null;
  payee: string;
  mode: string | null;
  note: string;
  by: string;
  returnOf: string | null;
  receipts: FileRef[];
  deleted: DeletedMark | null;
  history: HistoryItem[];
  sample?: boolean;
}

export interface Crew {
  id: string;
  trade: string;
  name: string;
  people: number;
  rate: number;
  start: string;
  end: string | null;
  holidays: string[];
  by: string;
  sample?: boolean;
}

export interface Task {
  id: string;
  title: string;
  who: string;
  room: string | null;
  due: string | null;
  done: boolean;
  doneBy: string | null;
  doneAt: string | null;
  by: string;
  sample?: boolean;
}

export interface Photo {
  id: string;
  name: string;
  room: string | null;
  date: string;
  by: string;
  provider: Provider;
  fileId: string | null;
  sample?: boolean;
}

/** Shared key/value settings, e.g. the total budget. */
export interface Setting {
  id: string;
  value: string;
  by: string;
}

export interface Snapshot {
  expenses: Expense[];
  crews: Crew[];
  tasks: Task[];
  photos: Photo[];
  settings: Setting[];
}

export type Table = keyof Snapshot;
export type RowOf<T extends Table> = Snapshot[T][number];
