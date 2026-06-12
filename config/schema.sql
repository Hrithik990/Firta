-- ============================================================
--  FIRTA — Supabase Schema
--  Paste into: Supabase Dashboard → SQL Editor → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            bigint generated always as identity primary key,
  full_name     text not null,
  email         text not null unique,
  phone         text,
  password_hash text not null,
  plan          text not null default 'free' check (plan in ('free','pro','enterprise')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

CREATE TABLE IF NOT EXISTS items (
  id               bigint generated always as identity primary key,
  user_id          bigint not null references users(id) on delete cascade,
  name             text not null,
  category         text not null,
  description      text,
  finder_message   text,
  tag_id           text not null unique,
  status           text not null default 'active' check (status in ('active','lost','found','inactive')),
  lost_mode        boolean default false,
  qr_image_path    text,   -- stores base64 data URL (works on Vercel)
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

CREATE TABLE IF NOT EXISTS scans (
  id           bigint generated always as identity primary key,
  item_id      bigint not null references items(id) on delete cascade,
  scanned_at   timestamptz default now(),
  ip_address   text,
  user_agent   text
);

CREATE TABLE IF NOT EXISTS messages (
  id           bigint generated always as identity primary key,
  item_id      bigint not null references items(id) on delete cascade,
  sender_type  text not null check (sender_type in ('finder','owner')),
  content      text not null,
  is_read      boolean default false,
  sent_at      timestamptz default now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN new.updated_at = now(); RETURN new; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS items_updated_at ON items;
CREATE TRIGGER items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Disable RLS (server uses service key)
ALTER TABLE users    DISABLE ROW LEVEL SECURITY;
ALTER TABLE items    DISABLE ROW LEVEL SECURITY;
ALTER TABLE scans    DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- SCANS: add location columns (run this if table already exists)
ALTER TABLE scans ADD COLUMN IF NOT EXISTS latitude  double precision;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS location_name text;

-- MESSAGES: add location columns
ALTER TABLE messages ADD COLUMN IF NOT EXISTS latitude  double precision;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS location_name text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS finder_name text;

-- EMAIL VERIFICATION
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token_expires timestamptz;

-- FORGOT PASSWORD
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires timestamptz;

-- Bio field for settings
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
