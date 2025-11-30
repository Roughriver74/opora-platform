# Быстрая настройка CI/CD

## Шаг 1: Генерация SSH ключей

### Для продакшн сервера:

```bash
# Генерация ключа
ssh-keygen -t ed25519 -C "github-actions-deploy-prod" -f ~/.ssh/github_actions_deploy_prod

# Копирование на сервер
ssh-copy-id -i ~/.ssh/github_actions_deploy_prod.pub root@31.128.39.123

# Просмотр приватного ключа (для копирования в GitHub Secrets)
cat ~/.ssh/github_actions_deploy_prod
```

### Для dev сервера:

```bash
# Генерация ключа
ssh-keygen -t ed25519 -C "github-actions-deploy-dev" -f ~/.ssh/github_actions_deploy_dev

# Копирование на сервер
ssh-copy-id -i ~/.ssh/github_actions_deploy_dev.pub root@31.129.109.2

# Просмотр приватного ключа (для копирования в GitHub Secrets)
cat ~/.ssh/github_actions_deploy_dev
```

## Шаг 2: Добавление секретов в GitHub

1. Откройте репозиторий на GitHub
2. Перейдите в **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **New repository secret**

### Добавьте следующие секреты:

| Имя секрета | Описание | Значение |
|------------|----------|----------|
| `SSH_PRIVATE_KEY` | Приватный SSH ключ для продакшн | Содержимое `~/.ssh/github_actions_deploy_prod` |
| `SSH_PRIVATE_KEY_DEV` | Приватный SSH ключ для dev | Содержимое `~/.ssh/github_actions_deploy_dev` |

## Шаг 3: Проверка файла .env.production

Убедитесь, что файл `.env.production` существует в корне проекта и содержит все необходимые переменные окружения.

**Важно:** Файл `.env.production` должен быть на сервере в директории `/var/www/beton-crm/` или будет скопирован при первом деплое.

## Шаг 4: Тестирование

### Тест продакшн деплоя:

1. Создайте ветку `production` или используйте `main`
2. Сделайте коммит и пуш:
   ```bash
   git checkout -b production
   git push origin production
   ```
3. Проверьте выполнение workflow в разделе **Actions** на GitHub

### Тест dev деплоя:

1. Создайте ветку `develop` или `dev`
2. Сделайте коммит и пуш:
   ```bash
   git checkout -b develop
   git push origin develop
   ```
3. Проверьте выполнение workflow в разделе **Actions** на GitHub

## Ручной запуск

Если нужно запустить деплой вручную:

1. Перейдите в **Actions** на GitHub
2. Выберите нужный workflow (Deploy to Production или Deploy to Dev)
3. Нажмите **Run workflow**
4. Выберите ветку и нажмите **Run workflow**

## Устранение проблем

### Ошибка подключения по SSH

- Проверьте, что SSH ключ правильно скопирован на сервер
- Убедитесь, что секрет `SSH_PRIVATE_KEY` или `SSH_PRIVATE_KEY_DEV` правильно добавлен в GitHub
- Проверьте, что ключ содержит весь текст, включая `-----BEGIN OPENSSH PRIVATE KEY-----` и `-----END OPENSSH PRIVATE KEY-----`

### Ошибка при сборке

- Проверьте логи в разделе Actions
- Убедитесь, что все зависимости установлены
- Проверьте, что команда `npm run build` работает локально

### Ошибка при деплое на сервере

- Проверьте логи на сервере: `ssh root@<SERVER_IP> 'cd /var/www/beton-crm && docker-compose logs -f'`
- Убедитесь, что Docker и Docker Compose установлены на сервере
- Проверьте наличие файла `.env.production` на сервере

## Полезные команды

### Просмотр логов на сервере:

```bash
# Продакшн
ssh root@31.128.39.123 'cd /var/www/beton-crm && docker-compose logs -f'

# Dev
ssh root@31.129.109.2 'cd /var/www/beton-crm && docker-compose logs -f'
```

### Проверка статуса контейнеров:

```bash
# Продакшн
ssh root@31.128.39.123 'cd /var/www/beton-crm && docker-compose ps'

# Dev
ssh root@31.129.109.2 'cd /var/www/beton-crm && docker-compose ps'
```

### Откат к предыдущей версии:

```bash
ssh root@<SERVER_IP>
cd /var/www/beton-crm
# Найдите нужную резервную копию
ls -la backups/
# Восстановите
tar -xzf backups/app-backup-<timestamp>.tar.gz
docker-compose up -d
```

