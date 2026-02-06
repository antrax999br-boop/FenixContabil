
-- Add avatar_url and job_title columns to profiles table
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists job_title text default 'Analista Júnior';

-- Update job_title based on existing roles as a starting point
update public.profiles 
set job_title = case 
    when role = 'admin' then 'Contador Sênior' 
    else 'Analista Júnior' 
end
where job_title is null;

-- Ensure profiles bucket exists for avatars
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatars are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );
