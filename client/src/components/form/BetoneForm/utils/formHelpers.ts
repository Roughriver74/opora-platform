import { FormField as FormFieldType } from '../../../../types';
import { FormProgress } from '../types';
import { AUTO_FILLED_TYPES, FORM_CONSTANTS } from '../constants';

/**
 * Подсчитывает прогресс заполнения формы
 * @param fields - массив полей формы
 * @param values - текущие значения формы
 * @returns объект с информацией о прогрессе
 */
export const calculateProgress = (
	fields: FormFieldType[], 
	values: Record<string, any>
): FormProgress => {
	// Фильтруем поля, которые участвуют в подсчете прогресса
	const validatableFields = fields.filter(field => 
		!AUTO_FILLED_TYPES.includes(field.type as any)
	);

	const totalFields = validatableFields.length;
	
	// Подсчитываем заполненные поля
	const filledFields = validatableFields.reduce((count, field) => {
		const value = values[field.name];
		
		// Проверяем, заполнено ли поле
		if (field.type === 'checkbox') {
			// Для чекбоксов считаем заполненным любое значение (true/false)
			return count + (value !== undefined ? 1 : 0);
		} else {
			// Для остальных полей проверяем наличие значения
			return count + (value && value.toString().trim() !== '' ? 1 : 0);
		}
	}, 0);

	const percentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

	return {
		totalFields,
		filledFields,
		percentage
	};
};

/**
 * Получает цвет для индикатора прогресса
 * @param percentage - процент заполнения
 * @returns цвет индикатора
 */
export const getProgressColor = (percentage: number): string => {
	if (percentage < 30) {
		return FORM_CONSTANTS.PROGRESS_COLORS.low;
	} else if (percentage < 70) {
		return FORM_CONSTANTS.PROGRESS_COLORS.medium;
	} else {
		return FORM_CONSTANTS.PROGRESS_COLORS.high;
	}
};

/**
 * Определяет размер FAB кнопки в зависимости от размера экрана
 * @returns размер кнопки
 */
export const getFabSize = (): 'small' | 'medium' => {
	if (typeof window !== 'undefined' && window.innerWidth < FORM_CONSTANTS.MOBILE_BREAKPOINT) {
		return 'small';
	}
	return 'medium';
};

/**
 * Создает функцию прокрутки к верху страницы
 * @returns функция прокрутки
 */
export const createScrollToTop = (): (() => void) => {
	return () => {
		window.scrollTo({
			top: 0,
			behavior: FORM_CONSTANTS.SCROLL_BEHAVIOR,
		});
	};
};
