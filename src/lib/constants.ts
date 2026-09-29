import { FAMILY } from '../config';

export type SpendType = 'Labour' | 'Raw material' | 'Interior designer' | 'Other';

export interface Category {
  id: string;
  label: string;
  type: SpendType;
}

export const CATS: Category[] = [
  { id: 'material', label: 'Raw material', type: 'Raw material' },
  { id: 'mistry', label: 'Mistry', type: 'Labour' },
  { id: 'mazdur', label: 'Mazdur', type: 'Labour' },
  { id: 'plumber', label: 'Plumber', type: 'Labour' },
  { id: 'electrician', label: 'Electrician', type: 'Labour' },
  { id: 'painter', label: 'Painter', type: 'Labour' },
  { id: 'carpenter', label: 'Carpenter', type: 'Labour' },
  { id: 'tiler', label: 'Tile fitter', type: 'Labour' },
  { id: 'pop', label: 'POP / false ceiling', type: 'Labour' },
  { id: 'debris', label: 'Debris and cleaning', type: 'Labour' },
  { id: 'designer', label: 'Interior designer', type: 'Interior designer' },
  { id: 'furniture', label: 'Furniture and appliances', type: 'Other' },
  { id: 'transport', label: 'Transport', type: 'Other' },
  { id: 'travel', label: 'Travel', type: 'Other' },
  { id: 'other', label: 'Other', type: 'Other' }
];

export const CAT_BY_ID: Record<string, Category> = Object.fromEntries(CATS.map((c) => [c.id, c]));

export const CAT_GROUPS: [string, string[]][] = [
  ['Things you bought', ['material', 'furniture']],
  ['Labour', ['mistry', 'mazdur', 'plumber', 'electrician', 'painter', 'carpenter', 'tiler', 'pop', 'debris']],
  ['Services and travel', ['designer', 'transport', 'travel', 'other']]
];

/** Categories a daily-wage crew can be tied to. */
export const CREW_CATS = CATS.filter((c) => c.type === 'Labour' && c.id !== 'debris');

export const MATERIALS = ['Tiles', 'Paint', 'Lights', 'Wires and switches', 'Pipes and fittings', 'Cement and sand', 'Plywood', 'Hardware', 'Sanitaryware', 'Other'];

export const PAY_MODES = ['Cash', 'UPI', 'Card', 'Bank'];

export const TASK_PEOPLE = [...FAMILY, 'Designer', 'Mistry', 'Plumber', 'Electrician', 'Painter', 'Carpenter'];

export const TYPES: SpendType[] = ['Labour', 'Raw material', 'Interior designer', 'Other'];

/** Validated for colour-blind separation and 3:1 contrast on white. Keep the order. */
export const TYPE_COLORS: Record<SpendType, string> = {
  Labour: '#2a78d6',
  'Raw material': '#c2562b',
  'Interior designer': '#1f8a70',
  Other: '#8a5bb8'
};

export const TEXT_SIZES: { id: 'normal' | 'large' | 'larger'; label: string; scale: number; sample: number }[] = [
  { id: 'normal', label: 'Normal', scale: 1, sample: 18 },
  { id: 'large', label: 'Large', scale: 1.15, sample: 22 },
  { id: 'larger', label: 'Larger', scale: 1.3, sample: 26 }
];
