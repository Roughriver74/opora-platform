import { FormField } from '../../../../types'

/**
 * Новая упрощенная система порядка полей
 * Все элементы (разделы и поля) идут по порядку: 1, 2, 3, 4, 5, 6...
 */

export interface OrderedElement {
	id: string
	type: 'section' | 'field'
	field: FormField
	order: number
	originalIndex: number
}

/**
 * Получить все элементы в порядке их отображения
 */
export function getOrderedElements(fields: FormField[]): OrderedElement[] {
	return fields
		.map((field, index) => ({
			id: field._id || `temp-${index}`,
			type: (field.type === 'header' ? 'section' : 'field') as
				| 'section'
				| 'field',
			field,
			order: field.order || index + 1,
			originalIndex: index,
		}))
		.sort((a, b) => a.order - b.order)
}

/**
 * Переупорядочить все элементы по простой последовательности 1, 2, 3...
 */
export function normalizeAllOrders(fields: FormField[]): FormField[] {
	const orderedElements = getOrderedElements(fields)

	return orderedElements.map((element, index) => ({
		...element.field,
		order: index + 1,
	}))
}

/**
 * Переместить элемент с позиции fromIndex на позицию toIndex
 */
export function moveElement(
	fields: FormField[],
	fromIndex: number,
	toIndex: number
): FormField[] {
	const orderedElements = getOrderedElements(fields)

	// Находим элемент для перемещения
	const elementToMove = orderedElements[fromIndex]
	if (!elementToMove) {
		console.error('Элемент для перемещения не найден:', fromIndex)
		return fields
	}

	// Создаем новый массив без перемещаемого элемента
	const withoutElement = orderedElements.filter(
		(_, index) => index !== fromIndex
	)

	// Вставляем элемент на новую позицию
	const reordered = [
		...withoutElement.slice(0, toIndex),
		elementToMove,
		...withoutElement.slice(toIndex),
	]

	// Обновляем порядок всех элементов
	return reordered.map((element, index) => ({
		...element.field,
		order: index + 1,
	}))
}

/**
 * Вставить новый элемент на определенную позицию
 */
export function insertElementAtPosition(
	fields: FormField[],
	newField: FormField,
	position: number
): FormField[] {
	const orderedElements = getOrderedElements(fields)

	// Создаем новый элемент
	const newElement: OrderedElement = {
		id: newField._id || `temp-${Date.now()}`,
		type: newField.type === 'header' ? 'section' : 'field',
		field: newField,
		order: position,
		originalIndex: -1,
	}

	// Вставляем новый элемент на нужную позицию
	const withNewElement = [
		...orderedElements.slice(0, position),
		newElement,
		...orderedElements.slice(position),
	]

	// Перенумеровываем все элементы
	return withNewElement.map((element, index) => ({
		...element.field,
		order: index + 1,
	}))
}

/**
 * Удалить элемент и перенумеровать остальные
 */
export function removeElementAndReorder(
	fields: FormField[],
	elementId: string
): FormField[] {
	const orderedElements = getOrderedElements(fields)

	// Удаляем элемент
	const withoutElement = orderedElements.filter(
		element => element.id !== elementId
	)

	// Перенумеровываем оставшиеся элементы
	return withoutElement.map((element, index) => ({
		...element.field,
		order: index + 1,
	}))
}

/**
 * Изменить порядок элемента на конкретное число
 */
export function changeElementOrder(
	fields: FormField[],
	elementId: string,
	newOrder: number
): FormField[] {
	const orderedElements = getOrderedElements(fields)

	// Находим элемент для изменения
	const elementIndex = orderedElements.findIndex(el => el.id === elementId)
	if (elementIndex === -1) {
		console.error('Элемент не найден:', elementId)
		return fields
	}

	// Удаляем элемент из текущей позиции
	const element = orderedElements[elementIndex]
	const withoutElement = orderedElements.filter(
		(_, index) => index !== elementIndex
	)

	// Определяем новую позицию (минус 1 для преобразования в индекс)
	const newPosition = Math.max(0, Math.min(newOrder - 1, withoutElement.length))

	// Вставляем элемент на новую позицию
	const reordered = [
		...withoutElement.slice(0, newPosition),
		element,
		...withoutElement.slice(newPosition),
	]

	// Перенумеровываем все элементы
	return reordered.map((element, index) => ({
		...element.field,
		order: index + 1,
	}))
}

/**
 * Получить статистику по порядку
 */
export function getOrderStatistics(fields: FormField[]): {
	totalElements: number
	sections: number
	fields: number
	duplicateOrders: number[]
	missingOrders: number[]
} {
	const orderedElements = getOrderedElements(fields)
	const orders = orderedElements.map(el => el.order)

	const sections = orderedElements.filter(el => el.type === 'section').length
	const fieldsCount = orderedElements.filter(el => el.type === 'field').length

	// Находим дубликаты
	const duplicateOrders = orders.filter(
		(order, index) => orders.indexOf(order) !== index
	)

	// Находим пропущенные номера
	const missingOrders: number[] = []
	for (let i = 1; i <= orderedElements.length; i++) {
		if (!orders.includes(i)) {
			missingOrders.push(i)
		}
	}

	return {
		totalElements: orderedElements.length,
		sections,
		fields: fieldsCount,
		duplicateOrders: Array.from(new Set(duplicateOrders)),
		missingOrders,
	}
}

/**
 * Валидировать корректность порядка
 */
export function validateOrder(fields: FormField[]): {
	isValid: boolean
	errors: string[]
} {
	const stats = getOrderStatistics(fields)
	const errors: string[] = []

	if (stats.duplicateOrders.length > 0) {
		errors.push(`Дублирующиеся порядки: ${stats.duplicateOrders.join(', ')}`)
	}

	if (stats.missingOrders.length > 0) {
		errors.push(`Пропущенные порядки: ${stats.missingOrders.join(', ')}`)
	}

	return {
		isValid: errors.length === 0,
		errors,
	}
}
