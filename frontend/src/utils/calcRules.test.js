import { describe, expect, it } from 'vitest';
import { createField, createMoveSlot, createSideConditions, resolveSlot } from '../components/calc/calcState';
import battleData from '../data/battle-data.json';
import { gmaxMoveOf } from '../data/gmaxMoves';
import { formTypes } from '../data/formItems';
import { moveSummaryOf } from './battleData';
import { calculateDamage, sturdyHolds } from './damage';
import { canPowerUp, maxPower, zPower } from './poweredMoves';
import { simulateTurn, turnOrder } from './turn';

const summary = (slug) => moveSummaryOf(battleData, slug);
const NO_EFFECT = {
  target: 'selected-pokemon', category: null, statChanges: [], statChance: 0,
  ailment: null, ailmentChance: 0, healing: 0, drain: 0, flinchChance: 0,
};
const combatant = ({ stats, ...extra } = {}) => ({
  level: 100, types: ['normal'], tera: '', boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, item: '', ability: '', status: '',
  stats: { hp: 400, atk: 200, def: 200, spa: 200, spd: 200, spe: 200, ...stats }, ...extra,
});
const used = (slug, { mode = '', gmax = null, attacker = combatant(), field = createField(), effects = {} } = {}) =>
  resolveSlot({ ...createMoveSlot({ ...summary(slug), effects: { ...NO_EFFECT, ...effects } }), mode }, gmax, { attacker, field });
const hit = (move, { attacker = combatant(), defender = combatant(), field = createField(), protect = false } = {}) =>
  calculateDamage({ attacker, defender, move, field, defenderSide: { ...createSideConditions(), protect } });
const turn = (moves, combatants = [combatant(), combatant()], field = createField()) =>
  simulateTurn({ combatants, moves, sideConditions: field.sides, field, names: ['A', 'B'] });

describe('poder Z e Max próprios', () => {
  it.each([
    ['weather-ball', 160, 130],
    ['terrain-pulse', 160, 130],
    ['gyro-ball', 160, 130],
    ['seismic-toss', 100, 75],
    ['bullet-seed', 140, 130],
    ['multi-attack', 185, 95],
    ['crush-grip', 190, 140],
    ['sheer-cold', 180, 130],
    ['return', 160, 130],
  ])('%s: Z %i, Max %i', (slug, z, max) => {
    expect(canPowerUp(summary(slug))).toBe(true);
    expect([zPower(summary(slug)), maxPower(summary(slug))]).toEqual([z, max]);
  });

  it.each(['struggle', 'max-flare', 'breakneck-blitz--physical', 'catastropika', 'lets-snuggle-forever'])('%s não se converte', (slug) => {
    expect(canPowerUp(summary(slug))).toBe(false);
  });

  it('golpe de poder variável causa dano como Z', () => {
    expect(hit(used('gyro-ball', { mode: 'z' })).max).toBeGreaterThan(0);
  });
});

