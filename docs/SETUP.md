# Setup

There are two ways to run this app from the same code:

| | Public demo | Family app |
|---|---|---|
| Who it's for | Anyone who wants to try it | Your household |
| Where data lives | In each visitor's browser | Supabase (shared by everyone in the family) |
| Keys needed | None | Supabase, plus optional Google Drive |
| Time | About 2 minutes | About 15 minutes, plus 10 for Google Drive |

Both are free on the Vercel Hobby and Supabase Free plans.

> **Branch:** everything is on `claude/gallant-wright-n6oltf`. Before deploying, create a `main` branch from it on GitHub (Branches → New branch) and make `main` the default branch. Vercel deploys the default branch to production.

---

## A. Public demo

1. Go to [vercel.com/new](https://vercel.com/new) and import the `home-renovation` repository.
2. Vercel detects **Vite**. Leave the build settings as they are.
3. Under **Environment Variables**, add `VITE_DEMO` = `true`.
4. Click **Deploy**. Share the URL. Every visitor gets their own copy of the example household, with a **Reset demo** button.

---

## B. Family app

### 1. Supabase (database)

1. Go to [supabase.com](https://supabase.com) → **New project**.
   - **Region:** *South Asia (Mumbai)*, for the lowest latency in India.
   - Save the database password somewhere safe; the app doesn't need it.
2. Pick a **family code**: something short that you'll type once on each phone, for example `sharma-2026`.
3. Open **SQL Editor → New query**. Paste all of [`supabase/schema.sql`](../supabase/schema.sql), replace `CHANGE-ME` with your family code, and click **Run**.
4. Open **Project Settings → API** and copy three values:
   - **Project URL**
   - **anon public** key
   - **service_role** key (secret; it only goes into Vercel, never into the app)

### 2. Vercel (hosting)

1. Go to [vercel.com/new](https://vercel.com/new) and import the same repository again. Name this project something like `renovation-family`.
2. Add these **Environment Variables**:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL |
   | `VITE_SUPABASE_ANON_KEY` | anon public key |
   | `VITE_FAMILY` | Your names, comma-separated, e.g. `Garvit,Manmohan,Rekha` |
   | `FAMILY_CODE` | The same family code you put in the SQL |
   | `SUPABASE_URL` | Project URL (again, for the photo functions) |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |

   Optionally, set `VITE_ROOMS` to your own rooms, e.g. `Living room,Bathroom,Kitchen`. "Whole house" is always added.
3. Click **Deploy**.

`VITE_…` values are built into the app. After you change one, go to **Deployments → ⋯ → Redeploy**.

### 3. Each phone

1. Open the app's URL. On the first visit it asks for the **family code**; type it once.
2. Choose your name.
3. Add it to the home screen:
   - **Android (Chrome):** menu ⋮ → *Add to Home screen*.
   - **iPhone (Safari):** Share → *Add to Home Screen*.

Photos now save to a private Supabase Storage bucket (1 GB free). Part C moves them to Google Drive.

---

## C. Google Drive for photos (optional)

The app uses the `drive.file` permission, so it can only see files it created itself, never the rest of your Drive. Your Google account authorises it once, and every family member's photos go into one folder.

1. Open [console.cloud.google.com](https://console.cloud.google.com) and create a project, e.g. *Home renovation*.
2. **APIs & Services → Library** → search **Google Drive API** → **Enable**.
3. **Google Auth Platform** (older name: *OAuth consent screen*):
   - **Branding:** app name *Home renovation*, your email as support and contact email.
   - **Audience:** User type *External*. Then click **Publish app** so the status is **In production**.
     This matters: in *Testing* status, Google cancels the permission after 7 days.
   - **Data access:** add the scope `https://www.googleapis.com/auth/drive.file`.
4. **Clients → Create client**:
   - Type: *Web application*.
   - Authorised redirect URI: `https://YOUR-FAMILY-APP.vercel.app/api/google/callback`
   - Copy the **Client ID** and **Client secret**.
5. In Vercel, add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then **Redeploy**.
6. On your phone or laptop, open:
   `https://YOUR-FAMILY-APP.vercel.app/api/google/start?k=YOUR_FAMILY_CODE`
   - Tap **Continue to Google** and sign in with the Google account whose Drive should hold the photos.
   - If Google shows *"Google hasn't verified this app"*, tap **Advanced → Go to Home renovation**. It's your own app.
   - Tap **Allow**. The next page creates a **Home renovation photos** folder and shows two values.
7. In Vercel, add `GOOGLE_REFRESH_TOKEN` and `GOOGLE_DRIVE_FOLDER_ID` from that page, then **Redeploy**.

New photos now go to Drive. Photos already in Supabase Storage keep working.

---

## Run it on your computer

```bash
npm install
npm run dev          # demo mode at http://localhost:5173
```

To work against your real database:
1. Copy `.env.example` to `.env.local` and fill in the `VITE_…` values.
2. The photo functions in `/api` only run under Vercel's dev server: `npx vercel dev`.

Checks:

```bash
npm run build        # type-check and production build
npm test             # unit tests (money logic, crew linking, soft delete, API)
npm run smoke        # end-to-end run through every main flow in demo mode (after build)
```

---

## Changing things later

- **Names or rooms:** edit `VITE_FAMILY` or `VITE_ROOMS` in Vercel, then redeploy.
- **Family code:**
  - Run `update private.app_config set value = 'new-code' where key = 'family_code';` in the SQL Editor.
  - Change `FAMILY_CODE` in Vercel and redeploy.
  - Each phone asks for the new code the next time it can't load.
- **Example entries:** the family app starts empty. The demo's example household only exists in demo mode.

## If something goes wrong

- **"That code didn't work":** the code typed on the phone doesn't match the one in `private.app_config`. They're case-sensitive.
- **"Couldn't load the family's data":**
  - Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy.
  - Free Supabase projects pause after 7 days with no activity. Open the project in Supabase and click **Restore**.
- **Photos say "Not uploaded":**
  - Check `FAMILY_CODE` in Vercel matches the SQL.
  - Check that either the Supabase Storage keys or all four Google keys are set.
- **Supabase blocked on an Indian network:** in early 2025 some ISPs briefly blocked `*.supabase.co`. If it happens again, the fix is to send database calls through the app's own Vercel domain (a small proxy function). It isn't built yet; ask for it if you need it.
