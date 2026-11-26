// Regras dos formulários de Configurações → Segurança, sem React nem Supabase (testáveis em node).

export const MIN_PASSWORD = 8;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mensagens do Supabase Auth em português; o resto cai numa mensagem genérica (sem detalhes internos).
const AUTH_ERRORS = {
  same_password: 'A nova senha precisa ser diferente da atual.',
  weak_password: 'Senha fraca ou já vazada em outro site. Escolha outra, mais longa.',
  email_exists: 'Esse e-mail já está em uso em outra conta.',
  email_address_invalid: 'Esse e-mail não é válido.',
  over_email_send_rate_limit: 'Muitos e-mails enviados agora. Espere alguns minutos e tente de novo.',
  over_request_rate_limit: 'Muitas tentativas. Espere alguns minutos e tente de novo.',
  reauthentication_not_valid: 'Código inválido ou vencido. Peça um novo.',
  session_not_found: 'Sua sessão expirou. Saia e entre de novo.',
};
export const authErrorMessage = (error) => AUTH_ERRORS[error?.code] ?? 'Não foi possível concluir agora. Tente de novo.';

/** Valida a troca de senha antes de mandar ao Supabase; null se está tudo certo. */
export function passwordProblem(password, confirmation) {
  if (password.length < MIN_PASSWORD) return `A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`;
  if (password !== confirmation) return 'As duas senhas não são iguais.';
  return null;
}
