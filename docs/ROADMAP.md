# FlagOS — Implementation Roadmap

> **Reference document for the multi-role player platform + mobile-first redesign.**
> Keep this updated as phases complete. Mark phases `[x]` when done.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Design Constraints — Non-Negotiable](#design-constraints)
3. [Architecture Decisions (Locked)](#architecture-decisions)
4. [Database Schema Changes](#database-schema-changes)
5. [New Files](#new-files)
6. [Modified Files](#modified-files)
7. [Implementation Phases](#implementation-phases)
8. [Critical Warnings](#critical-warnings)

---

## Executive Summary

Two parallel tracks being built simultaneously:

**Track 1 — Multi-Role Player Platform**
The app was built for a single user (coach/manager). This track opens it up so coaches can invite players, players can join teams, view shared playbooks, create plays, and see team rosters. Free agents can browse all public teams and request to join.

**Track 2 — Mobile-First Redesign**
The app assumed tablet/desktop (1024px+). The sidebar always occupies space, the play designer has three hardcoded columns, and canvas uses mouse-only events. This track makes every page usable on a 375px phone screen without breaking the desktop experience.

---

## Design Constraints

These are non-negotiable. Every file touched must comply.

1. **Scoped CSS with semantic class names.** No Tailwind utility spam inside components. Use classes like `.team-browser-card`, `.invite-form`, `.mobile-topbar`. Tailwind utility classes are fine for one-off layout in templates.
2. **CSS custom properties only.** `var(--color-primary)`, `var(--color-muted-foreground)`, `var(--color-border)`, `var(--color-card)`, `var(--color-accent)`, `var(--color-background)`, `var(--color-foreground)`, `var(--color-destructive)`. No hardcoded hex except inside `color-mix(in oklch, ...)` patterns.
3. **lucide-vue-next for all icons.** No other icon libraries.
4. **shadcn-nuxt components for all UI.** Input, Button, Select, Label, Dialog, Sheet, etc.
5. **reka-ui for headless primitives.** Uses `model-value` / `@update:model-value` convention, NOT `checked`.
6. **useX() composable pattern.** Every composable returns reactive refs + async functions. No direct Supabase calls from pages.
7. **RLS must match UI gating.** Never rely on UI alone to hide data. Every access control decision has a corresponding Postgres policy.
8. **New pages match existing layout system.** `layout: 'default'` or `layout: 'auth'` in `definePageMeta`. No custom root layouts.
9. **Mobile-first on all new pages.** Build new pages for 375px first, then enhance for desktop.
10. **Breakpoints:** `mobile < 768px` | `tablet 768–1023px` | `desktop ≥ 1024px`. Use `useBreakpoint()`, not ad-hoc window checks.

---

## Architecture Decisions

These are locked. Don't revisit without updating this doc.

### User Roles
- `account_type: 'manager' | 'player'` on `profiles` — primary account type
- `is_app_admin: boolean` on `profiles` — gates Developer tab (replaces `isDev` check in settings)
- A manager CAN hold `team_memberships` rows on other coaches' teams (dual role is supported)
- Sidebar shows "Teams I Manage" + "Teams I'm On" — switching context changes the full nav view

### Team Access
- `team_memberships` is the source of truth for player access to a team's content
- `team_playbooks` is explicit sharing — manager selects which playbooks a team can see
- New teams default to `is_joinable: false` (invite-only). Manager explicitly opens them.

### Billing
- One subscription per coach (`team_subscriptions` keyed by `user_id`)
- Covers all teams the coach manages — no per-team or per-seat pricing
- Players inherit the plan of any team they're a member of where the coach has Pro
- Free agents get the standard free trial, then free tier

### Invite System
- Token-based (`player_invites` table), 7-day expiry, one-time use
- Manager generates link from squad page → email sent via Resend (Supabase Edge Function)
- `/join/[token]` page handles new signup AND existing account flows
- On signup: `account_type: 'player'`, link `players.linked_user_id`, insert `team_memberships`

### Play Creation by Players
- Players can only create plays if they're a member of a team with at least one shared playbook
- If no shared playbook exists: server creates one under coach's `user_id`, shares it, notifies coach
- Play `user_id` = the player's auth ID (authorship is tracked). Playbook `user_id` = coach.

### BLUR.AI
- Running simulations: manager only (requires Pro plan)
- Viewing results: players can see results the coach explicitly shares via `sim_job_team_shares`
- Players see a "Shared Results" section instead of the run-job UI

### Mobile Architecture
- `useBreakpoint()` — single source of truth for responsive breakpoints
- `useAppNav()` — shared state for mobile nav drawer (via `useState`)
- `usePlayDesignerUI()` — active panel state for play designer mobile tabs
- AppSidebar on mobile: `position: fixed` drawer, opens/closes via hamburger
- Play designer on mobile: bottom tab bar (Canvas | Roster | Details), full-screen canvas

### Attribute Visibility
- Player account attribute columns: hidden at UI layer only (no column-level DB security)
- Players can technically query the columns but the app never renders them

---

## Database Schema Changes

### Column Additions to Existing Tables

```sql
-- profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'manager'
  CHECK (account_type IN ('manager', 'player'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_app_admin BOOLEAN NOT NULL DEFAULT false;

-- players
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_players_linked_user ON public.players(linked_user_id);

-- teams
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_joinable BOOLEAN NOT NULL DEFAULT false;

-- notifications (extend type constraint)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('job_completed','job_failed','new_play','player_created_play','join_request','join_approved','join_rejected'));

-- field_settings (already in lib/types.ts but missing from DB)
ALTER TABLE public.field_settings ADD COLUMN IF NOT EXISTS default_player_label_on_canvas TEXT
  DEFAULT 'position' CHECK (default_player_label_on_canvas IN ('number','position','both','none'));
```

### New Tables

```sql
-- Team memberships: links player auth accounts to teams
CREATE TABLE IF NOT EXISTS public.team_memberships (
  id        UUID NOT NULL PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  team_id   UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_team_memberships_team ON public.team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_user ON public.team_memberships(user_id);

-- Policies:
-- SELECT: own rows OR team owner
CREATE POLICY "Members and owners can read memberships" ON public.team_memberships FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR team_id IN (SELECT id FROM public.teams WHERE user_id = auth.uid()));
-- INSERT: self only (via accept invite server route) or service role
CREATE POLICY "Users can join teams" ON public.team_memberships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
-- DELETE: self (leave) or team owner (remove)
CREATE POLICY "Members can leave or owners can remove" ON public.team_memberships FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR team_id IN (SELECT id FROM public.teams WHERE user_id = auth.uid()));

-- Explicit playbook sharing with teams
CREATE TABLE IF NOT EXISTS public.team_playbooks (
  id          UUID NOT NULL PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  playbook_id UUID NOT NULL REFERENCES public.playbooks(id) ON DELETE CASCADE,
  shared_by   UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, playbook_id)
);
ALTER TABLE public.team_playbooks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_team_playbooks_team     ON public.team_playbooks(team_id);
CREATE INDEX IF NOT EXISTS idx_team_playbooks_playbook ON public.team_playbooks(playbook_id);

-- Policies:
CREATE POLICY "Team members and owners can read team playbooks" ON public.team_playbooks FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT id FROM public.teams WHERE user_id = auth.uid())
    OR team_id IN (SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid())
  );
CREATE POLICY "Team owners can manage team playbooks" ON public.team_playbooks FOR ALL TO authenticated
  USING (team_id IN (SELECT id FROM public.teams WHERE user_id = auth.uid()))
  WITH CHECK (team_id IN (SELECT id FROM public.teams WHERE user_id = auth.uid()));

-- Invite tokens
CREATE TABLE IF NOT EXISTS public.player_invites (
  id         UUID NOT NULL PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  token      TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  team_id    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id  UUID REFERENCES public.players(id) ON DELETE SET NULL,
  email      TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.player_invites ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_invites_token ON public.player_invites(token);

-- Policies:
CREATE POLICY "Team owners can manage their invites" ON public.player_invites FOR ALL TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());
-- Read by token (for validation) is done server-side with service role

-- Free agent join requests
CREATE TABLE IF NOT EXISTS public.team_join_requests (
  id           UUID NOT NULL PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id      UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  message      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(user_id, team_id)
);
ALTER TABLE public.team_join_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_team_join_requests_team   ON public.team_join_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_user   ON public.team_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_status ON public.team_join_requests(status);

-- Policies:
CREATE POLICY "Users can read own requests and owners can read team requests" ON public.team_join_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR team_id IN (SELECT id FROM public.teams WHERE user_id = auth.uid()));
CREATE POLICY "Users can submit join requests" ON public.team_join_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Team owners can respond to requests" ON public.team_join_requests FOR UPDATE TO authenticated
  USING (team_id IN (SELECT id FROM public.teams WHERE user_id = auth.uid()));

-- Play Lab result sharing with teams
CREATE TABLE IF NOT EXISTS public.sim_job_team_shares (
  id         UUID NOT NULL PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  job_id     UUID NOT NULL REFERENCES public.sim_jobs(id) ON DELETE CASCADE,
  team_id    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  shared_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sim_job_team_shares ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sim_job_team_shares_job  ON public.sim_job_team_shares(job_id);
CREATE INDEX IF NOT EXISTS idx_sim_job_team_shares_team ON public.sim_job_team_shares(team_id);

-- Policies:
CREATE POLICY "Members and owners can read shared jobs" ON public.sim_job_team_shares FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT id FROM public.teams WHERE user_id = auth.uid())
    OR team_id IN (SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid())
  );
CREATE POLICY "Owners can share/unshare jobs" ON public.sim_job_team_shares FOR ALL TO authenticated
  USING (shared_by = auth.uid())
  WITH CHECK (shared_by = auth.uid());

-- Team subscriptions (one per coach, covers all their teams)
CREATE TABLE IF NOT EXISTS public.team_subscriptions (
  id                     UUID NOT NULL PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  status                 TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('active','canceled','past_due','trialing')),
  plan                   TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro')),
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.team_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies:
CREATE POLICY "Users can read own subscription" ON public.team_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
-- Write: service role only (Stripe webhook)

-- Teams: allow browsing all teams (for /teams page)
CREATE POLICY "Authenticated users can browse all teams" ON public.teams FOR SELECT TO authenticated
  USING (true);
-- Note: This is additive to the existing owner SELECT policy. Supabase merges SELECT policies with OR.

-- team_players: allow members to read their team's roster
CREATE POLICY "Team members can read team roster" ON public.team_players FOR SELECT TO authenticated
  USING (team_id IN (SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid()));

-- plays: allow players to read plays in shared playbooks and insert their own plays
CREATE POLICY "Players can read plays in shared playbooks" ON public.plays FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR playbook_id IN (
      SELECT tp.playbook_id FROM public.team_playbooks tp
      JOIN public.team_memberships tm ON tm.team_id = tp.team_id
      WHERE tm.user_id = auth.uid()
    )
  );
CREATE POLICY "Players can insert plays into shared playbooks" ON public.plays FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      playbook_id IN (SELECT id FROM public.playbooks WHERE user_id = auth.uid())
      OR playbook_id IN (
        SELECT tp.playbook_id FROM public.team_playbooks tp
        JOIN public.team_memberships tm ON tm.team_id = tp.team_id
        WHERE tm.user_id = auth.uid()
      )
    )
  );
```

### DB Trigger Updates

The `handle_new_user()` trigger must:
1. Read `account_type` from `raw_user_meta_data` (default `'manager'`)
2. Write it to `profiles.account_type`
3. Only create the "Free Agent" auto-team when `account_type = 'manager'`

---

## New Files

### Composables
| File | Purpose |
|------|---------|
| `composables/useBreakpoint.ts` | SSR-safe responsive breakpoints (mobile/tablet/desktop) |
| `composables/useAppNav.ts` | Mobile nav drawer shared state |
| `composables/usePlayDesignerUI.ts` | Active panel state for mobile play designer tabs |
| `composables/useAccountType.ts` | Derives isManager/isPlayer/isAppAdmin from loaded profile |
| `composables/useTeamMemberships.ts` | Fetch memberships, active team, leave team |
| `composables/usePlayerInvites.ts` | Generate/revoke/regenerate invites, list pending |
| `composables/useTeamJoinRequests.ts` | Submit/respond to join requests |
| `composables/useTeamPlaybooks.ts` | Share/unshare playbooks, fetch accessible playbooks |
| `composables/useSimJobShares.ts` | Share/unshare Play Lab results with teams |
| `composables/useTeamSubscription.ts` | Own and inherited plan resolution |

### Pages
| File | Purpose |
|------|---------|
| `pages/join/[token].vue` | Invite landing + signup (auth layout) |
| `pages/teams/index.vue` | Team browser for free agents and all users |

### Components
| File | Purpose |
|------|---------|
| `components/playbook/SharePlaybookDialog.vue` | Dialog to share a playbook with team(s) |

### Server Routes
| File | Purpose |
|------|---------|
| `server/api/invites/create.post.ts` | Create invite + send Resend email |
| `server/api/invites/[token]/validate.get.ts` | Validate token (no auth required) |
| `server/api/invites/[token]/accept.post.ts` | Link player, create membership, mark used |
| `server/api/join-requests/[id]/respond.post.ts` | Approve/reject request, create membership |
| `server/api/plays/create-for-team.post.ts` | Create playbook under coach's account for player |
| `server/api/notifications/notify-team.post.ts` | Batch notify team members about a play |

---

## Modified Files

| File | What Changes |
|------|-------------|
| `nuxt.config.ts` | Viewport meta, RESEND_API_KEY in runtimeConfig |
| `lib/types.ts` | Add account_type/is_app_admin to Profile, is_joinable to Team, linked_user_id to Player, 6 new interfaces |
| `types/database.types.ts` | Add Row/Insert/Update for all 6 new tables + new columns |
| `composables/useNotifications.ts` | Extend AppNotification type union, add toast handling for new types |
| `composables/usePlanAccess.ts` | Extend plan resolution to check team subscriptions for players |
| `components/layout/AppSidebar.vue` | Mobile drawer, team switcher, role-aware nav |
| `layouts/default.vue` | Mobile top bar, backdrop |
| `layouts/canvas.vue` | Mobile top bar |
| `pages/auth/signup.vue` | Role picker (manager vs player), slim player form |
| `pages/auth/login.vue` | Handle `?invite=token` query after login |
| `middleware/auth.global.ts` | Add `/join/` to public routes |
| `pages/squad/index.vue` | Invite generation, requests tab, player roster view, mobile |
| `pages/playbooks/index.vue` | Share with team action, player filtered view |
| `pages/plays/index.vue` | Notify team action, author badge, player filtered view |
| `pages/plays/[id].vue` | Notify team button, player save flow, mobile layout, pointer events |
| `components/canvas/CanvasToolbar.vue` | Mobile scrollable toolbar |
| `composables/useCanvasInteraction.ts` | Replace mouse events with pointer events |
| `pages/blurai/playlab/index.vue` | Share results with team, player shared results view |
| `pages/blurai/playlab/[id].vue` | Player read-only view |
| `pages/notifications.vue` | New types, icons, navigation, updated copy |
| `pages/settings.vue` | is_app_admin gate for dev tab, billing/team tab player views, mobile nav |

---

## Implementation Phases

### [ ] Phase 0 — Mobile Foundations
**Goal: App shell works on mobile before we write a single new feature.**

Files:
- **CREATE** `composables/useBreakpoint.ts` — SSR-safe, resize listener, mobile/tablet/desktop
- **CREATE** `composables/useAppNav.ts` — `useState('flagos-mobile-nav')`, open/close/toggle
- **MODIFY** `nuxt.config.ts` — add viewport + safe area meta
- **MODIFY** `components/layout/AppSidebar.vue` — mobile drawer (position:fixed, slide transform, backdrop close, route-change close, close X button in header, override collapsed styles on mobile)
- **MODIFY** `layouts/default.vue` — mobile top bar (hamburger + FlagLab logo + notifications bell), backdrop overlay, hide breadcrumb on mobile
- **MODIFY** `layouts/canvas.vue` — minimal mobile top bar (hamburger + app title; full canvas treatment deferred to Phase 8)

Key implementation notes:
- Sidebar mobile: use `.sidebar--mobile` class (not `.collapsed`) so mobile CSS is isolated
- Sidebar on mobile always renders full-width (280px), ignoring the desktop `collapsed` state
- Mobile top bar height: 48px (`h-12`), `border-b border-border`, `bg-background`
- Backdrop z-index: 49 (below sidebar z-50, above content)
- Route watcher in AppSidebar closes drawer on navigation
- `isMobile` guard on mouseenter/hover so touch devices don't trigger hover states
- CSS transition on mobile sidebar: `transform` not `width` (avoids layout reflow)

---

### [ ] Phase 1 — Database Migrations
**Goal: All schema changes in Supabase before any UI touches them.**

Apply all SQL from the [Database Schema Changes](#database-schema-changes) section above.
File to track: append to `supabase/migrations/` as `002_player_platform.sql`.

Testability: Supabase Table Editor confirms all 6 new tables + new columns exist. RLS is enabled on all new tables.

---

### [ ] Phase 2 — TypeScript Types
**Goal: Compile-time safety for all new DB shapes.**

- `lib/types.ts` — add to Profile, Team, Player interfaces + 6 new interfaces
- `types/database.types.ts` — add Row/Insert/Update blocks for new tables + new column additions

Gate: `npx nuxi typecheck` passes with zero new errors.

---

### [ ] Phase 3 — Core Composables
Files: see [New Files — Composables](#new-files) above.
Also modify `useNotifications.ts` and `usePlanAccess.ts`.

Key notes:
- `useAccountType` — reads from `useState('profile')`, no DB fetch, purely computed
- `useTeamMemberships` — `activeTeamId` persisted in `localStorage('flagos-active-team-id')`
- `usePlayerInvites.createInvite()` — calls server route (not Supabase directly) because Resend email requires server
- `useTeamSubscription.fetchCoachSubscription()` — server route only (players can't read other users' rows via RLS)

---

### [ ] Phase 4 — Server Routes
Files: see [New Files — Server Routes](#new-files) above.
Also: add `RESEND_API_KEY` to `nuxt.config.ts` private runtimeConfig and `.env.example`.

Pattern: identical to `server/api/account/delete.post.ts` (defineEventHandler + serverSupabaseUser + service role client).

---

### [ ] Phase 5 — New Pages
- `pages/join/[token].vue` (auth layout) — invite flow
- `pages/teams/index.vue` (default layout) — team browser
- `middleware/auth.global.ts` — add `/join/` to public routes
- `pages/auth/login.vue` — handle `?invite=token` query after sign-in

Both pages: mobile-first from day one. Grid cols: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.

---

### [ ] Phase 6 — Auth Signup Flow
- `pages/auth/signup.vue` — role picker cards at top, slim player form

Role picker: `.role-picker` (flex row → col on mobile), `.role-card`, `.role-card.active`. Manager path = existing form. Player path = name + email + password only.

---

### [ ] Phase 7 — Squad Page
- `pages/squad/index.vue` — manager additions + player roster view + mobile

Manager: invite generation per player, pending invite badges, FlagOS joined indicator, Requests tab, `is_joinable` toggle in team create dialog.
Player: Roster view (no attributes, no editing, single column on mobile).
Mobile: player rows as stacked cards, attributes panel as bottom sheet.

---

### [ ] Phase 8 — Playbooks + Plays + Canvas Mobile
**Most work in a single phase.**

- `pages/playbooks/index.vue` + `SharePlaybookDialog.vue`
- `pages/plays/index.vue` — notify team action, author badges
- `pages/plays/[id].vue` — notify button, player save flow, **full mobile layout (bottom tabs)**
- `components/canvas/CanvasToolbar.vue` — horizontal scroll on mobile
- `composables/useCanvasInteraction.ts` — **pointer events (critical)**
- `composables/usePlayDesignerUI.ts` — active panel state

Play designer mobile layout:
```
Mobile (< lg):
  MobilePlayHeader (48px) — hamburger | play name | save
  ActivePanel (fills screen) — canvas | roster | details based on activePanel
  BottomTabBar (44px) — Field | Roster | Details tabs

Desktop (≥ lg):
  Existing 3-column layout unchanged
```

Canvas pointer events: replace all `mouse*` with `pointer*`. Add `setPointerCapture` on drag start. Add `touch-action: none` to canvas wrapper.

---

### [ ] Phase 9 — Play Lab
- Share results with team (manager)
- Player "Shared Results" view (read-only)
- Mobile: collapsible config panel

---

### [ ] Phase 10 — Notifications + Settings
- `pages/notifications.vue` — new type handling, icons, navigation, copy
- `pages/settings.vue` — is_app_admin gate, player billing view, player team tab, mobile horizontal tab nav

Settings mobile: below `xl`, vertical left nav becomes horizontal scrolling tab bar at top.

---

### [ ] Phase 11 — AppSidebar Team Switcher
**High-risk change — save for after all other phases stable.**

- Change `navGroups` from `const` to `computed<NavGroup[]>`
- Update `sortedNavGroups` and `displayNavGroups` chains to use `.value`
- Add team switcher between `.sidebar-nav` and `.sidebar-footer`
- Two sections in switcher popup: "Teams I Manage" + "Teams I'm On"
- `activeContext` computed drives nav item visibility

---

### [ ] Phase 12 — Routing Finalization
- Breadcrumb: add `/teams` entry
- Audit player-accessible routes for any middleware blocks

---

### [ ] Phase 13 — Cross-Cutting Cleanup + RLS Audit
- Walk every new composable query, verify matching RLS policy
- Expand `AppNotification` metadata union type
- All Dialog components: `w-[calc(100vw-2rem)] sm:max-w-lg` + safe-area padding
- `AppBreadcrumb` hide on mobile (already hidden from Phase 0, just confirm)
- `.env.example` updated with `RESEND_API_KEY`

---

### [ ] Phase 14 — Mobile Polish Pass
**Dedicated sweep over pages not heavily modified in main phases.**

- `/dashboard.vue` — stat grid + recent plays grid at all breakpoints
- `/playbooks/[id].vue` — play grid inside playbook detail
- `/blurai/playlab/[id].vue` — replay viewer, stats tables (`overflow-x-auto`)
- All dialogs system-wide — shared `.dialog-mobile-safe` rule in `assets/css/main.css`
- Device testing: iPhone 14 Pro (393px), iPad (768px), iPad Pro (1024px) on all key pages

---

## Critical Warnings

1. **`navGroups` in AppSidebar (Phase 11):** It's a static `const` referencing `isActive()` which is a function. Converting to `computed` means `isActive` must be computed-friendly (it already is since it reads `route.path`). Trace `sortedNavGroups` → `displayNavGroups` → `visibleNavGroups` chains — all three must use `.value` after the change.

2. **`isDev` in settings.vue (Phase 10):** Currently `const isDev = import.meta.dev` (a boolean constant). Changing to `computed(() => isAppAdmin.value || import.meta.dev)` requires updating `tabIds` on line 838 to use `.value` inside the computed callback.

3. **Player INSERT on `plays`:** Player's `user_id` = their own auth ID (not the coach). The `playbook_id` points to the coach's playbook. This is intentional — authorship tracked via `user_id`. The INSERT RLS checks `user_id = auth.uid()` which is the player's ID. ✓

4. **"Browse all teams" RLS policy:** Uses `USING (true)` for authenticated users on `teams` SELECT. This is additive to the existing owner policy (Supabase merges SELECT policies with OR). It is safe because it's SELECT only — INSERT/UPDATE/DELETE policies are unaffected.

5. **AppSidebar mobile drawer z-index stack:** Sidebar = `z-50`, Backdrop = `z-49`, SimHistorySidebar = check its z-index to ensure no conflict.

6. **Pointer events in canvas (Phase 8):** `pointerdown/move/up/cancel` replaces `mousedown/move/up/leave`. Must add `setPointerCapture(e.pointerId)` on drag start and `releasePointerCapture` on drag end. Add `touch-action: none` to the `<canvas>` element wrapper. Test on iPad to ensure no scroll fighting.

7. **Resend email:** Requires `RESEND_API_KEY` in `.env` and a verified sending domain in Resend. The invite email is sent from the server route, not client-side. Never expose the API key to the browser.

8. **`handle_new_user` trigger update (Phase 1):** Must be done in Supabase SQL editor since it's a Postgres trigger on `auth.users`. Changes to this trigger affect every future signup — test carefully with a new test account after applying.

---

*Last updated: Phase 0 in progress*
