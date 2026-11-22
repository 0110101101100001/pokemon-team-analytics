import { describe, expect, it } from 'vitest';
import { canPowerUp, maxPower, poweredMove, zPower } from './poweredMoves';

const move = (slug, type, power, extra = {}) => ({ slug, type, damageClass: 'physical', power, ...extra });

describe('golpes Z e Max na calculadora', () => {
  it('converte o poder pela tabela do golpe Z', () => {
    expect(zPower(move('earthquake', 'ground', 100))).toBe(180);
    expect(zPower(move('flamethrower', 'fire', 90))).toBe(175);
    expect(zPower(move('quick-attack', 'normal', 40))).toBe(100);
    expect(zPower(move('close-combat', 'fighting', 120))).toBe(190);
    expect(zPower(move('v-create', 'fire', 180))).toBe(220);
    expect(zPower(move('return', 'normal', 102))).toBe(160);
  });

  it('converte o poder pela tabela do golpe Max, mais fraca para Lutador e Venenoso', () => {
    expect(maxPower(move('flamethrower', 'fire', 90))).toBe(130);
    expect(maxPower(move('close-combat', 'fighting', 120))).toBe(95);
    expect(maxPower(move('sludge-bomb', 'poison', 90))).toBe(90);
    expect(maxPower(move('hurricane', 'flying', 110))).toBe(140);
  });

  it('troca o golpe pelo Z ou Max do tipo, com um acerto só', () => {
    const bulletSeed = move('bullet-seed', 'grass', 25, { minHits: 2, maxHits: 5 });
    expect(poweredMove(bulletSeed, 'z')).toMatchObject({ slug: 'bloom-doom', power: 140, maxHits: null, powered: 'z', poweredFrom: 'bullet-seed' });
    expect(poweredMove(bulletSeed, 'max')).toMatchObject({ slug: 'max-overgrowth', power: 130, name: 'Max Overgrowth' });
    expect(poweredMove(move('play-rough', 'fairy', 90), 'z').slug).toBe('twinkle-tackle');
  });

  it('troca pelo G-Max só o golpe do tipo do G-Max; os outros viram o Max', async () => {
    const { gmaxMoveOf } = await import('../data/gmaxMoves');
    const wildfire = gmaxMoveOf('charizard');
    expect(poweredMove(move('flamethrower', 'fire', 90), 'gmax', wildfire))
      .toMatchObject({ name: 'G-Max Wildfire', slug: 'g-max-wildfire', type: 'fire', power: 130, powered: 'gmax' });
    expect(poweredMove(move('air-slash', 'flying', 75), 'gmax', wildfire)).toMatchObject({ name: 'Max Airstream', powered: 'max' });
    expect(poweredMove(move('close-combat', 'fighting', 120), 'gmax', gmaxMoveOf('machamp')).power).toBe(95);
    expect(poweredMove(move('quick-attack', 'normal', 40), 'gmax', null)).toMatchObject({ name: 'Max Strike' });
  });

  it('G-Max Drum Solo, Fireball e Hydrosnipe têm poder fixo de 160', async () => {
    const { gmaxMoveOf } = await import('../data/gmaxMoves');
    expect(poweredMove(move('drum-beating', 'grass', 80), 'gmax', gmaxMoveOf('rillaboom')).power).toBe(160);
    expect(poweredMove(move('ember', 'fire', 40), 'gmax', gmaxMoveOf('cinderace')).power).toBe(160);
    expect(poweredMove(move('water-gun', 'water', 40), 'gmax', gmaxMoveOf('inteleon')).power).toBe(160);
  });

  it('não mexe em golpes de status', () => {
    const status = { slug: 'swords-dance', type: 'normal', damageClass: 'status', power: null };
    expect(canPowerUp(status)).toBe(false);
    expect(poweredMove(status, 'z')).toBe(status);
    expect(poweredMove(move('earthquake', 'ground', 100), '')).toMatchObject({ slug: 'earthquake' });
  });
});

