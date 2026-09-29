# Renovation tracker: a family expense app my mother can actually use

A mobile-first web app for tracking our home renovation in India: what's pending, who it's waiting on, where the money went room by room, and what we still owe the daily-wage crews.

## Context and problem

We were renovating our flat, and at the end of each day I wanted one answer: which room was taking most of the budget, and what inside that room was driving it. Was the bathroom expensive because of sanitaryware or because of the plumber's days?

The money was spread across three people, cash and UPI, shop bills, returns and painters paid by the day. A spreadsheet could hold it, but nobody in my family would open one on a phone at a hardware shop. I wanted logging a payment to take a few taps and the analysis to happen on its own.

I was the product owner and designer. I designed and built it with Claude as a collaborator: I set the brief, reviewed every iteration and made the calls on what to keep and cut. Claude drafted screens, pushed back on my brief and wrote the prototype and code. The app is not in real daily use yet, so this case study covers decisions, not outcomes.

## Users and constraints

- **Me (Garvit)**: the organiser. I care about analytics and keeping the data honest.
- **My mother**: older and less comfortable with phones, but on site most often and paying many of the bills. She is the main design constraint. If she can't add an expense on her own, the app has failed.
- **Another family member** who also pays for things on site.

Constraints I set along the way: shared online data; no sign-in (passwords would stop my mother on day one); no offline mode; no Hindi labels for now; and nothing that adds clutter for her.

## Process

I worked in rounds, each starting from my feedback on a clickable prototype.

**Round 1: the brief, and pushback on it.** I asked for a simple form: amount, reason (Mistry, Mazdur, Raw material, Plumber, Painter, Travel and so on) and room. The first prototype came back with questions I hadn't asked myself. Designer fees, flat-wide labour and transport don't belong to one room, and forcing them into one would corrupt the "which room cost most" answer, so a **Whole house** bucket was added. The interior designer wasn't even in my category list, though tracking it was one of my goals. And free text for materials ("paint", "Paints", "Asian Paints 20L") would fragment the analytics, so materials got type chips with optional text.

**Round 2: analytics, returns and my mother.** I said the analytics weren't good enough: I wanted charts, a drill-down and a step-by-step form my mother could use. I also hit a real case: I bought a ₹1,400 drain on a sanitaryware bill, returned it and bought a ₹400 one instead. The design moved to a House → Room → Entry hierarchy with stacked bars per room, a room breakdown screen, a one-question-per-screen wizard and returns linked to their bill. I asked for holiday tracking for painters, and Claude added earned vs paid, because holidays alone don't answer "what do I still owe?"

A self-review then caught that in the sample data Whole house had become the biggest "room" at 33%, burying the real answer, the bathroom. Shared costs moved to their own row below the rooms, and the chart now names the top room in words.

**Round 3: keeping crew payments honest.** The first sync matched payments to crews by category and date, which double-counts when two painter crews overlap. I set the direction: payments come only from Expenses, ask "which crew?" only when there are two or more, and set a crew's end date when work actually finishes. I also added **Paid by**, the pick-your-name model instead of sign-in, and a **Tasks** screen as the home tab, because on a renovation "what's pending and who is it waiting on" matters more day to day than logging spend.

**Round 4: saying no, and easier on the eyes.** I turned down tap-to-call, Excel export and auto-generated tasks as clutter, and said yes to soft delete and receipt photos on Google Drive. When I asked for something "easier on the eyes", we named what was tiring (near-black buttons, a border on every card, lots of small bold text, a wall of 15 tiles) and replaced it with charcoal text, one slate-teal accent, tinted selections, borderless cards, bigger type and grouped categories.

**Round 5: typeface.** I compared four fonts on the same screens (Atkinson Hyperlegible, Nunito, Plus Jakarta Sans, Baloo 2 with Mukta), judging by how readable ₹ amounts were for my mother rather than by style. I chose Nunito.

**Round 6: audits.** I had the design audited against two published design skills, taste-skill (tasteskill.dev) and an Apple Human Interface Guidelines skill. I adopted most findings and rejected a few, each for a stated reason.

## Key decisions

**1. Returns are linked to the bill.** A return picks its original bill, copies its category, material, room and crew, and can't exceed what's left on the bill. Every total is then a plain sum, and **Add replacement** pre-fills the next purchase.
*Why*: a loose negative entry is easy to mislabel, and one wrong room silently skews the per-room numbers. *Trade-off*: one extra step before entering the amount.

**2. Shared costs are a bucket, not a split.** Flat-wide costs go to Whole house, shown apart from the rooms.
*Why*: splitting every bill is precise but tedious, and my mother would never do it. *Trade-off*: room totals slightly understate true room cost. I'll add splitting only if the numbers look wrong.

**3. One question per screen, with chips.** Amount → what for → detail → room → when → review, with **Change** on every line, no auto-advance and a sticky date for backfilling.
*Why*: every option is visible, a choice is one tap, and my mother only ever faces one decision. *Trade-off*: a longer flow for me, which I accepted.

