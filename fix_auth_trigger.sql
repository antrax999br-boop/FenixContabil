-- Fix user creation error
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  user_name text;
begin
  -- Try to get name from metadata, otherwise default to email prefix
  user_name := new.raw_user_meta_data->>'name';
  
  if user_name is null or user_name = '' then
    user_name := split_part(new.email, '@', 1);
  end if;

  insert into public.profiles (id, name, email, role)
  values (new.id, user_name, new.email, 'usuario');
  return new;
end;
$$ language plpgsql security definer;
