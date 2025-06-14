const mongoose = require('mongoose');

// Подключение к MongoDB
mongoose.connect('mongodb://localhost:27017/beton-crm');

// Схемы
const FormFieldSchema = new mongoose.Schema({
  name: String,
  label: String,
  type: String,
  required: Boolean,
  bitrixFieldId: String,
  bitrixFieldType: String,
  order: Number
});

const FormSchema = new mongoose.Schema({
  name: String,
  title: String,
  description: String,
  isActive: Boolean,
  fields: [mongoose.Schema.Types.ObjectId],
  bitrixDealCategory: String,
  successMessage: String
});

const FormField = mongoose.model('FormField', FormFieldSchema);
const Form = mongoose.model('Form', FormSchema);

async function createTestForm() {
  try {
    console.log('Создаю тестовую форму с секциями...');
    
    // Создаем поля для тестовой формы с секциями
    const fields = await FormField.insertMany([
      // Секция 1: Покупатель
      { name: 'buyer_header', label: 'Информация о покупателе', type: 'header', required: false, bitrixFieldId: '', bitrixFieldType: '', order: 1 },
      { name: 'buyer_company', label: 'Название компании', type: 'text', required: true, bitrixFieldId: 'TITLE', bitrixFieldType: 'string', order: 2 },
      { name: 'buyer_contact', label: 'Контактное лицо', type: 'text', required: true, bitrixFieldId: 'CONTACT_NAME', bitrixFieldType: 'string', order: 3 },
      { name: 'buyer_phone', label: 'Телефон', type: 'text', required: true, bitrixFieldId: 'PHONE', bitrixFieldType: 'phone', order: 4 },
      { name: 'buyer_email', label: 'Email', type: 'text', required: true, bitrixFieldId: 'EMAIL', bitrixFieldType: 'email', order: 5 },
      
      // Секция 2: Продукт
      { name: 'product_header', label: 'Информация о продукте', type: 'header', required: false, bitrixFieldId: '', bitrixFieldType: '', order: 10 },
      { name: 'product_type', label: 'Тип бетона', type: 'text', required: true, bitrixFieldId: 'PRODUCT_TYPE', bitrixFieldType: 'string', order: 11 },
      { name: 'volume', label: 'Объем (куб.м)', type: 'number', required: true, bitrixFieldId: 'VOLUME', bitrixFieldType: 'number', order: 12 },
      { name: 'delivery_date', label: 'Дата доставки', type: 'date', required: true, bitrixFieldId: 'DELIVERY_DATE', bitrixFieldType: 'date', order: 13 },
      
      // Секция 3: Завод
      { name: 'factory_header', label: 'Информация о заводе', type: 'header', required: false, bitrixFieldId: '', bitrixFieldType: '', order: 20 },
      { name: 'factory_company', label: 'Завод-изготовитель', type: 'text', required: false, bitrixFieldId: 'FACTORY_NAME', bitrixFieldType: 'string', order: 21 },
      { name: 'factory_contact', label: 'Контакт завода', type: 'text', required: false, bitrixFieldId: 'FACTORY_CONTACT', bitrixFieldType: 'string', order: 22 },
      { name: 'factory_phone', label: 'Телефон завода', type: 'text', required: false, bitrixFieldId: 'FACTORY_PHONE', bitrixFieldType: 'phone', order: 23 },
      { name: 'factory_address', label: 'Адрес завода', type: 'text', required: false, bitrixFieldId: 'FACTORY_ADDRESS', bitrixFieldType: 'string', order: 24 }
    ]);
    
    console.log(`Создано полей: ${fields.length}`);
    
    // Создаем форму
    const form = await Form.create({
      name: 'test-form-with-sections',
      title: 'Тестовая форма с секциями',
      description: 'Форма для тестирования функционала связанных полей',
      isActive: true,
      fields: fields.map(f => f._id),
      bitrixDealCategory: '1',
      successMessage: 'Заявка успешно отправлена!'
    });
    
    console.log('✅ Тестовая форма создана!');
    console.log('ID формы:', form._id);
    console.log('Название:', form.title);
    console.log('Количество полей:', fields.length);
    console.log('\n🔗 Теперь можно протестировать связанные поля:');
    console.log('1. Откройте форму в браузере');
    console.log('2. Заполните поля в секции "Информация о покупателе"');
    console.log('3. В секции "Информация о заводе" появится кнопка "Копировать поля"');
    console.log('4. Нажмите кнопку и выберите, какие поля копировать');
    
  } catch (error) {
    console.error('❌ Ошибка создания формы:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestForm(); 