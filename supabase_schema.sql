-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create tables
create table public.profiles (
  id uuid references auth.users not null primary key,
  name text not null,
  email text,
  role text check (role in ('admin', 'usuario')) default 'usuario',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  cnpj text not null,
  interest_percent numeric not null default 0,
  observations text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade not null,
  invoice_number text, 
  original_value numeric not null,
  due_date date not null,
  status text check (status in ('PAGO', 'NAO_PAGO', 'ATRASADO')) default 'NAO_PAGO',
  days_overdue int default 0,
  final_value numeric not null,
  payment_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.calendar_events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  event_date date not null,
  event_time time not null,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.invoices enable row level security;
alter table public.calendar_events enable row level security;

-- Policies (Shared access for all authenticated users as per requirements)
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Authenticated users can select clients" on public.clients for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert clients" on public.clients for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update clients" on public.clients for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete clients" on public.clients for delete using (auth.role() = 'authenticated');

create policy "Authenticated users can select invoices" on public.invoices for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert invoices" on public.invoices for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update invoices" on public.invoices for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete invoices" on public.invoices for delete using (auth.role() = 'authenticated');

create policy "Authenticated users can select events" on public.calendar_events for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert events" on public.calendar_events for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update events" on public.calendar_events for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete events" on public.calendar_events for delete using (auth.role() = 'authenticated');

-- Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (new.id, new.raw_user_meta_data->>'name', new.email, 'usuario');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Database function to update invoice statuses
create or replace function update_invoice_statuses()
returns void as $$
declare
  inv record;
  cli record;
  current_date_val date := current_date;
  days_late int;
  interest_val numeric;
begin
  for inv in select * from public.invoices where status != 'PAGO' loop
    if inv.due_date < current_date_val then
      -- It is overdue
      days_late := current_date_val - inv.due_date;
      
      -- Get client interest
      select * into cli from public.clients where id = inv.client_id;
      
      if found then
        interest_val := inv.original_value * (cli.interest_percent / 100.0) * days_late;
        
        update public.invoices
        set status = 'ATRASADO',
            days_overdue = days_late,
            final_value = inv.original_value + interest_val
        where id = inv.id;
      end if;
    end if;
  end loop;
end;
$$ language plpgsql;
