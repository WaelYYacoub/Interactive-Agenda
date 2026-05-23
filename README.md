# Site Secretary

Interactive notes / assistant secretary web app for the **OTG Water Transmission System** project. Built with React Router 7, Supabase, and OpenAI Whisper. Bilingual EN/AR with full RTL.

## Features (milestone 1)

- Notes / Issues / Incidents / Events / Audits / Progress / Challenges
- Status transitions with **full audit history** (every change is logged)
- Project hierarchy: Alignment → Section → KM range, plus Laydowns and Pumping Station
- Tagging by Activity (17), Equipment (~20), Welfare item (6)
- People directory per section (Petrojet + subcontractor staff with phones)
- Voice notes via OpenAI Whisper (auto-detects Arabic + English)
- EN/AR with RTL layout flip
- Magic-link auth via Supabase

Not in milestone 1: map view, KML parsing, file attachments UI, multi-user collaboration.

---

## Prerequisites

- Node.js 20+
- A free Supabase project — sign up at https://supabase.com
- An OpenAI API key (Whisper) — https://platform.openai.com/api-keys

---

## Setup

### 1. Install

```sh
cd web
npm install
```

### 2. Create your Supabase project

1. https://supabase.com → new project. Pick any region.
2. Once it's ready, copy the values from **Project Settings → API**:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, keep secret)

### 3. Apply the schema

Open the Supabase dashboard → **SQL Editor** → New query, then paste and run:

1. `supabase/migrations/0001_init.sql` — creates tables, RLS policies, triggers.

### 4. Create your auth user

Supabase dashboard → **Authentication → Users → Add user → Send invite** (use your own email). Confirm the email.

Copy your user's `id` (UUID) from the Users list.

### 5. Seed your project + catalogs

Open `supabase/seed.sql`, replace the placeholder UUID near the bottom with your user id:

```sql
owner uuid := '00000000-0000-0000-0000-000000000000';  -- <-- replace
```

Then run the file in the SQL editor. This inserts:

- The 17 activity types, ~20 equipment types, 6 welfare items
- The OTG project, Alignment 1 (10 sections), Alignment 2 (5 sections), LD1–LD6, Main Pumping Station

### 6. Configure environment

```sh
cp .env.example .env.local
```

Fill in `.env.local`:

```env
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=sk-...
SESSION_SECRET=<paste 32+ random chars>
```

### 7. Run

```sh
npm run dev
```

App at http://localhost:5173.

---

## How status history works

Every time you change a note's status (Open → In progress → Resolved …), a row is appended to `note_status_history` with `from_status`, `to_status`, `note`, `changed_at`, and `changed_by`. The note detail page shows the full timeline plus a quick "last action was X, now Y" summary.

The schema also auto-logs the initial status when a note is created (via the `notes_log_creation` trigger).

---

## How voice notes work

- The browser records audio with `MediaRecorder` (webm/opus where supported).
- The recording is POSTed to `/api/transcribe` (server-side route).
- The route forwards the file to OpenAI's `audio/transcriptions` endpoint with `model=whisper-1` and the current UI language as a hint (`ar` or `en`).
- The transcript is appended to the notes textarea.

The OpenAI API key never leaves the server. Files larger than 25 MB are rejected.

---

## Project structure

```
web/
├── app/
│   ├── root.tsx                      # HTML shell, sets <html dir="rtl|ltr">
│   ├── routes.ts                     # Route table
│   ├── routes/
│   │   ├── _app.tsx                  # Authenticated layout (sidebar + header)
│   │   ├── _index.tsx                # Dashboard
│   │   ├── login.tsx                 # Magic-link form
│   │   ├── logout.tsx
│   │   ├── auth.callback.tsx         # Exchanges magic-link code for session
│   │   ├── alignments.$alignmentId.tsx
│   │   ├── sections.$sectionId.tsx
│   │   ├── notes._index.tsx          # List + filter
│   │   ├── notes.new.tsx             # Create form (with voice)
│   │   ├── notes.$noteId.tsx         # Detail + status transition + history
│   │   ├── people.tsx
│   │   ├── api.transcribe.tsx        # Whisper proxy
│   │   └── api.set-locale.tsx        # Language switcher endpoint
│   ├── components/
│   │   ├── ui/                       # Button, Input, Textarea, Card, Badge
│   │   ├── LanguageSwitcher.tsx
│   │   └── VoiceRecorder.tsx
│   ├── lib/
│   │   ├── env.server.ts
│   │   ├── supabase.server.ts        # Server-side client + requireUser()
│   │   ├── supabase.client.ts
│   │   ├── i18n.ts
│   │   ├── i18n.server.ts            # Locale cookie + RTL detection
│   │   └── utils.ts                  # cn(), formatKm()
│   ├── locales/
│   │   ├── en.json
│   │   └── ar.json
│   └── app.css                       # Tailwind + theme tokens
├── supabase/
│   ├── migrations/0001_init.sql
│   └── seed.sql
├── package.json
├── vite.config.ts
├── react-router.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

---

## Domain notes

- **Alignment 1** = 10 sections, KM 0+000 → 64+970 (~65 km)
- **Alignment 2** = 5 sections, KM 0+000 → 34+685 (~34.7 km)
- KM notation in UI: `KM+meters`, e.g. `2+100` for 2,100 m (see `formatKm()` in `app/lib/utils.ts`)
- The parent project's `Interactive Agenda.md` is the source of truth for activity / equipment / welfare lists and the section KM ranges. The seed file mirrors it exactly.
- The parent project's KML (`OTG Water Transmission System LUP.kml`) holds 2,008 chainage point markers along the two alignments. They are **not** loaded by the seed — they're available for a later "import KM marks" milestone.

---

## Roadmap

- Map view (parse KML, plot pipeline + section markers, link notes to the map)
- File attachments (Supabase Storage)
- Multi-user collaboration with roles
- Push notifications for status changes on watched items
- Exports (PDF daily report, CSV)
