FROM node:18-alpine as builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Устанавливаем NODE_ENV для production сборки
ENV NODE_ENV=production
ARG NODE_ENV=production

# Сборка приложения
RUN NODE_ENV=production npm run build

# Production образ
FROM nginx:alpine

# Копируем собранное приложение
COPY --from=builder /app/build /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт
EXPOSE 4200

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]