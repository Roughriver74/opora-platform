// Константы для BetoneForm
export const FORM_CONSTANTS = {
	// Пороговые значения
	SECTION_THRESHOLD: 15, // Количество полей для активации секционного режима
	SCROLL_THRESHOLD: 300, // Позиция скролла для показа кнопки "наверх"
	
	// Размеры и отступы
	MOBILE_BREAKPOINT: 600,
	SECTION_SPACING: 3,
	FIELD_SPACING: { xs: 1.5, sm: 2 },
	
	// Анимации
	SCROLL_BEHAVIOR: 'smooth' as const,
	
	// Цвета и стили
	PROGRESS_COLORS: {
		low: '#f44336',    // красный для низкого прогресса
		medium: '#ff9800', // оранжевый для среднего
		high: '#4caf50',   // зеленый для высокого
	},
	
	// Текстовые константы
	DEFAULT_SECTION_TITLE: 'Основная информация',
	DEFAULT_FORM_TITLE: 'Форма заказа',
	
	// Кнопки и лейблы
	SUBMIT_LABELS: {
		default: '🚀 ОТПРАВИТЬ ЗАЯВКУ',
		submitting: 'Отправка...',
	},
	
	NAVIGATION_LABELS: {
		previous: '← Предыдущая секция',
		next: 'Следующая секция →',
	},
	
	// Валидация
	VALIDATION_MESSAGES: {
		required: 'Это поле обязательно для заполнения',
		email: 'Введите корректный email адрес',
		phone: 'Введите корректный номер телефона',
		number: 'Введите корректное число',
		min: 'Значение слишком маленькое',
		max: 'Значение слишком большое',
	}
} as const;

// Типы полей, которые не участвуют в валидации
export const NON_VALIDATABLE_TYPES = ['divider', 'header'] as const;

// Типы полей, которые считаются заполненными по умолчанию
export const AUTO_FILLED_TYPES = ['divider', 'header'] as const;
