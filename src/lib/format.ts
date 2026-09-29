import { LOCALE } from '../config';

export const iso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const today = () => iso(new Date());
export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const daysAgo = (n: number) => addDays(today(), -n);
export const diffDays = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);

export const short = (s: string) => parse(s).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
export const longDate = (s: string) => parse(s).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
export const dayLabel = (s: string) => {
  const diff = diffDays(s, today());
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  return parse(s).toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
};
export const stamp = (at: string) =>
  new Date(at).toLocaleString(LOCALE, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const nowIso = () => new Date().toISOString();

/** Monday of the week containing the date. */
export const weekStart = (s: string) => {
  const d = parse(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
};

export const money = (n: number) => {
  const r = Math.round(Math.abs(n)).toLocaleString(LOCALE);
  return (n < 0 ? '−₹' : '₹') + r;
};

/** Digits typed into an amount field, shown with Indian grouping. */
export const grouped = (raw: string) => {
  if (!raw) return '';
  const [whole, dec] = raw.split('.');
  const w = whole ? Number(whole).toLocaleString(LOCALE) : '0';
  return dec !== undefined ? `${w}.${dec.slice(0, 2)}` : w;
};

export const cleanAmount = (v: string) => {
  let s = v.replace(/[^0-9.]/g, '');
  const i = s.indexOf('.');
  if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '').slice(0, 2);
  return s.replace(/^0+(?=\d)/, '');
};

export const lakhHint = (amt: number) => (amt >= 100000 ? `${(amt / 100000).toFixed(2).replace(/\.?0+$/, '')} lakh rupees` : '');

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const ordinal = (n: number) => {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return n + (n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th');
};

export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
