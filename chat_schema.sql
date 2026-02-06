
-- Tabela de Mensagens com suporte a conversa privada
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  content text not null,
  sender_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_read boolean default false
);

-- RLS (Segurança)
alter table public.messages enable row level security;

-- Quem pode ver: O remetente ou o destinatário
create policy "Usuarios veem suas proprias mensagens" 
  on public.messages for select 
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Quem pode enviar: Apenas usuários autenticados (sender_id deve ser o próprio usuário)
create policy "Usuarios enviam mensagens" 
  on public.messages for insert 
  with check (auth.uid() = sender_id);
