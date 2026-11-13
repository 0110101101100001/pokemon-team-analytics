import { createContext, useContext } from 'react';

// `slot` é o nó do header onde a seção ativa desenha os próprios filtros.
export const HeaderContext = createContext({ slot: null, collapsed: false });

export const useHeaderCollapsed = () => useContext(HeaderContext).collapsed;
