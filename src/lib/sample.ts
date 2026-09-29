import { FAMILY } from '../config';
import { addDays, daysAgo, today, uid } from './format';
import type { Crew, Expense, Photo, Snapshot, Task } from './types';

/**
 * A fictional household for the demo, built around one story:
 * the bathroom is the most expensive room, a floor drain was returned and
 * replaced with a smaller one, and a painting crew is still at work.
 */
export function sampleData(): Snapshot {
  const [a, b, c] = [FAMILY[0], FAMILY[1] ?? FAMILY[0], FAMILY[2] ?? FAMILY[0]];
  const crewId = uid();
  const crews: Crew[] = [{
    id: crewId, trade: 'painter', name: "Ramesh's team", people: 2, rate: 800, by: a, sample: true,
    start: daysAgo(13), end: null, holidays: [daysAgo(7), daysAgo(3)]
  }];

  type Row = [number, number, string, string | null, string, string, string, string, string, string?, boolean?];
  const rows: Row[] = [
    [0, 2400, 'mazdur', null, '2 workers', 'Whole house', 'Cash', b, b],
    [0, 18500, 'material', 'Tiles', 'Anti-skid floor tiles, 14 boxes', 'Bathroom', 'UPI', a, a, 'tiles-invoice.jpg'],
    [1, 4000, 'painter', null, 'Weekly payment', 'Whole house', 'Cash', c, c, undefined, true],
    [1, 3500, 'plumber', null, '', 'Bathroom', 'UPI', a, a],
    [1, 1200, 'transport', null, 'Tempo for tiles', 'Whole house', 'Cash', b, b],
    [2, 45000, 'designer', null, 'Design fee, 2nd instalment', 'Whole house', 'Bank', a, a, 'designer-invoice-2.jpg'],
    [3, 9800, 'material', 'Lights', 'Profile lights and drivers', 'Living room', 'UPI', a, a],
    [3, 6000, 'electrician', null, '', 'Living room', 'UPI', c, a],
    [4, 12500, 'material', 'Paint', 'Emulsion, 20 L', 'Living room', 'UPI', a, a],
    [8, 8000, 'painter', null, 'Advance', 'Whole house', 'Cash', b, b, undefined, true],
    [6, 22000, 'carpenter', null, 'Kitchen shutters', 'Kitchen', 'Cash', c, a],
    [6, 31000, 'material', 'Plywood', 'BWP ply, 8 sheets', 'Kitchen', 'Bank', a, a, 'ply-bill.jpg'],
    [7, 400, 'material', 'Sanitaryware', 'Smaller floor drain', 'Bathroom', 'Cash', a, a],
    [8, 5500, 'mistry', null, '', 'Bathroom', 'Cash', b, b],
    [9, 650, 'travel', null, 'Auto to hardware market', 'Whole house', 'Cash', a, a],
    [10, 14200, 'material', 'Sanitaryware', 'WC, basin and floor drain', 'Bathroom', 'Card', a, a, 'sanitary-bill.jpg'],
    [12, 4000, 'mistry', null, '', 'Balcony', 'Cash', b, b],
    [13, 7400, 'material', 'Tiles', 'Wall cladding', 'Balcony', 'UPI', a, a],
    [15, 3000, 'electrician', null, '', "Mother's room", 'UPI', a, a],
    [16, 6200, 'material', 'Wires and switches', 'Modular switches', "Mother's room", 'UPI', c, c],
    [18, 5000, 'painter', null, 'Study room touch-up', 'Study room', 'Cash', a, a],
    [24, 28000, 'furniture', null, 'Study table and shelf', 'Study room', 'Card', a, a],
    [30, 30000, 'designer', null, 'Design fee, 1st instalment', 'Whole house', 'Bank', c, a],
    [35, 16000, 'material', 'Cement and sand', 'Waterproofing', 'Bathroom', 'Cash', a, a],
    [40, 9000, 'debris', null, 'Demolition debris removal', 'Whole house', 'Cash', c, b]
  ];

  const expenses: Expense[] = rows.map(([ago, amount, cat, matType, matNote, room, mode, paidBy, by, receipt, crew]) => {
    const date = daysAgo(ago);
    const at = `${date}T11:15:00`;
    return {
      id: uid(), kind: 'expense', date, amount, cat, other: '', matType, matNote, room, mode, paidBy, by,
      payee: '', note: '', returnOf: null, crewId: crew ? crewId : null, deleted: null, sample: true,
      receipts: receipt ? [{ id: uid(), name: receipt, by, at, provider: 'local', fileId: null }] : [],
      history: [{ what: 'Added', by, at }]
    };
  });

  const sanitary = expenses.find((e) => e.matNote === 'WC, basin and floor drain')!;
  const retDate = daysAgo(7);
  expenses.push({
    ...sanitary, id: uid(), kind: 'return', date: retDate, amount: -1400, matNote: 'Floor drain (too big)', mode: 'Cash',
    paidBy: null, by: a, returnOf: sanitary.id, receipts: [], history: [{ what: 'Added', by: a, at: `${retDate}T17:40:00` }]
  });

  const dup = expenses.find((e) => e.matNote === 'Tempo for tiles')!;
  const delAt = `${today()}T09:05:00`;
  expenses.push({
    ...dup, id: uid(), deleted: { by: a, at: delAt, with: null },
    history: [...dup.history, { what: 'Deleted', by: a, at: delAt }]
  });

  const t = (title: string, who: string, room: string | null, due: number | null, doneBy?: string, doneAgo?: number): Task => ({
    id: uid(), title, who, room, due: due === null ? null : addDays(today(), due), done: !!doneBy,
    doneBy: doneBy ?? null, doneAt: doneBy ? daysAgo(doneAgo ?? 0) : null, by: a, sample: true
  });
  const tasks: Task[] = [
    t('Leak test the bathroom floor (48 hours of water)', 'Plumber', 'Bathroom', -1),
    t('Finalise kitchen countertop design', 'Designer', 'Kitchen', 3),
    t('Send balcony railing options', 'Designer', 'Balcony', null),
    t('Fix loose switchboard', 'Electrician', "Mother's room", 2),
    t('Second coat in the living room', 'Painter', 'Living room', 5),
    t('Choose curtain fabric', b, 'Main bedroom', null),
    t('Ask society about using the lift for debris', c, 'Whole house', null),
    t('Buy a smaller floor drain', a, 'Bathroom', null, a, 7),
    t('Confirm tile quantity for balcony', 'Mistry', 'Balcony', null, b, 12),
    t('Get paint shade samples', 'Painter', 'Living room', null, c, 5)
  ];

  const photos: Photo[] = [
    { id: uid(), name: 'bathroom-waterproofing.jpg', room: 'Bathroom', date: daysAgo(34), by: a, provider: 'local', fileId: null, sample: true },
    { id: uid(), name: 'kitchen-shutters.jpg', room: 'Kitchen', date: daysAgo(6), by: b, provider: 'local', fileId: null, sample: true },
    { id: uid(), name: 'living-room-shades.jpg', room: 'Living room', date: daysAgo(4), by: c, provider: 'local', fileId: null, sample: true }
  ];

  return { expenses, crews, tasks, photos, settings: [{ id: 'budget', value: '800000', by: a }] };
}
