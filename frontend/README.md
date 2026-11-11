# Frontend — Pokédex Competitiva

Interface em **React + Vite + Tailwind CSS** para consulta de Pokémons e estatísticas competitivas da Smogon.

## Estrutura

```
frontend/
  index.html
  vite.config.js        # Vite + proxy /api → http://localhost:8000
  tailwind.config.js    # Tema e cores dos tipos Pokémon
  postcss.config.js
  package.json
  src/
    main.jsx            # Entry point
    index.css           # Tailwind + estilos globais
    App.jsx             # Orquestração de estado e layout principal
    services/
      api.js            # Integração PokeAPI + backend FastAPI
    components/
      PokemonCard.jsx   # Card de listagem (clique abre o drawer)
      PokemonTypeBadge.jsx  # Badge de tipo elementar
      FiltersBar.jsx    # Barra de busca + filtros tier/data
      PokemonGrid.jsx   # Grid responsiva de cards
      PokemonDrawer.jsx # Painel lateral com detalhes + stats Smogon
    utils/
      typeColors.js     # Cores dos tipos elementares
```

## Instalação e execução

```bash
cd frontend

# Instalar dependências
npm install

# Rodar em desenvolvimento (porta 5173)
npm run dev

# Build para produção
npm run build

# Pré-visualizar build de produção
npm run preview
```

O Vite já tem um proxy configurado (`/api` → `http://localhost:8000`), então o frontend consome o backend sem problemas de CORS em desenvolvimento.

## Integrações

### PokeAPI (pública)
- Listagem de Pokémon com sprites oficiais, nomes e tipos.
- Consumido via `src/services/api.js` → `fetchPokemonList()`.

### Backend FastAPI (Smogon)
- Endpoint público: `GET /api/pokemon/{name}/stats?tier=gen9ou&date=2026-10`
- Consumido ao abrir o drawer de um Pokémon via `fetchSmogonStats()`.
- Retorna `404` quando não há dados do Smogon para aquele Pokémon/tier/data.

## Funcionalidades

| Tela | Descrição |
|------|-----------|
| Listagem (Grid) | Cards com sprite, nome, número e tipos. Filtro por nome, tier e mês. |
| Detalhes (Drawer lateral) | Ao clicar em um card, abre painel direito com sprite, tipos, taxa de uso, habilidades, itens, moves e checks/counters do Smogon. |
| Filtros | Busca por nome, seletor de tier (OU/UU/Ubers/Doubles) e mês de referência. |

## Requisitos

- Node.js 18+
- Backend FastAPI rodando em `http://localhost:8000` (veja `../backend/README.md`)
