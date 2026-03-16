-- =============================================================================
-- FlagLab — Master Database Schema
-- =============================================================================
-- Generated from Supabase production database.
-- Run against a fresh Supabase project to recreate the full schema.
--
-- Prerequisites: Supabase project with auth.users, uuid-ossp, and pgcrypto
-- extensions already enabled (Supabase defaults).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions (installed by Supabase or enabled manually)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp"      WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto"        WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_graphql"      WITH SCHEMA graphql;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "supabase_vault"  WITH SCHEMA vault;


-- ═════════════════════════════════════════════════════════════════════════════
-- TABLES
-- ═════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- One row per auth.users entry. Created automatically by the
-- handle_new_user() trigger on auth.users INSERT.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID        NOT NULL PRIMARY KEY REFERENCES auth.users (id),
  display_name         TEXT,
  default_team_id      UUID,
  tutorial_completed_at TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- teams
-- A user can have multiple teams; a "Free Agent" team is auto-created on
-- profile creation via handle_new_profile().
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.teams (
  id          UUID        NOT NULL PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users (id),
  name        TEXT        NOT NULL,
  description TEXT        DEFAULT ''::text,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- players
-- Roster of players owned by a user. Contains universal, offense, and defense
-- attribute JSONB blobs plus starter flags (legacy — per-team starters are in
-- team_players).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.players (
  id                    UUID        NOT NULL PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id               UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id),
  name                  TEXT        NOT NULL,
  number                INT         NOT NULL,
  photo_url             TEXT,
  offense_positions     TEXT[]      DEFAULT '{}'::text[],
  defense_positions     TEXT[]      DEFAULT '{}'::text[],
  universal_attributes  JSONB       DEFAULT '{"speed":5,"agility":5,"stamina":5,"football_iq":5,"acceleration":5}'::jsonb,
  offense_attributes    JSONB       DEFAULT '{"speed":5,"release":5,"stamina":5,"accuracy":5,"blocking":5,"catching":5,"hip_drop":5,"snapping":5,"throwing":5,"hip_twist":5,"jump_ball":5,"knee_slide":5,"separation":5,"football_iq":5,"route_running":5,"throwing_power":5,"decision_making":5,"pocket_awareness":5}'::jsonb,
  defense_attributes    JSONB       DEFAULT '{"rush":5,"speed":5,"timing":5,"agility":5,"pursuit":5,"stamina":5,"coverage":5,"rush_moves":5,"football_iq":5,"ball_hawking":5,"flag_pulling":5,"zone_awareness":5,"field_awareness":5,"play_recognition":5}'::jsonb,
  offense_starter       BOOLEAN     NOT NULL DEFAULT false,
  defense_starter       BOOLEAN     NOT NULL DEFAULT false,
  height                INT,
  weight                INT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- team_players
-- Junction table: which players belong to which team, with per-team
-- starter/position assignments and lock flags.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.team_players (
  id                     UUID    NOT NULL PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  team_id                UUID    NOT NULL REFERENCES public.teams (id),
  player_id              UUID    NOT NULL REFERENCES public.players (id),
  offense_position       TEXT,
  defense_position       TEXT,
  offense_starter        BOOLEAN NOT NULL DEFAULT false,
  defense_starter        BOOLEAN NOT NULL DEFAULT false,
  offense_starter_locked BOOLEAN DEFAULT false,
  defense_starter_locked BOOLEAN DEFAULT false,
  UNIQUE (team_id, player_id)
);

ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- playbooks
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.playbooks (
  id          UUID        NOT NULL PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id     UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id),
  name        TEXT        NOT NULL,
  description TEXT        DEFAULT ''::text,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- plays
-- Individual plays belong to a playbook. canvas_data stores the full play
-- design (players, routes, annotations) as JSONB.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.plays (
  id          UUID        NOT NULL PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id     UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id),
  playbook_id UUID        NOT NULL REFERENCES public.playbooks (id),
  name        TEXT        NOT NULL,
  play_type   TEXT        NOT NULL DEFAULT 'offense'::text,
  formation   TEXT        DEFAULT ''::text,
  canvas_data JSONB       DEFAULT '{"players":[],"version":1,"annotations":[]}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT plays_play_type_check CHECK (play_type = ANY (ARRAY['offense'::text, 'defense'::text]))
);

