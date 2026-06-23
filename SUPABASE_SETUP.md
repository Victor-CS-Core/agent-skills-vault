# Supabase setup for Skill Vault

This app now supports optional cloud sync in `index.html` using Supabase.

## 1) Create project

1. Create a Supabase project.
2. In Supabase, go to Project Settings > API and copy:
   - Project URL
   - anon public key

## 2) Create table and policies

Run this SQL in the Supabase SQL editor:

```sql
create extension if not exists pgcrypto;

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_key text not null,
  name text not null,
  description text not null default '',
  category text not null default 'misc',
  source text not null default 'manual',
  source_type text not null default 'manual',
  skill_path text not null default '',
  raw_url text not null default '',
  body text not null default '',
  added_at timestamptz not null default now(),
  unique (user_id, skill_key)
);

alter table public.skills enable row level security;

create policy "skills_select_own"
on public.skills
for select
using (auth.uid() = user_id);

create policy "skills_insert_own"
on public.skills
for insert
with check (auth.uid() = user_id);

create policy "skills_update_own"
on public.skills
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "skills_delete_own"
on public.skills
for delete
using (auth.uid() = user_id);
```

## 3) Enable login method

1. Go to Authentication > Providers.
2. Enable Email provider (magic link).

## 4) Add site URL / redirect URL

1. Go to Authentication > URL configuration.
2. Add your GitHub Pages URL, for example:
   - Site URL: `https://victor-cs-core.github.io/agent-skills-vault/`
   - Redirect URL: `https://victor-cs-core.github.io/agent-skills-vault/`

## 5) Use it in the app

1. Click `Connect Cloud` in the app header.
2. Paste Supabase URL and anon key.
3. Click `Sign in` and use your email.
4. Open the magic link on the same device/browser.
5. Click `Sync now`.

## Notes

- Local IndexedDB is still used as cache/offline storage.
- Cloud sync is per signed-in user.
- Deletions are pushed to cloud when performed from this app.
