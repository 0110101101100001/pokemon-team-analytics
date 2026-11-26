const GUEST = 'Visitante';

/**
 * Nome, e-mail e inicial de quem está na sessão. Vale o nome de exibição escolhido nas Configurações; sem ele, o do
 * provedor de login e, no cadastro por e-mail (que não pede nome), a parte antes do @.
 * `fallbackName` é esse nome automático, mostrado como sugestão no campo do Perfil.
 */
export function profileAccount(user, displayName = null) {
  const { full_name: fullName, name: profileName } = user?.user_metadata ?? {};
  const email = user?.email || null;
  const fallbackName = fullName?.trim() || profileName?.trim() || email?.split('@')[0] || GUEST;
  const name = displayName?.trim() || fallbackName;
  return { name, fallbackName, email, initial: Array.from(name)[0].toLocaleUpperCase('pt-BR') };
}
