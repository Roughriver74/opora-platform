import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import {
	Nomenclature,
	NomenclatureType,
	NomenclatureSyncStatus,
	NomenclatureCategory,
	NomenclatureUnit,
} from '../database/entities'
import {
	nomenclatureRepository,
	nomenclatureCategoryRepository,
	nomenclatureUnitRepository,
} from '../database/repositories'
import { logger } from '../utils/logger'

/**
 * Результат импорта
 */
export interface ImportResult {
	total: number
	created: number
	updated: number
	skipped: number
	errors: { row: number; message: string; data?: any }[]
}

/**
 * Фильтры для экспорта
 */
export interface ExportFilters {
	categoryId?: string
	type?: NomenclatureType
	syncStatus?: NomenclatureSyncStatus
	isActive?: boolean
}

/**
 * Определение колонки Excel
 */
interface ColumnDefinition {
	key: string
	header: string
	width: number
	required?: boolean
	default?: any
}

/**
 * Сервис для работы с Excel файлами номенклатуры
 */
class NomenclatureExcelService {
	private readonly columns: ColumnDefinition[] = [
		{ key: 'sku', header: 'Артикул*', width: 15, required: true },
		{ key: 'name', header: 'Наименование*', width: 40, required: true },
		{ key: 'description', header: 'Описание', width: 50 },
		{ key: 'categoryCode', header: 'Код категории', width: 15 },
		{ key: 'unitCode', header: 'Ед. изм.*', width: 10, required: true },
		{ key: 'price', header: 'Цена', width: 12 },
		{ key: 'currency', header: 'Валюта', width: 8, default: 'RUB' },
		{ key: 'type', header: 'Тип', width: 12, default: 'product' },
		{ key: 'tags', header: 'Теги (через ;)', width: 30 },
		{ key: 'bitrixProductId', header: 'Bitrix24 ID', width: 15 },
		{ key: 'isActive', header: 'Активен', width: 10, default: true },
	]

