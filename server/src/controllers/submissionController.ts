import { Request, Response } from 'express';
import Form from '../models/Form';
import FormField, { IFormField } from '../models/FormField';
import bitrix24Service from '../services/bitrix24Service';

// Обработка отправки формы заявки
export const submitForm = async (req: Request, res: Response) => {
  try {
    const { formId, formData } = req.body;

    if (!formId || !formData) {
      return res.status(400).json({ message: 'Необходимо указать ID формы и данные формы' });
    }

    // Получаем форму с полями
    const form = await Form.findById(formId).populate('fields');
    if (!form) {
      return res.status(404).json({ message: 'Форма не найдена' });
    }

    // Проверяем, активна ли форма
    if (!form.isActive) {
      return res.status(400).json({ message: 'Форма не активна' });
    }

    // Подготавливаем данные для создания сделки в Битрикс24
    const dealData: Record<string, any> = {};

    // Проходим по всем полям формы и заполняем данные для сделки
    for (const field of form.fields as unknown as IFormField[]) {
      // Проверяем, есть ли значение для этого поля
      if (formData[field.name] !== undefined) {
        // Маппинг поля формы на поле Битрикс24
        dealData[field.bitrixFieldId] = formData[field.name];
      } else if (field.required) {
        // Если поле обязательное, но значение не предоставлено
        return res.status(400).json({ message: `Поле "${field.label}" обязательно для заполнения` });
      }
    }

    // Если указана категория сделки, устанавливаем её
    if (form.bitrixDealCategory) {
      dealData['CATEGORY_ID'] = form.bitrixDealCategory;
    }

    // Создаем сделку в Битрикс24
    const dealResponse = await bitrix24Service.createDeal(dealData);

    // Возвращаем успешный ответ с ID созданной сделки
    res.status(200).json({
      success: true,
      message: form.successMessage || 'Спасибо! Ваша заявка успешно отправлена.',
      dealId: dealResponse.result,
    });
  } catch (error: any) {
    console.error('Ошибка при отправке формы:', error);
    res.status(500).json({ message: 'Произошла ошибка при обработке заявки', error: error.message });
  }
};
