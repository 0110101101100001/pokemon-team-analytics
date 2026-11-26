// Abas das configurações da conta, na ordem da navegação. Os ids são os do endereço (`?conta=perfil`);
// `short` é o rótulo das abas no celular, onde elas rolam numa faixa só.
// Ficam fora de AccountSettings para o App ler o endereço sem puxar o modal para o pacote inicial.
export const ACCOUNT_TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'favoritos', label: 'Favoritos' },
  { id: 'historico', label: 'Histórico' },
  { id: 'times', label: 'Times salvos', short: 'Times' },
  { id: 'builds', label: 'Builds salvas', short: 'Builds' },
  { id: 'preferencias', label: 'Preferências' },
  { id: 'aparencia', label: 'Aparência' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'dados', label: 'Meus dados', short: 'Dados' },
];

export const isAccountTab = (value) => ACCOUNT_TABS.some((tab) => tab.id === value);