ALTER TABLE public.plays ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- field_settings
-- Per-user settings for field dimensions, play designer preferences, and
-- appearance. One row per user.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.field_settings (
  id                              UUID        NOT NULL PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id                         UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id),
  field_length                    INT         NOT NULL DEFAULT 70,
  field_width                     INT         NOT NULL DEFAULT 40,
  endzone_size                    INT         NOT NULL DEFAULT 10,
  line_of_scrimmage               INT         NOT NULL DEFAULT 25,
  first_down                      INT         DEFAULT 25,
  default_play_view               TEXT        DEFAULT 'fit'::text,
  default_play_type               TEXT        DEFAULT 'offense'::text,
  show_ghost_defense_by_default   BOOLEAN     DEFAULT false,
  default_ghost_defense_play_id   UUID        REFERENCES public.plays (id),
  sidebar_start_collapsed         BOOLEAN     DEFAULT false,
  show_player_names_on_canvas     BOOLEAN     DEFAULT true,
  default_offense_starter_count   INT         DEFAULT 5,
  default_defense_starter_count   INT         DEFAULT 5,
  theme                           TEXT        DEFAULT 'system'::text,
  created_at                      TIMESTAMPTZ DEFAULT now(),
  updated_at                      TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT field_settings_default_play_view_check  CHECK (default_play_view = ANY (ARRAY['fit'::text, 'full'::text])),
  CONSTRAINT field_settings_default_play_type_check  CHECK (default_play_type = ANY (ARRAY['offense'::text, 'defense'::text])),
  CONSTRAINT field_settings_offense_count_check      CHECK (default_offense_starter_count IS NULL OR (default_offense_starter_count >= 5 AND default_offense_starter_count <= 8)),
  CONSTRAINT field_settings_defense_count_check      CHECK (default_defense_starter_count IS NULL OR (default_defense_starter_count >= 5 AND default_defense_starter_count <= 8)),
  CONSTRAINT field_settings_theme_check              CHECK (theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text]))
);

ALTER TABLE public.field_settings ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- shared_plays
-- Publicly shareable snapshots of plays. share_token is a random hex string.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shared_plays (
  id             UUID        NOT NULL PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id        UUID        NOT NULL REFERENCES auth.users (id),
  play_id        UUID        NOT NULL REFERENCES public.plays (id),
  share_token    TEXT        NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text),
  play_snapshot  JSONB       NOT NULL,
  play_name      TEXT        NOT NULL,
  play_type      TEXT        NOT NULL,
  play_formation TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT shared_plays_play_type_check CHECK (play_type = ANY (ARRAY['offense'::text, 'defense'::text]))
);

