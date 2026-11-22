import { describe, expect, it } from 'vitest';
import {
  createField, createMoveSlot, createSide, resolveSlot, sideFromTeam, swapIn,
} from '../components/calc/calcState';
import battleData from '../data/battle-data.json';
import { gmaxMoveOf } from '../data/gmaxMoves';
import { moveSummaryOf } from './battleData';
import { calculateDamage, describeKnockout } from './damage';
import { trapReason } from './switching';
import { simulateTurn } from './turn';

const NO_EFFECT = {
  target: 'selected-pokemon', category: null, statChanges: [], statChance: 0,
  ailment: null, ailmentChance: 0, healing: 0, drain: 0, flinchChance: 0,
};
let nextUid = 0;
const mon = ({ stats, ability = '', ...extra } = {}) => {
  nextUid += 1;
  return {
    uid: nextUid, name: `P${nextUid}`, level: 100, types: ['normal'], tera: '', item: '', status: '', ability, rawAbility: ability,
    boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    stats: { hp: 400, atk: 200, def: 200, spa: 200, spd: 200, spe: 200, ...stats },
    ...extra,
  };
};
const used = (slug, { effects = {}, mode = '', species } = {}) => resolveSlot(
  { ...createMoveSlot({ ...moveSummaryOf(battleData, slug), effects: { ...NO_EFFECT, ...effects } }), mode },
  species ? gmaxMoveOf(species) : null,
);
const field = (own = {}, rest = {}) => {
  const base = createField();
  return { ...base, ...rest, sides: [{ ...base.sides[0], ...own }, base.sides[1]] };
};

/** Um turno de A (com reservas) contra B (com reservas). */
function play({ a = mon(), b = mon(), benchA = [mon()], benchB = [], moves = [null, null], switches = [null, null], on = createField(), ...rest }) {
  const result = simulateTurn({
    combatants: [a, b], bench: [benchA, benchB], moves, switches, sideConditions: on.sides, field: on, names: [a.name, b.name], ...rest,
  });
  return { ...result, a, b, benchA, benchB };
}
/** A troca para a primeira reserva. */
const switchIn = (entrant, options = {}) => play({ benchA: [entrant], switches: [entrant.uid, null], ...options });

describe('troca', () => {
  it('acontece antes do golpe, e quem entra é que apanha', () => {
    const result = switchIn(mon(), { moves: [null, used('tackle')] });
    expect(result.active[0]).toBe(result.benchA[0].uid);
    expect(result.sides[0].currentHp).toBeLessThan(400);
    expect(result.benched.get(result.a.uid).currentHp).toBeNull();
  });

  it('quem sai perde estágios e contador de veneno, mas leva PS, sono e status', () => {
    const a = mon({ currentHp: 150, status: 'toxic', toxicTurns: 4, boosts: { atk: 3, def: 0, spa: 0, spd: 0, spe: 0 } });
    const out = switchIn(mon(), { a }).benched.get(a.uid);
    expect(out).toMatchObject({ currentHp: 150, status: 'toxic', toxicTurns: 0, volatiles: {} });
    expect(out.boosts.atk).toBe(0);
  });

  it('Regenerator cura 1/3 e Natural Cure tira o status', () => {
    const regenerator = mon({ currentHp: 100, ability: 'regenerator' });
    expect(switchIn(mon(), { a: regenerator }).benched.get(regenerator.uid).currentHp).toBe(233);
    const natural = mon({ status: 'burn', ability: 'natural-cure' });
    expect(switchIn(mon(), { a: natural }).benched.get(natural.uid).status).toBe('');
  });

  it('o Dynamax acaba e não volta para o time', () => {
    const a = mon({ stats: { hp: 800 }, baseHp: 400, dynamax: 2, currentHp: 301 });
    const result = switchIn(mon(), { a });
    expect(result.benched.get(a.uid).currentHp).toBe(151);
    expect(result.sides[0].dynamaxSpent).toBe(true);
  });

  it('Fake Out volta a valer para quem acabou de entrar', () => {
    expect(switchIn(mon()).sides[0].turnsOut).toBe(0);
  });
});

