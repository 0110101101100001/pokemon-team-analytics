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
  });

  it('converte o poder pela tabela do golpe Max, mais fraca para Lutador e Venenoso', () => {
    expect(maxPower(move('flamethrower', 'fire', 90))).toBe(130);
    expect(maxPower(move('close-combat', 'fighting', 120))).toBe(95);
    expect(maxPower(move('sludge-bomb', 'poison', 90))).toBe(90);
    expect(maxPower(move('hurricane', 'flying', 110))).toBe(140);
  });

  it('troca o golpe pelo Z ou Max do tipo, com um acerto só', () => {
    const bulletSeed = move('bullet-seed', 'grass', 25, { minHits: 2, maxHits: 5 });
    expect(poweredMove(bulletSeed, 'z')).toMatchObject({ slug: 'bloom-doom', power: 100, maxHits: null, powered: 'z', poweredFrom: 'bullet-seed' });
    expect(poweredMove(bulletSeed, 'max')).toMatchObject({ slug: 'max-overgrowth', power: 90, name: 'Max Overgrowth' });
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

  it('não mexe em golpes de status nem de poder variável', () => {
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
