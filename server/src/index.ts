import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import connectDB from './config/database';
import config from './config/config';

// Импорт маршрутизаторов
import formFieldRoutes from './routes/formFieldRoutes';
import formRoutes from './routes/formRoutes';
import submissionRoutes from './routes/submissionRoutes';

// Инициализация Express приложения
const app = express();

// Подключение к MongoDB
connectDB();

// Middleware
// Простая настройка CORS для всех маршрутов
app.use(cors({
  origin: '*', // Разрешаем запросы с любого источника (только для разработки)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Маршруты API
app.use('/api/form-fields', formFieldRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/submissions', submissionRoutes);

// Базовый маршрут для проверки работоспособности API
app.get('/', (req, res) => {
  res.json({ message: 'Beton CRM API работает' });
});

// Запуск сервера
const PORT = 5001; // Явно указываем порт 5001
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (error) => {
  console.error('Необработанная ошибка:', error);
});

export default app;
