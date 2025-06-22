# Инструкция по развертыванию Beton CRM

В этом документе описаны шаги по настройке сервера и CI/CD для автоматического развертывания приложения Beton CRM.

## Подготовка сервера

1. Скопируйте скрипт `server-setup.sh` на ваш сервер:

   ```
   scp server-setup.sh user@your-server-ip:~/
   ```
2. Запустите скрипт для базовой настройки сервера:

   ```
   ssh user@your-server-ip "chmod +x ~/server-setup.sh && ~/server-setup.sh"
   ```
3. Настройте MongoDB (при необходимости изменить настройки по умолчанию):

   ```
   ssh user@your-server-ip
   sudo nano /etc/mongod.conf
   sudo systemctl restart mongod
   ```
4. Настройте nginx конфигурацию:

   ```
   # Скопируйте файл на сервер
   scp nginx.conf user@your-server-ip:~/nginx.conf

   # На сервере
   ssh user@your-server-ip
   sudo cp ~/nginx.conf /etc/nginx/sites-available/beton-crm

   # Отредактируйте конфигурацию, обновив данные для вашего домена
   sudo nano /etc/nginx/sites-available/beton-crm

   # Создайте символическую ссылку
   sudo ln -s /etc/nginx/sites-available/beton-crm /etc/nginx/sites-enabled/

   # Проверьте конфигурацию
   sudo nginx -t

   # Перезапустите nginx
   sudo systemctl reload nginx
   ```
5. Настройте SSL с Let's Encrypt:

   ```
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

## Настройка GitHub Actions CI/CD

1. Создайте публичный и приватный SSH-ключи для деплоя:

   ```
   ssh-keygen -t ed25519 -C "github-deploy-key" -f ~/.ssh/github_deploy_key
   ```
2. Добавьте публичный ключ на сервер:

   ```
   ssh user@your-server-ip "mkdir -p ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
   cat ~/.ssh/github_deploy_key.pub | ssh user@your-server-ip "cat >> ~/.ssh/authorized_keys"
   ```
3. В GitHub репозитории добавьте следующие секреты (Settings → Secrets and variables → Actions → New repository secret):

   * `SSH_PRIVATE_KEY`: Содержимое файла `~/.ssh/github_deploy_key`
   * `SSH_HOST`: IP-адрес или доменное имя вашего сервера
   * `SSH_USER`: Имя пользователя для подключения к серверу
   * `DEPLOY_PATH`: Путь к директории на сервере, куда будет производиться деплой (например, `/var/www/beton-crm`)
   * `KNOWN_HOSTS`: Выполните команду `ssh-keyscan -H your-server-ip` и добавьте результат в этот секрет
4. Подготовьте директорию для деплоя на сервере:

   ```
   ssh user@your-server-ip "mkdir -p /var/www/beton-crm"
   ```

## Ручной деплой

### Использование скрипта автоматического деплоя

**ВАЖНО:** Скрипт необходимо запускать из корневой директории проекта, а не из директории scripts!

```bash
# Правильно - из корня проекта:
cd /путь/к/beton-crm && ./scripts/manual-deploy.sh

# НЕПРАВИЛЬНО - не запускайте из директории scripts:
# cd /путь/к/beton-crm/scripts && ./manual-deploy.sh
```

Скрипт выполнит следующие действия:
1. Создаст резервную копию .env файла
2. Установит нужные настройки окружения для сборки
3. Соберёт проект (клиент и сервер)
4. Восстановит оригинальную конфигурацию .env
5. Упакует необходимые файлы в архив
6. Загрузит архив на сервер и развернёт его
7. Перезапустит приложение с помощью PM2

### Альтернативный способ ручного деплоя

Если по какой-то причине вы не можете использовать скрипт автоматического деплоя:

1. Соберите клиентскую часть:

   ```
   cd client
   npm run build
   ```
2. Соберите серверную часть:

   ```
   cd server
   npm run build
   ```
3. Скопируйте файлы на сервер:

   ```
   # Создайте структуру директорий
   ssh user@your-server-ip "mkdir -p /var/www/beton-crm/{client/build,server/dist}"

   # Копируйте файлы
   scp -r client/build/* user@your-server-ip:/var/www/beton-crm/client/build/
   scp -r server/dist/* user@your-server-ip:/var/www/beton-crm/server/dist/
   scp server/package.json user@your-server-ip:/var/www/beton-crm/server/
   scp package.json ecosystem.config.js .env.production user@your-server-ip:/var/www/beton-crm/

   # Переименуйте .env.production в .env на сервере
   ssh user@your-server-ip "mv /var/www/beton-crm/.env.production /var/www/beton-crm/.env"
   ```
4. Установите зависимости и запустите приложение:

   ```
   ssh user@your-server-ip "cd /var/www/beton-crm && npm install --production && cd server && npm install --production"
   ssh user@your-server-ip "cd /var/www/beton-crm && pm2 delete beton-crm || true && pm2 start ecosystem.config.js --env production && pm2 save"
   ```

## Проверка развертывания

1. Проверьте, что API сервер работает:

   ```
   curl http://your-domain.com/api
   ```
2. Откройте ваш сайт в браузере: `https://your-domain.com`
3. Проверьте логи PM2:

   ```
   ssh user@your-server-ip "pm2 logs beton-crm"
   ```

## Резервное копирование данных

Чтобы создать резервную копию базы данных MongoDB:

```
ssh user@your-server-ip "mongodump --out=/backup/$(date +%Y-%m-%d) --db=beton-crm"
```

Для восстановления:

```
ssh user@your-server-ip "mongorestore --db=beton-crm /backup/YYYY-MM-DD/beton-crm"
```

## Работа с администраторской панелью

Для входа в администраторскую панель:

1. Перейдите на страницу `/admin` вашего сайта
2. Используйте пароль, указанный в .env файле в переменной `ADMIN_PASSWORD`

Обязательно измените пароль администратора в файле `.env` на сервере перед запуском в продакшене.




# Правильный способ запуска скрипта деплоя (выполнять из корневой директории проекта):
cd /путь/к/beton-crm && ./scripts/manual-deploy.sh
