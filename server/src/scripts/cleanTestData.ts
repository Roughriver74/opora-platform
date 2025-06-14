import mongoose from 'mongoose';
import Form from '../models/Form';
import FormField from '../models/FormField';
import Submission from '../models/Submission';
import connectDB from '../config/database';

const cleanTestData = async (): Promise<void> => {
  try {
    console.log('🧹 Начинаем очистку тестовых данных...');
    
    // Подключаемся к базе данных
    await connectDB();
    console.log('✅ Подключен к MongoDB');

    // Удаляем все тестовые формы
    const deletedForms = await Form.deleteMany({});
    console.log(`🗑️  Удалено форм: ${deletedForms.deletedCount}`);

    // Удаляем все поля форм
    const deletedFields = await FormField.deleteMany({});
    console.log(`🗑️  Удалено полей форм: ${deletedFields.deletedCount}`);

    // Удаляем все заявки (опционально - оставьте если нужно сохранить реальные заявки)
    const deletedSubmissions = await Submission.deleteMany({});
    console.log(`🗑️  Удалено заявок: ${deletedSubmissions.deletedCount}`);

    console.log('✅ Очистка тестовых данных завершена успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при очистке тестовых данных:', error);
  } finally {
    // Отключаемся от MongoDB
    await mongoose.disconnect();
    console.log('🔌 Отключен от MongoDB');
    process.exit(0);
  }
};

// Запускаем скрипт
cleanTestData(); 