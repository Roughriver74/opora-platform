import { Request, Response } from 'express';
import FormField from '../models/FormField';
import bitrix24Service from '../services/bitrix24Service';

// Получение всех полей формы
export const getAllFields = async (req: Request, res: Response): Promise<void> => {
  try {
    const fields = await FormField.find().sort({ order: 1 });
    res.status(200).json(fields);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Получение конкретного поля формы по ID
export const getFieldById = async (req: Request, res: Response): Promise<void> => {
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
export const createField = async (req: Request, res: Response): Promise<void> => {
  try {
    const field = new FormField(req.body);
    const savedField = await field.save();
    res.status(201).json(savedField);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Обновление существующего поля формы
export const updateField = async (req: Request, res: Response): Promise<void> => {
  try {
    const field = await FormField.findById(req.params.id);
    if (!field) {
      res.status(404).json({ message: 'Поле не найдено' });
      return;
    }
    
    Object.assign(field, req.body);
    const updatedField = await field.save();
    
    res.status(200).json(updatedField);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Удаление поля формы
export const deleteField = async (req: Request, res: Response): Promise<void> => {
  try {
    const field = await FormField.findById(req.params.id);
    if (!field) {
      res.status(404).json({ message: 'Поле не найдено' });
      return;
    }
    
    await FormField.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Поле успешно удалено' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Получение доступных полей из Битрикс24
export const getBitrixFields = async (req: Request, res: Response): Promise<void> => {
  try {
    const fieldsResponse = await bitrix24Service.getDealFields();
    
    if (!fieldsResponse || !fieldsResponse.result) {
      res.status(404).json({ message: 'Не удалось получить поля из Битрикс24' });
      return;
    }
    
    const formattedFields = Object.entries(fieldsResponse.result).reduce((acc: any, [fieldCode, fieldData]: [string, any]) => {
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
export const getProductsList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    const products = await bitrix24Service.getProducts(query as string);
    res.status(200).json(products);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Получение списка компаний из Битрикс24
export const getCompaniesList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    const companies = await bitrix24Service.getCompanies(query as string);
    res.status(200).json(companies);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Получение списка контактов из Битрикс24
export const getContactsList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    const contacts = await bitrix24Service.getContacts(query as string);
    res.status(200).json(contacts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
