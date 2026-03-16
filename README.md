# FlagLab

**FlagLab** (codebase: `flagos`) is a web application for **flag football**: design offensive and defensive plays on an interactive canvas, organize them in playbooks, manage rosters and teams, share plays via link, and optionally get AI-suggested plays. It is built as a full-stack Nuxt 3 app with Supabase for auth and data.

---

## Features

- **Play designer** — Draw plays on a configurable field (yard lines, endzones, LOS, first-down line). Place players, assign positions, draw routes and annotations. Support for both offensive and defensive plays with optional “ghost defense” overlay.
- **Playbooks** — Group plays into playbooks; list and open plays from a playbook.
- **Squad / roster** — Manage players and teams: add/edit players, assign offense/defense positions, set starter counts, bulk import, export roster. “Auto starters” and “Reset” for starter assignments; track up to three teams with OVR/OFF/DEF scores.
- **Settings** — Field dimensions, default play view (fit/full), default play type (offense/defense), ghost defense default, player names on canvas, default player label in marker, default starter counts, theme (light/dark/system), primary team, account, and billing placeholder.
- **Shared plays** — Share a play via a public link (`/shared/[token]`) for view-only access.
- **AI play suggestions** — Optional OpenAI-powered play suggestions (server-side) when `OPENAI_API_KEY` is set.
- **Planned** — Match Sim and Play Lab (simulation) are linked in the UI but marked “Coming Soon.”

---

## Tech stack

| Layer | Technology |
|-------|------------|
| **Framework** | Nuxt 3, Vue 3, Vue Router 4 |
| **Language** | TypeScript |
| **Backend / data / auth** | Supabase (PostgreSQL, Row Level Security, Auth) via `@nuxtjs/supabase` and `@supabase/supabase-js` |
| **Styling** | Tailwind CSS 4, PostCSS |
| **UI components** | shadcn-nuxt (Radix Vue + Reka UI), Lucide icons, CVA, clsx, tailwind-merge, tw-animate-css |
| **Tables** | TanStack Vue Table |
| **Utilities** | VueUse |
| **Deployment** | Vercel (Nitro preset `vercel`) |

---

## Prerequisites

