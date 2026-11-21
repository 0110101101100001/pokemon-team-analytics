import { describe, expect, it } from 'vitest';
import { calculateDamage, describeKnockout } from './damage';
import { averageDamage, simulateTurn, turnOrder } from './turn';
import { NATURAL_GIFT } from '../data/battleModifiers';
import { createField, createSideConditions } from '../components/calc/calcState';

const NO_BOOSTS = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const side = (overrides = {}) => ({
  level: 100, types: ['normal'], originalTypes: ['normal'], tera: '', item: '', ability: '', status: '',
  stats: { hp: 300, atk: 200, def: 200, spa: 200, spd: 200, spe: 200 },
  boosts: NO_BOOSTS, weight: 50, currentHp: null, toxicTurns: 0, lastHit: null,
  ...overrides,
});
const move = (slug, type, category, power = null, extra = {}) => ({ slug, name: slug, type, category, damageClass: category, power, hits: 1, crit: false, ...extra });
const field = createField();
const conditions = [createSideConditions(), createSideConditions()];
const hit = (attacker, defender, used) => calculateDamage({ attacker, defender, move: used, field, defenderSide: conditions[1] });

describe('dano fixo', () => {
  it('Seismic Toss e Night Shade tiram o nível; o fantasma é imune ao Seismic Toss', () => {
    expect(hit(side({ level: 50 }), side(), move('seismic-toss', 'fighting', 'physical')).max).toBe(50);
    expect(hit(side(), side({ types: ['ghost'] }), move('seismic-toss', 'fighting', 'physical')).reason).toMatch(/imune/);
    expect(hit(side({ level: 77 }), side({ types: ['psychic'] }), move('night-shade', 'ghost', 'special')).min).toBe(77);
    expect(hit(side(), side(), move('night-shade', 'ghost', 'special')).reason).toMatch(/imune/);
  });

  it('Super Fang, Ruination e Nature\'s Madness tiram metade dos PS atuais', () => {
    expect(hit(side(), side({ currentHp: 200 }), move('super-fang', 'normal', 'physical')).max).toBe(100);
    expect(hit(side(), side({ types: ['fire'] }), move('natures-madness', 'fairy', 'special')).max).toBe(150);
    expect(hit(side(), side({ currentHp: 1 }), move('ruination', 'dark', 'special')).max).toBe(1);
  });

  it('Endeavor, Final Gambit e os de valor fixo', () => {
    expect(hit(side({ currentHp: 40 }), side(), move('endeavor', 'normal', 'physical')).max).toBe(260);
    expect(hit(side(), side(), move('endeavor', 'normal', 'physical')).reason).toMatch(/Endeavor falha/);
    expect(hit(side({ currentHp: 120 }), side(), move('final-gambit', 'fighting', 'special')).max).toBe(120);
    expect(hit(side(), side(), move('dragon-rage', 'dragon', 'special')).max).toBe(40);
    expect(hit(side(), side(), move('sonic-boom', 'normal', 'special')).max).toBe(20);
    const psywave = hit(side({ level: 100 }), side(), move('psywave', 'psychic', 'special'));
    expect([psywave.min, psywave.max]).toEqual([50, 150]);
  });

  it('Counter e Mirror Coat dependem do último golpe recebido', () => {
    const counter = move('counter', 'fighting', 'physical', null, { priority: -5 });
    expect(hit(side(), side(), counter).reason).toMatch(/Counter só funciona/);
    expect(hit(side({ lastHit: { damage: 90, category: 'physical' } }), side(), counter).max).toBe(180);
    expect(hit(side({ lastHit: { damage: 90, category: 'physical' } }), side(), move('mirror-coat', 'psychic', 'special')).reason).toBeTruthy();
    expect(hit(side({ lastHit: { damage: 90, category: 'special' } }), side(), move('metal-burst', 'steel', 'physical')).max).toBe(135);
  });

  it('OHKO: tira tudo, mas falha contra Sturdy, nível maior e Sheer Cold em Ice', () => {
    expect(hit(side(), side({ currentHp: 222 }), move('guillotine', 'normal', 'physical')).max).toBe(222);
    expect(hit(side(), side({ ability: 'sturdy' }), move('fissure', 'ground', 'physical')).reason).toMatch(/Sturdy/);
    expect(hit(side({ level: 50 }), side(), move('horn-drill', 'normal', 'physical')).reason).toMatch(/nível maior/);
    expect(hit(side(), side({ types: ['ice'] }), move('sheer-cold', 'ice', 'special')).reason).toMatch(/Ice/);
  });
});

