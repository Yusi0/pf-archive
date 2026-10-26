-- Post view counter. Run once in the Supabase dashboard (SQL editor).
-- Readers can read the counts; the only way to change one is increment_post_view(), which adds 1.

create table if not exists public.post_views (
  slug  text primary key check (slug ~ '^[A-Za-z0-9._-]{1,80}$'),
  views bigint not null default 0
);

alter table public.post_views enable row level security;

drop policy if exists "anyone can read post views" on public.post_views;
create policy "anyone can read post views"
  on public.post_views for select
  to anon, authenticated
  using (true);

create or replace function public.increment_post_view(p_slug text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  total bigint;
begin
  if p_slug is null or p_slug !~ '^[A-Za-z0-9._-]{1,80}$' then
    raise exception 'invalid slug';
  end if;

  insert into public.post_views as v (slug, views)
  values (p_slug, 1)
  on conflict (slug) do update set views = v.views + 1
  returning v.views into total;

  return total;
end;
$$;

revoke all on function public.increment_post_view(text) from public;
grant execute on function public.increment_post_view(text) to anon, authenticated;
