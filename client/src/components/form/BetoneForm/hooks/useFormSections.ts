import { useMemo, useState } from 'react';
import { FormField as FormFieldType } from '../../../../types';
import { FormSection } from '../types';
import { groupFieldsBySection, shouldUseSectionMode } from '../utils/sectionHelpers';

/**
 * Хук для управления секциями формы
 * @param fields - массив полей формы
 * @returns объект с данными и методами для работы с секциями
 */
export const useFormSections = (fields: FormFieldType[]) => {
	const [activeSection, setActiveSection] = useState(0);
	const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0])); // По умолчанию первая секция развернута

	// Группируем поля по секциям
	const fieldSections = useMemo<FormSection[]>(() => {
		return groupFieldsBySection(fields);
	}, [fields]);

	// Определяем, нужен ли секционный режим
	const useSectionMode = useMemo(() => {
		return shouldUseSectionMode(fields);
	}, [fields]);

	// Навигация между секциями
	const goToNextSection = () => {
		if (activeSection < fieldSections.length - 1) {
			const nextSection = activeSection + 1;
			setActiveSection(nextSection);
			// Автоматически разворачиваем следующую секцию
			setExpandedSections(prev => new Set(prev).add(nextSection));
		}
	};

	const goToPreviousSection = () => {
		if (activeSection > 0) {
			const prevSection = activeSection - 1;
			setActiveSection(prevSection);
			// Автоматически разворачиваем предыдущую секцию
			setExpandedSections(prev => new Set(prev).add(prevSection));
		}
	};

	const goToSection = (sectionIndex: number) => {
		if (sectionIndex >= 0 && sectionIndex < fieldSections.length) {
			setActiveSection(sectionIndex);
			// Автоматически разворачиваем выбранную секцию
			setExpandedSections(prev => new Set(prev).add(sectionIndex));
		}
	};

	// Переключение видимости секции (аккордеон)
	const toggleSectionExpanded = (sectionIndex: number) => {
		setExpandedSections(prev => {
			const newExpanded = new Set(prev);
			if (newExpanded.has(sectionIndex)) {
				newExpanded.delete(sectionIndex);
			} else {
				newExpanded.add(sectionIndex);
			}
			return newExpanded;
		});
	};

	// Проверка, развернута ли секция
	const isSectionExpanded = (sectionIndex: number) => {
		return expandedSections.has(sectionIndex);
	};

	// Разворачивание всех секций
	const expandAllSections = () => {
		const allSections = new Set<number>();
		for (let i = 0; i < fieldSections.length; i++) {
			allSections.add(i);
		}
		setExpandedSections(allSections);
	};

	// Сворачивание всех секций
	const collapseAllSections = () => {
		setExpandedSections(new Set());
	};

	// Проверки состояния навигации
	const canGoNext = activeSection < fieldSections.length - 1;
	const canGoPrevious = activeSection > 0;
	const isLastSection = activeSection === fieldSections.length - 1;
	const isFirstSection = activeSection === 0;

	// Текущая секция
	const currentSection = fieldSections[activeSection] || null;

	return {
		// Данные секций
		fieldSections,
		currentSection,
		activeSection,
		useSectionMode,
		
		// Навигация
		goToNextSection,
		goToPreviousSection,
		goToSection,
		setActiveSection,
		
		// Состояние навигации
		canGoNext,
		canGoPrevious,
		isLastSection,
		isFirstSection,
		
		// Статистика
		totalSections: fieldSections.length,
		
		// Состояние развернутых секций
		expandedSections,
		setExpandedSections,
		toggleSectionExpanded,
		isSectionExpanded,
		expandAllSections,
		collapseAllSections,
	};
};
