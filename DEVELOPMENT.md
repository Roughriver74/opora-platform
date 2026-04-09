# 🚀 Руководство по разработке West Visit

## Быстрый запуск

### Для macOS/Linux:

```bash
./start_dev.sh
```




### pkill 

```bash
pkill -f "react-scripts start" && pkill -f "node.*frontend" 2>/dev/null; echo "React dev-сервер остановлен. Теперь запустите ./start_dev.sh заново"
```

## Что делает скрипт

1. **Проверяет зависимости** - автоматически устанавливает недостающие пакеты
2. **Запускает бэкенд** на порту 8001 с автоперезагрузкой
3. **Запускает фронтенд** на порту 3001
4. **Показывает статус** всех сервисов

## Доступные сервисы

После запуска будут доступны:

- 📱 **Фронтенд**: http://localhost:3001
- 🔧 **Бэкенд API**: http://localhost:8001
- 📚 **API Документация**: http://localhost:8001/docs
- 🔍 **Health Check**: http://localhost:8001/api/health

## Остановка

- **macOS/Linux**: Нажмите `Ctrl+C` в терминале
- **Windows**: Закройте окна терминалов

## Переменные окружения

Скрипт автоматически устанавливает следующие переменные:

```bash
ACCESS_TOKEN_EXPIRE_MINUTES=60
ALGORITHM=HS256
BITRIX24_SMART_PROCESS_VISIT_ID=1054
BITRIX24_WEBHOOK_URL="https://crmwest.ru/rest/156/fnonb6nklg81kzy1/"
BITRIX_API_ENDPOINT="https://crmwest.ru/rest/156/fnonb6nklg81kzy1/"
CORS_ORIGINS="http://localhost:3001,http://localhost:8001"
DATABASE_URL="postgresql://west_visit:WestVisit_Dev_Pass_2025@31.128.37.26:5433/west_visit_dev"
POSTGRES_DB=west_visit_dev
POSTGRES_HOST=31.128.37.26
POSTGRES_PASSWORD=WestVisit_Dev_Pass_2025
POSTGRES_PORT=5433
POSTGRES_USER=west_visit
SECRET_KEY="your-secret-key-for-development"
```

## Ручной запуск

Если нужно запустить сервисы отдельно:

### Бэкенд:

```bash
cd /path/to/project
export ACCESS_TOKEN_EXPIRE_MINUTES=60
export ALGORITHM=HS256
# ... другие переменные
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Фронтенд:

```bash
cd frontend
export PORT=3001
npm start
```

## Устранение неполадок

### Порт уже занят

```bash
# Найти процесс на порту
lsof -ti:8001
# Остановить процесс
kill <PID>
```

### Зависимости не установлены

```bash
# Бэкенд
pip install -r app/requirements.txt

# Фронтенд
cd frontend
npm install
```

### Проблемы с базой данных

Проверьте подключение к PostgreSQL:

```bash
psql -h 31.128.37.26 -p 5433 -U west_visit -d west_visit_dev
```

## Структура проекта

```
visits/
├── app/                    # Backend (FastAPI)
│   ├── main.py            # Точка входа
│   ├── routers/           # API маршруты
│   ├── services/          # Бизнес-логика
│   ├── models.py          # Модели данных
│   └── requirements.txt   # Python зависимости
├── frontend/              # Frontend (React)
│   ├── src/              # Исходный код
│   ├── public/           # Статические файлы
│   └── package.json      # Node.js зависимости
├── start_dev.sh          # Скрипт запуска (macOS/Linux)
├── start_dev.bat         # Скрипт запуска (Windows)
└── DEVELOPMENT.md        # Этот файл
```

## Полезные команды

```bash
# Проверить статус процессов
ps aux | grep uvicorn
ps aux | grep node

# Проверить порты
lsof -i :8001
lsof -i :3001

# Логи бэкенда
tail -f app/logs/app.log

# Логи фронтенда
cd frontend && npm run build
```
