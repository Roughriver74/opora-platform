import mongoose from 'mongoose';
import User from '../models/User';
import { PasswordHashService } from '../utils/passwordHash';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

/**
 * Скрипт для создания администратора
 */
async function createAdmin() {
  try {
    // Подключаемся к базе данных
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/beton-crm';
    await mongoose.connect(mongoUri);
    console.log('Подключение к MongoDB установлено');

    // Проверяем, есть ли уже админы
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Администратор уже существует:', existingAdmin.email);
      process.exit(0);
    }

    // Получаем данные из переменных окружения или устанавливаем по умолчанию
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@beton-crm.ru';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Администратор';
    const adminLastName = process.env.ADMIN_LAST_NAME || 'Системы';

    // Валидируем пароль
    const passwordValidation = PasswordHashService.validatePassword(adminPassword);
    if (!passwordValidation.isValid) {
      console.error('Ошибка валидации пароля:', passwordValidation.message);
      process.exit(1);
    }

    // Создаем администратора
    const admin = new User({
      email: adminEmail,
      password: adminPassword, // будет автоматически хешироваться в pre-save хуке
      role: 'admin',
      firstName: adminFirstName,
      lastName: adminLastName,
      status: 'active'
    });

    await admin.save();

    console.log('✅ Администратор успешно создан:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Имя: ${adminFirstName} ${adminLastName}`);
    console.log(`Роль: ${admin.role}`);
    console.log(`ID: ${admin._id}`);

  } catch (error) {
    console.error('❌ Ошибка создания администратора:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Отключение от MongoDB');
  }
}

// Запускаем скрипт, если он вызван напрямую
if (require.main === module) {
  createAdmin();
}

export default createAdmin; 