describe('golpes com regras próprias', () => {
  it('Body Press usa a Def do usuário; Foul Play, o Atk do alvo', () => {
    const bodyPress = move('body-press', 'fighting', 'physical', 80);
    const sturdy = side({ stats: { ...side().stats, def: 400 } });
    expect(hit(sturdy, side(), bodyPress).max).toBeGreaterThan(hit(side(), side(), bodyPress).max);
    const foulPlay = move('foul-play', 'dark', 'physical', 95);
    const strongTarget = side({ stats: { ...side().stats, atk: 400 } });
    expect(hit(side(), strongTarget, foulPlay).max).toBeGreaterThan(hit(side(), side(), foulPlay).max);
  });

  it('Psyshock acerta a Def; Assault Vest não protege dele', () => {
    const psyshock = move('psyshock', 'psychic', 'special', 80);
    const walled = side({ stats: { ...side().stats, spd: 400 } });
    expect(hit(side(), walled, psyshock).max).toBe(hit(side(), side(), psyshock).max);
    expect(hit(side(), side({ item: 'assault-vest' }), psyshock).max).toBe(hit(side(), side(), psyshock).max);
  });

  it('Wicked Blow é sempre crítico', () => {
    expect(hit(side(), side(), move('wicked-blow', 'dark', 'physical', 75)).crit).toBe(true);
  });
});

describe('Natural Gift', () => {
  it('usa o tipo e o poder da Berry (Geração 6+: 20 a mais que na PokéAPI)', () => {
    expect(NATURAL_GIFT['cheri-berry']).toEqual({ type: 'fire', power: 80 });
    const result = hit(side({ item: 'cheri-berry' }), side({ types: ['grass'] }), move('natural-gift', 'normal', 'physical'));
    expect(result.moveType).toBe('fire');
    expect(result.typeMultiplier).toBe(2);
    expect(result.variablePower.power).toBe(80);
    expect(hit(side(), side(), move('natural-gift', 'normal', 'physical')).reason).toMatch(/Berry/);
  });
});

describe('PS atuais na conta', () => {
  it('Multiscale só vale com os PS cheios', () => {
    const tackle = move('tackle', 'normal', 'physical', 40);
    const full = hit(side(), side({ ability: 'multiscale' }), tackle).max;
    const hurt = hit(side(), side({ ability: 'multiscale', currentHp: 299 }), tackle).max;
    expect(hurt).toBeGreaterThan(full);
  });

  it('o nocaute conta a partir dos PS atuais', () => {
    const tackle = move('tackle', 'normal', 'physical', 40);
    const context = { attacker: side(), defender: side({ currentHp: 10 }), defenderSide: conditions[1], field };
    expect(describeKnockout(hit(side(), side({ currentHp: 10 }), tackle), context).text).toMatch(/^OHKO garantido/);
  });
});


