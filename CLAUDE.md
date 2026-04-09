# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OPORA (ОПОРА) is a visit and activity management platform for field teams. Built with Python/FastAPI backend and React/TypeScript frontend. Uses PostgreSQL for data persistence and optional Bitrix24 CRM integration.

**Architecture**: FastAPI backend + React SPA frontend, Docker-based deployment
**Database**: PostgreSQL 14 with SQLAlchemy ORM + Alembic migrations
**Authentication**: JWT-based with role-based access (user/admin)
**External Integration**: Bitrix24 CRM (configurable per deployment), DaData address service

## Что использовать

Для внутренних вычислений используй backend (Python/FastAPI).
Для отрисовки данных - frontend (React/MUI).

## Development Commands

**IMPORTANT**: This project can run via Docker or locally.

### Docker (recommended)
```bash
docker-compose up --build          # Start all services
docker-compose down                # Stop all services
docker-compose logs -f backend     # Backend logs
docker-compose logs -f frontend    # Frontend logs
```

### Local development
```bash
./start_dev.sh                     # Start backend (4201) + frontend (4200) locally
```

### Backend only (Python)
```bash
pip install -r app/requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 4201 --reload
```

### Frontend only (React)
```bash
cd frontend
npm install
PORT=4200 REACT_APP_API_URL=http://localhost:4201/api npm start
```

### Database Migrations (Alembic)
```bash
# Inside backend container or locally with correct DATABASE_URL
cd app
alembic upgrade head               # Run migrations
alembic revision --autogenerate -m "description"  # Generate migration
alembic downgrade -1                # Revert last migration
```

## Service Access
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:4201
- **API Docs (Swagger)**: http://localhost:4201/docs
- **PostgreSQL**: localhost:4202
- **Production**: https://opora.b-ci.ru

## Architecture & Key Components

### Backend (`/app`)
- **Framework**: FastAPI with async support (uvicorn)
- **ORM**: SQLAlchemy 2.0 (async via asyncpg)
- **Structure**:
  - `main.py` — App entry point, router registration
  - `config.py` — Settings from environment variables
  - `models.py` — SQLAlchemy database models
  - `routers/` — API endpoint definitions (auth, visits, clinics, contacts, doctors, admin, settings, tasks, dadata)
  - `services/` — Business logic using Unit of Work pattern
  - `schemas/` — Pydantic validation schemas
  - `alembic/` — Database migrations
  - `schedulers/` — APScheduler tasks (Excel import)

### Frontend (`/frontend/src`)
- **Framework**: React 18 + TypeScript
- **UI Library**: MUI v5 with custom adaptive theme
- **Theme**: Light/dark mode with Inter font (see `theme/` directory)
- **State**: React Query (@tanstack/react-query) + Context API
- **Key directories**:
  - `pages/` — Page components (Visits, Companies, Contacts, Admin panels)
  - `components/` — Reusable UI (Layout, StatusBadge, PageHeader, ThemeToggle, etc.)
  - `context/` — AuthContext (JWT auth), ThemeContext (light/dark)
  - `theme/` — Modular theme (palette.ts, typography.ts, components.ts, index.ts)
  - `services/` — Axios-based API clients

### Database Entities (`app/models.py`)
- **User** — email, hashed_password, is_admin, bitrix_user_id
- **Company** — name, bitrix_id, inn, kpp, region, dynamic_fields (JSONB)
- **Visit** — company_id, user_id, date, status, visit_type, dynamic_fields
- **Doctor** — name, bitrix_id, dynamic_fields
- **Contact** — name, bitrix_id, contact_type, dynamic_fields
- **NetworkClinic** — company_id, name, doctor_bitrix_id
- **FieldMapping** — entity_type, app_field_name, bitrix_field_id
- **GlobalSettings** — key/value settings store
- **CompanyAddress** — company_id, city, street, latitude, longitude

### API Routes (prefix: `/api`)
- Auth: `POST /auth/login`, `POST /auth/register`
- Visits: `GET/POST/PUT/DELETE /visits/*`
- Companies: `GET/POST/PUT/DELETE /clinics/*`
- Contacts: `GET/POST/PUT/DELETE /contacts/*`
- Doctors: `GET/POST/PUT/DELETE /doctors/*`
- Settings: `GET/PUT /settings/*`
- Admin: `GET/POST/PUT/DELETE /admin/field-mappings`
- Health: `GET /health`

## Environment Configuration

See `.env.example` for all variables. Key ones:
```
DATABASE_URL=postgresql://opora_user:opora_dev_pass@db:5432/opora_dev
JWT_SECRET=change-me-in-production
BITRIX_API_ENDPOINT=           # Optional, configurable via admin UI
CORS_ORIGINS=http://localhost:4200
TOKEN_DADATA=                  # Optional, for address autocomplete
```

## Key Development Notes

### Theme System
The app uses a modular MUI theme (`frontend/src/theme/`) with light/dark mode. `ThemeContext` persists user preference to localStorage. All UI components should use theme tokens, not hardcoded colors.

### Bitrix24 Integration
Bitrix24 webhook URL is configurable (not hardcoded). Configure via admin settings page or `BITRIX_API_ENDPOINT` env var. App works without Bitrix24 for local CRUD operations.

### Docker Ports
- 4200: Frontend (nginx serving React build)
- 4201: Backend (uvicorn FastAPI)
- 4202: PostgreSQL

### Testing
```bash
# E2E tests can be run from project root if Playwright is configured
npm test
```
