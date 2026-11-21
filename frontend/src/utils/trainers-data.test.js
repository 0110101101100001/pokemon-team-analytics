/* eslint-env node */
import { describe, expect, it } from 'vitest';
import { unknownTrainerValues } from './trainers';

// Confere a tabela de verdade, com a chave anon, como o site lê: um problema de permissão também aparece aqui.
// Roda no CI com os secrets SUPABASE_URL e SUPABASE_ANON_KEY e é pulado sem eles.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
const COLUMNS = 'Card_ID,Region,Role,Battle_Stage,Battle_Gimmick,Games_Label,Games_JSON';
const PAGE_SIZE = 1000;

async function fetchAllRows() {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await fetch(`${url}/rest/v1/PokemonTrainers?select=${COLUMNS}&order=Card_ID`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + PAGE_SIZE - 1}` },
    });
    if (!response.ok) throw new Error(`PokemonTrainers: ${response.status} ${await response.text()}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

describe.skipIf(!url || !key)('PokemonTrainers no Supabase', () => {
  it('só tem regiões, papéis, etapas, mecânicas e jogos que o front sabe posicionar', async () => {
    const rows = await fetchAllRows();
    expect(rows.length).toBeGreaterThan(0);
    expect(unknownTrainerValues(rows)).toEqual({});
  }, 30_000);
});
