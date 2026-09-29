const env = import.meta.env;

const list = (v: string | undefined, fallback: string[]) => {
  const items = (v || '').split(',').map((s) => s.trim()).filter(Boolean);
  return items.length ? items : fallback;
};

export const SUPABASE_URL = (env.VITE_SUPABASE_URL as string | undefined) || '';
export const SUPABASE_ANON_KEY = (env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';

/** Demo mode keeps everything in this browser with a fictional household. */
export const DEMO = env.VITE_DEMO === 'true' || !SUPABASE_URL || !SUPABASE_ANON_KEY;

export const FAMILY = list(env.VITE_FAMILY as string | undefined, ['Anil', 'Sunita', 'Rohan']);

export const SHARED_ROOM = 'Whole house';
export const ROOMS = [
  ...list(env.VITE_ROOMS as string | undefined, ['Living room', 'Bathroom', "Mother's room", 'Study room', 'Main bedroom', 'Balcony', 'Kitchen'])
    .filter((r) => r !== SHARED_ROOM),
  SHARED_ROOM
];

export const LOCALE = 'en-IN';
