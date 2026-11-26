import { beforeAll, describe, expect, it } from 'vitest';
import allSets from '../data/gen9.json';
import { buildMeta } from './metaScore';
import { createCardState, evaluateTeam } from './sketchEdit';
import { POOL, ROWS, battleData, byName } from './sketchFixtures';
import { planSketch, sketchContext } from './sketchPlan';
import { SKETCH_STATE_KEY, readSketchState, restoreCards, serializeSketchState, writeSketchState } from './sketchStore';

const META = buildMeta(ROWS, POOL);
const input = { pool: POOL, meta: META, battleData, allSets, tier: 'gen9ou', archetypeKey: 'free' };
const VALIDATORS = { isTier: (tier) => tier === 'gen9ou' || tier === 'gen9uu', isArchetype: (key) => ['free', 'rain'].includes(key) };
const PLAN = { tier: 'gen9ou', archetype: 'free', banned: [byName('mewtwo')], maxTwoPerType: true };

const memoryStorage = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)) };
};

let ctx;
let cards;
beforeAll(() => {
  ctx = sketchContext(input);
  const seed = [{ ...byName('great-tusk'), set: { moves: [] } }];
  cards = planSketch({ seed, ...input }).map((variation) => createCardState(variation, ctx));
});

describe('sketchStore', () => {
  it('ida e volta: o plano e os cards voltam com as mesmas notas', () => {
    const storage = memoryStorage();
    const edited = cards.map((card, index) => (index === 1 ? { ...card, edited: true } : card));
    writeSketchState(storage, { plan: PLAN, result: { status: 'done', plan: PLAN, teamKey: '984', ms: 120, ctx }, cards: edited });

    const stored = readSketchState(storage, VALIDATORS);
    expect(stored.plan).toEqual(PLAN);
    expect(stored.result).toEqual({ plan: PLAN, teamKey: '984', ms: 120 });

    const restored = restoreCards(stored.cards, ctx);
    expect(restored).toHaveLength(cards.length);
    restored.forEach((card, index) => {
      expect(card.members.map((member) => member.pokemon.name)).toEqual(cards[index].members.map((member) => member.pokemon.name));
      expect(card.members.map((member) => member.locked)).toEqual(cards[index].members.map((member) => member.locked));
      expect(card.evaluation).toEqual(evaluateTeam(cards[index].members, ctx));
      expect(card.history).toEqual([]);
    });
    expect(restored[1].edited).toBe(true);
  });

  it('o set do builder não vai junto da entrada do Pokémon', () => {
    const serialized = serializeSketchState({ plan: { ...PLAN, banned: [{ ...byName('mewtwo'), set: { moves: [] } }] }, result: { status: 'idle' }, cards: [] });
    expect(serialized.plan.banned[0]).not.toHaveProperty('set');
    expect(serialized.result).toBeNull();
    expect(serialized.cards).toEqual([]);
  });

  it('dado inválido ou de outra versão vira null; tier ou estilo desconhecido é corrigido ou descartado', () => {
    const storage = memoryStorage();
    expect(readSketchState(storage, VALIDATORS)).toBeNull();
    storage.setItem(SKETCH_STATE_KEY, '{nada');
    expect(readSketchState(storage, VALIDATORS)).toBeNull();
    storage.setItem(SKETCH_STATE_KEY, JSON.stringify({ version: 99, plan: PLAN }));
    expect(readSketchState(storage, VALIDATORS)).toBeNull();
    storage.setItem(SKETCH_STATE_KEY, JSON.stringify({ version: 1, plan: { ...PLAN, tier: 'gen1ou' } }));
    expect(readSketchState(storage, VALIDATORS)).toBeNull();
    storage.setItem(SKETCH_STATE_KEY, JSON.stringify({ version: 1, plan: { ...PLAN, archetype: 'sumiu', banned: [{ x: 1 }] }, result: null, cards: [] }));
    expect(readSketchState(storage, VALIDATORS).plan).toEqual({ ...PLAN, archetype: 'free', banned: [] });
  });

  it('cards incompletos são descartados, e sem cards o resultado não volta', () => {
    const storage = memoryStorage();
    const raw = serializeSketchState({ plan: PLAN, result: { status: 'done', plan: PLAN, teamKey: '984', ms: 1 }, cards });
    raw.cards = raw.cards.map((card) => ({ ...card, members: card.members.slice(0, 5) }));
    storage.setItem(SKETCH_STATE_KEY, JSON.stringify(raw));
    const stored = readSketchState(storage, VALIDATORS);
    expect(stored.result).toBeNull();
    expect(stored.cards).toEqual([]);
  });

  it('sem armazenamento, nada quebra', () => {
    const broken = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('cota'); } };
    expect(readSketchState(broken, VALIDATORS)).toBeNull();
    expect(() => writeSketchState(broken, { plan: PLAN, result: { status: 'idle' }, cards: [] })).not.toThrow();
    expect(readSketchState(null, VALIDATORS)).toBeNull();
  });
});