describe('passar o turno', () => {
  const names = ['Seu', 'Oponente'];
  const tackle = move('tackle', 'normal', 'physical', 40);
  const fx = (overrides) => ({
    target: 'selected-pokemon', category: 'damage', statChanges: [], statChance: 0, ailment: null, ailmentChance: 0, healing: 0, drain: 0, ...overrides,
  });
  const status = (slug, type, effects, extra = {}) => move(slug, type, 'status', null, { effects: fx(effects), ...extra });
  const run = (combatants, moves, overrides = {}) => simulateTurn({
    combatants, moves, sideConditions: overrides.conditions ?? conditions, field: overrides.field ?? field, names,
  });
  const hpOf = (turn) => turn.sides.map((s) => s.currentHp);

  it('o mais rápido age antes; a prioridade vence a velocidade; Trick Room inverte', () => {
    const fast = side({ stats: { ...side().stats, spe: 300 } });
    expect(turnOrder([side(), fast], [tackle, tackle], conditions, field)).toEqual([1, 0]);
    expect(turnOrder([side(), fast], [{ ...tackle, priority: 1 }, tackle], conditions, field)).toEqual([0, 1]);
    expect(turnOrder([side(), fast], [tackle, tackle], conditions, { ...field, trickRoom: true })).toEqual([0, 1]);
  });

  it('tira o dano médio dos dois lados e anota o golpe recebido', () => {
    const [a, b] = [side(), side()];
    const expected = averageDamage(hit(a, b, tackle));
    const turn = run([a, b], [tackle, tackle]);
    expect(hpOf(turn)).toEqual([300 - expected, 300 - expected]);
    expect(turn.sides[1].lastHit).toEqual({ damage: expected, category: 'physical' });
  });

  it('quem desmaia não age', () => {
    const fast = side({ stats: { ...side().stats, spe: 300 } });
    expect(hpOf(run([side({ currentHp: 1 }), fast], [tackle, tackle]))).toEqual([0, 300]);
  });

  it('Counter devolve o golpe físico recebido no mesmo turno', () => {
    const counter = move('counter', 'fighting', 'physical', null, { priority: -5 });
    const turn = run([side(), side()], [counter, tackle]);
    expect(300 - turn.sides[1].currentHp).toBe((300 - turn.sides[0].currentHp) * 2);
  });

  it('veneno forte cresce a cada turno', () => {
    const poisoned = side({ status: 'toxic' });
    const first = run([poisoned, side()], [null, null]);
    expect(first.sides[0].currentHp).toBe(300 - Math.floor(300 / 16));
    const second = run([{ ...poisoned, ...first.sides[0] }, side()], [null, null]);
    expect(first.sides[0].currentHp - second.sides[0].currentHp).toBe(Math.floor((300 * 2) / 16));
  });

  it('estágios: Swords Dance sobe o usuário, Growl baixa o alvo, Close Combat baixa o próprio usuário', () => {
    const swordsDance = status('swords-dance', 'normal', { target: 'user', category: 'net-good-stats', statChanges: [{ stat: 'atk', change: 2 }] });
    const growl = status('growl', 'normal', { target: 'all-opponents', category: 'net-good-stats', statChanges: [{ stat: 'atk', change: -1 }] });
    expect(run([side(), side()], [swordsDance, growl]).sides[0].boosts.atk).toBe(1);
    const closeCombat = move('close-combat', 'fighting', 'physical', 120, {
      effects: fx({ category: 'damage-raise', statChanges: [{ stat: 'def', change: -1 }, { stat: 'spd', change: -1 }], statChance: 100 }),
    });
    const after = run([side(), side()], [closeCombat, null]);
    expect(after.sides[0].boosts).toMatchObject({ def: -1, spd: -1 });
    expect(after.sides[1].boosts.def).toBe(0);
  });

  it('Draco Meteor e Make It Rain baixam a SpA do usuário; Tera Blast só com Tera Stellar', () => {
    const dracoMeteor = move('draco-meteor', 'dragon', 'special', 130, {
      effects: fx({ category: 'damage-raise', statChanges: [{ stat: 'spa', change: -2 }], statChance: 100 }),
    });
    const after = run([side(), side()], [dracoMeteor, null]);
    expect(after.sides[0].boosts.spa).toBe(-2);
    expect(after.sides[1].boosts.spa).toBe(0);
    const makeItRain = move('make-it-rain', 'steel', 'special', 120, {
      effects: fx({ target: 'all-opponents', category: null, statChanges: [{ stat: 'spa', change: -1 }] }),
    });
    expect(run([side(), side()], [makeItRain, null]).sides[0].boosts.spa).toBe(-1);
    const teraBlast = move('tera-blast', 'normal', 'special', 80, {
      effects: fx({ category: null, statChanges: [{ stat: 'atk', change: -1 }, { stat: 'spa', change: -1 }] }),
    });
    const plain = run([side(), side()], [teraBlast, null]);
    expect([plain.sides[0].boosts.spa, plain.sides[1].boosts.spa]).toEqual([0, 0]);
    const stellar = run([side({ tera: 'stellar' }), side()], [teraBlast, null]);
    expect(stellar.sides[0].boosts.spa).toBe(-1);
  });

  it('Belly Drum paga metade dos PS e leva o Atk a +6; Heal Pulse cura o alvo', () => {
    const bellyDrum = status('belly-drum', 'normal', { target: 'user', category: 'unique' });
    const drummed = run([side(), side()], [bellyDrum, null]);
    expect(drummed.sides[0]).toMatchObject({ currentHp: 150, boosts: { atk: 6 } });
    expect(run([side({ currentHp: 150 }), side()], [bellyDrum, null]).sides[0].boosts.atk).toBe(0);
    const healPulse = status('heal-pulse', 'psychic', { category: 'heal', healing: 50 });
    const healed = run([side({ currentHp: 100 }), side({ currentHp: 100 })], [healPulse, null]);
    expect(healed.sides.map((s) => s.currentHp)).toEqual([100, 250]);
  });

  it('o estágio novo já vale no turno seguinte', () => {
    const swordsDance = status('swords-dance', 'normal', { target: 'user', category: 'net-good-stats', statChanges: [{ stat: 'atk', change: 2 }] });
    const first = run([side(), side()], [swordsDance, null]);
    const boosted = run([{ ...side(), ...first.sides[0] }, side()], [tackle, null]);
    const plain = run([side(), side()], [tackle, null]);
    expect(300 - boosted.sides[1].currentHp).toBeGreaterThan(300 - plain.sides[1].currentHp);
  });

  it('status: Toxic envenena, Thunder Wave não pega em Ground, Spore não pega em Grass', () => {
    const toxic = status('toxic', 'poison', { category: 'ailment', ailment: 'poison' });
    expect(run([side(), side()], [toxic, null]).sides[1].status).toBe('toxic');
    expect(run([side(), side({ types: ['steel'] })], [toxic, null]).sides[1].status).toBe('');
    const thunderWave = status('thunder-wave', 'electric', { category: 'ailment', ailment: 'paralysis' });
    expect(run([side(), side({ types: ['ground'] })], [thunderWave, null]).sides[1].status).toBe('');
    const spore = status('spore', 'grass', { category: 'ailment', ailment: 'sleep' });
    expect(run([side(), side({ types: ['grass'] })], [spore, null]).sides[1].status).toBe('');
    expect(run([side(), side()], [spore, null]).sides[1].status).toBe('sleep');
  });

  it('quem dorme perde 2 turnos e acorda no 3º', () => {
    let sleeper = side({ status: 'sleep', sleepTurns: null });
    const acted = [];
    for (let i = 0; i < 3; i += 1) {
      const turn = run([sleeper, side()], [tackle, null]);
      acted.push(turn.sides[1].currentHp < 300);
      sleeper = { ...sleeper, ...turn.sides[0] };
    }
    expect(acted).toEqual([false, false, true]);
  });

  it('Recover cura metade; Giga Drain cura com o dano; Double-Edge tem recuo', () => {
    const recover = status('recover', 'normal', { target: 'user', category: 'heal', healing: 50 });
    expect(run([side({ currentHp: 100 }), side()], [recover, null]).sides[0].currentHp).toBe(250);
    const gigaDrain = move('giga-drain', 'grass', 'special', 75, { effects: fx({ drain: 50 }) });
    const drained = run([side({ currentHp: 100 }), side()], [gigaDrain, null]);
    expect(drained.sides[0].currentHp).toBe(100 + Math.floor((300 - drained.sides[1].currentHp) / 2));
    const doubleEdge = move('double-edge', 'normal', 'physical', 120, { effects: fx({ drain: -33 }) });
    const recoiled = run([side(), side()], [doubleEdge, null]);
    expect(recoiled.sides[0].currentHp).toBe(300 - Math.floor(((300 - recoiled.sides[1].currentHp) * 33) / 100));
  });

  it('Leech Seed tira 1/8 do semeado e cura quem plantou', () => {
    const leechSeed = status('leech-seed', 'grass', { category: 'ailment', ailment: 'leech-seed' });
    const turn = run([side({ currentHp: 200 }), side()], [leechSeed, null]);
    expect(turn.conditions[1].leechSeed).toBe(true);
    expect(turn.sides[1].currentHp).toBe(300 - 37);
    expect(turn.sides[0].currentHp).toBe(200 + 37);
    expect(run([side(), side({ types: ['grass'] })], [leechSeed, null]).conditions[1].leechSeed).toBeFalsy();
  });

  it('Protect bloqueia o golpe do oponente só naquele turno', () => {
    const protect = status('protect', 'normal', { target: 'user', category: 'unique' }, { priority: 4 });
    const turn = run([side(), side()], [protect, tackle]);
    expect(turn.sides[0].currentHp).toBe(300);
    expect(turn.conditions[0].protect).toBe(false);
  });

  it('golpes de campo: Rain Dance, Reflect, Stealth Rock e Trick Room', () => {
    const rain = status('rain-dance', 'water', { target: 'entire-field', category: 'whole-field-effect' });
    const reflect = status('reflect', 'psychic', { target: 'users-field', category: 'field-effect' });
    const turn = run([side(), side()], [rain, reflect]);
    expect(turn.field.weather).toBe('rain');
    expect(turn.conditions[1].reflect).toBe(true);
    const rocks = status('stealth-rock', 'rock', { target: 'opponents-field', category: 'field-effect' });
    expect(run([side(), side()], [rocks, null]).conditions[1].stealthRock).toBe(true);
    const trickRoom = status('trick-room', 'psychic', { target: 'entire-field', category: 'whole-field-effect' }, { priority: -7 });
    expect(run([side(), side()], [trickRoom, null]).field.trickRoom).toBe(true);
  });

  it('Bide acumula por 2 turnos e devolve o dobro no 3º', () => {
    const bide = move('bide', 'normal', 'physical', null, { priority: 1 });
    let user = side();
    let foe = side();
    for (let i = 0; i < 2; i += 1) {
      const turn = run([user, foe], [bide, tackle]);
      user = { ...user, ...turn.sides[0] };
      foe = { ...foe, ...turn.sides[1] };
      expect(foe.currentHp).toBe(300);
    }
    const taken = 300 - user.currentHp;
    expect(user.bide).toEqual({ turns: 2, stored: taken });
    // No 3º turno o lado continua no Bide (mesmo escolhendo outro golpe), que sai antes do Tackle e devolve o dobro.
    const release = run([user, foe], [tackle, tackle]);
    expect(release.sides[1].currentHp).toBe(300 - taken * 2);
    expect(release.sides[0].bide).toBeNull();
  });
});

