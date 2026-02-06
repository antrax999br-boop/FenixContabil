
-- Permitir que o Admin (Laercio) atualize qualquer perfil
create policy "Admin can update any profile"
on public.profiles
for update
using (
  auth.jwt() ->> 'email' = 'laercio@laercio.com.br'
);
