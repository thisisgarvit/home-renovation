import type { RowOf, Snapshot, Table } from '../types';

export interface Store {
  mode: 'demo' | 'live';
  load(): Promise<Snapshot>;
  save<T extends Table>(table: T, rows: RowOf<T>[]): Promise<void>;
  remove(table: Table, ids: string[]): Promise<void>;
  /** Live mode: true when the family code on this device is accepted by the database. */
  checkCode(): Promise<boolean>;
  /** Demo mode: put the sample household back. */
  reset(): Promise<Snapshot>;
}

export const emptySnapshot = (): Snapshot => ({ expenses: [], crews: [], tasks: [], photos: [], settings: [] });