describe('entrada em campo', () => {
  it('Stealth Rock, Steelsurge e Spikes ferem', () => {
    expect(switchIn(mon({ types: ['flying'] }), { on: field({ stealthRock: true, spikes: 3 }) }).sides[0].currentHp).toBe(300);
    expect(switchIn(mon(), { on: field({ spikes: 3 }) }).sides[0].currentHp).toBe(300);
    expect(switchIn(mon({ types: ['fairy'] }), { on: field({ steelsurge: true }) }).sides[0].currentHp).toBe(300);
  });

  it('Heavy-Duty Boots e Magic Guard não tomam o dano', () => {
    const on = field({ stealthRock: true, spikes: 3 });
    expect(switchIn(mon({ item: 'heavy-duty-boots' }), { on }).sides[0].currentHp).toBe(400);
    expect(switchIn(mon({ ability: 'magic-guard' }), { on }).sides[0].currentHp).toBe(400);
  });

  it('Toxic Spikes envenena, e um Poison no chão as absorve', () => {
    expect(switchIn(mon(), { on: field({ toxicSpikes: 1 }) }).sides[0].status).toBe('poison');
    expect(switchIn(mon(), { on: field({ toxicSpikes: 2 }) }).sides[0].status).toBe('toxic');
    expect(switchIn(mon({ types: ['poison'] }), { on: field({ toxicSpikes: 2 }) }).conditions[0].toxicSpikes).toBe(0);
  });

  it('Sticky Web baixa a Spe e aciona Defiant', () => {
    const { boosts } = switchIn(mon({ ability: 'defiant' }), { on: field({ stickyWeb: true }) }).sides[0];
    expect(boosts).toMatchObject({ spe: -1, atk: 2 });
  });

  it.each([['', -1], ['inner-focus', 0], ['guard-dog', 1], ['clear-body', 0], ['defiant', 1]])('Intimidate contra "%s": Atk %i', (ability, atk) => {
    expect(switchIn(mon({ ability: 'intimidate' }), { b: mon({ ability }) }).sides[1].boosts.atk).toBe(atk);
  });

  it('traz clima e terreno', () => {
    expect(switchIn(mon({ ability: 'drought' })).field.weather).toBe('sun');
    expect(switchIn(mon({ ability: 'grassy-surge' })).field.terrain).toBe('grassy');
  });

  it('o clima comum fica quando quem o trouxe sai; o primal, não', () => {
    expect(switchIn(mon(), { a: mon({ ability: 'drought' }), on: field({}, { weather: 'sun' }) }).field.weather).toBe('sun');
    expect(switchIn(mon(), { a: mon({ ability: 'desolate-land' }), on: field({}, { weather: 'harsh-sun' }) }).field.weather).toBe('');
  });

  it('Neutralizing Gas desliga a habilidade de quem entra', () => {
    expect(switchIn(mon({ ability: 'intimidate' }), { b: mon({ ability: 'neutralizing-gas' }) }).sides[1].boosts.atk).toBe(0);
  });

  it('cair nos hazards deixa a vaga para outro', () => {
    expect(switchIn(mon({ currentHp: 20 }), { on: field({ stealthRock: true }) }).sides[0].currentHp).toBe(0);
  });
});

describe('golpes que trocam', () => {
  it('U-turn causa o dano e troca', () => {
    const result = play({ moves: [used('u-turn'), null] });
    expect(result.sides[1].currentHp).toBeLessThan(400);
    expect(result.active[0]).toBe(result.benchA[0].uid);
  });

  it('Volt Switch em imune não troca', () => {
    const result = play({ b: mon({ types: ['ground'] }), moves: [used('volt-switch'), null] });
    expect(result.active[0]).toBe(result.a.uid);
  });

  it('entra quem foi escolhido', () => {
    const [first, second] = [mon(), mon()];
    expect(play({ benchA: [first, second], incoming: [second.uid, null], moves: [used('u-turn'), null] }).active[0]).toBe(second.uid);
  });

  it('Baton Pass passa os estágios', () => {
    const a = mon({ boosts: { atk: 2, def: 0, spa: 0, spd: 0, spe: 0 } });
    expect(play({ a, moves: [used('baton-pass', { effects: { target: 'user' } }), null] }).sides[0].boosts.atk).toBe(2);
  });

  it('Parting Shot só troca se baixar algum estágio', () => {
    const effects = { statChanges: [{ stat: 'atk', change: -1 }, { stat: 'spa', change: -1 }], statChance: 0 };
    const worked = play({ moves: [used('parting-shot', { effects }), null] });
    expect(worked.active[0]).toBe(worked.benchA[0].uid);
    const blocked = play({ b: mon({ ability: 'clear-body' }), moves: [used('parting-shot', { effects }), null] });
    expect(blocked.active[0]).toBe(blocked.a.uid);
  });

  it('Roar arrasta, mesmo através de Protect', () => {
    const reserve = mon();
    const result = play({ benchB: [reserve], moves: [used('roar'), used('protect', { effects: { target: 'user' } })] });
    expect(result.active[1]).toBe(reserve.uid);
  });

  it('Dragon Tail não arrasta Suction Cups', () => {
    const b = mon({ ability: 'suction-cups' });
    expect(play({ b, benchB: [mon()], moves: [used('dragon-tail'), null] }).active[1]).toBe(b.uid);
  });

  it('Pursuit pega quem sai com o dobro do poder', () => {
    const a = mon();
    const result = switchIn(mon(), { a, moves: [null, used('pursuit')] });
    const normal = play({ moves: [null, used('pursuit')] });
    expect(400 - result.benched.get(a.uid).currentHp).toBeGreaterThan((400 - normal.sides[0].currentHp) * 1.7);
    expect(result.sides[0].currentHp).toBe(400);
  });

  it('Rapid Spin limpa o próprio lado', () => {
    const on = field({ stealthRock: true, toxicSpikes: 2, stickyWeb: true });
    expect(play({ on, moves: [used('rapid-spin'), null] }).conditions[0]).toMatchObject({ stealthRock: false, toxicSpikes: 0, stickyWeb: false });
  });

  it('Protect não barra hazards', () => {
    const moves = [used('stealth-rock', { effects: { target: 'opponents-field' } }), used('protect', { effects: { target: 'user' } })];
    expect(play({ moves }).conditions[1].stealthRock).toBe(true);
  });
});

