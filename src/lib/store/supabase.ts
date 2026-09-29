import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../config';
import type { RowOf, Snapshot, Table } from '../types';
import { getFamilyCode } from './familyCode';
import type { Store } from './types';

/** Field names that don't follow the plain camelCase → snake_case rule. */
const RENAME: Record<string, string> = { by: 'added_by', start: 'start_date', end: 'end_date' };
const BACK: Record<string, string> = Object.fromEntries(Object.entries(RENAME).map(([k, v]) => [v, k]));
const NUMERIC = new Set(['amount', 'people', 'rate']);

const toSnake = (k: string) => RENAME[k] ?? k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
const toCamel = (k: string) => BACK[k] ?? k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

export const toRow = (obj: object) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => [toSnake(k), v]));

export const fromRow = <T>(row: Record<string, unknown>): T =>
  Object.fromEntries(
    Object.entries(row)
      .filter(([k]) => k !== 'created_at' && k !== 'updated_at')
      .map(([k, v]) => [toCamel(k), NUMERIC.has(toCamel(k)) && v !== null ? Number(v) : v])
  ) as T;

const TABLES: Table[] = ['expenses', 'crews', 'tasks', 'photos', 'settings'];

/** Live store: shared data in Supabase, guarded by the family code header. */
export function supabaseStore(): Store {
  let client: SupabaseClient | null = null;
  let clientCode = '';
  const db = () => {
    const code = getFamilyCode();
    if (!client || code !== clientCode) {
      clientCode = code;
      client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { 'x-family-key': code } }
      });
    }
    return client;
  };

  return {
    mode: 'live',
    async load() {
      const results = await Promise.all(TABLES.map((t) => db().from(t).select('*').order('created_at', { ascending: false })));
      const snap = {} as Snapshot;
      results.forEach((r, i) => {
        if (r.error) throw r.error;
        (snap as unknown as Record<string, unknown[]>)[TABLES[i]] = (r.data ?? []).map((row) => fromRow(row as Record<string, unknown>));
      });
      return snap;
    },
    async save<T extends Table>(table: T, rows: RowOf<T>[]) {
      if (!rows.length) return;
      const { error } = await db().from(table).upsert(rows.map(toRow));
      if (error) throw error;
    },
    async remove(table, ids) {
      if (!ids.length) return;
      const { error } = await db().from(table).delete().in('id', ids);
      if (error) throw error;
    },
    async checkCode() {
      const { data, error } = await db().rpc('check_family_code');
      if (error) throw error;
      return data === true;
    },
    async reset() {
      return this.load();
    }
  };
}
