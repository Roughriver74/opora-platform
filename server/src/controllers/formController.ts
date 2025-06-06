import { Request, Response } from 'express';
import Form from '../models/Form';
import bitrix24Service from '../services/bitrix24Service';

// Получение всех форм
export const getAllForms = async (req: Request, res: Response) => {
  try {
    const forms = await Form.find().populate('fields');
    res.status(200).json(forms);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Получение конкретной формы по ID
export const getFormById = async (req: Request, res: Response) => {
  try {
    const form = await Form.findById(req.params.id).populate('fields');
    if (!form) {
      return res.status(404).json({ message: 'Форма не найдена' });
    }
    res.status(200).json(form);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Создание новой формы
export const createForm = async (req: Request, res: Response) => {
  try {
    const form = new Form(req.body);
    const savedForm = await form.save();
    res.status(201).json(savedForm);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Обновление существующей формы
export const updateForm = async (req: Request, res: Response) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ message: 'Форма не найдена' });
    }

    Object.assign(form, req.body);
    const updatedForm = await form.save();
    
    res.status(200).json(updatedForm);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Удаление формы
export const deleteForm = async (req: Request, res: Response) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ message: 'Форма не найдена' });
    }
    
    await Form.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Форма успешно удалена' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Получение категорий сделок из Битрикс24
export const getDealCategories = async (req: Request, res: Response) => {
  try {
    const categories = await bitrix24Service.getDealCategories();
    res.status(200).json(categories);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