	/**
	 * Генерация шаблона Excel
	 */
	async generateTemplate(): Promise<Buffer> {
		const wb = XLSX.utils.book_new()

		// Лист 1: Номенклатура
		const nomenclatureSheet = XLSX.utils.aoa_to_sheet([
			this.columns.map((c) => c.header),
			// Пример строки
			[
				'PROD-001',
				'Продукт 001',
				'Описание продукта 001',
				'CATEGORY_A',
				'm3',
				'5500',
				'RUB',
				'product',
				'продукт;001',
				'',
				'true',
			],
			[
				'PROD-002',
				'Продукт 002',
				'Описание продукта 002',
				'CATEGORY_A',
				'm3',
				'6000',
				'RUB',
				'product',
				'продукт;002',
				'',
				'true',
			],
		])

		nomenclatureSheet['!cols'] = this.columns.map((c) => ({ wch: c.width }))
		XLSX.utils.book_append_sheet(wb, nomenclatureSheet, 'Номенклатура')

		// Лист 2: Справочник категорий
		const categories = await nomenclatureCategoryRepository.findAllActive()
		const categoriesData = [
			['Код', 'Название', 'Описание'],
			...categories.map((c) => [c.code, c.name, c.description || '']),
		]
		const categoriesSheet = XLSX.utils.aoa_to_sheet(categoriesData)
		categoriesSheet['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 50 }]
		XLSX.utils.book_append_sheet(wb, categoriesSheet, 'Категории')

		// Лист 3: Справочник единиц измерения
		const units = await nomenclatureUnitRepository.findAllActive()
		const unitsData = [
			['Код', 'Название', 'Сокращение', 'Код ОКЕИ'],
			...units.map((u) => [u.code, u.name, u.shortName, u.okeiCode || '']),
		]
		const unitsSheet = XLSX.utils.aoa_to_sheet(unitsData)
		unitsSheet['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }]
		XLSX.utils.book_append_sheet(wb, unitsSheet, 'Единицы измерения')

		// Лист 4: Справочник типов
		const typesSheet = XLSX.utils.aoa_to_sheet([
			['Код', 'Описание'],
			['product', 'Товар'],
			['service', 'Услуга'],
			['material', 'Материал'],
		])
		typesSheet['!cols'] = [{ wch: 15 }, { wch: 30 }]
		XLSX.utils.book_append_sheet(wb, typesSheet, 'Типы')

		return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
	}

	/**
	 * Импорт номенклатуры из Excel файла
	 */
	async importFromExcel(filePath: string): Promise<ImportResult> {
		const result: ImportResult = {
			total: 0,
			created: 0,
			updated: 0,
			skipped: 0,
			errors: [],
		}

		try {
			// Проверяем существование файла
			if (!fs.existsSync(filePath)) {
				throw new Error(`Файл не найден: ${filePath}`)
			}

			const wb = XLSX.readFile(filePath)
			const sheetName = wb.SheetNames[0]
			const ws = wb.Sheets[sheetName]

			// Преобразуем в массив объектов
			const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { header: 1 })

			if (rows.length < 2) {
				throw new Error('Файл не содержит данных для импорта')
			}

			// Получаем заголовки
			const headers = rows[0] as string[]
			const headerMap = this.mapHeaders(headers)

			// Загружаем справочники
			const categories = await nomenclatureCategoryRepository.findAllActive()
			const units = await nomenclatureUnitRepository.findAllActive()
			const categoryMap = new Map(categories.map((c) => [c.code.toLowerCase(), c]))
			const unitMap = new Map(units.map((u) => [u.code.toLowerCase(), u]))

			// Обрабатываем строки данных (пропускаем заголовок)
			for (let i = 1; i < rows.length; i++) {
				const row = rows[i] as any[]
				result.total++

				try {
					const data = this.parseRow(row, headerMap, categoryMap, unitMap)

					if (!data) {
						result.skipped++
						continue
					}

					// Проверяем существование по SKU
					const existing = await nomenclatureRepository.findBySku(data.sku)

					if (existing) {
						// Обновляем
						await nomenclatureRepository.update(existing.id, data)
						result.updated++
					} else {
						// Создаем
						await nomenclatureRepository.create({
							...data,
							syncStatus: NomenclatureSyncStatus.LOCAL_ONLY,
						})
						result.created++
					}
				} catch (error: any) {
					result.errors.push({
						row: i + 1,
						message: error.message,
						data: row,
					})
				}
			}

			logger.info(
				`Импорт Excel завершен. Всего: ${result.total}, создано: ${result.created}, обновлено: ${result.updated}, пропущено: ${result.skipped}, ошибок: ${result.errors.length}`
			)
		} catch (error: any) {
			logger.error('Ошибка импорта Excel:', error)
			throw error
		} finally {
			// Удаляем временный файл
			try {
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath)
				}
			} catch {}
		}

