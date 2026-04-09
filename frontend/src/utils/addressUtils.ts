/**
 * Утилиты для работы с адресами
 */

/**
 * Очищает строку адреса от служебных данных Bitrix24
 * @param address Адрес, который может содержать служебные данные
 * @returns Очищенный адрес
 */
export const cleanAddressString = (address: string | undefined): string => {
	if (!address) return ''
	
	// Удаляем всё, что находится после символа |;| (формат Bitrix24)
	if (address.includes('|;|')) {
		return address.split('|;|')[0]
	}
	
	// Удаляем всё, что находится после символа | (старый формат)
	if (address.includes('|')) {
		return address.split('|')[0]
	}
	
	return address
}
