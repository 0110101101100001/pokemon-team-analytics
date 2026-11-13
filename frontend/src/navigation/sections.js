import { Backpack, BookOpen, Calculator, Medal, Swords } from 'lucide-react';

// `pigment` é a tinta da seção: pinta a pincelada da aba ativa e a mancha do header.
export const SECTIONS = [
  { id: 'pokedex', path: 'pokedex', label: 'Pokédex', shortLabel: 'Pokédex', icon: BookOpen, pigment: '#A4C294' },
  { id: 'items', path: 'itens', label: 'Itens', shortLabel: 'Itens', icon: Backpack, pigment: '#F0B37E' },
  { id: 'gymLeaders', path: 'ginasios', label: 'Gym Leaders', shortLabel: 'Líderes', icon: Medal, pigment: '#F28FB8' },
  { id: 'teamBuilder', path: 'times', label: 'Team Builder', shortLabel: 'Times', icon: Swords, pigment: '#BFA2F2' },
  { id: 'damageCalculator', path: 'calculadora', label: 'Damage Calculator', shortLabel: 'Dano', icon: Calculator, pigment: '#8FD6E8' },
];

export const DEFAULT_SECTION = SECTIONS[0];

export const sectionFromPath = (path) => SECTIONS.find((section) => section.path === path) ?? DEFAULT_SECTION;

export const sectionHref = (section) => `#/${section.path}`;
