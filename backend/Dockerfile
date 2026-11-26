FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Dependências do sistema (mínimas; o scraper usa apenas requests/supabase)
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Instala dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Código da aplicação (o .dockerignore deixa de fora .env, venv e testes)
COPY . .

# Roda sem root: um usuário sem senha nem shell, dono só do que precisa ler.
RUN useradd --system --no-create-home --shell /usr/sbin/nologin app
USER app

# Expõe a porta da API
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
