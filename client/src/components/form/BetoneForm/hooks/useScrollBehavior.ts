import { useState, useEffect } from 'react';
import { ScrollBehavior } from '../types';
import { FORM_CONSTANTS } from '../constants';
import { createScrollToTop } from '../utils/formHelpers';

/**
 * Хук для управления поведением прокрутки
 * @returns объект с состоянием и методами для работы с прокруткой
 */
export const useScrollBehavior = (): ScrollBehavior => {
	const [showScrollTop, setShowScrollTop] = useState(false);

	// Отслеживание прокрутки
	useEffect(() => {
		const handleScroll = () => {
			setShowScrollTop(window.scrollY > FORM_CONSTANTS.SCROLL_THRESHOLD);
		};

		window.addEventListener('scroll', handleScroll);
		
		// Проверяем начальное состояние
		handleScroll();

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	}, []);

	const scrollToTop = createScrollToTop();

	return {
		showScrollTop,
		scrollToTop,
	};
};