- **Node.js** (LTS, e.g. 20+)
- **npm** (or pnpm/yarn)
- **Supabase project** — Create a project at [supabase.com](https://supabase.com); you will need the project URL, anon key, and (for account deletion) the service role key.

---

## Getting started

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd flagos
   npm install
   ```

2. **Environment variables**  
   Copy the example env and set your Supabase (and optional) keys:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with at least:
   - `SUPABASE_URL` — Supabase project URL  
   - `SUPABASE_KEY` — Supabase anon (public) key  

   See [Environment variables](#environment-variables) for full list.

3. **Run in development**
   ```bash
   npm run dev
   ```
   Open the URL shown (e.g. `http://localhost:3000`). Sign up or log in via the auth pages; the app will redirect you to the dashboard.

4. **Build for production**
   ```bash
   npm run build
   npm run preview   # optional: local preview
   ```

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|--------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase anon (public) key |
| `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | For account deletion | Service role key (Supabase Dashboard → Settings → API). Used by `server/api/account/delete.post.ts` |
| `OPENAI_API_KEY` | No | Enables AI play suggestions in `server/api/suggest-play.post.ts` |
| `SUPABASE_ACCESS_TOKEN` | No | Used by scripts (e.g. `update-confirmation-email`); from Supabase account tokens |

Do not commit `.env`. Use `.env.example` as a template.

---

## Project structure

| Path | Purpose |
|------|---------|
| **`pages/`** | File-based routes: landing (`/`), dashboard, auth (login, signup, forgot/reset password, confirm), playbooks, plays (list + editor), squad, simulation (game/scenario), shared play, settings, what’s new |
| **`components/`** | Vue components: `ui/` (shadcn/Radix primitives), `layout/` (AppSidebar, AppFooter, AppBreadcrumb), `play/`, `playbook/`, `player/`, `canvas/`, `onboarding/`, dialogs (SharePlay, Feedback, etc.) |
| **`composables/`** | Auto-imported composables for data (Supabase), canvas, simulation, theme, confirm, tutorial, search, etc. |
| **`lib/`** | Shared logic: `types.ts` (domain types), `constants.ts` (positions, attributes, field defaults, formations), `utils.ts`, `playerAttributes.ts` |
| **`types/`** | `database.types.ts` — Supabase-generated DB types |
| **`layouts/`** | `default.vue` (app shell with sidebar, footer, modals), `auth.vue` (auth pages) |
| **`server/`** | API routes: `api/account/delete.post.ts`, `api/suggest-play.post.ts` |
| **`middleware/`** | `auth.global.ts` — auth redirect and route protection |
| **`plugins/`** | `theme.client.ts` — theme (light/dark/system) |
| **`assets/`** | Global CSS (`main.css`), fonts |
| **`public/`** | Favicons, logo, `robots.txt` |

---

## Architecture

### Data and composables

- **Supabase client** — Typed client is provided via `useSupabaseDB()` in `composables/useSupabase.ts` (wraps `useSupabaseClient<Database>()`).
- **Domain data** — Composables own reactive state and talk to Supabase:
  - **usePlayers** — Players CRUD, team score
  - **useTeams** — Teams, team_players, starter assignment, auto-assign, reset
  - **usePlaybooks** — Playbooks list and CRUD
  - **usePlays** — Plays for a playbook, CRUD
  - **useProfile** — User profile (e.g. display name, default_team_id)
  - **useFieldSettings** — Field dimensions and app defaults
  - **useSharePlay** — Shared play token/link
  - **useBulkImport** — Bulk player import
  - **usePlayerExport** — Export roster
  - **useConfirm** — Global confirm dialog
  - **useTutorial** — Onboarding tutorial
  - **useAppSearch** — Command palette (e.g. ⌘K)
  - **useQuickPlay** — Quick “new play” flow
  - **useSuggestPlay** — AI play suggestion (calls server API)
- **Canvas and simulation** — `useCanvas`, `useCanvasRenderer`, `useCanvasInteraction`, `useDraggableElement`, `usePlaySimulation`, `usePlayTest`, `useRouteAnalysis` handle the play designer and related behavior.

### Layouts and auth

- **Default layout** — Sidebar (nav: Dashboard, Playbooks, Squad, blur.ai section), main content slot, footer. Registers theme, quick play (e.g. ⌘N), search (⌘K), confirm dialog, tutorial modal.
- **Auth layout** — Used for login, signup, forgot/reset password, confirm; minimal shell with branding and form slot.
- **Auth middleware** (`middleware/auth.global.ts`):
  - Not logged in and route is not `/auth*` and not `/shared/*` and not `/` → redirect to `/auth/login`.
  - Logged in and on `/auth*` or `/` → redirect to `/dashboard`.

### Server

- **Account deletion** — `server/api/account/delete.post.ts` uses the Supabase service role key (from `runtimeConfig.supabase.serviceKey`) to call `auth.admin.deleteUser()` after validating the authenticated user.
- **AI suggest play** — `server/api/suggest-play.post.ts` uses `OPENAI_API_KEY` (when set) to call OpenAI and return suggested play data.

---

## Data model

### Domain types (`lib/types.ts`)

- **Profile** — User profile: display name, default_team_id, tutorial_completed_at.
- **FieldSettings** — Field dimensions (length, width, endzone, LOS, first down), default play view/type, ghost defense, player names on canvas, default player label, default starter counts, theme.
- **Playbook** — Name, description; has many plays.
- **Play** — Name, play_type (offense/defense), formation, canvas_data (players, routes, annotations).
- **Player** — Name, number, height, weight, photo_url, offense/defense positions, universal/offense/defense attributes.
- **Team** — Name, description; has many team_players.
- **TeamPlayer** — Links player to team with offense/defense position and starter/locked flags.
- **Canvas** — CanvasData, CanvasPlayer, CanvasRoute, CanvasAnnotation; position and attribute types (e.g. OffensePosition, DefensePosition, UniversalAttributes, OffenseAttributes, DefenseAttributes).

### Supabase tables (`types/database.types.ts`)

- **profiles** — User profile (id, display_name, default_team_id, tutorial_completed_at, etc.)
- **field_settings** — Per-user field and app settings
- **playbooks** — Playbook metadata
- **plays** — Play metadata and canvas_data (JSON)
- **players** — Player metadata and attributes (JSON columns for positions/attributes)
- **teams** — Team metadata (includes system “Free Agent” team)
- **team_players** — Join table (team_id, player_id, positions, starter flags, locked flags)
- **shared_plays** — Token and play_id for public sharing
- **bug_reports** / **feature_requests** — Feedback

RLS (Row Level Security) is used so users only access their own data.

### Constants and attributes

- **`lib/constants.ts`** — Position labels, attribute groups, default attributes, field defaults, formation slot maps (offense/defense, 5–8 players), `getDefaultFormation()`.
- **`lib/playerAttributes.ts`** — Attribute keys and visibility by position for offense/defense.

---

## Player attributes (all attributes gathered in the app)

Every player has **universal**, **offense**, and **defense** attributes. Each is stored as a numeric value (e.g. 1–10 or 1–5). Default for new attributes is `5`. Groups and labels are defined in `lib/constants.ts`; types in `lib/types.ts`.

### Universal attributes (12)

| Key | Label |
|-----|--------|
| `speed` | Speed |
| `acceleration` | Acceleration |
| `stamina` | Stamina |
| `football_iq` | Football IQ |
| `agility` | Agility |
| `playmaking` | Playmaking |
| `reaction_time` | Reaction Time |
| `deceleration` | Deceleration |
| `change_of_direction` | Change of Direction (COD) |
| `reach` | Reach (Catch Radius) |
| `body_control_balance` | Body Control / Balance |
| `field_vision` | Field Vision |

### Offense attributes (27)

**QB (8):**  
`throwing_power` (Throwing Power), `accuracy` (Accuracy), `decision_making` (Decision Making), `pocket_awareness` (Pocket Awareness), `release_quickness` (Release Quickness), `throw_timing` (Throw Timing (Anticipation)), `throw_on_run` (Throw on the Run), `ball_security` (Ball Security)

**WR (9):**  
`catching` (Catching), `route_running` (Route Running), `release` (Release), `separation` (Separation), `jump_ball` (Jump Ball), `ball_tracking` (Ball Tracking), `contested_catch` (Contested Catch), `hands_consistency` (Hands Consistency), `after_catch_vision` (After Catch Vision)

**C (4):**  
`snapping` (Snapping), `snap_accuracy` (Snap Accuracy), `snap_speed` (Snap Speed), `snap_velocity` (Snap Velocity)

**Evasion (3):**  
`hip_drop` (Hip Drop), `knee_slide` (Knee Slide), `hip_twist` (Hip Twist)

### Defense attributes (23)

**DB (9):**  
`coverage` (Coverage), `ball_hawking` (Ball Hawking), `zone_awareness` (Zone Awareness), `coverage_technique` (Coverage Technique), `ball_skills_defensive` (Ball Skills (Defensive)), `closing_burst` (Closing Burst), `recovery_agility` (Recovery Agility), `flag_pull_technique` (Flag Pull Technique), `play_recognition` (Play Recognition)

**RSH (8):**  
`rush` (Rush), `rush_moves` (Rush Moves), `timing` (Timing), `get_off_burst` (Get-Off Burst), `rush_angle_efficiency` (Rush Angle Efficiency), `closing_burst_rush` (Closing Burst (Rush)), `rush_discipline` (Rush Discipline), `sack_flag_conversion` (Sack / Flag Conversion)

**MLB (5):**  
`play_recognition` (Play Recognition), `field_awareness` (Field Awareness), `zone_recognition` (Zone Recognition), `pursuit_angle` (Pursuit Angle), `coverage_support` (Coverage Support)

**Evasion (2):**  
`flag_pulling` (Flag Pulling), `pursuit` (Pursuit)

### Positions

- **Offense:** `QB` (Quarterback), `WR` (Wide Receiver), `C` (Center)
- **Defense:** `DB` (Defensive Back), `RSH` (Rusher), `MLB` (Middle Linebacker)

### Attribute weights

`lib/constants.ts` defines `ATTRIBUTE_WEIGHTS` (per-attribute multipliers for position-fit scoring). Keys match the attribute keys above; values are used in logic such as `determineBestRole`.

---

## Main routes

| Route | Description |
|-------|-------------|
| `/` | Public landing; CTA to sign up / log in |
| `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/confirm` | Auth flows (Supabase) |
| `/dashboard` | Authenticated dashboard |
| `/playbooks`, `/playbooks/[id]` | Playbooks list and single playbook with its plays |
| `/plays`, `/plays/[id]` | All plays list and play editor (canvas) |
| `/plays/new` | New play (optional `playbookId` query) |
| `/squad` | Squad/roster: teams, players, filters, starters, add/import/export |
| `/simulation/game`, `/simulation/scenario` | Match Sim and Play Lab (Coming Soon) |
| `/shared/[token]` | Public shared play view |
| `/settings` | General, Field, Team, Billing, Account |

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run generate` | Static site generate (if applicable) |
| `npm run preview` | Preview production build locally |
| `npm run update-confirmation-email` | Script using `SUPABASE_ACCESS_TOKEN` to update confirmation email (see script and env) |

---

## Deployment

The app is configured for **Vercel** via `nitro.preset: 'vercel'` in `nuxt.config.ts`. Set the same environment variables in your Vercel project (SUPABASE_URL, SUPABASE_KEY, and optionally SUPABASE_SERVICE_KEY, OPENAI_API_KEY). Build command: `npm run build`; output uses the default Nuxt/Nitro build for Vercel.

---

## Summary

FlagLab is a Nuxt 3 + Supabase application for designing and managing flag football plays and rosters. The codebase uses file-based routing, composables for data and canvas behavior, typed Supabase client, and shadcn-style UI. Auth and RLS ensure multi-tenant isolation. The README above reflects the structure, features, and setup as of the current codebase.
