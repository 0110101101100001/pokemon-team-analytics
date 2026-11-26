import { Backpack, BookOpen, Calculator, Disc3, Grid3x3, Library, Medal, Sparkles, Swords } from 'lucide-react';
import { formatHash, parseHash } from './hashRoute';

// `pigment` é a tinta da seção: pinta a pincelada da aba ativa e a mancha do header.
// `title` e `description` (opcionais) vão para o <title> e a meta description quando a aba está aberta.
export const SECTIONS = [
  { id: 'pokedex', path: 'pokedex', label: 'Pokédex', shortLabel: 'Pokédex', icon: BookOpen, pigment: '#A4C294' },
  { id: 'moves', path: 'movimentos', label: 'Movimentos', shortLabel: 'Golpes', icon: Disc3, pigment: '#F2D27A' },
  { id: 'abilities', path: 'habilidades', label: 'Habilidades', shortLabel: 'Habilid.', icon: Sparkles, pigment: '#E89A8A' },
  { id: 'items', path: 'itens', label: 'Itens', shortLabel: 'Itens', icon: Backpack, pigment: '#F0B37E' },
  {
    id: 'types',
    path: 'tipos',
    label: 'Tipos',
    shortLabel: 'Tipos',
    icon: Grid3x3,
    pigment: '#9CC5A1',
    title: 'Tabela de tipos',
    description: 'Tabela de tipos Pokémon interativa: matriz 18×18 de efetividade, resumo de cada tipo e calculadora de defesa para tipo duplo.',
  },
  { id: 'trainers', path: 'treinadores', label: 'Liga', shortLabel: 'Liga', icon: Medal, pigment: '#F28FB8' },
  { id: 'teamBuilder', path: 'times', label: 'Times', shortLabel: 'Times', icon: Swords, pigment: '#BFA2F2' },
  { id: 'damageCalculator', path: 'calculadora', label: 'Calculadora', shortLabel: 'Calc.', icon: Calculator, pigment: '#8FD6E8' },
];

export const DEFAULT_SECTION = SECTIONS[0];

/**
 * Abas de consulta agrupadas sob "Referência" no menu do header (do sm em diante), para os rótulos não se
 * espremerem; no celular, a grade de ícones mostra todas. A ordem do grupo é a de SECTIONS.
 */
export const REFERENCE_GROUP = {
  id: 'reference',
  label: 'Referência',
  icon: Library,
  sectionIds: ['moves', 'abilities', 'items', 'types'],
};

export const sectionFromPath = (path) => SECTIONS.find((section) => section.path === path) ?? DEFAULT_SECTION;

export const sectionHref = (section) => `#/${section.path}`;

const CALCULATOR = SECTIONS.find((section) => section.id === 'damageCalculator');
const TRAINER_SEGMENT = 'treinador';
export const CALCULATOR_HREF = sectionHref(CALCULATOR);

/** Calculadora com o time de uma batalha da Liga no lado do oponente (`#/calculadora/treinador/<card_id>`). */
export const calculatorTrainerHref = (battleId) => `${CALCULATOR_HREF}/${TRAINER_SEGMENT}/${encodeURIComponent(battleId)}`;

/** card_id pedido no endereço da calculadora, ou null. */
export function trainerBattleFromHash(hash = window.location.hash) {
  const [section, segment, id] = parseHash(hash).segments;
  if (section !== CALCULATOR.path || segment !== TRAINER_SEGMENT || !id) return null;
  return id;
}

const TRAINERS = SECTIONS.find((section) => section.id === 'trainers');

/** Ficha de um treinador na Liga (`#/treinadores/<trainer_slug>`). */
export const trainerHref = (slug) => formatHash([TRAINERS.path, slug]);