describe('golpes Z e Max na fórmula', async () => {
  const { calculateDamage } = await import('./damage');
  const { createField, createSideConditions } = await import('../components/calc/calcState');
  const combatant = (types) => ({
    level: 100, types, originalTypes: types, tera: '', boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, item: '', ability: '', status: '',
    stats: { hp: 300, atk: 250, def: 200, spa: 200, spd: 200, spe: 200 },
  });
  const field = createField();
  const damage = (move, protect) => calculateDamage({
    attacker: combatant(['fire']),
    defender: combatant(['normal']),
    move: { ...move, category: move.damageClass, hits: 1, crit: false },
    field,
    defenderSide: { ...createSideConditions(), protect },
  });
  const flamethrower = { slug: 'flamethrower', type: 'fire', damageClass: 'special', power: 90 };

  it('atravessa Protect com 1/4 do dano; o golpe normal não', () => {
    const z = poweredMove(flamethrower, 'z');
    const open = damage(z, false).max;
    const guarded = damage(z, true).max;
    expect(guarded).toBeGreaterThan(0);
    expect(Math.abs(guarded - open / 4)).toBeLessThanOrEqual(1);
    expect(damage(flamethrower, true).reason).toMatch(/Protect/);
  });
});

describe('habilidades que trocam o tipo e golpes Z', async () => {
  const { calculateDamage } = await import('./damage');
  const { createField, createSideConditions } = await import('../components/calc/calcState');
  const combatant = (ability) => ({
    level: 100, types: ['normal'], tera: '', boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, item: '', ability, status: '',
    stats: { hp: 300, atk: 200, def: 200, spa: 200, spd: 200, spe: 200 },
  });
  const damage = (used, ability) => calculateDamage({
    attacker: combatant(ability),
    defender: combatant(''),
    move: { ...used, category: used.damageClass, hits: 1, crit: false },
    field: createField(),
    defenderSide: createSideConditions(),
  });
  const returnMove = move('return', 'normal', 102);

  it.each(['pixilate', 'aerilate', 'refrigerate', 'galvanize', 'normalize'])('%s não afeta o Breakneck Blitz', (ability) => {
    expect(damage(poweredMove(returnMove, 'z'), ability)).toMatchObject({ moveType: 'normal', min: 172, max: 204 });
  });

  it('Normalize não troca o tipo de um golpe Z de outro tipo', () => {
    expect(damage(poweredMove(move('flamethrower', 'fire', 90), 'z'), 'normalize').moveType).toBe('fire');
  });

  it('o golpe normal continua mudando de tipo e ganhando o bônus', () => {
    expect(damage(returnMove, 'pixilate')).toMatchObject({ moveType: 'fairy', min: 88, max: 104 });
  });
});