describe('efeitos de Z e Max no turno', () => {
  const closeCombat = { category: 'damage-raise', statChanges: [{ stat: 'def', change: -1 }, { stat: 'spd', change: -1 }] };

  it('o Z não herda quedas, recuo nem status', () => {
    expect(turn([used('close-combat', { mode: 'z', effects: closeCombat }), null]).sides[0].boosts.def).toBe(0);
    expect(turn([used('double-edge', { mode: 'z', effects: { drain: -33 } }), null]).sides[0].currentHp).toBe(400);
    expect(turn([used('nuzzle', { mode: 'z', effects: { ailment: 'paralysis', ailmentChance: 100 } }), null]).sides[1].status).toBe('');
  });

  it('o golpe normal continua com os efeitos', () => {
    expect(turn([used('close-combat', { effects: closeCombat }), null]).sides[0].boosts.def).toBe(-1);
  });

  it('o Max aplica o efeito dele', () => {
    expect(turn([used('close-combat', { mode: 'max', effects: closeCombat }), null]).sides[0].boosts).toMatchObject({ atk: 1, def: 0 });
    expect(turn([used('return', { mode: 'max' }), null]).sides[1].boosts.spe).toBe(-1);
    expect(turn([used('flamethrower', { mode: 'max' }), null]).field.weather).toBe('sun');
    expect(turn([used('thunderbolt', { mode: 'max' }), null]).field.terrain).toBe('electric');
  });

  it('o G-Max aplica o efeito dele', () => {
    const gmax = (slug, species) => used(slug, { mode: 'gmax', gmax: gmaxMoveOf(species) });
    expect(turn([gmax('ice-beam', 'lapras'), null]).conditions[0].auroraVeil).toBe(true);
    expect(turn([gmax('thunderbolt', 'pikachu'), null]).sides[1].status).toBe('paralysis');
    expect(turn([gmax('surf', 'drednaw'), null]).conditions[1].stealthRock).toBe(true);
  });

  it('clima primal não cede ao Max', () => {
    const field = { ...createField(), weather: 'heavy-rain' };
    expect(turn([used('rock-slide', { mode: 'max' }), null], undefined, field).field.weather).toBe('heavy-rain');
  });

  it('com Cloud Nine, o clima novo não muda o Z da Weather Ball', () => {
    const combatants = [combatant({ ability: 'cloud-nine' }), combatant({ stats: { spe: 300 } })];
    const result = turn([used('weather-ball', { mode: 'z' }), used('sunny-day')], combatants);
    expect(result.log.map((line) => line.text).join(' ')).toContain('Breakneck Blitz');
  });

  it('Z e Max agem com prioridade 0', () => {
    const combatants = [combatant(), combatant({ stats: { spe: 300 } })];
    const sides = createField().sides;
    expect(turnOrder(combatants, [used('quick-attack'), used('return')], sides, createField())).toEqual([0, 1]);
    expect(turnOrder(combatants, [used('quick-attack', { mode: 'z' }), used('return')], sides, createField())).toEqual([1, 0]);
  });

  it('em Dynamax, Choice Scarf não acelera e o Pokémon não recua', () => {
    const scarfed = [combatant({ item: 'choice-scarf' }), combatant({ stats: { spe: 250 } })];
    expect(turnOrder(scarfed, [used('return', { mode: 'max' }), used('return')], createField().sides, createField())).toEqual([1, 0]);
    const result = turn([used('fake-out', { effects: { flinchChance: 100 } }), used('return', { mode: 'max' })]);
    expect(result.sides[0].currentHp).toBeLessThan(400);
  });
});

describe('regras de dano de Z e Max', () => {
  it('Choice Band e Gorilla Tactics não valem em Dynamax', () => {
    const max = used('return', { mode: 'max' });
    expect(hit(max, { attacker: combatant({ item: 'choice-band' }) }).max).toBe(hit(max).max);
    expect(hit(max, { attacker: combatant({ ability: 'gorilla-tactics' }) }).max).toBe(hit(max).max);
  });

  it('G-Max One Blow atravessa Protect com o dano inteiro', () => {
    const oneBlow = used('wicked-blow', { mode: 'gmax', gmax: gmaxMoveOf('urshifu-single-strike') });
    expect(hit(oneBlow, { protect: true }).max).toBe(hit(oneBlow).max);
  });

  it('G-Max Fireball ignora a habilidade do alvo', () => {
    const fireball = used('pyro-ball', { mode: 'gmax', gmax: gmaxMoveOf('cinderace') });
    expect(hit(fireball, { defender: combatant({ ability: 'flash-fire' }) }).max).toBeGreaterThan(0);
    const sturdy = combatant({ ability: 'sturdy' });
    expect(sturdyHolds(hit(fireball, { defender: sturdy }), sturdy, combatant())).toBe(false);
  });
});

