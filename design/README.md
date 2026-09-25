# Design: Renovation expense tracker

Mobile-first app for logging home-renovation spending and seeing which room, category, material and worker it went to. Used by Garvit and Mom, so the data is stored online and shared.

Live prototype (clickable, private until shared): https://claude.ai/artifact/4TjkwwFLs2GaNNAr7Dp1zU

The `.dc.html` files are the source for that canvas. `Main.dc.html` holds the whole app and its logic; every other artboard imports it with a different `start` screen.

## Screens

| Tab | Screen | Artboard |
|---|---|---|
| Add | 1. Amount (+ "Returned something?" link) | `Main` |
| | 2. What was it for (15 categories) | `AddWhat` |
| | 2a. Raw material: type chips + optional detail | `AddMaterial` |
| | 2b. Other: required free text | `AddOther` |
| | 3. Which room (7 rooms + Whole house) | `AddWhere` |
| | 4. When (Today / Yesterday / Other day) + optional paid to, mode, note | `AddWhen` |
| | 5. Check and save, each line has "Change" | `AddReview` |
| | Saved → Add another / See expenses | `AddDone` |
| | Return R1: pick the bill | `ReturnPick` |
| | Return R2: amount back (≤ bill's net) + what was returned + date | `ReturnAmount` |
| | Return saved → "Add replacement" (prefilled category, material, room) | `ReturnDone` |
| Expenses | List grouped by Date / Room / Category, net subtotals | `List` |
| | Entry detail: fields, linked returns, net, record return, edit, delete (two-tap) | `Entry` |
| Insights | Net spent, budget meter, this week, returned; stacked bars by room (split by type), shared costs separate; type split; weekly columns | `Insights` |
| | Room breakdown: share + rank, type split, categories, materials after returns, all entries | `Room` |
| Workers | Crew per daily-wage team: start/end dates, calendar (tap = holiday), mark Sundays off, days worked, earned vs paid, "Pay balance" → Add flow | `Workers` |

## Data model (as prototyped)

- **Entry**: `id, kind (expense|return), date, amount (return is negative), cat, other, matType, matNote, room, payee, mode, note, by, returnOf`.
  - A return stores `returnOf` = the original expense id and copies its `cat`, `matType`, `room`. Totals are plain sums, so every chart is net of returns automatically.
  - A return can't exceed the bill's remaining net. Deleting a bill deletes its returns.
- **Crew**: `id, trade, name, people, rate (per person per day), start, end (null = ongoing), holidays[]`.
  - Earned = days worked (start → min(end, today), minus holidays) × people × rate.
  - Paid = expenses with `cat = trade` dated inside the crew's range.
- **Types** used by charts: Labour, Raw material, Interior designer, Other (furniture, transport, travel, other).

## Decisions

- **Step-by-step Add, one question per screen.** Designed for Mom: large targets (48–64 px), a Next button on every step (no auto-advance), and a review screen before saving. The date stays as picked between entries, which speeds up backfilling.
- **Returns are linked to the original bill**, not free-floating negative entries, so room and category can't be mislabelled.
- **Shared costs (Whole house) are shown apart from rooms**, so "which room took the most" isn't swamped by designer fees.
- **Chart colours** (Labour `#2a78d6`, Raw material `#c2562b`, Designer `#1f8a70`, Other `#8a5bb8`) pass colour-blind separation and 3:1 contrast checks. Every colour also has a text label.
- **Look**: warm paper `#F6F2EB`, ink `#1F1C17`, Fraunces for numbers and headings, Instrument Sans for UI text.

## Open for the build

- Backend and auth for shared data (Garvit + Mom), offline entry that syncs later.
- Hindi labels toggle; receipt photo; CSV/Excel export; per-room budgets.
