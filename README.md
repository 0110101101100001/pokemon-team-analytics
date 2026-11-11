# Smearglepedia

Pokédex com dados competitivos da Smogon e um team builder. O frontend é React + Vite e está no Netlify; a API é FastAPI e está no Render. Os dados e a autenticação ficam no Supabase.

## Estrutura

```
backend/
  app/
    main.py          rotas /health, /api/recommend, /api/admin/sync-smogon
    core/            config.py (variáveis de ambiente), security.py (JWT do Supabase)
    routers/         pokemon_stats.py
    scrapers/        update_smogon.py
    services/        recomendação, PokéAPI
    schemas/         modelos Pydantic
  requirements.txt
  Dockerfile
frontend/            React + Vite + Tailwind
netlify.toml         build e headers do frontend
docker-compose.yml   backend local
```

## Desenvolvimento local

Backend, a partir de `backend/`:

```bash
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Ou, na raiz, `docker compose up --build`.

Frontend, a partir de `frontend/`:

```bash
cp .env.example .env
npm install
npm run dev
```

Em desenvolvimento `VITE_API_URL` fica vazio e o Vite encaminha `/api` para `http://localhost:8000`.

## Variáveis de ambiente

Backend (`backend/.env`, ou Environment no Render):

| Variável | Obrigatória | Notas |
|---|---|---|
| `SUPABASE_URL` | sim | |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | só no servidor |
| `SUPABASE_JWT_SECRET` | sim | valida os tokens enviados pelo frontend |
| `ALLOWED_ORIGINS` | não | origens CORS separadas por vírgula; por omissão `http://localhost:5173` |
| `DEFAULT_TIER` | não | por omissão `gen9ou` |
| `SMOGON_BADGE_TIERS` | não | tiers considerados para o selo "Smogon" na grelha |

Frontend (`frontend/.env`, ou Environment variables no Netlify):

| Variável | Notas |
|---|---|
| `VITE_API_URL` | URL do serviço no Render; vazio em desenvolvimento |
| `VITE_SUPABASE_URL` | |
| `VITE_SUPABASE_ANON_KEY` | chave anon, nunca a service role |

As `VITE_*` são embutidas no bundle durante o build. Depois de as alterar no Netlify é preciso fazer um novo deploy.

## Deploy

**Frontend (Netlify).** O `netlify.toml` na raiz já define `base = "frontend"`, o comando de build, a pasta `dist`, os headers de cache e o fallback de SPA. Basta ligar o repositório e definir as três `VITE_*`.

**Backend (Render).** Web Service com Root Directory `backend`, usando o `Dockerfile` ou o runtime Python:

- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/health`

`ALLOWED_ORIGINS` tem de incluir o domínio do Netlify, sem barra no fim.

No plano gratuito o Render adormece o serviço após 15 minutos sem tráfego, e o primeiro pedido seguinte demora a responder. O Supabase gratuito também pausa projetos inativos; o workflow `.github/workflows/supabase-keepalive.yml` faz um pedido a cada três dias para o evitar.

### Cron Jobs no Render

Dois Cron Jobs, criados em New > Cron Job a partir do mesmo repositório. Os horários são em UTC.

| | Keepalive | Atualização da Smogon |
|---|---|---|
| Root Directory | `backend` | `backend` |
| Build Command | `echo ok` | `pip install -r requirements.txt` |
| Command | `curl -fsS --retry 3 --max-time 90 "$BACKEND_HEALTH_URL"` | `python -m app.scrapers.update_smogon` |
| Schedule | `*/10 * * * *` | `0 6 2 * *` |
| Variáveis | `BACKEND_HEALTH_URL` (URL pública do serviço + `/health`) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PYTHON_VERSION` |

A atualização corre no dia 2 porque a Smogon nem sempre publica as estatísticas do mês anterior logo no dia 1. O comando termina com erro se algum tier falhar, e a execução fica marcada como falhada no painel.

## Dados da Smogon

`backend/app/scrapers/update_smogon.py` descarrega os ficheiros de uso e de moveset de `smogon.com/stats/<mês>/` para os tiers da Geração 9 (OU, Ubers, UU, RU, NU, PU, LC, Doubles OU) e faz upsert na tabela `smogon_stats`, com chave única `(name, tier, date)`. As linhas do mesmo tier e mês são apagadas antes de serem regravadas.

```bash
cd backend
python -m app.scrapers.update_smogon
```

Sem argumentos, sincroniza o mês anterior ao corrente. Para outro mês:

```bash
python -m app.scrapers.update_smogon 2026-10
```

A API usa sempre o mês mais recente que existir na tabela.

A sincronização também pode ser disparada pela API, em segundo plano, com `POST /api/admin/sync-smogon`.

## API

| Método | Caminho | Auth | |
|---|---|---|---|
| GET | `/health` | não | |
| GET | `/api/smogon/names` | não | Pokémon com dados na Smogon, por tier |
| GET | `/api/pokemon/{name}/stats` | não | estatísticas de um Pokémon (`?tier=`, `?date=`) |
| POST | `/api/recommend` | sim | recomendação para a equipa |
| POST | `/api/admin/sync-smogon` | sim | sincronização com a Smogon |

As rotas autenticadas esperam `Authorization: Bearer <access token do Supabase>`. A documentação interativa fica em `/docs`.

```bash
curl "http://localhost:8000/api/pokemon/Great%20Tusk/stats?tier=gen9ou"
```

`/api/pokemon/{name}/stats` devolve 404 quando não há dados para esse Pokémon no tier e mês pedidos.
