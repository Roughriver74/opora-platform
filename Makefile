.PHONY: up down logs migrate migration shell db test build deploy deploy-bg monitoring status

# Запуск в dev режиме
up:
	docker compose up -d

# Остановка
down:
	docker compose down

# Логи backend
logs:
	docker compose logs -f backend

# Применить миграции
migrate:
	docker compose exec backend alembic upgrade head

# Создать миграцию (использование: make migration name="описание")
migration:
	docker compose exec backend alembic revision --autogenerate -m "$(name)"

# Открыть shell в backend контейнере
shell:
	docker compose exec backend bash

# Открыть psql
db:
	docker compose exec db psql -U opora_user -d opora_dev

# Запустить тесты
test:
	docker compose exec backend pytest tests/ -v

# Пересобрать образы
build:
	docker compose build --no-cache

# Production деплой
deploy:
	bash deploy/deploy.sh

# Blue-green деплой
deploy-bg:
	bash deploy/blue-green-deploy.sh

# Мониторинг (Prometheus + Grafana)
monitoring:
	docker compose -f docker-compose.monitoring.yml up -d

# Статус всех сервисов
status:
	docker compose ps
	@echo ""
	@echo "=== Health Check ==="
	@curl -s http://localhost:4201/api/health | python3 -m json.tool 2>/dev/null || echo "Backend not running"
