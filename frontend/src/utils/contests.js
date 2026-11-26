import CONTEST_DATA from '../data/contest-moves.json';
import { CONTEST_EFFECT_TEXT, SUPER_CONTEST_EFFECT_TEXT } from '../data/contestEffects';
import { createTextMatcher } from './textMatch';

// Golpes nos Contests (contest-moves.json, de scripts/build-contest-moves.mjs), já com os textos em português.

/** Categorias de Contest: nome em português, nome do jogo e a cor da faixa. */
export const CONTEST_CATEGORIES = {
  cool: { label: 'Estilo', game: 'Cool', color: '#B8402A' },
  beauty: { label: 'Beleza', game: 'Beauty', color: '#4F6D8A' },
  cute: { label: 'Fofura', game: 'Cute', color: '#C2708A' },
  smart: { label: 'Esperteza', game: 'Smart', color: '#5F7A52' },
  tough: { label: 'Força', game: 'Tough', color: '#B98428' },
};

const contestEffect = (id) => {
  if (id == null) return null;
  const [appeal, jam] = CONTEST_DATA.effects[id] ?? [0, 0];
  return { appeal, jam, text: CONTEST_EFFECT_TEXT[id] ?? null };
};

const superEffect = (id) =>
  (id == null ? null : { appeal: CONTEST_DATA.superEffects[id] ?? 0, text: SUPER_CONTEST_EFFECT_TEXT[id] ?? null });

export const CONTEST_MOVES = CONTEST_DATA.moves.map(([slug, type, category, effectId, superEffectId, combos, superCombos]) => ({
  slug,
  type,
  category,
  contest: contestEffect(effectId),
  superContest: superEffect(superEffectId),
  combos,
  superCombos,
}));

/** Filtra por nome (busca de utils/textMatch.js), tipo do golpe e categoria do Contest. */
export function filterContestMoves(moves, { term, type, category }) {
  const matches = createTextMatcher(term);
  return moves.filter((move) =>
    (!type || move.type === type)
    && (!category || move.category === category)
    && matches(move.slug));
}
