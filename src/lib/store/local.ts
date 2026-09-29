import { sampleData } from '../sample';
import type { RowOf, Snapshot, Table } from '../types';
import type { Store } from './types';

const KEY = 'renovation-demo-v1';

const read = (): Snapshot | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Snapshot;
    return { ...s, settings: s.settings ?? [] };
  } catch {
    return null;
  }
};

const write = (s: Snapshot) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage full or blocked: the demo keeps working in memory for this visit.
  }
};

/** Demo store: everything lives in this browser. */
export function localStore(): Store {
  let snap: Snapshot = read() ?? sampleData();
  write(snap);
  return {
    mode: 'demo',
    async load() {
      return structuredClone(snap);
    },
    async save<T extends Table>(table: T, rows: RowOf<T>[]) {
      const list = snap[table] as RowOf<T>[];
      rows.forEach((row) => {
        const i = list.findIndex((x) => x.id === row.id);
        if (i >= 0) list[i] = row;
        else list.unshift(row);
      });
      write(snap);
    },
    async remove(table, ids) {
      (snap[table] as { id: string }[]) = (snap[table] as { id: string }[]).filter((x) => !ids.includes(x.id));
      write(snap);
    },
    async checkCode() {
      return true;
    },
    async reset() {
      snap = sampleData();
      write(snap);
      return structuredClone(snap);
    }
  };
}
