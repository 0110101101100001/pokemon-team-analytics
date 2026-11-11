# Pokémon Team Analytics

Monorepo fullstack para uma Pokédex e Team Builder competitivo, com estatísticas da Smogon sincronizadas no Supabase e recomendações de time via FastAPI.

## Estrutura

```
backend/           # Serviço FastAPI (Python)
  app/
    main.py        # Entrypoint da API
    core/          # config.py (env), security.py (JWT Supabase)
    routers/       # Rotas da API (pokemon_stats.py, etc.)
    scrapers/      # Scraper da Smogon (update_smogon.py)
    services/      # Lógica de recomendação, PokeAPI, ML
    schemas/       # Pydantic (recommendation.py, pokemon_stats.py, etc.)
  requirements.txt # Dependências Python
  .env             # Variáveis de ambiente (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ...)
  Dockerfile       # Imagem Docker do backend
scraper/           # (antigo local do script; mantido vazio após a migração)
frontend/          # Aplicação frontend
k8s/               # Manifests Kubernetes
```

## Scraper da Smogon (`update_smogon.py`)

O script `backend/app/scrapers/update_smogon.py` baixa, trata (parsing) e sincroniza as estatísticas de moveset da Smogon no Supabase (tabela `smogon_stats`).

### Dependências
O script utiliza `requests`, `python-dotenv` e `supabase`. Todas já estão listadas em `backend/requirements.txt`:
```
fastapi==0.110.0
uvicorn==0.30.0
python-dotenv==1.0.0
pyjwt>=2.15.1
supabase>=2.10.0
websockets>=14.0
requests==2.31.0
pandas>=2.2.0
numpy>=1.26.0
httpx==0.24.0
scikit-learn>=1.4.0
```

### Variáveis de ambiente obrigatórias

Crie/confira `backend/.env` com, no mínimo:

```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_do_supabase_aqui
SUPABASE_JWT_SECRET=seu_jwt_secret_do_supabase_aqui
DEFAULT_TIER=gen9ou
SMOGON_STATS_TABLE=smogon_stats
```

## Rodando o scraper

### 1. Manualmente (sem Docker)

A partir da pasta `backend/`:

```bash
# Instale as dependências
pip install -r requirements.txt

# Execute o scraper diretamente
python -m app.scrapers.update_smogon
```

O script processa os tiers `gen9ou`, `gen9uu`, `gen9ubers` e `gen9doublesou` para a data `2026-10`, faz o parsing dos arquivos da Smogon e grava/atualiza (upsert) na tabela `smogon_stats` do Supabase.

### 2. Via Docker

Na raiz do projeto:

```bash
# Levanta o container do backend
docker-compose up --build

# A API fica disponível em http://localhost:8000
```

O `Dockerfile` já instala `requests` (e demais dependências), então o container sobe sem erros relacionadas ao scraper.

## Endpoint de sincronização sob demanda

A API expõe um endpoint administrativo que dispara a sincronização da Smogon:

```
POST /api/admin/sync-smogon
```

- **Autenticação:** requer `Authorization: Bearer <token_jwt_do_supabase>` (mesma dependência de `/api/recommend`).
- **Execução:** a tarefa roda em segundo plano (`BackgroundTasks`); o endpoint retorna imediatamente com `status: "accepted"`.
- **Efeito:** chama `run_sync()` do scraper, que baixa os movesets da Smogon e faz upsert na tabela `smogon_stats`.

Exemplo com `curl`:

```bash
curl -X POST http://localhost:8000/api/admin/sync-smogon \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

Resposta esperada:

```json
{
  "status": "accepted",
  "message": "Sincronização da Smogon iniciada em segundo plano.",
  "endpoint": "/api/admin/sync-smogon"
}
```

## Endpoint público: estatísticas de um Pokémon

O frontend pode consultar os dados estatísticos de um Pokémon específico através do endpoint público:

```
GET /api/pokemon/{name}/stats
```

### Parâmetros

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| `name` | path | Sim | — | Nome do Pokémon (ex: `Great Tusk`) |
| `tier` | query | Não | `gen9ou` | Tier da Smogon (ex: `gen9ou`, `gen9uu`, `gen9ubers`, `gen9doublesou`) |
| `date` | query | Não | mais recente | Mês de referência (ex: `2026-10`). Se omitido, retorna o mês mais recente disponível. |

### Exemplo com `curl`

```bash
# Estatísticas do Great Tusk no gen9ou (mês mais recente)
curl "http://localhost:8000/api/pokemon/Great%20Tusk/stats?tier=gen9ou"

# Estatísticas de um mês específico
curl "http://localhost:8000/api/pokemon/Gholdengo/stats?tier=gen9ou&date=2026-10"
```

### Resposta (exemplo)

```json
{
  "name": "Great Tusk",
  "tier": "gen9ou",
  "date": "2026-10",
  "raw_count": 12345,
  "usage_percent": 28.5,
  "abilities": { "Protosynthesis": 98.2 },
  "items": { "Booster Energy": 88.1, "Leftovers": 5.2 },
  "moves": { "Headlong Rush": 75.3, "Close Combat": 60.1 },
  "spreads": { "Adamant:252/252/4/0/0/0": 40.5 },
  "tera_types": { "Fighting": 35.2, "Steel": 20.1 },
  "teammates": { "Iron Valiant": 15.3, "Raging Bolt": 12.8 },
  "checks_and_counters": [
    { "pokemon": "Iron Valiant", "score": 85.2, "ko_pct": 42.1, "switch_pct": 30.5 }
  ]
}
```

- **Autenticação:** não é necessária (endpoint público).
- **404 Not Found:** se o Pokémon não existir para o tier/data informados.

## Frontend (React + Vite + Tailwind)

A aplicação frontend está em `frontend/` e consome o backend FastAPI através do proxy do Vite (`/api` → `http://localhost:8000`).

### Executar o frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

### Funcionalidades da Pokédex

- **Listagem (Grid):** cards com sprite oficial, nome, número e tipos elementares.
- **Filtros:** busca por nome, seletor de tier (OU/UU/Ubers/Doubles) e mês de referência.
- **Painel lateral (Drawer):** ao clicar em um Pokémon, exibe estatísticas competitivas do Smogon (taxa de uso, habilidades, itens, moves, checks/counters) buscadas em `GET /api/pokemon/{name}/stats`.

Documentação detalhada em `frontend/README.md`.

## Automação agendada (opcional)

Para rodar periodicamente (ex: todo mês, quando a Smogon publica novas estatísticas), você pode:

- Chamar `POST /api/admin/sync-smogon` a partir de um cron job / GitHub Actions / Cloud Scheduler, passando um token de serviço válido.
- Ou executar o script diretamente em um container/job: `docker run ... python -m app.scrapers.update_smogon`.

## Endpoints principais

| Método | Caminho | Descrição | Auth |
|--------|---------|-----------|------|
| GET | `/health` | Health check | Não |
| GET | `/api/pokemon/{name}/stats` | Estatísticas de um Pokémon na Smogon | Não |
| POST | `/api/recommend` | Recomendação de Pokémon/time (autenticado) | Sim |
| POST | `/api/admin/sync-smogon` | Sincronização sob demanda dos dados da Smogon (autenticado) | Sim |