describe('tipo do golpe antes de virar Z ou Max', async () => {
  const { calculateDamage } = await import('./damage');
  const { simulateTurn } = await import('./turn');
  const { createField, createMoveSlot, createSideConditions, resolveSlot } = await import('../components/calc/calcState');
  const { gmaxMoveOf } = await import('../data/gmaxMoves');
  const combatant = (extra = {}) => ({
    level: 100, types: ['normal'], tera: '', boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, item: '', ability: '', status: '',
    stats: { hp: 300, atk: 200, def: 200, spa: 200, spd: 200, spe: 200 }, ...extra,
  });
  const use = (base, { mode = '', gmax = null, weather = '', terrain = '', ...extra } = {}) => {
    const attacker = combatant(extra);
    const field = { ...createField(), weather, terrain };
    const used = resolveSlot({ ...createMoveSlot(base), mode }, gmax, { attacker, field });
    const result = calculateDamage({ attacker, defender: combatant(), move: used, field, defenderSide: createSideConditions() });
    return { name: used.name, power: used.power, type: result.moveType, min: result.min, max: result.max };
  };
  const returnMove = move('return', 'normal', 102);
  const weatherBall = move('weather-ball', 'normal', 50, { damageClass: 'special' });
  const terrainPulse = move('terrain-pulse', 'normal', 50, { damageClass: 'special' });

  it.each([
    ['pixilate', 'fairy', 'Max Starfall'],
    ['aerilate', 'flying', 'Max Airstream'],
    ['refrigerate', 'ice', 'Max Hailstorm'],
    ['galvanize', 'electric', 'Max Lightning'],
  ])('%s: o Max é o do novo tipo, sem o bônus', (ability, type, name) => {
    expect(use(returnMove, { mode: 'max', ability })).toEqual({ name, power: 130, type, min: 94, max: 111 });
  });

  it('Normalize: vira Max Strike, com o bônus e o poder do golpe original', () => {
    expect(use(returnMove, { mode: 'max', ability: 'normalize' })).toMatchObject({ name: 'Max Strike', min: 169, max: 199 });
    expect(use(move('close-combat', 'fighting', 120), { mode: 'max', ability: 'normalize' })).toMatchObject({ name: 'Max Strike', power: 95 });
  });

  it('o G-Max segue o tipo novo', () => {
    const options = { mode: 'gmax', gmax: gmaxMoveOf('meowth') };
    expect(use(returnMove, options).name).toBe('G-Max Gold Rush');
    expect(use(returnMove, { ...options, ability: 'pixilate' }).name).toBe('Max Starfall');
  });

  it.each([
    ['sun', 'fire', 'Inferno Overdrive'],
    ['harsh-sun', 'fire', 'Inferno Overdrive'],
    ['rain', 'water', 'Hydro Vortex'],
    ['heavy-rain', 'water', 'Hydro Vortex'],
    ['sand', 'rock', 'Continental Crush'],
    ['snow', 'ice', 'Subzero Slammer'],
    ['strong-winds', 'normal', 'Breakneck Blitz'],
    ['', 'normal', 'Breakneck Blitz'],
  ])('Weather Ball Z com clima "%s" é %s: %s', (weather, type, name) => {
    expect(use(weatherBall, { mode: 'z', weather, ability: 'pixilate' })).toMatchObject({ name, power: 160, type });
  });

  it('Terrain Pulse muda de tipo como Max, não como Z', () => {
    expect(use(terrainPulse, { mode: 'z', terrain: 'electric' }).name).toBe('Breakneck Blitz');
    expect(use(terrainPulse, { mode: 'max', terrain: 'electric' }).name).toBe('Max Lightning');
    expect(use(terrainPulse, { mode: 'max', terrain: 'electric', types: ['flying'] }).name).toBe('Max Strike');
  });

  it('o Z da Weather Ball segue o clima que mudou no mesmo turno', () => {
    const combatants = [combatant(), combatant({ stats: { ...combatant().stats, spe: 300 } })];
    const field = createField();
    const z = resolveSlot({ ...createMoveSlot(weatherBall), mode: 'z' }, null, { attacker: combatants[0], field });
    const sunnyDay = { ...move('sunny-day', 'fire', null, { damageClass: 'status' }), category: 'status', effects: { target: 'entire-field', statChanges: [] } };
    const turn = simulateTurn({ combatants, moves: [z, sunnyDay], sideConditions: field.sides, field, names: ['A', 'B'] });
    expect(z.name).toBe('Breakneck Blitz');
    expect(turn.log.map((line) => line.text).join(' ')).toContain('Inferno Overdrive');
  });

  const exempt = ['judgment', 'multi-attack', 'natural-gift', 'revelation-dance', 'techno-blast', 'terrain-pulse', 'weather-ball'];

  it.each(exempt)('%s não muda com -ate, mas muda virando Max', (slug) => {
    const base = move(slug, 'normal', 100);
    expect(use(base, { ability: 'pixilate' })).toEqual(use(base));
    expect(use(base, { ability: 'pixilate', mode: 'max' }).type).toBe('fairy');
  });

  it.each([...exempt, 'hidden-power', 'struggle'])('%s não recebe Normalize', (slug) => {
    const base = move(slug, 'normal', 100);
    expect(use(base, { ability: 'normalize' })).toEqual(use(base));
  });

  it('Tera Blast com Tera, inclusive Stellar, não muda com -ate', () => {
    const teraBlast = move('tera-blast', 'normal', 80);
    expect(use(teraBlast, { ability: 'pixilate', tera: 'stellar' }).type).toBe('normal');
    expect(use(teraBlast, { ability: 'pixilate', tera: 'fire' }).type).toBe('fire');
    expect(use(teraBlast, { ability: 'pixilate' }).type).toBe('fairy');
  });
});
