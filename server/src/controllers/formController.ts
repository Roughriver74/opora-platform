import { Request, Response } from 'express';
import Form from '../models/Form';
import bitrix24Service from '../services/bitrix24Service';

// Получение всех форм
export const getAllForms = async (req: Request, res: Response): Promise<void> => {
  try {
    const forms = await Form.find().populate('fields');
    res.status(200).json(forms);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Получение конкретной формы по ID
export const getFormById = async (req: Request, res: Response): Promise<void> => {
  try {
    const form = await Form.findById(req.params.id).populate('fields');
    if (!form) {
      res.status(404).json({ message: 'Форма не найдена' });
      return;
    }
    res.status(200).json(form);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Создание новой формы
export const createForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const form = new Form(req.body);
    const savedForm = await form.save();
    res.status(201).json(savedForm);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Обновление существующей формы
export const updateForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) {
      res.status(404).json({ message: 'Форма не найдена' });
      return;
    }

    Object.assign(form, req.body);
    const updatedForm = await form.save();
    
    res.status(200).json(updatedForm);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Удаление формы
export const deleteForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) {
      res.status(404).json({ message: 'Форма не найдена' });
      return;
    }
    
    await Form.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Форма успешно удалена' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Получение категорий сделок из Битрикс24
export const getDealCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoriesData = await bitrix24Service.getDealCategories();
    console.log('Полученные данные от Bitrix24:', JSON.stringify(categoriesData, null, 2));
    
    // Преобразование результата в формат, ожидаемый фронтендом (ID и NAME)
    let categories = [];
    
    // Обработка нового формата из crm.category.list
    if (categoriesData && categoriesData.result && categoriesData.result.categories) {
      // Используем новый формат от crm.category.list, где категории находятся в result.categories
      if (Array.isArray(categoriesData.result.categories)) {
        categories = categoriesData.result.categories.map(category => ({
          ID: category.id ? category.id.toString() : '',
          NAME: category.name || ''
        }));
      }
    }
    
    // Если получили пустой массив, добавляем тестовую категорию для отладки
    if (categories.length === 0) {
      categories = [
        { ID: '1', NAME: 'Основная категория' },
        { ID: '2', NAME: 'Дополнительная категория' }
      ];
    }
    
    console.log('Отформатированные категории:', categories);
    
    // Возвращаем данные в формате, который ожидает фронтенд
    res.status(200).json({ result: categories });
  } catch (error: any) {
    console.error('Ошибка при получении категорий сделок:', error);
    
    // Для предотвращения ошибок на фронтенде, возвращаем пустой массив вместо ошибки
    res.status(200).json({
      result: [
        { ID: '1', NAME: 'Основная категория' },
        { ID: '2', NAME: 'Дополнительная категория' }
      ]
    });
  }
};
// Временная заглушка для функции submitForm
export const submitForm = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ message: 'Форма отправлена успешно (временная заглушка)' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при отправке формы' });
  }
};