describe('Fake Out', () => {
  const names = ['Seu', 'Oponente'];
  const tackle = move('tackle', 'normal', 'physical', 40);
  const fakeOut = move('fake-out', 'normal', 'physical', 40, {
    priority: 3,
    effects: {
      target: 'selected-pokemon', category: 'damage', statChanges: [], statChance: 0, ailment: null, ailmentChance: 0,
      healing: 0, drain: 0, flinchChance: 100,
    },
  });
  const run = (combatants, moves) => simulateTurn({ combatants, moves, sideConditions: conditions, field, names });

  it('no primeiro turno age antes e faz o alvo recuar', () => {
    const fast = side({ stats: { ...side().stats, spe: 400 } });
    const turn = run([side(), fast], [fakeOut, tackle]);
    expect(turn.sides[1].currentHp).toBeLessThan(300);
    expect(turn.sides[0].currentHp).toBe(300);
    expect(turn.log.some((line) => /recuou e não age/.test(line.text))).toBe(true);
    expect(turn.sides.map((s) => s.turnsOut)).toEqual([1, 1]);
  });

  it('do segundo turno em diante falha', () => {
    const turn = run([side({ turnsOut: 1 }), side()], [fakeOut, tackle]);
    expect(turn.sides[1].currentHp).toBe(300);
    expect(turn.sides[0].currentHp).toBeLessThan(300);
    expect(hit(side({ turnsOut: 1 }), side(), fakeOut).reason).toMatch(/primeiro turno/);
  });

  it('Inner Focus e Covert Cloak impedem o recuo; Steadfast sobe a Spe', () => {
    expect(run([side(), side({ ability: 'inner-focus' })], [fakeOut, tackle]).sides[0].currentHp).toBeLessThan(300);
    expect(run([side(), side({ item: 'covert-cloak' })], [fakeOut, tackle]).sides[0].currentHp).toBeLessThan(300);
    const steadfast = run([side(), side({ ability: 'steadfast' })], [fakeOut, tackle]);
    expect(steadfast.sides[0].currentHp).toBe(300);
    expect(steadfast.sides[1].boosts.spe).toBe(1);
  });

  it('não faz recuar quem já agiu no turno', () => {
    const faster = side({ stats: { ...side().stats, spe: 400 } });
    const quick = { ...tackle, priority: 4 };
    const turn = run([side(), faster], [fakeOut, quick]);
    expect(turn.sides[0].currentHp).toBeLessThan(300);
    expect(turn.log.some((line) => /recua/.test(line.text))).toBe(false);
  });
});
