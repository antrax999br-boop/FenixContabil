
-- Permitir que apenas o usuário laercio@laercio.com.br apague mensagens
-- Nota: Isso usa o email contido no JWT do usuário autenticado

create policy "Apenas Laercio pode apagar mensagens"
on public.messages
for delete
using (
  auth.jwt() ->> 'email' = 'laercio@laercio.com.br'
);
