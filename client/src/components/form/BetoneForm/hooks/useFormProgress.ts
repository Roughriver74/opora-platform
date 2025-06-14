import { useMemo } from 'react';
import { FormField as FormFieldType } from '../../../../types';
import { FormProgress } from '../types';
import { calculateProgress, getProgressColor } from '../utils/formHelpers';

/**
 * Хук для вычисления прогресса заполнения формы
 * @param fields - массив полей формы
 * @param values - текущие значения формы
 * @returns объект с информацией о прогрессе
 */
export const useFormProgress = (
	fields: FormFieldType[], 
	values: Record<string, any>
) => {
	// Вычисляем прогресс заполнения
	const progress = useMemo<FormProgress>(() => {
		return calculateProgress(fields, values);
	}, [fields, values]);

	// Определяем цвет индикатора прогресса
	const progressColor = useMemo(() => {
		return getProgressColor(progress.percentage);
	}, [progress.percentage]);

	// Текстовое описание прогресса
	const progressText = useMemo(() => {
		return `${progress.filledFields} из ${progress.totalFields} полей заполнено`;
	}, [progress.filledFields, progress.totalFields]);

	// Определяем статус прогресса
	const progressStatus = useMemo((): 'low' | 'medium' | 'high' | 'complete' => {
		if (progress.percentage === 100) return 'complete';
		if (progress.percentage >= 70) return 'high';
		if (progress.percentage >= 30) return 'medium';
		return 'low';
	}, [progress.percentage]);

	return {
		progress,
		progressColor,
		progressText,
		progressStatus,
		isComplete: progress.percentage === 100,
		isEmpty: progress.percentage === 0,
	};
};
