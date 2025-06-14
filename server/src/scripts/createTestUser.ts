import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const createTestUser = async (): Promise<void> => {
  try {
    // Подключаемся к базе данных
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/beton-crm';
    await mongoose.connect(mongoUri);
    console.log('Подключен к MongoDB');

    // Проверяем, существует ли уже пользователь
    const existingUser = await User.findOne({ 
      email: 'user@betonexpress.pro' 
    });

    if (existingUser) {
      console.log('Пользователь user@betonexpress.pro уже существует');
      process.exit(0);
    }

    // Создаем нового пользователя (пароль будет захеширован автоматически в pre('save'))
    const testUser = new User({
      email: 'user@betonexpress.pro',
      password: 'user123', // Передаем пароль в открытом виде
      role: 'user',
      firstName: 'Тест',
      lastName: 'Пользователь',
      phone: '+7 (999) 123-45-67',
      status: 'active'
    });

    await testUser.save();
    console.log('✅ Тестовый пользователь создан:');
    console.log('Email: user@betonexpress.pro');
    console.log('Пароль: user123');
    console.log('Роль: user');
    
  } catch (error) {
    console.error('❌ Ошибка создания пользователя:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

// Запускаем скрипт
createTestUser(); 