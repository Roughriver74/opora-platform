import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../models/User';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const createDefaultAdmin = async (): Promise<void> => {
  try {
    // Подключаемся к базе данных
    // Пробуем разные варианты подключения
    const mongoUri = process.env.MONGODB_URI || 
                     process.env.MONGO_URI || 
                     'mongodb://localhost:27017/beton-crm';
    
    console.log('Попытка подключения к MongoDB...');
    console.log('URI:', mongoUri.replace(/\/\/.*@/, '//***:***@')); // Скрываем пароль в логах
    
    await mongoose.connect(mongoUri);
    console.log('✅ Подключен к MongoDB');

    // Проверяем, существует ли уже админ
    const existingAdmin = await User.findOne({ 
      email: 'crm@betonexpress.pro' 
    });

    if (existingAdmin) {
      console.log('ℹ️  Админ crm@betonexpress.pro уже существует');
      console.log('✅ Email: crm@betonexpress.pro');
      console.log('✅ Пароль: Sacre.net13');
      return;
    }

    // Создаем нового админа (пароль будет захеширован автоматически в pre('save'))
    const admin = new User({
      email: 'crm@betonexpress.pro',
      password: 'Sacre.net13', // Передаем пароль в открытом виде
      role: 'admin',
      firstName: 'CRM',
      lastName: 'Administrator',
      phone: '',
      status: 'active'
    });

    await admin.save();
    console.log('✅ Админ по умолчанию успешно создан!');
    console.log('📧 Email: crm@betonexpress.pro');
    console.log('🔑 Пароль: Sacre.net13');
    console.log('👤 Роль: admin');
    console.log('📊 Статус: active');
    
  } catch (error) {
    console.error('❌ Ошибка создания админа:', error);
    console.error('💡 Возможные причины:');
    console.error('   - Неправильный MONGODB_URI в .env файле');
    console.error('   - MongoDB сервер недоступен');
    console.error('   - Проблемы с сетевым подключением');
    console.error('');
    console.error('🔧 Для ручного создания выполните:');
    console.error('   cd /var/www/beton-crm/server');
    console.error('   npm run create-default-admin');
    
    // Не завершаем процесс с ошибкой, чтобы деплой продолжился
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 Отключен от MongoDB');
    }
  }
};

// Запускаем скрипт
createDefaultAdmin(); 