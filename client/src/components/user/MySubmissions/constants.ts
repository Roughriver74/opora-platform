export const STATUS_COLORS = {
	'С1:NEW': 'primary',
	'C1:UC_GJLIZP': 'warning',
	'C1:WON': 'success',
} as const

export const DEFAULT_STATUS_LABELS = {
	'C1:NEW': 'Новая',
	'C1:UC_GJLIZP': 'Отправлено',
	'C1:WON': 'Отгружено',
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
