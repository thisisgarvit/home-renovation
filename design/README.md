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
| | 4. When (Today / Yesterday / Other day) + Paid by (defaults to current user), paid to, mode, note, receipt photo (camera or gallery) | `AddWhen` |
| | 5. Check and save, each line has "Change"; shows the crew it will count towards | `AddReview` |
| | Saved ("Counted in Ramesh's team's payments") → Add another / See expenses | `AddDone` |
| | Return R1: pick the bill | `ReturnPick` |
| | Return R2: amount back (≤ bill's net) + what was returned + date | `ReturnAmount` |
| | Return saved → "Add replacement" (prefilled category, material, room, crew) | `ReturnDone` |
| Expenses | List grouped by Date / Room / Category, net subtotals; link to Recently deleted | `List` |
| | Recently deleted: who deleted what and when, Restore on each (restores linked returns too) | `Deleted` |
| | Entry detail: fields, linked returns, net, receipt photos (+ add later), history (added / edited / receipt added / deleted / restored, by whom and when), record return, edit, delete (two-tap, soft) | `Entry` |
| Insights | Net spent, budget meter, Photos & receipts link, this week, returned; stacked bars by room (split by type) with shared costs separate; type split; weekly columns | `Insights` |
| | Room breakdown: share + rank, type split, categories, materials after returns, all entries | `Room` |
| | Photos & receipts: grid filtered All / Receipts / Site photos; receipt opens its expense; "Add a site photo" | `Media` |
| Workers | Crew: status, days worked / holidays / total, calendar (tap = holiday), mark Sundays off, earned vs paid vs still to pay, payments list read-only from Expenses | `Workers` |
| | "Work has finished" → last working day → crew closed (can reopen) | `WorkersFinish` |
| | New crew: name, category, people, ₹/person/day, start date (no end date) | `WorkersNew` |

## Data model (as prototyped)

- **Entry**: `id, kind (expense|return), date, amount (return is negative), cat, other, matType, matNote, room, crewId, paidBy, payee, mode, note, by, returnOf, receipts[], deleted, history[]`.
  - `by` is the person using the app; `paidBy` is whose money it was (Garvit / Manmohan / Rekha).
  - `history` holds `{what: Added|Edited|Receipt added|Deleted|Restored, by, at}`.
  - **Soft delete**: `deleted = {by, at, with}` hides the entry from every total and list except Recently deleted. Deleting a bill also marks its returns (`with` = bill id); restoring the bill brings them back. Nothing is ever hard-deleted from the app.
  - `receipts` holds `{id, name, by, at}` plus, in the build, the Google Drive file id and thumbnail link.
- **Photo** (site photo, not tied to an expense): `id, name, room?, date, by` + Drive file id.
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
- **Receipts and photos go to one family Google Drive folder, uploaded by the server.** There's no sign-in, so users can't authorise Drive themselves. The server holds a single OAuth refresh token (Garvit's Google account, authorised once) and uploads into a fixed folder. A service account won't work with a personal Gmail: service accounts have no Drive storage of their own outside a Workspace shared drive. Photos should be compressed on the phone before upload.
- **Chart colours** (Labour `#2a78d6`, Raw material `#c2562b`, Designer `#1f8a70`, Other `#8a5bb8`) pass colour-blind separation and 3:1 contrast checks. Every colour also has a text label.
- **Look ("easy on the eyes")**:
  - Soft stone page `#F3F1EC`, borderless white cards with a faint shadow, charcoal text `#2A2E33`, secondary text `#5B6167`.
  - One calm slate-teal accent `#34505C` for buttons, progress and selected-state borders. Selected options use a light tint (`#E4ECEE`) rather than a solid black fill.
  - Every text pair is at least 5:1 contrast.
  - Type: Atkinson Hyperlegible (designed for low-vision readers) at 14–16 px for UI text, Fraunces only for headings and big numbers.
  - Categories are grouped (Things you bought / Labour / Services & travel) instead of one wall of 15 tiles.

## Not in this phase

Sign-in, offline entry, Hindi labels, phone numbers / tap-to-call, Excel export, automatic tasks.

## Open for the build

Backend for shared data; Google Drive upload service (see above); per-room budgets.
