import { describe, expect, it } from 'vitest';
import { profileAccount } from './profileAccount';

describe('profileAccount', () => {
  it('sem sessão é Visitante, sem e-mail', () => {
    expect(profileAccount(undefined)).toEqual({ name: 'Visitante', fallbackName: 'Visitante', email: null, initial: 'V' });
  });

  it('usa o nome do perfil e o e-mail da sessão', () => {
    const user = { email: 'ana@example.com', user_metadata: { full_name: ' Ángela Souza ' } };
    expect(profileAccount(user)).toEqual({ name: 'Ángela Souza', fallbackName: 'Ángela Souza', email: 'ana@example.com', initial: 'Á' });
    expect(profileAccount({ user_metadata: { name: 'Bia' } }).name).toBe('Bia');
  });

  it('sem nome usa a parte antes do @', () => {
    const user = { email: 'treinador@example.com', user_metadata: { full_name: '  ' } };
    expect(profileAccount(user)).toMatchObject({ name: 'treinador', initial: 'T' });
  });

  it('o nome de exibição da conta vale sobre os outros; o automático fica como fallbackName', () => {
    const user = { email: 'treinador@example.com', user_metadata: {} };
    expect(profileAccount(user, ' Mestre Kaique ')).toMatchObject({ name: 'Mestre Kaique', fallbackName: 'treinador', initial: 'M' });
    expect(profileAccount(user, '   ').name).toBe('treinador');
  });
});
