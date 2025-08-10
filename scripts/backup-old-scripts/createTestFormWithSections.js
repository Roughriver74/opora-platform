const mongoose = require('mongoose');
const FormField = require('../server/src/models/FormField');

// Подключение к MongoDB
mongoose.connect('mongodb://localhost:27017/beton-crm', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const createTestFormWithSectionsAndGroups = async () => {
  try {
    // Удаляем существующие поля
    await FormField.deleteMany({});

    // Создаем форму с секциями и группировкой
    const fields = [
      // === СЕКЦИЯ: Информация о покупателе ===
      {
        name: 'buyer_info_header',
        type: 'header',
        label: 'Информация о покупателе',
        order: 1,
        required: false,
        section: 'buyer'
      },

      // Группа: Основная информация о компании
      {
        name: 'company_info_divider',
        type: 'divider',
        label: 'Основная информация о компании',
        order: 2,
        required: false,
        section: 'buyer'
      },
      {
        name: 'buyer_company_name',
        type: 'text',
        label: 'Название компании',
        order: 3,
        required: true,
        section: 'buyer',
        placeholder: 'ООО "Строй-Инвест"'
      },
      {
        name: 'buyer_company_type',
        type: 'select',
        label: 'Тип организации',
        order: 4,
        required: true,
        section: 'buyer',
        options: ['ООО', 'ЗАО', 'ИП', 'АО', 'Государственное предприятие']
      },
      {
        name: 'buyer_inn',
        type: 'text',
        label: 'ИНН',
        order: 5,
        required: true,
        section: 'buyer',
        placeholder: '1234567890'
      },
      {
        name: 'buyer_kpp',
        type: 'text',
        label: 'КПП',
        order: 6,
        required: false,
        section: 'buyer',
        placeholder: '123456789'
      },

      // Группа: Контактная информация
      {
        name: 'contact_info_divider',
        type: 'divider',
        label: 'Контактная информация',
        order: 7,
        required: false,
        section: 'buyer'
      },
      {
        name: 'buyer_contact_person',
        type: 'text',
        label: 'Контактное лицо',
        order: 8,
        required: true,
        section: 'buyer',
        placeholder: 'Иванов Иван Иванович'
      },
      {
        name: 'buyer_phone',
        type: 'phone',
        label: 'Телефон',
        order: 9,
        required: true,
        section: 'buyer',
        placeholder: '+7 (999) 123-45-67'
      },
      {
        name: 'buyer_email',
        type: 'email',
        label: 'Email',
        order: 10,
        required: true,
        section: 'buyer',
        placeholder: 'contact@company.ru'
      },
      {
        name: 'buyer_additional_phone',
        type: 'phone',
        label: 'Дополнительный телефон',
        order: 11,
        required: false,
        section: 'buyer',
        placeholder: '+7 (999) 765-43-21'
      },

      // Группа: Адрес и местоположение
      {
        name: 'address_info_divider',
        type: 'divider',
        label: 'Адрес и местоположение',
        order: 12,
        required: false,
        section: 'buyer'
      },
      {
        name: 'buyer_legal_address',
        type: 'textarea',
        label: 'Юридический адрес',
        order: 13,
        required: true,
        section: 'buyer',
        placeholder: 'г. Москва, ул. Примерная, д. 1, офис 101'
      },
      {
        name: 'buyer_actual_address',
        type: 'textarea',
        label: 'Фактический адрес',
        order: 14,
        required: false,
        section: 'buyer',
        placeholder: 'г. Москва, ул. Рабочая, д. 2, склад 3'
      },

      // === СЕКЦИЯ: Информация о продукте ===
      {
        name: 'product_info_header',
        type: 'header',
        label: 'Информация о продукте',
        order: 15,
        required: false,
        section: 'product'
      },

      // Группа: Характеристики бетона
      {
        name: 'concrete_specs_divider',
        type: 'divider',
        label: 'Характеристики бетона',
        order: 16,
        required: false,
        section: 'product'
      },
      {
        name: 'concrete_grade',
        type: 'select',
        label: 'Марка бетона',
        order: 17,
        required: true,
        section: 'product',
        options: ['М100', 'М150', 'М200', 'М250', 'М300', 'М350', 'М400', 'М450', 'М500']
      },
      {
        name: 'concrete_class',
        type: 'select',
        label: 'Класс бетона',
        order: 18,
        required: true,
        section: 'product',
        options: ['B7.5', 'B10', 'B12.5', 'B15', 'B20', 'B22.5', 'B25', 'B30', 'B35', 'B40']
      },
      {
        name: 'concrete_volume',
        type: 'number',
        label: 'Объем (м³)',
        order: 19,
        required: true,
        section: 'product',
        placeholder: '10'
      },
      {
        name: 'concrete_mobility',
        type: 'select',
        label: 'Подвижность',
        order: 20,
        required: false,
        section: 'product',
        options: ['П1', 'П2', 'П3', 'П4', 'П5']
      },

      // Группа: Дополнительные характеристики
      {
        name: 'additional_specs_divider',
        type: 'divider',
        label: 'Дополнительные характеристики',
        order: 21,
        required: false,
        section: 'product'
      },
      {
        name: 'frost_resistance',
        type: 'select',
        label: 'Морозостойкость',
        order: 22,
        required: false,
        section: 'product',
        options: ['F50', 'F75', 'F100', 'F150', 'F200', 'F300']
      },
      {
        name: 'water_resistance',
        type: 'select',
        label: 'Водонепроницаемость',
        order: 23,
        required: false,
        section: 'product',
        options: ['W2', 'W4', 'W6', 'W8', 'W10', 'W12']
      },
      {
        name: 'additives',
        type: 'multiselect',
        label: 'Добавки',
        order: 24,
        required: false,
        section: 'product',
        options: ['Пластификатор', 'Ускоритель твердения', 'Замедлитель схватывания', 'Противоморозная добавка']
      },

      // Группа: Сроки и цены
      {
        name: 'timing_pricing_divider',
        type: 'divider',
        label: 'Сроки и цены',
        order: 25,
        required: false,
        section: 'product'
      },
      {
        name: 'delivery_date',
        type: 'date',
        label: 'Дата поставки',
        order: 26,
        required: true,
        section: 'product'
      },
      {
        name: 'delivery_time',
        type: 'select',
        label: 'Время поставки',
        order: 27,
        required: false,
        section: 'product',
        options: ['8:00-12:00', '12:00-16:00', '16:00-20:00', 'Согласовать отдельно']
      },
      {
        name: 'price_per_cube',
        type: 'number',
        label: 'Цена за м³ (руб.)',
        order: 28,
        required: false,
        section: 'product',
        placeholder: '3500'
      },

      // === СЕКЦИЯ: Информация о заводе ===
      {
        name: 'factory_info_header',
        type: 'header',
        label: 'Информация о заводе',
        order: 29,
        required: false,
        section: 'factory'
      },

      // Группа: Завод-изготовитель (поля схожие с покупателем для демонстрации копирования)
      {
        name: 'factory_main_divider',
        type: 'divider',
        label: 'Завод-изготовитель',
        order: 30,
        required: false,
        section: 'factory'
      },
      {
        name: 'factory_name',
        type: 'text',
        label: 'Название завода',
        order: 31,
        required: true,
        section: 'factory',
        placeholder: 'БетонЗавод №1'
      },
      {
        name: 'factory_contact_person',
        type: 'text',
        label: 'Контактное лицо',
        order: 32,
        required: false,
        section: 'factory',
        placeholder: 'Петров Петр Петрович'
      },
      {
        name: 'factory_phone',
        type: 'phone',
        label: 'Телефон завода',
        order: 33,
        required: false,
        section: 'factory',
        placeholder: '+7 (999) 111-22-33'
      },
      {
        name: 'factory_email',
        type: 'email',
        label: 'Email завода',
        order: 34,
        required: false,
        section: 'factory',
        placeholder: 'factory@betonzavod.ru'
      },

      // Группа: Производственные мощности
      {
        name: 'production_capacity_divider',
        type: 'divider',
        label: 'Производственные мощности',
        order: 35,
        required: false,
        section: 'factory'
      },
      {
        name: 'daily_capacity',
        type: 'number',
        label: 'Суточная мощность (м³)',
        order: 36,
        required: false,
        section: 'factory',
        placeholder: '500'
      },
      {
        name: 'mixer_trucks_count',
        type: 'number',
        label: 'Количество автобетоносмесителей',
        order: 37,
        required: false,
        section: 'factory',
        placeholder: '10'
      },
      {
        name: 'quality_certificates',
        type: 'multiselect',
        label: 'Сертификаты качества',
        order: 38,
        required: false,
        section: 'factory',
        options: ['ГОСТ 7473-2010', 'ISO 9001', 'Сертификат соответствия', 'Экологический сертификат']
      },

      // Группа: Логистика
      {
        name: 'logistics_divider',
        type: 'divider',
        label: 'Логистика',
        order: 39,
        required: false,
        section: 'factory'
      },
      {
        name: 'factory_address',
        type: 'textarea',
        label: 'Адрес завода',
        order: 40,
        required: false,
        section: 'factory',
        placeholder: 'Московская область, г. Подольск, промзона "Бетон"'
      },
      {
        name: 'delivery_radius',
        type: 'number',
        label: 'Радиус доставки (км)',
        order: 41,
        required: false,
        section: 'factory',
        placeholder: '50'
      },
      {
        name: 'delivery_cost_per_km',
        type: 'number',
        label: 'Стоимость доставки за км (руб.)',
        order: 42,
        required: false,
        section: 'factory',
        placeholder: '30'
      }
    ];

    // Создаем поля
    await FormField.insertMany(fields);

    
    

    
    
  } catch (error) {
  } finally {
    mongoose.connection.close();
  }
};

createTestFormWithSectionsAndGroups(); 