import { Backpack, BookOpen, Calculator, Disc3, Medal, Swords } from 'lucide-react';

// `pigment` é a tinta da seção: pinta a pincelada da aba ativa e a mancha do header.
export const SECTIONS = [
  { id: 'pokedex', path: 'pokedex', label: 'Pokédex', shortLabel: 'Pokédex', icon: BookOpen, pigment: '#A4C294' },
  { id: 'moves', path: 'movimentos', label: 'Movimentos', shortLabel: 'Golpes', icon: Disc3, pigment: '#F2D27A' },
  { id: 'items', path: 'itens', label: 'Itens', shortLabel: 'Itens', icon: Backpack, pigment: '#F0B37E' },
  { id: 'trainers', path: 'treinadores', label: 'Treinadores', shortLabel: 'Treinadores', icon: Medal, pigment: '#F28FB8' },
  { id: 'teamBuilder', path: 'times', label: 'Montador de Times', shortLabel: 'Times', icon: Swords, pigment: '#BFA2F2' },
  { id: 'damageCalculator', path: 'calculadora', label: 'Calculadora de Dano', shortLabel: 'Dano', icon: Calculator, pigment: '#8FD6E8' },
];

export const DEFAULT_SECTION = SECTIONS[0];

export const sectionFromPath = (path) => SECTIONS.find((section) => section.path === path) ?? DEFAULT_SECTION;

export const sectionHref = (section) => `#/${section.path}`;
