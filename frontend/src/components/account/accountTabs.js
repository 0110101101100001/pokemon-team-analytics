// Abas das configurações da conta, na ordem da navegação. Os ids são os do endereço (`?conta=perfil`);
// `short` é o rótulo das abas no celular, onde as quatro dividem uma linha.
// Ficam fora de AccountSettings para o App ler o endereço sem puxar o modal para o pacote inicial.
export const ACCOUNT_TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'times', label: 'Times salvos', short: 'Times' },
  { id: 'builds', label: 'Builds salvas', short: 'Builds' },
  { id: 'aparencia', label: 'Aparência' },
];

export const isAccountTab = (value) => ACCOUNT_TABS.some((tab) => tab.id === value);
