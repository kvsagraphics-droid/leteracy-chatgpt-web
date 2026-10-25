-- Literacy Verse database schema for Supabase.
-- Run this entire file in Supabase Dashboard -> SQL Editor -> New query.
-- IMPORTANT: replace the example campaigns below before using public fundraising.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default 'Learner',
  role text not null default 'student' check (role in ('student', 'teacher', 'volunteer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null default 'Community contributor',
  description text not null default '',
  resource_type text not null check (resource_type in ('pdf', 'story', 'poem', 'note')),
  body text,
  file_path text,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  submitted_by uuid references auth.users(id) on delete set null,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  constraint books_pdf_has_file_or_text check (resource_type <> 'pdf' or file_path is not null or body is not null)
);

create table if not exists public.podcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  video_url text not null,
  status text not null default 'published' check (status in ('draft', 'published', 'hidden')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.fundraisers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Community project',
  description text not null default '',
  goal_amount numeric(12,2) not null default 0 check (goal_amount >= 0),
  raised_amount numeric(12,2) not null default 0 check (raised_amount >= 0),
  currency text not null default 'USD',
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fundraiser_id uuid not null references public.fundraisers(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0 and amount <= 1000000),
  currency text not null default 'USD',
  status text not null default 'pledged' check (status in ('pledged', 'cancelled', 'paid', 'refunded')),
  created_at timestamptz not null default now()
);

create index if not exists books_status_created_idx on public.books(status, created_at desc);
create index if not exists books_submitter_idx on public.books(submitted_by);
create index if not exists podcasts_status_created_idx on public.podcasts(status, created_at desc);
create index if not exists fundraisers_status_created_idx on public.fundraisers(status, created_at desc);
create index if not exists donations_user_idx on public.donations(user_id, created_at desc);

-- Helper functions run with the table owner's privileges to avoid RLS recursion.
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

revoke all on function public.current_role() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- Automatically create a normal profile on Supabase signup.
-- User metadata may request teacher/volunteer/student, but cannot create an admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'student');
  if requested_role not in ('student', 'teacher', 'volunteer') then
    requested_role := 'student';
  end if;
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, 'learner'), '@', 1)),
    requested_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.podcasts enable row level security;
alter table public.fundraisers enable row level security;
alter table public.donations enable row level security;

-- Profiles: users may read their own profile; only admins may read all profiles.
drop policy if exists "profile owner or admin can read" on public.profiles;
create policy "profile owner or admin can read" on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());
-- No client INSERT/UPDATE/DELETE policy for profiles. The trusted trigger creates it.

-- Library content: public reads only published records. Contributors can see their own pending submissions.
drop policy if exists "published books are public and owners see submissions" on public.books;
create policy "published books are public and owners see submissions" on public.books
for select to anon, authenticated
using (status = 'published' or submitted_by = auth.uid() or public.is_admin());

drop policy if exists "signed in users may submit pending resources" on public.books;
create policy "signed in users may submit pending resources" on public.books
for insert to authenticated
with check (
  submitted_by = auth.uid()
  and status = 'pending'
  and (
    resource_type = 'pdf'
    or public.current_role() in ('teacher', 'admin')
  )
);

drop policy if exists "admins manage book review status" on public.books;
create policy "admins manage book review status" on public.books
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins delete books" on public.books;
create policy "admins delete books" on public.books
for delete to authenticated
using (public.is_admin());

-- Podcasts: everyone can read published videos, only admins can publish/manage them.
drop policy if exists "published podcasts are public" on public.podcasts;
create policy "published podcasts are public" on public.podcasts
for select to anon, authenticated
using (status = 'published' or public.is_admin());

drop policy if exists "admins insert podcasts" on public.podcasts;
create policy "admins insert podcasts" on public.podcasts
for insert to authenticated
with check (public.is_admin() and created_by = auth.uid());

drop policy if exists "admins update podcasts" on public.podcasts;
create policy "admins update podcasts" on public.podcasts
for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins delete podcasts" on public.podcasts;
create policy "admins delete podcasts" on public.podcasts
for delete to authenticated using (public.is_admin());

-- Fundraising campaigns are visible publicly; pledge records require an account.
drop policy if exists "active campaigns are public" on public.fundraisers;
create policy "active campaigns are public" on public.fundraisers
for select to anon, authenticated
using (status = 'active' or public.is_admin());

drop policy if exists "admins manage campaigns" on public.fundraisers;
create policy "admins manage campaigns" on public.fundraisers
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users may record their own pledges" on public.donations;
create policy "users may record their own pledges" on public.donations
for insert to authenticated
with check (
  user_id = auth.uid()
  and status = 'pledged'
  and exists (select 1 from public.fundraisers f where f.id = fundraiser_id and f.status = 'active')
);

drop policy if exists "users read their own pledges or admin reads all" on public.donations;
create policy "users read their own pledges or admin reads all" on public.donations
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Explicit grants; RLS policies still govern which rows and operations are allowed.
grant usage on schema public to anon, authenticated;
grant select on public.books, public.podcasts, public.fundraisers to anon, authenticated;
grant select on public.profiles, public.donations to authenticated;
grant insert on public.books, public.donations to authenticated;
grant update, delete on public.books to authenticated;
grant insert, update, delete on public.podcasts, public.fundraisers to authenticated;

-- Private PDF storage. Published book files can be signed/read by visitors;
-- a contributor may access their own submission folder; admin can review all files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-files', 'book-files', false, 15728640, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 15728640, allowed_mime_types = array['application/pdf'];

drop policy if exists "published pdfs and owners can read book files" on storage.objects;
create policy "published pdfs and owners can read book files" on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'book-files'
  and (
    exists (select 1 from public.books b where b.file_path = name and b.status = 'published')
    or (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
    or public.is_admin()
  )
);

drop policy if exists "users upload to their own book folder" on storage.objects;
create policy "users upload to their own book folder" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'book-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "admins delete book files" on storage.objects;
create policy "admins delete book files" on storage.objects
for delete to authenticated
using (bucket_id = 'book-files' and public.is_admin());

-- No payment gateway is configured by this starter. Pledges are records of intent only.
-- Add vetted campaign rows in the Supabase dashboard before the public launch.
