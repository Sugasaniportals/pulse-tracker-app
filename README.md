# Pulse Tracker — setup & build

## 1. Supabase (backend, free)

1. Create a project at supabase.com.
2. Open **SQL Editor → New query**, paste in `supabase/schema.sql`, and run it.
3. Go to **Storage** → create a new bucket called `proof-photos`, set it **public**.
4. Go to **Project Settings → API** and copy your **Project URL** and **anon public key**.
5. Paste both into `src/lib/supabase.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).

## 2. Reminders (Edge Function + cron)

1. Install the Supabase CLI: `npm install -g supabase`
2. `supabase login`
3. `supabase link --project-ref YOUR_PROJECT_REF`
4. `supabase functions deploy check-reminders`
5. In Supabase, go to **Database → Extensions**, enable `pg_cron` and `pg_net`.
6. Back in the SQL Editor, uncomment and run the `cron.schedule(...)` block at
   the bottom of `schema.sql`, filling in your project ref and anon key.

This makes the reminder check run server-side every 30 minutes, independent
of whether your phone app is open — this is the piece the earlier prototype
couldn't do.

## 3. Install dependencies

```
cd pulse-tracker-app
npm install
```

## 4. Run it locally first (no build needed)

```
npx expo start
```

Scan the QR code with the **Expo Go** app on your Android phone to test
everything — activities, streaks, photos, diary — before building an APK.

## 5. Build the actual APK

`app.json` already has `"owner": "codewithgrits-team"` set to your Expo org.

1. `npm install -g eas-cli`
2. `eas login` — log in with the same Google/GitHub account you used for expo.dev
3. `eas build:configure` — this fills in the real `projectId` in `app.json`
   (it currently says `REPLACE_WITH_YOUR_EAS_PROJECT_ID` as a placeholder)
4. `eas build -p android --profile preview`
5. Wait ~10–15 min, then open the link EAS gives you in the terminal (or check
   expo.dev → your project → Builds) to download the `.apk` directly to your
   phone.

This runs in Expo's cloud (free tier) and takes roughly 10–15 minutes. When
it finishes, it gives you a download link to the `.apk` — install it
directly on your phone (enable "install unknown apps" for your browser once,
when prompted).

## Notes

- No login screen — the app works immediately. If you want to recover data
  after switching phones later, we can add a simple magic-link restore using
  Supabase Auth email OTP; the schema is ready for it (just needs an
  `auth.uid()` column added to each table).
- Reminders fire via a real server-side cron job now, so they work even with
  the app closed or your phone locked — that was the core limitation of the
  browser prototype.
