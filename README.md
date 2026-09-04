# Training Schedule

A tiny site for your group: it lists every Tuesday 19:00–20:30 training
from 22 Sept 2026 to 15 May 2027, and each of your 4 players can mark
themselves as "can't make it" so everyone can see attendance at a glance
and rustle up a substitute if someone's missing.

No backend to run — it's a static site (works great on GitHub Pages) with
a free Firebase database behind it so everyone's ticks sync in real time.

## 1. Personalize it

Open `src/config.js`:

- **`PLAYERS`** — put in your 4 real names.
- **`SERIES`** — the Tuesday slot is already set up for 22 Sept 2026 to 15
  May 2027. Want a second weekly session later (e.g. a Saturday slot)?
  Just add another object to this array — the app merges and sorts them
  automatically.
- **`EXCLUDED_DATES`** — add any dates to skip (e.g. a holiday week).

## 2. Connect a free database (so attendance syncs between players)

Without this step the app still works, but each player's ticks only save
in their own browser (a "demo mode" banner will show).

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
   and create a new project (free tier is plenty for this).
2. In the project, go to **Build → Firestore Database → Create database**.
   Choose any region close to you, and start in **test mode** (you can
   tighten the rules later — see below).
3. Go to **Project settings → General**, scroll to "Your apps", click the
   `</>` (web) icon, register the app (no need for Firebase Hosting), and
   copy the `firebaseConfig` object it gives you.
4. Paste those values into `FIREBASE_CONFIG` in `src/config.js`.
5. In Firestore's **Rules** tab, use something like this so the
   `attendance` and `settings` collections are writable, without needing logins (fine for
   a private link shared with 4 friends):

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /attendance/{sessionId} {
         allow read, write: if true;
       }
         match /settings/{settingId} {
            allow read, write: if true;
         }
     }
   }
   ```

   Test-mode rules expire after 30 days, so swap them for the rule above
   (or something equivalent) before then.

## 3. Put it on GitHub Pages

1. Create a new **public** GitHub repo (e.g. `training-schedule`).
2. Push this project to it:

   ```bash
   cd training-schedule
   git init
   git add .
   git commit -m "Training schedule app"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

3. In the repo on GitHub, go to **Settings → Pages**, and under "Build and
   deployment" set **Source** to **GitHub Actions**. The included workflow
   (`.github/workflows/deploy.yml`) builds and deploys automatically on
   every push to `main`.
4. After the first push, check the **Actions** tab — once the workflow
   finishes, your site is live at:

   `https://<your-username>.github.io/<repo-name>/`

   Send that link to your 4 players.

## Running it locally

```bash
npm install
npm run dev
```

## How it works

- Each player picks their name on first visit (remembered in that
  browser); they can only toggle their *own* attendance, everyone else's
  is read-only to them.
- Attendance is stored in Firestore as one document per session date,
  with a field per player who's marked as out — so "no field" simply
  means "in".
- The schedule itself isn't stored anywhere; it's generated fresh from
  `src/config.js` every time the page loads, so editing the season dates
  or adding a session series doesn't require touching any data.