		return result
	}

	/**
	 * Экспорт номенклатуры в Excel
	 */
	async exportToExcel(filters?: ExportFilters): Promise<Buffer> {
		const wb = XLSX.utils.book_new()

		// Получаем данные с фильтрами
		const queryOptions: any = {
			where: {},
			relations: ['category', 'unit'],
			order: { sortOrder: 'ASC', name: 'ASC' },
		}

		if (filters?.categoryId) {
			queryOptions.where.categoryId = filters.categoryId
		}
		if (filters?.type) {
			queryOptions.where.type = filters.type
		}
		if (filters?.syncStatus) {
			queryOptions.where.syncStatus = filters.syncStatus
		}
		if (filters?.isActive !== undefined) {
			queryOptions.where.isActive = filters.isActive
		}

		const items = await nomenclatureRepository.findAll(queryOptions)

		// Формируем данные для экспорта
		const data = [
			this.columns.map((c) => c.header),
			...items.map((item) => [
				item.sku,
				item.name,
				item.description || '',
				item.category?.code || '',
				item.unit?.code || '',
				item.price !== null ? item.price.toString() : '',
				item.currency,
				item.type,
				item.tags?.join(';') || '',
				item.bitrixProductId || '',
				item.isActive ? 'true' : 'false',
			]),
		]

		const ws = XLSX.utils.aoa_to_sheet(data)
		ws['!cols'] = this.columns.map((c) => ({ wch: c.width }))
		XLSX.utils.book_append_sheet(wb, ws, 'Номенклатура')

		// Добавляем лист со статистикой
		const stats = await nomenclatureRepository.getStats()
		const statsData = [
			['Статистика экспорта'],
			[''],
			['Всего записей', items.length],
			['Активных', stats.active],
			['Синхронизированных с Bitrix24', stats.synced],
			['Только локальные', stats.localOnly],
			['С ошибками синхронизации', stats.errors],
			[''],
			['Дата экспорта', new Date().toLocaleString('ru-RU')],
		]
		const statsSheet = XLSX.utils.aoa_to_sheet(statsData)
		statsSheet['!cols'] = [{ wch: 30 }, { wch: 20 }]
		XLSX.utils.book_append_sheet(wb, statsSheet, 'Статистика')

		return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
	}

	// === Приватные методы ===

	/**
	 * Создает карту соответствия заголовков
	 */
	private mapHeaders(headers: string[]): Map<string, number> {
		const map = new Map<string, number>()

		for (let i = 0; i < headers.length; i++) {
			const header = headers[i]?.toString().toLowerCase().trim()
			if (!header) continue

			// Сопоставляем заголовки с ключами
			for (const col of this.columns) {
				const colHeader = col.header.toLowerCase().replace('*', '').trim()
				if (header === colHeader || header.includes(colHeader)) {
					map.set(col.key, i)
					break
				}
			}
		}

		return map
	}

	/**
	 * Парсит строку Excel в объект данных
	 */
	private parseRow(
		row: any[],
		headerMap: Map<string, number>,
		categoryMap: Map<string, NomenclatureCategory>,
		unitMap: Map<string, NomenclatureUnit>
	): Partial<Nomenclature> | null {
		const getValue = (key: string): any => {
			const index = headerMap.get(key)
			if (index === undefined) return undefined
			return row[index]?.toString().trim()
		}

		// Получаем обязательные поля
		const sku = getValue('sku')
		const name = getValue('name')
		const unitCode = getValue('unitCode')

		// Пропускаем пустые строки
		if (!sku && !name) {
			return null
		}

		// Валидация обязательных полей
		if (!sku) {
			throw new Error('Артикул (SKU) обязателен')
		}
		if (!name) {
			throw new Error('Наименование обязательно')
		}
		if (!unitCode) {
			throw new Error('Единица измерения обязательна')
		}

		// Находим единицу измерения
		const unit = unitMap.get(unitCode.toLowerCase())
		if (!unit) {
			throw new Error(`Единица измерения "${unitCode}" не найдена`)
		}

		// Находим категорию если указана
		const categoryCode = getValue('categoryCode')
		let categoryId: string | null = null
		if (categoryCode) {
			const category = categoryMap.get(categoryCode.toLowerCase())
			if (category) {
				categoryId = category.id
			} else {
				logger.warn(`Категория "${categoryCode}" не найдена, пропускаем`)
			}
		}

		// Парсим цену
		const priceStr = getValue('price')
		let price: number | null = null
		if (priceStr) {
			price = parseFloat(priceStr.replace(',', '.').replace(/\s/g, ''))
			if (isNaN(price)) {
				throw new Error(`Некорректная цена: "${priceStr}"`)
			}
		}

		// Парсим тип
		const typeStr = getValue('type')?.toLowerCase()
		let type = NomenclatureType.PRODUCT
		if (typeStr === 'service' || typeStr === 'услуга') {
			type = NomenclatureType.SERVICE
		} else if (typeStr === 'material' || typeStr === 'материал') {
			type = NomenclatureType.MATERIAL
		}

		// Парсим теги
		const tagsStr = getValue('tags')
		const tags = tagsStr
			? tagsStr
					.split(';')
					.map((t: string) => t.trim())
					.filter((t: string) => t)
			: []

		// Парсим активность
		const isActiveStr = getValue('isActive')?.toLowerCase()
		const isActive = isActiveStr !== 'false' && isActiveStr !== '0' && isActiveStr !== 'нет'

		// Bitrix ID
		const bitrixProductId = getValue('bitrixProductId') || null

		return {
			sku,
			name,
			description: getValue('description') || null,
			categoryId,
			unitId: unit.id,
			price,
			currency: getValue('currency') || 'RUB',
			type,
			tags,
			bitrixProductId,
			isActive,
		}
	}
}

export const nomenclatureExcelService = new NomenclatureExcelService()
