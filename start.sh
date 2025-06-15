#!/bin/bash

echo "🚀 Запуск Beton CRM..."

# Функция для остановки процессов при выходе
cleanup() {
    echo "🛑 Остановка процессов..."
    kill $SERVER_PID $CLIENT_PID 2>/dev/null
    exit
}

# Устанавливаем обработчик сигналов
trap cleanup SIGINT SIGTERM

# Запускаем сервер
echo "📡 Запуск сервера на порту 5001..."
cd server && npm run dev &
SERVER_PID=$!

# Ждем немного для запуска сервера
sleep 3

# Запускаем клиент
echo "🌐 Запуск клиента на порту 3000..."
cd client && npm start &
CLIENT_PID=$!

echo "✅ Приложение запущено!"
echo "🌐 Клиент: http://localhost:3000"
echo "📡 Сервер: http://localhost:5001"
echo "Нажмите Ctrl+C для остановки"

# Ждем завершения процессов
wait 