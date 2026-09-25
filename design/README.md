# Design: Renovation expense tracker

Mobile-first app for a home renovation. It covers the task list, expenses, returns, per-room analytics, and attendance for daily-wage crews. Used by Garvit, Manmohan and Rekha, so the data is stored online and shared.

Live prototype (clickable, private until shared): https://claude.ai/artifact/4TjkwwFLs2GaNNAr7Dp1zU

The `.dc.html` files are the source for that canvas. `Main.dc.html` holds the whole app and its logic; every other artboard imports it with a different `start` screen.

## Screens

| Tab | Screen | Artboard |
|---|---|---|
| (open) | Who is using the app? Garvit / Manmohan / Rekha, asked on every open; last person highlighted | `Main` |
| **Tasks** (home) | Open tasks grouped by person ("Waiting on Plumber") or by room; overdue first; tick to complete (records who ticked it and when); done tasks folded away | `Tasks` |
| | Quick add: title → depends on (family or trade) → optional room → optional due date | `TasksAdd` |
| Add | 1. Amount (+ "Returned something?" link) | `AddAmount` |
| | 2. What was it for (15 categories) | `AddWhat` |
| | 2a. Raw material: type chips + optional detail | `AddMaterial` |
| | 2b. Other: required free text | `AddOther` |
| | 2c. Which crew: shown only when 2+ active crews share the category | `AddCrew` |
| | 3. Which room (7 rooms + Whole house) | `AddWhere` |
| | 4. When (Today / Yesterday / Other day) + Paid by (defaults to current user), paid to, mode, note | `AddWhen` |
| | 5. Check and save, each line has "Change"; shows the crew it will count towards | `AddReview` |
| | Saved ("Counted in Ramesh's team's payments") → Add another / See expenses | `AddDone` |
| | Return R1: pick the bill | `ReturnPick` |
| | Return R2: amount back (≤ bill's net) + what was returned + date | `ReturnAmount` |
| | Return saved → "Add replacement" (prefilled category, material, room, crew) | `ReturnDone` |
| Expenses | List grouped by Date / Room / Category, net subtotals | `List` |
| | Entry detail: fields, linked returns, net, history (added/edited by whom and when), record return, edit, delete (two-tap) | `Entry` |
| Insights | Net spent, budget meter, this week, returned; stacked bars by room (split by type) with shared costs separate; type split; weekly columns | `Insights` |
| | Room breakdown: share + rank, type split, categories, materials after returns, all entries | `Room` |
| Workers | Crew: status, days worked / holidays / total, calendar (tap = holiday), mark Sundays off, earned vs paid vs still to pay, payments list read-only from Expenses | `Workers` |
| | "Work has finished" → last working day → crew closed (can reopen) | `WorkersFinish` |
| | New crew: name, category, people, ₹/person/day, start date (no end date) | `WorkersNew` |

## Data model (as prototyped)

- **Entry**: `id, kind (expense|return), date, amount (return is negative), cat, other, matType, matNote, room, crewId, paidBy, payee, mode, note, by, returnOf, history[]`.
  - `by` is the person using the app; `paidBy` is whose money it was (Garvit / Manmohan / Rekha).
  - `history` holds `{what: Added|Edited, by, at}`. Deletes should be soft and recorded the same way in the build.
  - A return stores `returnOf` and copies `cat, matType, room, crewId` from its bill, so every total is net of returns automatically. A return can't exceed the bill's remaining net. Deleting a bill deletes its returns.
- **Crew**: `id, trade (a labour category), name, people, rate, start, end (null until work finishes), holidays[]`.
  - Payments are expenses whose `crewId` is this crew; they are never entered from Workers.
  - When an expense is saved, `crewId` is resolved from crews with the same category that are active on its date: exactly 1 → linked automatically; 2 or more → asked in step 2c; 0 → none. The user can always pick "Not part of a crew" from review.
  - Earned = (start → end or today, minus holidays) × people × rate.
- **Task**: `id, title, who (Garvit | Manmohan | Rekha | Designer | Mistry | Plumber | Electrician | Painter | Carpenter), room?, due?, done, doneBy, doneAt, by`.
- **Types** used by charts: Labour, Raw material, Interior designer, Other (furniture, transport, travel, other).

## Decisions

- **Tasks is the home screen.** It's what the family checks daily; adding an expense is one tab away.
- **No sign-in in this phase.** A "who is using" picker on every open stamps each action with a name. Choosing a name is not a security boundary.
- **Step-by-step Add, one question per screen.** Designed for Rekha: large targets (48–64 px), a Next button on every step (no auto-advance), and a review screen before saving. The date stays as picked between entries, which speeds up backfilling.
- **Crew payments are recorded only through Expenses.** One source of truth, no double entry.
- **Returns are linked to the original bill**, so room, category and crew can't be mislabelled.
- **Shared costs (Whole house) are shown apart from rooms**, so "which room took the most" isn't swamped by designer fees.
- **Chart colours** (Labour `#2a78d6`, Raw material `#c2562b`, Designer `#1f8a70`, Other `#8a5bb8`) pass colour-blind separation and 3:1 contrast checks. Every colour also has a text label.
- **Look**: warm paper `#F6F2EB`, ink `#1F1C17`, Fraunces for numbers and headings, Instrument Sans for UI text.

## Not in this phase

Sign-in, offline entry, Hindi labels.

## Open for the build

Backend for shared data; soft delete with an activity record; receipt photo; CSV/Excel export; per-room budgets.
