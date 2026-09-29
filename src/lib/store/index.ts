import { DEMO } from '../../config';
import { localStore } from './local';
import type { Store } from './types';

export const storeMode: Store['mode'] = DEMO ? 'demo' : 'live';

/** The Supabase client is only downloaded when the app runs against a real database. */
export const storeReady: Promise<Store> = DEMO
  ? Promise.resolve(localStore())
  : import('./supabase').then((m) => m.supabaseStore());

export type { Store } from './types';
