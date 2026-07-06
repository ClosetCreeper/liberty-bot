-- Run this once in the Supabase SQL editor for your project.

-- Key/value store for channel + role config, edited via /setup
create table if not exists bot_config (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- One row per /infraction log
create table if not exists infractions (
  id bigint generated always as identity primary key,
  guild_id text not null,
  user_id text not null,
  user_tag text not null,
  type text not null,
  reason text not null,
  moderator_id text not null,
  moderator_tag text not null,
  created_at timestamptz default now()
);

-- One row per /promotion give
create table if not exists promotions (
  id bigint generated always as identity primary key,
  guild_id text not null,
  user_id text not null,
  user_tag text not null,
  role_id text not null,
  role_name text not null,
  reason text not null,
  moderator_id text not null,
  moderator_tag text not null,
  created_at timestamptz default now()
);

-- One row per /feedback submit
create table if not exists feedback (
  id bigint generated always as identity primary key,
  guild_id text not null,
  target_user_id text not null,
  target_user_tag text not null,
  rating integer not null,
  comments text,
  submitted_by_id text not null,
  submitted_by_tag text not null,
  created_at timestamptz default now()
);

create index if not exists infractions_user_id_idx on infractions (user_id);
create index if not exists promotions_user_id_idx on promotions (user_id);
create index if not exists feedback_target_user_id_idx on feedback (target_user_id);