describe('tipo por item e por forma', () => {
  it.each([
    ['judgment', { item: 'flame-plate' }, 'fire'],
    ['multi-attack', { item: 'water-memory' }, 'water'],
    ['techno-blast', { item: 'shock-drive' }, 'electric'],
    ['revelation-dance', { types: ['electric', 'flying'] }, 'electric'],
    ['ivy-cudgel', { species: 'ogerpon-wellspring-mask' }, 'water'],
    ['raging-bull', { species: 'tauros-paldea-blaze-breed' }, 'fire'],
    ['aura-wheel', { species: 'morpeko-hangry' }, 'dark'],
  ])('%s com %o é %s', (slug, extra, type) => {
    const attacker = combatant(extra);
    expect(hit(used(slug, { attacker }), { attacker }).moveType).toBe(type);
    expect(used(slug, { attacker, mode: 'max' }).type).toBe(type);
    expect(used(slug, { attacker, mode: 'z' }).type).toBe(summary(slug).type);
  });

  it('Magic Room e Klutz desligam a Plate', () => {
    const judgment = used('judgment');
    expect(hit(judgment, { attacker: combatant({ item: 'flame-plate', ability: 'klutz' }) }).moveType).toBe('normal');
    const field = { ...createField(), magicRoom: true };
    expect(hit(judgment, { attacker: combatant({ item: 'flame-plate' }), field }).moveType).toBe('normal');
  });

  it('Arceus e Silvally ganham o tipo do item', () => {
    expect(formTypes('arceus', 'flame-plate')).toEqual(['fire']);
    expect(formTypes('silvally', 'water-memory')).toEqual(['water']);
    expect(formTypes('genesect', 'burn-drive')).toBeNull();
  });

  it('Knock Off não ganha bônus contra a Plate do Arceus', () => {
    const knockOff = used('knock-off');
    const held = hit(knockOff, { defender: combatant({ species: 'arceus', item: 'flame-plate' }) });
    expect(held.max).toBe(hit(knockOff).max);
  });
});

describe('Forecast', () => {
  it.each([['sun', 'fire'], ['rain', 'water'], ['snow', 'ice']])('Castform em %s tem STAB de %s', (weather, type) => {
    const attacker = combatant({ species: 'castform', ability: 'forecast', originalTypes: ['normal'] });
    const field = { ...createField(), weather };
    const result = hit(used('weather-ball', { attacker, field }), { attacker, field });
    expect(result).toMatchObject({ moveType: type, stab: true });
  });
});

describe('efeito secundário', () => {
  const sheer = combatant({ ability: 'sheer-force' });

  it('Sheer Force só aumenta golpes com efeito secundário', () => {
    for (const slug of ['close-combat', 'draco-meteor', 'v-create']) {
      expect(hit(used(slug), { attacker: sheer }).max).toBe(hit(used(slug)).max);
    }
    for (const slug of ['trailblaze', 'flamethrower', 'electro-shot']) {
      expect(hit(used(slug), { attacker: sheer }).max).toBeGreaterThan(hit(used(slug)).max);
    }
  });

  it('Sheer Force tira o efeito e o custo da Life Orb', () => {
    const icyWind = used('icy-wind', { effects: { category: 'damage-lower', statChanges: [{ stat: 'spe', change: -1 }], statChance: 100 } });
    const result = turn([icyWind, null], [combatant({ ability: 'sheer-force', item: 'life-orb' }), combatant()]);
    expect(result.sides[0].currentHp).toBe(400);
    expect(result.sides[1].boosts.spe).toBe(0);
  });

  it('Shield Dust barra o efeito no alvo', () => {
    const nuzzle = used('nuzzle', { effects: { ailment: 'paralysis', ailmentChance: 100 } });
    expect(turn([nuzzle, null], [combatant(), combatant({ ability: 'shield-dust' })]).sides[1].status).toBe('');
    expect(turn([nuzzle, null]).sides[1].status).toBe('paralysis');
  });
});

describe('felicidade máxima', () => {
  it.each(['pika-papow', 'veevee-volley'])('%s tem 102 de poder', (slug) => {
    expect(summary(slug).power).toBe(102);
  });
});
