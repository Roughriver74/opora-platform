import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollBehavior } from '../types';
import { FORM_CONSTANTS } from '../constants';
import { createScrollToTop } from '../utils/formHelpers';

/**
 * Хук для управления поведением прокрутки
 * @returns объект с состоянием и методами для работы с прокруткой
 */
export const useScrollBehavior = (): ScrollBehavior => {
	const [showScrollTop, setShowScrollTop] = useState(false);
	const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isMountedRef = useRef(true);

	// Очистка при размонтировании
	useEffect(() => {
		return () => {
			isMountedRef.current = false;
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current);
				scrollTimeoutRef.current = null;
			}
		};
	}, []);

	// Throttled обработчик прокрутки для лучшей производительности
	const handleScroll = useCallback(() => {
		if (scrollTimeoutRef.current) {
			clearTimeout(scrollTimeoutRef.current);
		}
		
		scrollTimeoutRef.current = setTimeout(() => {
			if (isMountedRef.current) {
				setShowScrollTop(window.scrollY > FORM_CONSTANTS.SCROLL_THRESHOLD);
			}
		}, 100); // Throttle 100ms
	}, []);

	// Отслеживание прокрутки
	useEffect(() => {
		// Проверяем начальное состояние
		handleScroll();

		// Добавляем обработчик события
		window.addEventListener('scroll', handleScroll, { passive: true });

		// Cleanup функция
		return () => {
			window.removeEventListener('scroll', handleScroll);
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current);
				scrollTimeoutRef.current = null;
			}
		};
	}, [handleScroll]);

	const scrollToTop = createScrollToTop();

	return {
		showScrollTop,
		scrollToTop,
	};
};
