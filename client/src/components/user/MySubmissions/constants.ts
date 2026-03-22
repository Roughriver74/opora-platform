export const STATUS_COLORS = {
	'NEW': 'primary',
	'IN_PROGRESS': 'warning',
	'COMPLETED': 'success',
	'CANCELLED': 'error',
	// Legacy Bitrix24 статусы (обратная совместимость)
	'C1:NEW': 'primary',
	'C1:UC_GJLIZP': 'warning',
	'C1:WON': 'success',
	'C1:LOSE': 'error',
} as const

export const DEFAULT_STATUS_LABELS = {
	'NEW': 'Новая',
	'IN_PROGRESS': 'В работе',
	'COMPLETED': 'Выполнено',
	'CANCELLED': 'Отменено',
	// Legacy
	'C1:NEW': 'Новая',
	'C1:UC_GJLIZP': 'В работе',
	'C1:WON': 'Выполнено',
	'C1:LOSE': 'Отменено',
}

export const ITEMS_PER_PAGE_OPTIONS = [6, 12, 24]
export const DEFAULT_ROWS_PER_PAGE = 12

// Дефолтный статус фильтра - показываем только новые заявки
export const DEFAULT_STATUS_FILTER = ''

// Варианты сортировки
export const SORT_OPTIONS = [
	{ value: 'shipmentDate', label: 'По дате отгрузки' },
	{ value: 'createdAt', label: 'По дате создания' },
] as const

// Сортировка по умолчанию
export const DEFAULT_SORT_BY: 'shipmentDate' | 'createdAt' = 'shipmentDate'
export const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'desc'