describe('não poder trocar', () => {
  const reason = (own, foe = mon()) => trapReason(own, foe, createField());

  it('Shadow Tag, Arena Trap e Magnet Pull prendem', () => {
    expect(reason(mon(), mon({ ability: 'shadow-tag' }))).toMatch(/Shadow Tag/);
    expect(reason(mon({ types: ['flying'] }), mon({ ability: 'arena-trap' }))).toBeNull();
    expect(reason(mon({ types: ['steel'] }), mon({ ability: 'magnet-pull' }))).toMatch(/Magnet Pull/);
  });

  it('Ghost e Shed Shell escapam', () => {
    expect(reason(mon({ types: ['ghost'] }), mon({ ability: 'shadow-tag' }))).toBeNull();
    expect(reason(mon({ item: 'shed-shell' }), mon({ ability: 'shadow-tag' }))).toBeNull();
  });

  it('preso não troca, mas sai com U-turn', () => {
    const a = mon({ volatiles: { trapped: 'mean-look' } });
    expect(switchIn(mon(), { a }).active[0]).toBe(a.uid);
    const pivot = play({ a, moves: [used('u-turn'), null] });
    expect(pivot.active[0]).toBe(pivot.benchA[0].uid);
  });

  it('G-Max Terror prende, e a saída de quem prendeu solta', () => {
    expect(play({ b: mon({ types: ['psychic'] }), moves: [used('shadow-ball', { mode: 'gmax', species: 'gengar' }), null] }).sides[1].volatiles.trapped).toBe('g-max-terror');
    const b = mon({ volatiles: { trapped: 'mean-look' } });
    expect(switchIn(mon(), { b }).sides[1].volatiles.trapped).toBeFalsy();
  });
});

describe('substituto', () => {
  it('entra sem gastar o turno', () => {
    const a = mon({ currentHp: 0 });
    const b = mon({ status: 'burn', turnsOut: 2 });
    const result = switchIn(mon(), { a, b, replacing: true });
    expect(result.active[0]).toBe(result.benchA[0].uid);
    expect(result.sides[1]).toMatchObject({ currentHp: 400, turnsOut: 2 });
    expect(result.benched.get(a.uid).currentHp).toBe(0);
  });

  it('quem já está em campo não paga hazards de novo no veredito', () => {
    const attacker = mon();
    const defenderSide = field({ stealthRock: true }).sides[0];
    const verdict = (defender) => {
      const on = createField();
      const result = calculateDamage({ attacker, defender, move: used('tackle'), field: on, defenderSide });
      return describeKnockout(result, { attacker, defender, defenderSide, field: on }).text;
    };
    expect(verdict(mon({ entered: true }))).not.toBe(verdict(mon()));
  });
});

describe('time na calculadora', () => {
  const members = ['pikachu', 'eevee', 'snorlax'].map((name, id) => ({ pokemon: { id, name }, set: null }));

  it('o escolhido vai a campo e os outros viram reservas', () => {
    const side = sideFromTeam({ key: 't', index: 1, members });
    expect(side.pokemon.name).toBe('eevee');
    expect(side.bench.map((member) => member.pokemon.name)).toEqual(['pikachu', 'snorlax']);
  });

  it('trocar põe quem saiu na vaga de quem entrou', () => {
    const side = sideFromTeam({ key: 't', index: 0, members });
    const swapped = swapIn(side, side.bench[1].uid);
    expect(swapped.pokemon.name).toBe('snorlax');
    expect(swapped.bench.map((member) => member.pokemon.name)).toEqual(['eevee', 'pikachu']);
    expect(createSide().uid).not.toBe(createSide().uid);
  });
});
