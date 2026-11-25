// Abas das configurações da conta, na ordem da navegação. Os ids são os do endereço (`?conta=perfil`).
// Ficam fora de AccountSettings para o App ler o endereço sem puxar o modal para o pacote inicial.
export const ACCOUNT_TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'times', label: 'Times salvos' },
  { id: 'aparencia', label: 'Aparência' },
];

export const isAccountTab = (value) => ACCOUNT_TABS.some((tab) => tab.id === value);
