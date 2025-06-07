import { Request, Response } from 'express';
import FormField from '../models/FormField';
import bitrix24Service from '../services/bitrix24Service';

// Получение всех полей формы
export const getAllFields = async (req: Request, res: Response) => {
  try {
    const fields = await FormField.find().sort({ order: 1 });
    res.status(200).json(fields);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Получение конкретного поля формы по ID
export const getFieldById = async (req: Request, res: Response) => {
  try {
    const field = await FormField.findById(req.params.id);
    if (!field) {
      res.status(404).json({ message: 'Поле не найдено' });
      return;
    }
    res.status(200).json(field);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Создание нового поля формы
export const createField = async (req: Request, res: Response) => {
  try {
    const field = new FormField(req.body);
    const savedField = await field.save();
    res.status(201).json(savedField);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Обновление существующего поля формы
export const updateField = async (req: Request, res: Response) => {
  try {
    const field = await FormField.findById(req.params.id);
    if (!field) {
      return res.status(404).json({ message: 'Поле не найдено' });
    }
    
    Object.assign(field, req.body);
    const updatedField = await field.save();
    
    res.status(200).json(updatedField);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Удаление поля формы
export const deleteField = async (req: Request, res: Response) => {
  try {
    const field = await FormField.findById(req.params.id);
    if (!field) {
      return res.status(404).json({ message: 'Поле не найдено' });
    }
    
    await FormField.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Поле успешно удалено' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Получение доступных полей из Битрикс24
export const getBitrixFields = async (req: Request, res: Response) => {
  try {
    const fieldsResponse = await bitrix24Service.getDealFields();
    
    // Проверяем, есть ли поля в ответе
    if (!fieldsResponse || !fieldsResponse.result) {
      res.status(404).json({ message: 'Поля не найдены в ответе Битрикс24' });
      return;
    }
    
    // Преобразуем поля в формат { fieldCode: { code: fieldCode, name: fieldName, type: fieldType, ... } }
    const formattedFields = Object.entries(fieldsResponse.result).reduce((acc: any, [fieldCode, fieldData]: [string, any]) => {
      // Используем formLabel или listLabel как человекочитаемое название, или title если их нет
      const fieldName = fieldData.formLabel || fieldData.listLabel || fieldData.title || fieldCode;
      
      acc[fieldCode] = {
        code: fieldCode,
        name: fieldName,
        type: fieldData.type,
        isRequired: fieldData.isRequired,
        isMultiple: fieldData.isMultiple,
        items: fieldData.items, // Для полей типа enumeration
        originalData: fieldData // Сохраняем исходные данные для полной совместимости
      };
      
      return acc;
    }, {});
    
    res.status(200).json({
      result: formattedFields,
      time: fieldsResponse.time
    });
  } catch (error: any) {
    console.error('Ошибка при получении полей из Битрикс24:', error);
    res.status(500).json({ message: error.message });
  }
};

// Получение номенклатуры из Битрикс24 для динамических полей
export const getProductsList = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    const products = await bitrix24Service.getProducts(query as string);
    res.status(200).json(products);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
