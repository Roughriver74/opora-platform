import { BitrixStage } from '../types'

/**
 * Извлекает чистый статус без префикса категории
 */
export const getCleanStatus = (status: string): string => {
	if (status.includes(':')) {
		return status.split(':')[1]
	}
	return status
}

/**
 * Получает название статуса из Битрикс24
 */
export const getStatusName = (
	status: string,
	bitrixStages: BitrixStage[]
): string => {
	const cleanStatus = getCleanStatus(status)
	const stage = bitrixStages.find(
		stage => stage.id === status || stage.id === cleanStatus
	)

	// Если статус найден в загруженных данных из Битрикса
	if (stage) {
		return stage.name
	}

	// Fallback для основных статусов, если данные из Битрикса не загрузились
	switch (status) {
		case 'C1:NEW':
			return 'Новая'
		case 'C1:UC_GJLIZP':
			return 'Отправлено'
		case 'C1:WON':
			return 'Отгружено'
		default:
			return status // Показываем код, если название не найдено
	}
}

/**
 * Получает название поля по его имени
 */
export const getFieldLabel = (fieldName: string, formFields: any[]): string => {
	const field = formFields.find(f => f.name === fieldName)
	return field ? field.label : fieldName
}

/**
 * Определяет цвет чипа статуса синхронизации с Битрикс24
 */
export const getSyncStatusColor = (
	status: string
): 'success' | 'error' | 'warning' | 'default' => {
	switch (status) {
		case 'synced':
			return 'success'
		case 'failed':
			return 'error'
		case 'pending':
			return 'warning'
		default:
			return 'default'
	}
}

/**
 * Получает текст для статуса синхронизации
 */
export const getSyncStatusText = (status: string): string => {
	switch (status) {
		case 'synced':
			return 'Синхр.'
		case 'failed':
			return 'Ошибка'
		case 'pending':
			return 'Ожидает'
		default:
			return 'Не создано'
	}
}
