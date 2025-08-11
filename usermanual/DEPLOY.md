# 🚀 Инструкция по деплою Beton CRM

Этот документ описывает процесс деплоя приложения Beton CRM с локальной разработки на продакшн сервер.

## 🛠️ Настройка среды разработки

### Первоначальная настройка

```bash
# Клонируем репозиторий (если еще не клонировали)
git clone <repository-url>
cd beton-crm

# Автоматическая настройка среды разработки
./scripts/dev-setup.sh
```

Этот скрипт автоматически:
- Устанавливает все зависимости
- Создает конфигурационные файлы
- Запускает Docker контейнеры
- Проверяет работоспособность сервисов

### Ручная настройка

Если предпочитаете ручную настройку:

```bash
# Установка зависимостей
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Настройка конфигурации
cp server/.env.example server/.env
# Отредактируйте server/.env с вашими настройками

# Запуск в режиме разработки
./scripts/start-dev.sh
```

## 🌐 Деплой на сервер

### Конфигурация сервера

Убедитесь, что на сервере настроены:
- Docker и Docker Compose
- SSH доступ с вашего локального компьютера
- Доменное имя и SSL сертификаты

### Полный деплой

```bash
# Полный деплой с пересборкой всех сервисов
./scripts/deploy.sh
```

Полный деплой включает:
- Синхронизацию всех файлов
- Установку зависимостей
- Пересборку контейнеров
- Проверку работоспособности

### Быстрый деплой

```bash
# Быстрый деплой всего проекта
./scripts/deploy-quick.sh

# Деплой только backend
./scripts/deploy-quick.sh backend

# Деплой только frontend
./scripts/deploy-quick.sh frontend
```

Быстрый деплой подходит для:
- Небольших изменений в коде
- Исправления багов
- Обновления конфигурации

## 💾 Синхронизация базы данных

### Основные команды

```bash
# Скачать БД с сервера (заменит локальную БД)
./scripts/sync-db.sh pull

# Загрузить локальную БД на сервер (заменит серверную БД)
./scripts/sync-db.sh push --force

# Создать резервную копию БД на сервере
./scripts/sync-db.sh backup

# Синхронизировать пользователей с Bitrix24
./scripts/sync-db.sh sync-users

# Помощь по командам
./scripts/sync-db.sh --help
```

### ⚠️ Важно при работе с БД

- Всегда создавайте резервные копии перед синхронизацией
- Команды `pull` и `push` полностью заменяют данные
- Используйте `--force` только если уверены в действиях

## 👥 Синхронизация пользователей

### Автоматическая синхронизация

После деплоя можно синхронизировать всех активных пользователей из Bitrix24:

```bash
# На локальной среде
curl -X POST http://localhost:5001/api/sync/users \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# На сервере (через SSH)
ssh root@31.128.39.123 \
  "curl -X POST http://localhost:5001/api/sync/users \
   -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'"
```

### Получение токена авторизации

1. Войдите в админ панель: https://beton.shknv.ru
2. Логин: `crm@betonexpress.pro`, пароль: `admin123`
3. Откройте DevTools → Network → найдите любой API запрос
4. Скопируйте значение заголовка `Authorization`

## 🔧 Полезные команды для сервера

### Мониторинг сервисов

```bash
# Подключение к серверу
ssh root@31.128.39.123

# Переход в папку проекта
cd /var/www/beton-crm

# Статус контейнеров
docker-compose ps

# Логи всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f frontend

# Перезапуск сервисов
docker-compose restart
docker-compose restart backend
docker-compose restart frontend
```

### Управление контейнерами

```bash
# Остановка всех сервисов
docker-compose down

# Запуск сервисов
docker-compose up -d

# Пересборка и запуск
docker-compose up -d --build

# Очистка неиспользуемых ресурсов
docker system prune -f
```

## 📊 Проверка работоспособности

### Endpoint'ы для проверки

- **Frontend**: https://beton.shknv.ru
- **API Health**: https://beton.shknv.ru/api/health
- **API Base**: https://beton.shknv.ru/api

### Проверка после деплоя

```bash
# Проверка API
curl -f https://beton.shknv.ru/api/health

# Проверка формы
curl -f https://beton.shknv.ru/api/forms

# Проверка авторизации
curl -X POST https://beton.shknv.ru/api/auth/user-login \
     -H "Content-Type: application/json" \
     -d '{"email":"crm@betonexpress.pro","password":"admin123"}'
```

## 🐛 Решение проблем

### Проблемы с контейнерами

```bash
# Полная переустановка контейнеров
docker-compose down
docker-compose up -d --build --force-recreate

# Проверка логов на ошибки
docker-compose logs backend | grep -i error
docker-compose logs frontend | grep -i error
```

### Проблемы с БД

```bash
# Подключение к контейнеру БД
docker-compose exec postgres psql -U postgres -d beton_crm

# Проверка подключения к БД из backend
docker-compose exec backend npm run migration:run
```

### Проблемы с сетью

```bash
# Проверка портов
netstat -tlnp | grep -E ':(3000|5001|5489|6396)'

# Проверка nginx конфигурации
nginx -t
systemctl reload nginx
```

## 📝 Workflow разработки

### Рекомендуемый процесс

1. **Локальная разработка**
   ```bash
   ./scripts/start-dev.sh
   # Разработка и тестирование
   ```

2. **Коммит изменений**
   ```bash
   git add .
   git commit -m "Описание изменений"
   ```

3. **Деплой на сервер**
   ```bash
   ./scripts/deploy-quick.sh  # или ./scripts/deploy.sh
   ```

4. **Проверка работоспособности**
   ```bash
   curl -f https://beton.shknv.ru/api/health
   ```

### Работа с ветками

```bash
# Создание новой ветки для функции
git checkout -b feature/new-functionality

# Разработка и тестирование
# ...

# Слияние с основной веткой
git checkout main
git merge feature/new-functionality

# Деплой
./scripts/deploy.sh
```

## 🔐 Безопасность

- Никогда не коммитьте `.env` файлы с реальными паролями
- Регулярно обновляйте зависимости: `npm audit fix`
- Используйте сильные пароли для продакшн среды
- Регулярно создавайте резервные копии БД

## ✅ Чеклист деплоя

- [ ] Локальные тесты прошли успешно
- [ ] Все изменения закоммичены
- [ ] Конфигурация проверена
- [ ] Резервная копия БД создана
- [ ] Деплой выполнен без ошибок
- [ ] API отвечает корректно
- [ ] Frontend загружается
- [ ] Авторизация работает
- [ ] Bitrix24 интеграция функционирует
- [ ] Логи не содержат критических ошибок