-- Sem o grant, o RLS nem chega a ser avaliado: o site recebe "permission denied" ao ler ou gravar o avatar.
grant select, insert, update on public.user_profiles to authenticated;
