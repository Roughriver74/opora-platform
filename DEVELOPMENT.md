# Руководство по разработке OPORA

## Быстрый запуск

### Через Docker (рекомендуется)

```bash
docker-compose up --build
```

Сервисы:

- Frontend: <http://localhost:4200>
- Backend API: <http://localhost:4201>
- Swagger Docs: <http://localhost:4201/docs>
- PostgreSQL: localhost:4202

### Локальная разработка (без Docker)

```bash
./start_dev.sh
```

Это запустит backend на порту 4201 и frontend на порту 4200.

### Только Backend

```bash
pip install -r app/requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 4201 --reload
```

### Только Frontend

```bash
cd frontend
npm install
PORT=4200 REACT_APP_API_URL=http://localhost:4201/api npm start
```

## Переменные окружения

Скопируйте `.env.example` в `.env`:

```bash
cp .env.example .env
```

Основные переменные:

```env
DATABASE_URL=postgresql://opora_user:opora_dev_pass@localhost:4202/opora_dev
POSTGRES_HOST=localhost
POSTGRES_PORT=4202
POSTGRES_USER=opora_user
POSTGRES_PASSWORD=opora_dev_pass
POSTGRES_DB=opora_dev
JWT_SECRET=opora-dev-jwt-secret
BITRIX_API_ENDPOINT=
TOKEN_DADATA=
SECRET_DADATA=
CORS_ORIGINS=http://localhost:4200
ENVIRONMENT=development
DEV_MODE=True
```

## База данных

### Миграции (Alembic)

```bash
# Применить миграции
cd app && alembic upgrade head

# Создать новую миграцию
cd app && alembic revision --autogenerate -m "описание изменений"

# Откатить последнюю миграцию
cd app && alembic downgrade -1
```

### Подключение к БД

```bash
# Через Docker
docker exec -it opora_postgres psql -U opora_user -d opora_dev

# Локально
psql -h localhost -p 4202 -U opora_user -d opora_dev
```

## Деплой

### Production

```bash
cd deploy
./deploy.sh prod
```

Или вручную:

```bash
docker-compose -f deploy/docker-compose.prod.yml up --build -d
```

### Development (удалённый сервер)

```bash
cd deploy
./deploy.sh dev
```

## Архитектура

- **Backend**: Python 3.11 + FastAPI + SQLAlchemy (async) + Alembic
- **Frontend**: React 18 + TypeScript + MUI v5 + React Query
- **БД**: PostgreSQL 14
- **Деплой**: Docker Compose + Nginx

## Порты

| Сервис | Порт |
| --- | --- |
| Frontend (nginx) | 4200 |
| Backend (uvicorn) | 4201 |
| PostgreSQL | 4202 |
