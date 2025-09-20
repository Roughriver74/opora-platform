FROM node:18-alpine

# Устанавливаем cron и другие необходимые пакеты
RUN apk add --no-cache cron curl jq

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем все зависимости (включая dev для сборки)
RUN npm install

# Копируем исходный код
COPY . .

# Сборка TypeScript
RUN npm run build

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Создаем директорию для логов cron
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Меняем владельца файлов
RUN chown -R nodejs:nodejs /app

# Переключаемся на пользователя nodejs
USER nodejs

# Открываем порт
EXPOSE 5001

# Создаем скрипт запуска с cron
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "🚀 Запуск сервера с cron-синхронизацией..."' >> /app/start.sh && \
    echo 'cd /app' >> /app/start.sh && \
    echo 'node dist/scripts/setupCronInDocker.sh' >> /app/start.sh && \
    echo 'node dist/index.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Запускаем приложение с cron
CMD ["/app/start.sh"]