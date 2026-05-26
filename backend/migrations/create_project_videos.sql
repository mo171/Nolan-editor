-- Migration: project_videos table (with audio_url for TTS fallback)
-- Run this in your Supabase SQL editor

create table if not exists public.project_videos (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  task_id     text not null,
  video_url   text not null,
  audio_url   text,          -- optional TTS narration track (fallback if Kling has no audio)
  prompt      text,
  created_at  timestamptz not null default now()
);

-- Index for fast per-project lookup
create index if not exists idx_project_videos_project_id
  on public.project_videos(project_id);

-- If the table already exists, add the audio_url column
alter table public.project_videos
  add column if not exists audio_url text;

-- RLS: allow service role / anon
alter table public.project_videos enable row level security;

drop policy if exists "Allow all on project_videos" on public.project_videos;
create policy "Allow all on project_videos"
  on public.project_videos
  for all
  using (true)
  with check (true);
