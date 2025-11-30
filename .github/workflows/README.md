# CI/CD Configuration

## Автоматический деплой

Проект использует GitHub Actions для автоматического деплоя на продакшн и dev серверы.

### Настройка

#### 1. Добавление SSH ключей в GitHub Secrets

##### Для продакшн сервера:

1. Сгенерируйте SSH ключ для деплоя (если еще нет):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy-prod" -f ~/.ssh/github_actions_deploy_prod
   ```

2. Скопируйте публичный ключ на продакшн сервер:
   ```bash
   ssh-copy-id -i ~/.ssh/github_actions_deploy_prod.pub root@31.128.39.123
   ```

3. Добавьте приватный ключ в GitHub Secrets:
   - Перейдите в Settings → Secrets and variables → Actions
   - Нажмите "New repository secret"
   - Имя: `SSH_PRIVATE_KEY`
   - Значение: содержимое файла `~/.ssh/github_actions_deploy_prod` (приватный ключ)

##### Для dev сервера:

1. Сгенерируйте SSH ключ для dev деплоя:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy-dev" -f ~/.ssh/github_actions_deploy_dev
   ```

2. Скопируйте публичный ключ на dev сервер:
   ```bash
   ssh-copy-id -i ~/.ssh/github_actions_deploy_dev.pub root@31.129.109.2
   ```

3. Добавьте приватный ключ в GitHub Secrets:
   - Имя: `SSH_PRIVATE_KEY_DEV`
   - Значение: содержимое файла `~/.ssh/github_actions_deploy_dev` (приватный ключ)

#### 2. Проверка переменных окружения

Убедитесь, что файл `.env.production` существует и содержит все необходимые переменные окружения для продакшн сервера.

### Использование

#### Автоматический деплой

**Продакшн:**
- Workflow `deploy.yml` автоматически запускается при пуше в ветки:
  - `main`
  - `production`

**Dev:**
- Workflow `deploy-dev.yml` автоматически запускается при пуше в ветки:
  - `develop`
  - `dev`

#### Ручной запуск

1. Перейдите в раздел "Actions" в GitHub
2. Выберите нужный workflow:
   - "Deploy to Production" для продакшн
   - "Deploy to Dev" для dev окружения
3. Нажмите "Run workflow"
4. Выберите ветку и нажмите "Run workflow"

### Процесс деплоя

1. ✅ Проверка кода из репозитория
2. ✅ Установка зависимостей (client и server)
3. ✅ Настройка переменных окружения для продакшн
4. ✅ Сборка проекта (frontend и backend)
5. ✅ Создание архива для деплоя
6. ✅ Проверка резервных копий на сервере
7. ✅ Копирование архива на сервер
8. ✅ Создание резервной копии текущей версии
9. ✅ Остановка старого приложения
10. ✅ Распаковка нового приложения
11. ✅ Установка/обновление Docker и Docker Compose
12. ✅ Запуск Docker контейнеров
13. ✅ Выполнение миграций базы данных
14. ✅ Синхронизация данных с Bitrix в Elasticsearch
15. ✅ Проверка работоспособности приложения

### Мониторинг

**Продакшн:**
- Frontend: https://31.128.39.123:3000
- Backend API: https://31.128.39.123:5001/api/health

**Dev:**
- Frontend: https://31.129.109.2:3000
- Backend API: https://31.129.109.2:5001/api/health

### Логи

**Продакшн:**
```bash
ssh root@31.128.39.123 'cd /var/www/beton-crm && docker-compose logs -f'
```

**Dev:**
```bash
ssh root@31.129.109.2 'cd /var/www/beton-crm && docker-compose logs -f'
```

### Откат изменений

Если что-то пошло не так:
1. Найдите резервную копию в `/var/www/beton-crm/backups/`
2. Восстановите предыдущую версию:
   ```bash
   ssh root@31.128.39.123
   cd /var/www/beton-crm
   tar -xzf backups/app-backup-<timestamp>.tar.gz
   docker-compose up -d
   ```

### Безопасность

- SSH ключ хранится в GitHub Secrets и не доступен в логах
- Все соединения используют SSH с проверкой ключей
- Переменные окружения не попадают в репозиторий
- Резервные копии создаются автоматически перед каждым деплоем

