# Production Deployment Guide для Beton CRM

## ⚠️ КРИТИЧЕСКИ ВАЖНО: Порядок выполнения

### 1. Резервное копирование MongoDB (ОБЯЗАТЕЛЬНО)
```bash
./scripts/backup-mongodb.sh
```
**Результат**: Полный бэкап текущих данных (пользователи, формы, заявки)

### 2. Деплой нового приложения с Docker
```bash
./scripts/production-deploy.sh
```
**Результат**: Развертывание Docker контейнеров (PostgreSQL, Redis, Backend, Frontend)

### 3. Миграция данных из MongoDB в PostgreSQL
```bash
./scripts/migrate-data-to-postgres.sh
```
**Результат**: Перенос всех данных в новую базу PostgreSQL

## 📋 Что происходит при деплое

### Backup Phase (backup-mongodb.sh)
- ✅ Остановка старого приложения
- ✅ Создание MongoDB dump
- ✅ Экспорт коллекций в JSON
- ✅ Архивирование текущего приложения
- ✅ Скачивание бэкапа локально

### Deploy Phase (production-deploy.sh)
- ✅ Сборка React приложения для продакшн
- ✅ Создание деплой архива
- ✅ Установка Docker и Docker Compose на сервере
- ✅ Запуск PostgreSQL и Redis контейнеров
- ✅ Развертывание Backend и Frontend
- ✅ Запуск миграций схемы БД

### Migration Phase (migrate-data-to-postgres.sh)
- ✅ Парсинг JSON экспортов из MongoDB
- ✅ Трансформация данных для PostgreSQL
- ✅ Импорт пользователей, форм, полей и заявок
- ✅ Сохранение всех связей и истории

## 🔧 Новая архитектура

### Docker Services
- **PostgreSQL**: Порт 5432 (внутренний)
- **Redis**: Порт 6379 (внутренний) 
- **Backend**: Порт 5001 (внешний)
- **Frontend**: Порт 3000 (внешний)

### Volumes
- `postgres_data`: Данные PostgreSQL
- `redis_data`: Данные Redis с AOF persistence

### Networks
- `beton_network`: Внутренняя сеть для межсервисного общения

## 🌐 URL доступа после деплоя
- **Frontend**: http://31.128.39.123:3000
- **Backend API**: http://31.128.39.123:5001/api

## 🛠️ Команды управления

### На сервере
```bash
cd /var/www/beton-crm

# Просмотр статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f

# Рестарт сервисов
docker-compose restart

# Остановка
docker-compose down

# Запуск
docker-compose up -d
```

### Миграции базы данных
```bash
# Запуск миграций
docker-compose exec backend npm run migration:run

# Проверка базы данных
docker-compose exec backend npm run db:check
```

## 🆘 Troubleshooting

### Если что-то пошло не так

1. **Проверить статус контейнеров**:
   ```bash
   docker-compose ps
   ```

2. **Посмотреть логи**:
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   ```

3. **Откат к старой версии**:
   ```bash
   # Остановить Docker
   docker-compose down
   
   # Восстановить из бэкапа
   cd /var/backups/beton-crm/[timestamp]
   tar -xzf app-backup.tar.gz -C /var/www/
   
   # Восстановить MongoDB
   mongorestore --host localhost --port 27017 --db beton_crm mongodb/beton_crm
   
   # Запустить старое приложение
   pm2 start ecosystem.config.js
   ```

## 🔐 Безопасность

### Настройки файрвола
- Порт 22 (SSH)
- Порт 80 (HTTP) 
- Порт 443 (HTTPS)
- Порт 3000 (Frontend)
- Порт 5001 (Backend API)

### SSL сертификаты (опционально)
```bash
# Установка Let's Encrypt
certbot --nginx -d your-domain.com
```

## 📊 Мониторинг

### Автоматически настроенные службы
- ✅ Проверка состояния Docker контейнеров (каждые 5 минут)
- ✅ Ежедневное резервное копирование PostgreSQL (02:00)
- ✅ Ротация логов
- ✅ Автоматические обновления системы

### Просмотр логов мониторинга
```bash
tail -f /var/log/beton-crm/docker-monitor.log
tail -f /var/log/beton-crm/backup.log
```

## 📞 Контакты для поддержки

В случае проблем с деплоем:
1. Проверьте логи всех сервисов
2. Убедитесь в доступности портов
3. Проверьте права доступа к файлам
4. При критических ошибках используйте процедуру отката

**ВАЖНО**: Все скрипты создают множественные бэкапы - данные в безопасности!