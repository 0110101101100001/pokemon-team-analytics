import { describe, expect, it } from 'vitest';
import { memberToShowdown, teamToShowdown } from './showdownExport';
import { createBattleSet } from './stats';

const tusk = {
  name: 'great-tusk',
  set: {
    ...createBattleSet(),
    item: 'heavy-duty-boots',
    ability: 'protosynthesis',
    teraType: 'steel',
    nature: 'jolly',
    evs: { hp: 0, atk: 252, def: 4, spa: 0, spd: 0, spe: 252 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 0, spd: 31, spe: 31 },
    moves: [{ slug: 'headlong-rush' }, { slug: 'ice-spinner' }, { slug: 'rapid-spin' }, { slug: 'knock-off' }],
  },
};

describe('teamToShowdown', () => {
  it('gera o texto de importação de um set completo', () => {
    expect(memberToShowdown(tusk, 'Great Tusk')).toBe([
      'Great Tusk @ Heavy Duty Boots',
      'Ability: Protosynthesis',
      'Tera Type: Steel',
      'EVs: 252 Atk / 4 Def / 252 Spe',
      'Jolly Nature',
      'IVs: 0 SpA',
      '- Headlong Rush',
      '- Ice Spinner',
      '- Rapid Spin',
      '- Knock Off',
    ].join('\n'));
  });

  it('omite o que o set não tem e mostra o nível quando não é 100', () => {
    const bare = { name: 'pikachu', set: { ...createBattleSet(), level: 50, moves: [{ slug: 'u-turn' }, null, null, null] } };
    expect(memberToShowdown(bare)).toBe(['Pikachu', 'Level: 50', 'Hardy Nature', '- U Turn'].join('\n'));
  });

  it('separa os Pokémon por linha em branco e usa o nome do Showdown quando há', () => {
    const ogerpon = { name: 'ogerpon-wellspring-mask', set: { ...createBattleSet(), moves: [null, null, null, null] } };
    const text = teamToShowdown([tusk, ogerpon], (member) => (member.name === 'ogerpon-wellspring-mask' ? 'Ogerpon-Wellspring' : undefined));
    expect(text.split('\n\n')).toHaveLength(2);
    expect(text.startsWith('Great Tusk @ Heavy Duty Boots')).toBe(true);
    expect(text.endsWith('Ogerpon-Wellspring\nHardy Nature')).toBe(true);
  });
});
