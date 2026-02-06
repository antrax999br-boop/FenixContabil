
-- Tabela de Mensagens com suporte a conversa privada
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  content text,
  sender_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_read boolean default false,
  file_url text, -- URL do arquivo (se houver)
  file_type text, -- 'image', 'video', 'document', etc.
  file_name text -- Nome original do arquivo
);

-- RLS (Segurança)
alter table public.messages enable row level security;

-- Quem pode ver: O remetente ou o destinatário
create policy "Usuarios veem suas proprias mensagens" 
  on public.messages for select 
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Quem pode enviar: Apenas usuários autenticados
create policy "Usuarios enviam mensagens" 
  on public.messages for insert 
  with check (auth.uid() = sender_id);

-- STORAGE BUCKET (Precisa ser criado para upload de arquivos funcionar)
-- Nota: Em alguns ambientes Supabase, criar buckets via SQL pode exigir permissões especiais.
-- Se falhar, crie manualmente um bucket publico chamado 'chat-uploads' no dashboard.

insert into storage.buckets (id, name, public) 
values ('chat-uploads', 'chat-uploads', true)
on conflict (id) do nothing;

-- Policies para Storage
create policy "Usuarios podem ver arquivos do chat"
on storage.objects for select
using ( bucket_id = 'chat-uploads' and auth.role() = 'authenticated' );

create policy "Usuarios podem enviar arquivos pro chat"
on storage.objects for insert
with check ( bucket_id = 'chat-uploads' and auth.role() = 'authenticated' );
