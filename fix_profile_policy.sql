
-- Allow users to update their own profile
create policy "Users can update own profile"
on public.profiles
for update
using ( auth.uid() = id );
