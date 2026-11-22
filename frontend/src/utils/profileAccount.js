const GUEST = 'Visitante';

/**
 * Nome, e-mail e inicial de quem está na sessão. O cadastro por e-mail não pede nome:
 * nesse caso vale a parte antes do @.
 */
export function profileAccount(user) {
  const { full_name: fullName, name: profileName } = user?.user_metadata ?? {};
  const email = user?.email || null;
  const name = fullName?.trim() || profileName?.trim() || email?.split('@')[0] || GUEST;
  return { name, email, initial: Array.from(name)[0].toLocaleUpperCase('pt-BR') };
}