**4. Crew payments link explicitly.** Each expense stores a crew id worked out at save time: one active crew of that trade links silently, two or more adds a question, none adds nothing, and review always offers "Not part of a crew". Workers shows earned (days × people × rate, minus holidays), paid and still to pay, but never takes money.
*Why*: one source of truth for money, and no double counting. *Trade-off*: no "pay this crew" shortcut. The audit suggested one and I rejected it.

**5. No sign-in: pick your name, stamp every action.** Every add, edit, delete and restore records who and when. Deletes go to Recently deleted with **Restore**.
*Why*: history and soft delete make it safe for anyone to act without passwords. *Trade-off*: it's trust-based, fine for a family and wrong for strangers.

**6. Add is an action, not a tab.** Following the Apple guideline that tab bars are for navigation, **Add expense** became a button on Tasks and Expenses that opens a full-screen flow with **Cancel** and a "Discard this expense?" prompt, leaving four tabs: Tasks, Expenses, Summary, Workers.
*Trade-off*: the most common action is no longer on every screen.

**7. One codebase, two deployments.** The same branch runs as the private family app (Supabase and Drive keys) and as a public demo (local-only data, a fictional household, **Reset demo**), with names and rooms as configuration.
*Why*: a separate demo branch would drift. *Trade-off*: two storage backends behind one interface.

Also rejected from the audits: moving Photos into Expenses (I had placed them under Summary), an icon library (the prototype tool couldn't load one) and removing more cards, since cards keep tap areas obvious for an older user.

## Design system

- **Type**: Nunito 500–800. The prototype had drifted to 18 sizes; the audit brought it to a real scale: 17px body at 1.45 line-height, 17px buttons and row titles, 15px secondary, 26–28px titles and 36–44px amounts with tabular figures. Nothing goes below 13px except two 11px calendar marks.
- **Text size**: Normal, Large and Larger scale content by 1, 1.15 and 1.3, set on the same screen as "Who is using the app?".
- **Colour**: warm page `#F3F1EC`, white cards with a soft shadow, text `#2A2E33` instead of black, and one accent `#34505C`. The tint `#E4ECEE` is reserved for selected states. Every text pair is at least 5:1 contrast.
- **Charts**: Labour `#2a78d6`, Raw material `#c2562b`, Interior designer `#1f8a70`, Other `#8a5bb8`, checked for colour-blind separation and 3:1 against white, always with a legend, value labels and screen-reader text.
- **Shape**: 18px cards, 12px controls, 8px inner items; spacing on 4 / 8 / 12 / 16 / 24 / 32.
- **Accessibility**: tap targets of at least 44px, main buttons 52–56px tall, a check mark on every selected option so colour is never the only signal, and one-tap delete with Undo instead of "tap again to delete".
- **Words**: "Summary" not "Insights", "Total after returns" not "Net", buttons that start with a verb, and errors that say how to fix them ("Enter up to ₹12,800.").

## Build and architecture

- **Stack**: Vite, React and TypeScript with plain CSS tokens and a self-hosted Nunito font, deployed on Vercel. Shared data lives in Supabase (Postgres), planned for the Mumbai region. No UI or chart library: the charts are plain HTML bars, as in the prototype.
- **Two modes, one codebase**: with no database keys the app runs as a demo, keeping a fictional household in the browser (and never downloading the Supabase client). With keys, it becomes the shared family app.
- **Access without sign-in**: the anon key is public in any single-page app, so each device enters a one-time family code. Postgres row-level security checks it on every request, so a wrong code sees nothing and can change nothing.
- **Photos**: four small serverless functions (upload, view, and a two-page "Connect Google Drive" setup) save photos to a family Drive folder with the `drive.file` scope, which only sees files the app created. Drive normally needs each user to sign in with Google, and a service account gets no storage on a personal Gmail, so the server holds one token from my account, authorised once. Until Drive is connected, photos go to a private Supabase Storage bucket.
- **Phone back gesture**: every screen and step is a browser history entry, so Android's back gesture goes back one step, and finishing a flow removes its steps from history.
- **Checks**: unit tests for the money logic (returns, crew linking, soft delete), the database rules exercised on real Postgres, and an end-to-end browser run through every main flow.

## What I'd do next

- **Real auth and multiple households** for a public version. A family code and name picker suit one family, not strangers.
- **Per-room budgets**, deliberately left out of phase 1.
- **Bill splitting**, if Whole house turns out to hide too much.
- **Offline entry and Hindi labels**. The font stack already falls back to Devanagari.
- **Watching my mother use it on site.** Nothing has been tested with her in real use yet, and that is the test that matters.

## What I learned

- **The brief is a first draft.** My own category list left out the interior designer, the cost I most wanted to track. The biggest gains came from questioning the brief.
- **Analytics depend on data entry.** Linked returns, material types, crew links and the Whole house bucket are data-quality decisions that look like UI decisions.
- **Design for the least confident user.** Nearly every choice came from asking "can my mother do this alone?"
- **Saying no is design.** Tap-to-call, export, auto-tasks and a pay-this-crew shortcut were all reasonable. Cutting them kept the app small enough to learn.
- **Audits are input, not orders.** They caught real issues, including a bug where removing the sample data also wiped real crews, but I adopted each point only where it fit these users.
- **AI moved the bottleneck to judgement.** With Claude producing prototypes quickly, my job was deciding what the product should be and standing up for my mother's needs.
