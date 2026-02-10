-- FlagOS Database Schema

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Field Settings
create table field_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null default 'admin',
  field_length integer not null default 70,
  field_width integer not null default 40,
  endzone_size integer not null default 10,
  line_of_scrimmage integer not null default 25,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Playbooks
create table playbooks (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null default 'admin',
  name text not null,
  description text default '',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Plays
create table plays (
  id uuid primary key default uuid_generate_v4(),
  playbook_id uuid not null references playbooks(id) on delete cascade,
  user_id text not null default 'admin',
  name text not null,
  play_type text not null default 'offense' check (play_type in ('offense', 'defense')),
  formation text default '',
  canvas_data jsonb default '{"version":1,"players":[],"annotations":[]}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Players
create table players (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null default 'admin',
  name text not null,
  number integer not null,
  photo_url text,
  offense_positions text[] default '{}',
  defense_positions text[] default '{}',
  offense_attributes jsonb default '{"speed":5,"catching":5,"throwing":5,"route_running":5}',
  defense_attributes jsonb default '{"speed":5,"coverage":5,"rush":5,"agility":5}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Teams
create table teams (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null default 'admin',
  name text not null,
  description text default '',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Team Players (junction table)
create table team_players (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  offense_position text,
  defense_position text,
  unique(team_id, player_id)
);

-- Indexes
create index idx_playbooks_user on playbooks(user_id);
create index idx_plays_playbook on plays(playbook_id);
create index idx_plays_user on plays(user_id);
create index idx_players_user on players(user_id);
create index idx_teams_user on teams(user_id);
create index idx_team_players_team on team_players(team_id);
create index idx_team_players_player on team_players(player_id);
create index idx_field_settings_user on field_settings(user_id);

-- Row Level Security (disabled for now since we use user_id = 'admin')
alter table field_settings enable row level security;
alter table playbooks enable row level security;
alter table plays enable row level security;
alter table players enable row level security;
alter table teams enable row level security;
alter table team_players enable row level security;

-- Allow all operations for now (no auth)
create policy "Allow all on field_settings" on field_settings for all using (true) with check (true);
create policy "Allow all on playbooks" on playbooks for all using (true) with check (true);
create policy "Allow all on plays" on plays for all using (true) with check (true);
create policy "Allow all on players" on players for all using (true) with check (true);
create policy "Allow all on teams" on teams for all using (true) with check (true);
create policy "Allow all on team_players" on team_players for all using (true) with check (true);
