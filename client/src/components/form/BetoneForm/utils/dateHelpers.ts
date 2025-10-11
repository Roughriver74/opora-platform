/**
 * Форматирует дату в читаемый формат
 */
export const formatDate = (dateString: string): string => {
	if (!dateString) return ''

	const date = new Date(dateString)
	return date.toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	})
}

/**
 * Парсит строку даты
 */
export const parseDate = (dateString: string): Date | null => {
	if (!dateString) return null
	const date = new Date(dateString)
	return isNaN(date.getTime()) ? null : date
}

/**
 * Валидация диапазона дат для периодических заявок
 */
export const validateDateRange = (
	startDate: string,
	endDate: string
): string | null => {
	if (!startDate || !endDate) {
		return 'Необходимо указать начальную и конечную дату'
	}

	const start = new Date(startDate)
	const end = new Date(endDate)

	if (isNaN(start.getTime()) || isNaN(end.getTime())) {
		return 'Некорректный формат даты'
	}

	if (start > end) {
		return 'Начальная дата не может быть позже конечной'
	}

	const today = new Date()
	today.setHours(0, 0, 0, 0)

	if (start < today) {
		return 'Начальная дата не может быть в прошлом'
	}

	const diffTime = Math.abs(end.getTime() - start.getTime())
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

	if (diffDays > 365) {
		return 'Диапазон дат не может превышать 365 дней'
	}

	return null
}

/**
 * Получает количество дней между датами
 */
export const getDaysCount = (startDate: string, endDate: string): number => {
	if (!startDate || !endDate) return 0

	const start = new Date(startDate)
	const end = new Date(endDate)

	const diffTime = Math.abs(end.getTime() - start.getTime())
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}