ALTER TABLE public.shared_plays ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- bug_reports
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id          UUID        NOT NULL PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users (id),
  description TEXT        NOT NULL,
  page_url    TEXT,
  image_urls  TEXT[]      DEFAULT '{}'::text[],
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- feature_requests
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feature_requests (
  id          UUID        NOT NULL PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users (id),
  type        TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  page_url    TEXT,
  image_urls  TEXT[]      DEFAULT '{}'::text[],
  created_at  TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT feature_requests_type_check CHECK (type = ANY (ARRAY['feature'::text, 'feedback'::text]))
);

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- sim_jobs
-- Tracks simulation jobs (batch_sim, playbook_test). Status progression:
-- queued → running → completed | failed | cancelled.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sim_jobs (
  id             UUID             NOT NULL PRIMARY KEY,
  user_id        UUID             REFERENCES auth.users (id),
  job_type       TEXT             NOT NULL,
  status         TEXT             NOT NULL,
  progress       DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  progress_label TEXT             NOT NULL DEFAULT ''::text,
  job_metadata   JSONB,
  error          TEXT,
  result_ref     TEXT,
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ      NOT NULL DEFAULT now(),

  CONSTRAINT sim_jobs_job_type_check CHECK (job_type = ANY (ARRAY['batch_sim'::text, 'playbook_test'::text])),
  CONSTRAINT sim_jobs_status_check   CHECK (status   = ANY (ARRAY['queued'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))
);

-- Note: RLS is NOT enabled on sim_jobs (service role writes from engine).


-- ─────────────────────────────────────────────────────────────────────────────
-- sim_results
-- Stores the full result JSON for a completed simulation job.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sim_results (
  id          UUID        NOT NULL PRIMARY KEY,
  job_id      UUID        NOT NULL REFERENCES public.sim_jobs (id),
  result_json JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Note: RLS is NOT enabled on sim_results (service role writes from engine).


-- ═════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═════════════════════════════════════════════════════════════════════════════

-- profiles: PK only (id = auth.users.id)

-- teams
CREATE INDEX IF NOT EXISTS idx_teams_user ON public.teams USING btree (user_id);

-- players
CREATE INDEX IF NOT EXISTS idx_players_user ON public.players USING btree (user_id);

-- team_players
CREATE INDEX IF NOT EXISTS idx_team_players_team   ON public.team_players USING btree (team_id);
CREATE INDEX IF NOT EXISTS idx_team_players_player ON public.team_players USING btree (player_id);
-- UNIQUE (team_id, player_id) already created by table definition

-- playbooks
CREATE INDEX IF NOT EXISTS idx_playbooks_user ON public.playbooks USING btree (user_id);

-- plays
CREATE INDEX IF NOT EXISTS idx_plays_user     ON public.plays USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_plays_playbook ON public.plays USING btree (playbook_id);

-- field_settings
CREATE INDEX IF NOT EXISTS idx_field_settings_user ON public.field_settings USING btree (user_id);

-- shared_plays
CREATE INDEX IF NOT EXISTS shared_plays_play_id_idx ON public.shared_plays USING btree (play_id);
CREATE INDEX IF NOT EXISTS shared_plays_user_id_idx ON public.shared_plays USING btree (user_id);
CREATE INDEX IF NOT EXISTS shared_plays_token_idx   ON public.shared_plays USING btree (share_token) WHERE (is_active = true);
-- UNIQUE (share_token) already created by table definition

-- bug_reports
CREATE INDEX IF NOT EXISTS bug_reports_user_id_idx    ON public.bug_reports USING btree (user_id);
CREATE INDEX IF NOT EXISTS bug_reports_created_at_idx ON public.bug_reports USING btree (created_at DESC);

-- feature_requests
CREATE INDEX IF NOT EXISTS feature_requests_user_id_idx    ON public.feature_requests USING btree (user_id);
CREATE INDEX IF NOT EXISTS feature_requests_type_idx       ON public.feature_requests USING btree (type);
CREATE INDEX IF NOT EXISTS feature_requests_created_at_idx ON public.feature_requests USING btree (created_at DESC);

-- sim_jobs
CREATE INDEX IF NOT EXISTS idx_sim_jobs_user_id    ON public.sim_jobs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_sim_jobs_status     ON public.sim_jobs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_sim_jobs_created_at ON public.sim_jobs USING btree (created_at DESC);

-- sim_results
CREATE INDEX IF NOT EXISTS idx_sim_results_job_id ON public.sim_results USING btree (job_id);


-- ═════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ═════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- handle_new_user()
-- Triggered on auth.users INSERT. Creates the initial profile row using the
-- display_name from metadata or the email local part.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- handle_new_profile()
-- Triggered on profiles INSERT. Creates the default "Free Agent" team and
-- sets it as the user's default_team_id.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
begin
  insert into public.teams (user_id, name, description)
  values (new.id, 'Free Agent', 'Unassigned players');

  update public.profiles
  set default_team_id = (
    select id from public.teams
    where user_id = new.id and name = 'Free Agent'
    limit 1
  )
  where id = new.id;

  return new;
end;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═════════════════════════════════════════════════════════════════════════════

-- auth.users → profiles (managed by Supabase Dashboard or migration)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
--
-- Note: This trigger lives on auth.users which is managed by Supabase. It was
-- created via the Supabase Dashboard. Uncomment if recreating manually.

-- profiles → teams (auto-create "Free Agent" team)
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();


-- ═════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY POLICIES
-- ═════════════════════════════════════════════════════════════════════════════

-- ── profiles ─────────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING  ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);


-- ── teams ────────────────────────────────────────────────────────────────────

CREATE POLICY "Users can select own teams"
  ON public.teams FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own teams"
  ON public.teams FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own teams"
  ON public.teams FOR UPDATE
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own teams"
  ON public.teams FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── players ──────────────────────────────────────────────────────────────────

CREATE POLICY "Users can select own players"
  ON public.players FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own players"
  ON public.players FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own players"
  ON public.players FOR UPDATE
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own players"
  ON public.players FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── team_players ─────────────────────────────────────────────────────────────
-- Access is scoped through the parent team's user_id.

CREATE POLICY "Users can select own team_players"
  ON public.team_players FOR SELECT
  USING (team_id IN (SELECT id FROM teams WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Users can insert own team_players"
  ON public.team_players FOR INSERT
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Users can update own team_players"
  ON public.team_players FOR UPDATE
  USING  (team_id IN (SELECT id FROM teams WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Users can delete own team_players"
  ON public.team_players FOR DELETE
  USING (team_id IN (SELECT id FROM teams WHERE user_id = (SELECT auth.uid())));


-- ── playbooks ────────────────────────────────────────────────────────────────

CREATE POLICY "Users can select own playbooks"
  ON public.playbooks FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own playbooks"
  ON public.playbooks FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own playbooks"
  ON public.playbooks FOR UPDATE
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own playbooks"
  ON public.playbooks FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── plays ────────────────────────────────────────────────────────────────────

CREATE POLICY "Users can select own plays"
  ON public.plays FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own plays"
  ON public.plays FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own plays"
  ON public.plays FOR UPDATE
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own plays"
  ON public.plays FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── field_settings ───────────────────────────────────────────────────────────

CREATE POLICY "Users can select own field_settings"
  ON public.field_settings FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own field_settings"
  ON public.field_settings FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own field_settings"
  ON public.field_settings FOR UPDATE
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own field_settings"
  ON public.field_settings FOR DELETE
  USING ((SELECT auth.uid()) = user_id);


-- ── shared_plays ─────────────────────────────────────────────────────────────

CREATE POLICY "Users can manage their own shared plays"
  ON public.shared_plays FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view active shared plays by token"
  ON public.shared_plays FOR SELECT
  TO anon, authenticated
  USING (is_active = true);


-- ── bug_reports ──────────────────────────────────────────────────────────────

CREATE POLICY "Users can view their own bug reports"
  ON public.bug_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bug reports"
  ON public.bug_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can read all bug reports"
  ON public.bug_reports FOR SELECT
  TO service_role
  USING (true);


-- ── feature_requests ─────────────────────────────────────────────────────────

CREATE POLICY "Users can view their own feature requests"
  ON public.feature_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feature requests"
  ON public.feature_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- ═════════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ═════════════════════════════════════════════════════════════════════════════
-- These are created via Supabase Dashboard / API, not raw SQL.
-- Documented here for reference.
--
-- Bucket: bug-reports
--   Public: true
--   Max file size: 5 MB
--   Allowed MIME types: image/jpeg, image/png, image/gif, image/webp
--
-- Bucket: feature-requests
--   Public: true
--   Max file size: 5 MB
--   Allowed MIME types: image/jpeg, image/png, image/gif, image/webp


-- ═════════════════════════════════════════════════════════════════════════════
-- MIGRATION HISTORY (for reference)
-- ═════════════════════════════════════════════════════════════════════════════
-- 20260210024728  initial_schema
-- 20260210030219  expand_player_attributes
-- 20260210030839  add_starter_bench_columns
-- 20260210033807  add_mlb_and_flag_football_attributes
-- 20260210050213  add_team_player_starter_flags
-- 20260210054647  replace_blocking_with_center_attrs
-- 20260210055821  create_free_agent_team
-- 20260210070446  add_auth_system
-- 20260210220004  optimize_rls_initplan
-- 20260210232609  add_universal_attributes_and_consolidate
-- 20260213023743  add_first_down_to_field_settings
-- 20260213050048  add_general_preferences_to_field_settings
-- 20260213202110  add_theme_to_field_settings
-- 20260214044750  backfill_new_player_attributes_inferred
-- 20260214044900  backfill_reach_from_height
-- 20260214045009  backfill_new_attributes_from_current_values
-- 20260222025059  add_bug_reports_table
-- 20260222025111  add_bug_reports_storage_bucket
-- 20260222025119  make_bug_reports_bucket_public
-- 20260222030305  add_feature_requests_table
-- 20260222030311  add_feature_requests_storage_bucket
-- 20260222034046  add_shared_plays_table
-- 20260223213335  add_default_starter_counts_to_field_settings
-- 20260223220255  add_tutorial_completed_at_to_profiles
-- 20260311032044  add_sim_jobs_and_results
-- 20260312000557  add_user_id_and_cancelled_status_to_sim_jobs
-- 20260312022704  add_job_metadata_to_sim_jobs
