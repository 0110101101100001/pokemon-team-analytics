import { describe, expect, it } from 'vitest';
import { cellSummary } from '../components/types/TypeMatrix';
import { defenseTypesFromParams } from './TypesSection';

const params = (query) => new URLSearchParams(query);

describe('defenseTypesFromParams', () => {
  it('lê t1 e t2 do endereço', () => {
    expect(defenseTypesFromParams(params('t1=fire&t2=flying'))).toEqual({ first: 'fire', second: 'flying' });
    expect(defenseTypesFromParams(params('t1=water'))).toEqual({ first: 'water', second: '' });
  });

  it('ignora valores inválidos, o 2º igual ao 1º e o 2º sem o 1º', () => {
    expect(defenseTypesFromParams(params('t1=xyz&t2=fire'))).toEqual({ first: '', second: '' });
    expect(defenseTypesFromParams(params('t1=fire&t2=fogo'))).toEqual({ first: 'fire', second: '' });
    expect(defenseTypesFromParams(params('t1=fire&t2=fire'))).toEqual({ first: 'fire', second: '' });
    expect(defenseTypesFromParams(params('t1=toString'))).toEqual({ first: '', second: '' });
    expect(defenseTypesFromParams(params(''))).toEqual({ first: '', second: '' });
  });
});

describe('cellSummary', () => {
  it('descreve o confronto da célula', () => {
    expect(cellSummary('fire', 'grass')).toBe('Fire → Grass: 2× (super efetivo)');
    expect(cellSummary('normal', 'ghost')).toBe('Normal → Ghost: 0× (sem efeito)');
    expect(cellSummary('water', 'water')).toBe('Water → Water: ½× (pouco efetivo)');
    expect(cellSummary('fire', 'normal')).toBe('Fire → Normal: 1× (normal)');
  });
});
