# Базовый образ для Node.js
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++

# Установка зависимостей
FROM base AS deps
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm ci --only=production
RUN cd server && npm ci --only=production
RUN cd client && npm ci --only=production

# Установка dev зависимостей
FROM base AS dev-deps
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm ci
RUN cd server && npm ci
RUN cd client && npm ci

# Сборка сервера
FROM base AS server-build
COPY --from=dev-deps /app/server/node_modules ./server/node_modules
COPY server ./server
WORKDIR /app/server
RUN npm run build

# Сборка клиента
FROM base AS client-build
COPY --from=dev-deps /app/client/node_modules ./client/node_modules
COPY client ./client
WORKDIR /app/client
RUN npm run build

# Финальный образ
FROM base AS production
ENV NODE_ENV=production

# Копирование production зависимостей
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules

# Копирование собранного кода
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=client-build /app/client/build ./client/build

# Копирование package.json файлов
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Копирование скриптов и конфигов
COPY server/src/database/scripts ./server/src/database/scripts
COPY server/tsconfig.json ./server/

# Создание пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000 5000

CMD ["npm", "run", "start"]