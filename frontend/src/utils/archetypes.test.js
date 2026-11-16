import { describe, expect, it } from 'vitest';
import { archetypeByKey, archetypeFit, desiredCurve, isWeatherAbuser, isWeatherHindered } from './archetypes';
import { META, byName } from './sketchFixtures';

const team = (...names) => names.map(byName);

describe('archetypeFit', () => {
  it('Balance sem Hazard Control acusa a falta', () => {
    // Kingambit: setup; Dragapult: Pivot (+ Wallbreaker); Toxapex: Hazards e Recovery.
    const fit = archetypeFit(team('kingambit', 'dragapult', 'toxapex'), archetypeByKey('balance'), META);
    expect(fit.missing).toEqual(['removal']);
    expect(fit.notes[0]).toBe('falta: Hazard Control');
    expect(fit.label).toBe('Balance');
    expect(fit.parts.checklist).toBeCloseTo(2 / 3, 5);
    expect(fit.score).toBeLessThan(1);
  });

  it('Balance completo não acusa nada e pontua mais', () => {
    const balance = archetypeByKey('balance');
    const full = archetypeFit(team('great-tusk', 'corviknight', 'toxapex', 'gholdengo'), balance, META);
    const partial = archetypeFit(team('kingambit', 'dragapult', 'toxapex'), balance, META);
    expect(full.missing).toEqual([]);
    expect(full.score).toBeGreaterThan(partial.score);
  });

  it('as funções desejadas continuam pontuando acima do mínimo, com retorno decrescente', () => {
    expect(desiredCurve(0, 2)).toBe(0);
    expect(desiredCurve(2, 2)).toBeCloseTo(0.75, 5);
    expect(desiredCurve(3, 2)).toBeGreaterThan(desiredCurve(2, 2));
    expect(desiredCurve(3, 2) - desiredCurve(2, 2)).toBeLessThan(desiredCurve(2, 2) - desiredCurve(1, 2));
  });

  it('Hyper Offense pesa contra Recovery demais', () => {
    const fit = archetypeFit(team('great-tusk', 'corviknight', 'toxapex', 'gholdengo'), archetypeByKey('hyperOffense'), META);
    expect(fit.parts.penalties).toContainEqual({ label: '2 com Recovery além de 1', value: 0.16 });
  });

  describe('clima', () => {
    // Torkoal: setter, Hazards e Hazard Control. Abusers de sol: Great Tusk (Protosynthesis), Volcarona (Morning Sun),
    // Venusaur (Chlorophyll).
    const sun = archetypeByKey('sun');

    it('sol com 1 abuser não passa de 70%', () => {
      const fit = archetypeFit(team('torkoal', 'great-tusk', 'corviknight', 'kingambit', 'gholdengo', 'dragapult'), sun, META);
      expect(fit.abusers).toEqual(['great-tusk']);
      expect(fit.notes).toContain('1 de 3 abusers de sol');
      expect(fit.score).toBeLessThanOrEqual(0.7);
    });

    it('sol com 3 abusers passa de 85%', () => {
      const fit = archetypeFit(team('torkoal', 'great-tusk', 'volcarona', 'venusaur', 'corviknight', 'kingambit'), sun, META);
      expect(fit.abusers).toHaveLength(3);
      expect(fit.parts.weather).toBe(1);
      expect(fit.score).toBeGreaterThan(0.85);
    });

    it('quem depende de Water é atrapalhado pelo sol; quem aproveita o sol não', () => {
      expect(isWeatherHindered(byName('barraskewda'), 'sun', META)).toBe(true);
      expect(isWeatherHindered(byName('great-tusk'), 'sun', META)).toBe(false);
      const fit = archetypeFit(team('torkoal', 'great-tusk', 'barraskewda'), sun, META);
      expect(fit.parts.penalties).toContainEqual({ label: 'Barraskewda é atrapalhado por sol', value: 0.1 });
    });

    it('chuva sem setter acusa a chuva; o setter não conta como quem aproveita', () => {
      const rain = archetypeByKey('rain');
      expect(archetypeFit(team('barraskewda', 'great-tusk'), rain, META).missing).toContain('weather:rain');
      expect(isWeatherAbuser(byName('barraskewda'), 'rain', META)).toBe(true);
      const withSetter = archetypeFit(team('pelipper', 'barraskewda', 'great-tusk', 'corviknight'), rain, META);
      expect(withSetter.missing).toEqual([]);
      expect(withSetter.abusers).toEqual(['barraskewda']);
    });
  });

  it('Trick Room cobra velocidade baixa', () => {
    const trickRoom = archetypeByKey('trickRoom');
    const slow = archetypeFit(team('hatterene', 'cresselia', 'torkoal'), trickRoom, META);
    const fast = archetypeFit(team('hatterene', 'dragapult', 'iron-valiant'), trickRoom, META);
    expect(slow.score).toBeGreaterThan(fast.score);
    expect(fast.notes.some((note) => note.startsWith('velocidade base média'))).toBe(true);
  });

  it('Livre só cobra as funções básicas', () => {
    const fit = archetypeFit(team('great-tusk', 'rillaboom'), archetypeByKey('free'), META);
    expect(fit.missing).toEqual(['speedControl']);
    expect(fit.parts).toMatchObject({ desired: null, speed: null, weather: null });
  });
});
