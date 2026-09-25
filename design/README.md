# Design spec: Renovation tracker

This is the final design handover for phase 1. It covers a mobile-first web app where one family tracks a home renovation: tasks, expenses and returns, per-room spending, receipts and photos, and attendance for daily-wage crews. The family is Garvit, Manmohan and Rekha (Garvit's mother, less comfortable with phones). The data is stored online and shared between them.

- **Clickable prototype** (private until shared): https://claude.ai/artifact/4TjkwwFLs2GaNNAr7Dp1zU
- **Source**: the `.dc.html` files here. `Main.dc.html` holds the whole app and its logic. Every other artboard imports it and opens a different screen through its `start` setting.
- The design was audited against the taste-skill guidance (`Leonxlnx/taste-skill`, the source behind tasteskill.dev) and `dickwu/apple-design-skill` (Apple's Human Interface Guidelines). What was taken from each is listed under **Audit outcomes**.

## 1. Navigation

- **Opening the app** shows "Who is using the app?" with Garvit, Manmohan or Rekha, plus a **Text size** choice (Normal, Large, Larger). There is no sign-in; the chosen name is stamped on every action. Tapping the name at the top of any screen reopens this picker.
- **Four tabs**: **Tasks** (home), **Expenses**, **Summary**, **Workers**.
- **Add expense** is a full-width button at the bottom of Tasks and Expenses, not a tab. It opens a full-screen flow with no tab bar, **Back** on the left and **Cancel** on the right. Cancelling after typing anything asks "Discard this expense?" with **Discard** and **Keep editing**.
- **Screens inside a tab** (expense detail, room, recently deleted, photos) show a labelled back button, for example "‹ Expenses".

## 2. Screens

| Area | Screen | Artboard |
|---|---|---|
| Start | Who is using the app, plus text size | `Main` |
| Tasks | Open tasks grouped **By person** ("Waiting on Plumber") or **By room**, overdue first; tick a task to complete it (records who ticked it and when, and offers Undo); done tasks are folded away | `Tasks`, `TasksLarge` |
| | New task (with a visible label) → who needs to do it → room (optional) → due date (optional) | `TasksAdd` |
| Add expense | 1. How much? (Indian digit grouping as you type, "1.25 lakh" hint) and a "Returned something to a shop?" link | `AddAmount` |
| | 2. What was it for? Three groups: Things you bought / Labour / Services and travel | `AddWhat` |
| | 2a. Raw material: type plus an optional detail · 2b. Other: required text · 2c. Which crew (asked only when 2 or more active crews do that work) | `AddMaterial`, `AddOther`, `AddCrew` |
| | 3. Which room (7 rooms plus Whole house for shared costs) | `AddWhere` |
| | 4. When (Today / Yesterday / Other day), then a folded **More details (optional)**: Paid by (defaults to the current person), Paid to, How did you pay, Note | `AddWhen` |
| | 5. Check and save: every line has **Change**; **Receipt photo → Add photo**; "This will show as added by …" | `AddReview` |
| | Saved: "Counted in Ramesh's team's payments" if it went to a crew, then "Manmohan and Rekha can see it now" · **Add another** / **Done** | `AddDone` |
| | Cancel with changes → discard prompt | `AddDiscard` |
| Returns | R1 pick the bill (Materials / All bills) → R2 amount back (no more than the bill's remaining total), what was returned, and when → saved → **Add replacement** (category, material, room and crew already filled in) | `ReturnPick`, `ReturnAmount`, `ReturnDone` |
| Expenses | Grouped by Date / Room / Category, totals after returns, **Recently deleted (n)** link | `List` |
| | Expense detail: title is the item; fields; returns; "Add a return for this bill"; receipt photos (add one later); history (added / edited / receipt added / deleted / restored, with who and when); **Edit expense**; **Delete expense** (one tap, with Undo) | `Entry` |
| | Recently deleted: who deleted it and when, **Restore** | `Deleted` |
| Summary | Total after returns, budget meter, total budget; this week; money back from returns; **Photos and receipts**; spending by room as stacked bars (shared costs shown separately), with "Most spent: …"; spending by type; spending each week (the chart shows its highest-week value, and tapping a week shows its total) | `Insights` |
| | Room: share of total and rank, split by type, by category, raw materials after returns, every entry | `Room` |
| | Photos and receipts: All / Receipts / Site photos; a receipt opens its expense; a site photo opens a viewer; **Add photo** | `Media`, `Photo` |
| Workers | Crew: Working / Finished; "12 days worked, 2 holidays"; "From 12 Sep to today"; calendar (tap a day to mark a holiday); mark all Sundays; **Mark work finished** → last working day (can be reopened); Money: earned so far / paid / still to pay; payments are read-only and come from Expenses | `Workers`, `WorkersFinish` |
| | Add crew: name, type of work, people, ₹ per person a day, start date (no end date) | `WorkersNew` |

## 3. Data model

- **Expense**: `id, kind (expense|return), date, amount (negative for a return), cat, other, matType, matNote, room, crewId, paidBy, payee, mode, note, by, returnOf, receipts[], deleted, history[]`.
  - `by` is whoever used the app to add it; `paidBy` is whose money was spent.
  - `history[]` holds `{what: Added|Edited|Receipt added|Deleted|Restored, by, at}`.
  - **A return** stores `returnOf`, the bill it came from, and copies that bill's `cat`, `matType`, `room` and `crewId`. Every total is a plain sum, so all totals already account for returns. A return can't be more than what is left on the bill.
  - **Soft delete**: `deleted = {by, at, with}`. A deleted expense disappears from every list and total except Recently deleted. Deleting a bill also marks its returns (`with` = the bill's id), and restoring the bill brings them back. Nothing is ever hard-deleted.
  - **Receipts**: each is `{id, name, by, at}`, plus the Google Drive file id and a thumbnail in the build.
- **Crew**: `id, trade (a labour category), name, people, rate, start, end (null until work finishes), holidays[]`.
  - Payments are the expenses whose `crewId` matches the crew. They are never entered from Workers.
  - When an expense is saved, its crew is worked out from active crews with the same trade on the expense's date: exactly one is linked automatically; two or more means the person is asked (step 2c); none means no crew. The review screen always offers "Not part of a crew".
  - Earned = days from start to end (or today) minus holidays, × people × rate.
- **Task**: `id, title, who (Garvit | Manmohan | Rekha | Designer | Mistry | Plumber | Electrician | Painter | Carpenter), room?, due?, done, doneBy, doneAt, by`.
- **Site photo**: `id, name, room?, date, by`, plus the Drive file id.
- **Example data**: every seeded record has `sample: true`. "Remove examples" asks for confirmation and removes only those records.
- **Chart types**: Labour, Raw material, Interior designer, Other (furniture, transport, travel, other).

## 4. Visual system

- **Type**: Nunito (500/600/700/800), with `'Noto Sans Devanagari'` as the fallback if Hindi text ever appears.

  | Role | Size / weight / tracking |
  |---|---|
  | Who-is-using headline | 30 / 800 / −0.015em |
  | Tab screen title | 28 / 800 / −0.015em |
  | Screen title inside a tab | 26 / 800 / −0.01em |
  | Question heading | 26 / 800 / −0.01em |
  | Section heading | 18 / 800 |
  | Group label | 15 / 700, secondary colour |
  | Row title | 17 / 700 |
  | Body | 17 / 500, line-height 1.45 |
  | Secondary text | 15 / 500 |
  | Tags | 13 / 700 / +0.02em |
  | Buttons | 17 / 700 |
  | Tab labels | 13 / 700 |
  | Big numbers | 36–44 / 800 / −0.02em, tabular figures |

  Nothing goes below 13px, except the 11px "Off" and "Today" marks inside calendar cells. **Text size** scales the content by 1 / 1.15 / 1.3; in the build, set every size in `rem`.
- **Colour**:
  - Page `#F3F1EC`; cards white, shadow `0 1px 2px rgba(42,46,51,.04), 0 4px 12px rgba(42,46,51,.04)`.
  - Text `#2A2E33`, secondary text `#5B6167`.
  - Accent `#34505C` (buttons, links, progress, selected borders); selected fill `#E4ECEE`, used only for selected states.
  - Lines `#E6E3DD`; input borders `#9A968E` (about 3:1 against white); option-tile borders `#C9C5BD`.
  - Danger `#8E2A1F`; success `#2E5E35` on `#E5EFE6`.
  - Every text colour pair is at least 5:1 contrast.
- **Charts**: Labour `#2a78d6`, Raw material `#c2562b`, Interior designer `#1f8a70`, Other `#8a5bb8`. These pass colour-blind separation checks and 3:1 contrast against white. There is always a legend and every value has a text label, and screen-reader labels spell out each room's split.
- **Shape**: cards 18px; buttons, inputs and option tiles 12px; small inner items 8px; chips, tags and avatars fully rounded; chart bars 4px.
- **Spacing**: 4 / 8 / 12 / 16 / 24 / 32.
- **Sizes and states**:
  - Tap targets are at least 44px; main buttons are 52–56px tall.
  - A selected option shows a check mark as well as the tint, so colour is never the only signal.
- **Icons**: hand-drawn line icons with a 1.75px stroke, check marks 2.25px, and no emoji.

## 5. Writing rules

- Use plain words: Summary (not Insights), "Total after returns" (not Net), "How did you pay?" (not Paid via). Use sentence case, and start buttons with a verb.
- Use one label per action everywhere: **Add expense**, **Add a return**, **Add task**, **Add crew**, **Add photo**, **Save …**, **Mark work finished**.
- Put at most one middle dot on a line, and use no en dashes; use commas and "From … to …" instead.
- Empty screens say what to do next. Errors appear next to the field and say how to fix it, for example "That is more than the bill. Enter up to ₹12,800."
- Messages stay for 6 seconds, and any action that can be reversed (delete, task done, Sundays off, finished) comes with **Undo**.

## 6. Audit outcomes

**Adopted**:
- Nunito and the type scale above.
- Fewer radii and greys.
- Softer shadows.
- Add as a full-screen flow with Cancel and a discard prompt.
- Four tabs, with an **Add expense** button instead of an Add tab.
- Delete in one tap with Undo, instead of "tap again".
- A confirmation before removing examples. This also fixed a bug where it wiped real crews.
- Check marks on selected options.
- Text size setting.
- Optional details folded on the When step.
- Receipt moved to the review screen.
- Visible label on the task field.
- A hint when Add task is disabled.
- A single stats line and a hint under the calendar on Workers.
- Chart highest-value label, week hint and screen-reader text.
- Summary card no longer uses the selected tint.
- Site photo viewer.
- Consistent line-icon stroke.
- Every copy rewrite in section 5.

**Not adopted**:
- A "pay this crew" button on Workers. You asked that expenses not be entered from Workers.
- Moving Photos into Expenses. You placed them under Summary.
- Phosphor icons and global pressed/focus CSS. The prototype tool can't do these; they move to the build.
- Removing more cards. Cards keep tappable areas obvious for Rekha.

## 7. Build requirements the prototype can't show

- **Browser history**: give every screen and flow step its own history entry (`history.pushState`), so Android's back gesture goes back one step instead of leaving the app.
- **Pressed and focus states**: `button:active{transform:scale(.98)}` with a 120ms ease-out, `:focus-visible{outline:3px solid #34505C;outline-offset:2px}`, and no movement under `prefers-reduced-motion`.
- **Sizing and layout**:
  - Sizes in `rem`, and the text-size choice saved on each device.
  - `env(safe-area-inset-bottom)` padding on the tab bar and bottom buttons.
  - Wrap each step in a `<form>` and use `enterkeyhint`.
  - Put the cursor in the amount field when the step opens.
- **Photos**:
  - The server uploads to one family Google Drive folder, using a single stored OAuth refresh token from Garvit's Google account, authorised once. There's no per-user Google sign-in.
  - A service account won't work: with a personal Gmail it has no Drive storage of its own.
  - Compress photos on the phone before uploading.
  - Show "Not uploaded yet. It will try again when you're online." if an upload fails.
- **Shared data**: store it on a backend so all three people see the same data. Record the person and time for every write (the history above).

## 8. Out of scope for phase 1

Sign-in, offline entry, Hindi labels, phone numbers and tap-to-call, Excel export, automatic tasks, and budgets for each room.
