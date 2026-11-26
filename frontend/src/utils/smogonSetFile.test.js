import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import gen9 from '../data/gen9.json';
import { smogonSetFile } from './smogonSetFile';

const DIR = new URL('../../public/data/smogon-sets/', import.meta.url);
const readJson = (file) => JSON.parse(readFileSync(new URL(file, DIR), 'utf8'));

describe('smogonSetFile', () => {
  it('vira um nome de arquivo seguro', () => {
    expect(smogonSetFile('Raichu-Alola')).toBe('raichu-alola');
    expect(smogonSetFile('Zygarde-10%')).toBe('zygarde-10');
    expect(smogonSetFile("Oricorio-Pa'u")).toBe('oricorio-pa-u');
    expect(smogonSetFile('Mr. Mime')).toBe('mr-mime');
  });
});

// Se falhar, o gen9.json mudou sem rodar `node scripts/build-smogon-sets.mjs` (na raiz do repositório).
describe('public/data/smogon-sets em dia com gen9.json', () => {
  it('o índice tem os mesmos nomes, na mesma ordem', () => {
    expect(readJson('index.json')).toEqual(Object.keys(gen9));
  });

  it('cada Pokémon tem o seu arquivo, igual ao trecho do gen9.json', () => {
    for (const [name, sets] of Object.entries(gen9)) {
      expect(readJson(`${smogonSetFile(name)}.json`), name).toEqual(sets);
    }
  });
});
