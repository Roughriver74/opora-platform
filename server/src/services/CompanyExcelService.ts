/**
 * CompanyExcelService - Сервис импорта/экспорта компаний через Excel
 */

import * as XLSX from 'xlsx'
import { AppDataSource } from '../database/config/database.config'
import { Company, CompanyType, CompanySyncStatus } from '../database/entities/Company.entity'
import { logger } from '../utils/logger'

export interface CompanyImportRow {
	name: string
	shortName?: string
	inn?: string
	kpp?: string
	ogrn?: string
	companyType?: string
	phone?: string
	email?: string
	website?: string
	legalAddress?: string
	actualAddress?: string
	postalAddress?: string
	bankName?: string
	bankBik?: string
	bankAccount?: string
	bankCorrAccount?: string
	industry?: string
	notes?: string
	bitrixCompanyId?: string
}

export interface CompanyImportResult {
	success: boolean
	totalRows: number
	created: number
	updated: number
	skipped: number
	failed: number
	errors: Array<{
		row: number
		field?: string
		message: string
		data?: any
	}>
}

export interface CompanyExportOptions {
	companyType?: CompanyType
	isActive?: boolean
	includeInactive?: boolean
}

class CompanyExcelService {
	/**
	 * Генерация шаблона Excel для импорта компаний
	 */
	generateTemplate(): Buffer {
		const workbook = XLSX.utils.book_new()

		// Лист "Компании" с заголовками и примером
		const companiesData = [
			[
				'Название*',
				'Краткое название',
				'ИНН',
				'КПП',
				'ОГРН',
				'Тип (customer/supplier/partner/contractor/other)',
				'Телефон',
				'Email',
				'Сайт',
				'Юридический адрес',
				'Фактический адрес',
				'Почтовый адрес',
				'Банк',
				'БИК',
				'Расчётный счёт',
				'Корр. счёт',
				'Отрасль',
				'Примечания',
				'Bitrix24 ID',
			],
			[
				'ООО "Пример"',
				'Пример',
				'7701234567',
				'770101001',
				'1027700123456',
				'customer',
				'+7 (495) 123-45-67',
				'info@example.com',
				'https://example.com',
				'г. Москва, ул. Примерная, д. 1',
				'г. Москва, ул. Примерная, д. 1',
				'123456, г. Москва, а/я 123',
				'ПАО Сбербанк',
				'044525225',
				'40702810123456789012',
				'30101810400000000225',
				'Строительство',
				'Пример записи',
				'',
			],
		]

		const companiesSheet = XLSX.utils.aoa_to_sheet(companiesData)

		// Устанавливаем ширину колонок
		companiesSheet['!cols'] = [
			{ wch: 30 }, // Название
			{ wch: 20 }, // Краткое название
			{ wch: 15 }, // ИНН
			{ wch: 12 }, // КПП
			{ wch: 18 }, // ОГРН
			{ wch: 40 }, // Тип
			{ wch: 20 }, // Телефон
			{ wch: 25 }, // Email
			{ wch: 25 }, // Сайт
			{ wch: 40 }, // Юр. адрес
			{ wch: 40 }, // Факт. адрес
			{ wch: 40 }, // Почт. адрес
			{ wch: 25 }, // Банк
			{ wch: 12 }, // БИК
			{ wch: 25 }, // Р/с
			{ wch: 25 }, // Корр/с
			{ wch: 20 }, // Отрасль
			{ wch: 30 }, // Примечания
			{ wch: 15 }, // Bitrix ID
		]

		XLSX.utils.book_append_sheet(workbook, companiesSheet, 'Компании')

		// Лист "Справочник типов"
		const typesData = [
			['Код типа', 'Описание'],
			['customer', 'Заказчик'],
			['supplier', 'Поставщик'],
			['partner', 'Партнёр'],
			['contractor', 'Подрядчик'],
			['other', 'Прочее'],
		]
		const typesSheet = XLSX.utils.aoa_to_sheet(typesData)
		typesSheet['!cols'] = [{ wch: 15 }, { wch: 20 }]
		XLSX.utils.book_append_sheet(workbook, typesSheet, 'Справочник типов')

		// Лист "Инструкция"
		const instructionsData = [
			['Инструкция по заполнению'],
			[''],
			['1. Обязательные поля отмечены звёздочкой (*)'],
			['2. ИНН должен содержать 10 (для ЮЛ) или 12 (для ИП) цифр'],
			['3. КПП должен содержать 9 цифр'],
			['4. ОГРН должен содержать 13 (для ЮЛ) или 15 (для ИП) цифр'],
			['5. БИК должен содержать 9 цифр'],
			['6. Расчётный счёт и корр. счёт должны содержать 20 цифр'],
			['7. Тип компании выбирается из справочника (см. лист "Справочник типов")'],
			['8. При указании Bitrix24 ID система попытается связать запись с Bitrix24'],
			['9. Если компания с таким ИНН уже существует, она будет обновлена'],
			[''],
			['Допустимые форматы телефона:'],
			['+7 (495) 123-45-67'],
			['8-495-123-45-67'],
			['+74951234567'],
		]
		const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData)
		instructionsSheet['!cols'] = [{ wch: 60 }]
		XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Инструкция')

		const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
		return buffer
	}

	/**
	 * Импорт компаний из Excel файла
	 */
	async importFromExcel(
		fileBuffer: Buffer,
		options: { skipExisting?: boolean; updateExisting?: boolean } = {}
	): Promise<CompanyImportResult> {
		const { skipExisting = false, updateExisting = true } = options
		const result: CompanyImportResult = {
			success: true,
			totalRows: 0,
			created: 0,
			updated: 0,
			skipped: 0,
			failed: 0,
			errors: [],
		}

		try {
			const workbook = XLSX.read(fileBuffer, { type: 'buffer' })

			// Ищем лист "Компании" или берём первый лист
			const sheetName = workbook.SheetNames.includes('Компании')
				? 'Компании'
				: workbook.SheetNames[0]

			const sheet = workbook.Sheets[sheetName]
			const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 })

			// Пропускаем заголовок
			const dataRows = rows.slice(1).filter((row: any[]) =>
				row.some(cell => cell !== undefined && cell !== null && cell !== '')
			)
			result.totalRows = dataRows.length

			if (dataRows.length === 0) {
				result.errors.push({
					row: 0,
					message: 'Файл не содержит данных для импорта',
				})
				result.success = false
				return result
			}

			logger.info(`[CompanyExcelService] Начало импорта ${dataRows.length} компаний`)

			const companyRepository = AppDataSource.getRepository(Company)

			for (let i = 0; i < dataRows.length; i++) {
				const rowIndex = i + 2 // +2 потому что строка 1 - заголовок, нумерация с 1
				const row = dataRows[i] as any[]

				try {
					const importRow = this.parseRow(row)

					// Валидация
					const validationErrors = this.validateRow(importRow)
					if (validationErrors.length > 0) {
						result.failed++
						validationErrors.forEach(err => {
							result.errors.push({
								row: rowIndex,
								field: err.field,
								message: err.message,
								data: importRow,
							})
						})
						continue
					}

					// Проверяем существование компании по ИНН или Bitrix ID
					let existingCompany: Company | null = null

					if (importRow.inn) {
						existingCompany = await companyRepository.findOne({
							where: { inn: importRow.inn },
						})
					}

					if (!existingCompany && importRow.bitrixCompanyId) {
						existingCompany = await companyRepository.findOne({
							where: { bitrixCompanyId: importRow.bitrixCompanyId },
						})
					}

					if (existingCompany) {
						if (skipExisting) {
							result.skipped++
							continue
						}

						if (updateExisting) {
							// Обновляем существующую компанию
							const updateData = this.mapRowToEntity(importRow)
							Object.assign(existingCompany, updateData)
							await companyRepository.save(existingCompany)
							result.updated++
							logger.debug(
								`[CompanyExcelService] Обновлена компания: ${existingCompany.name}`
							)
						} else {
							result.skipped++
						}
					} else {
						// Создаём новую компанию
						const companyData = this.mapRowToEntity(importRow)
						const newCompany = companyRepository.create(companyData)
						await companyRepository.save(newCompany)
						result.created++
						logger.debug(`[CompanyExcelService] Создана компания: ${newCompany.name}`)
					}
				} catch (error: any) {
					result.failed++
					result.errors.push({
						row: rowIndex,
						message: error.message,
					})
					logger.error(
						`[CompanyExcelService] Ошибка в строке ${rowIndex}:`,
						error.message
					)
				}
			}

			result.success = result.failed === 0

			logger.info(
				`[CompanyExcelService] Импорт завершён: ${result.created} создано, ${result.updated} обновлено, ${result.skipped} пропущено, ${result.failed} ошибок`
			)

			return result
		} catch (error: any) {
			logger.error('[CompanyExcelService] Критическая ошибка импорта:', error)
			result.success = false
			result.errors.push({
				row: 0,
				message: `Ошибка чтения файла: ${error.message}`,
			})
			return result
		}
	}

	/**
	 * Экспорт компаний в Excel файл
	 */
	async exportToExcel(options: CompanyExportOptions = {}): Promise<Buffer> {
		const companyRepository = AppDataSource.getRepository(Company)

		const whereClause: any = {}
		if (options.companyType) {
			whereClause.companyType = options.companyType
		}
		if (!options.includeInactive) {
			whereClause.isActive = true
		}

		const companies = await companyRepository.find({
			where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
			order: { name: 'ASC' },
		})

		logger.info(`[CompanyExcelService] Экспорт ${companies.length} компаний`)

		const workbook = XLSX.utils.book_new()

		// Заголовки
		const headers = [
			'ID',
			'Название',
			'Краткое название',
			'ИНН',
			'КПП',
			'ОГРН',
			'Тип',
			'Телефон',
			'Доп. телефоны',
			'Email',
			'Сайт',
			'Юридический адрес',
			'Фактический адрес',
			'Почтовый адрес',
			'Банк',
			'БИК',
			'Расчётный счёт',
			'Корр. счёт',
			'Отрасль',
			'Примечания',
			'Bitrix24 ID',
			'Статус синхронизации',
			'Активна',
			'Создана',
			'Обновлена',
		]

		const data = companies.map(company => [
			company.id,
			company.name,
			company.shortName || '',
			company.inn || '',
			company.kpp || '',
			company.ogrn || '',
			company.companyType,
			company.phone || '',
			company.additionalPhones?.join(', ') || '',
			company.email || '',
			company.website || '',
			company.legalAddress || '',
			company.actualAddress || '',
			company.postalAddress || '',
			company.bankName || '',
			company.bankBik || '',
			company.bankAccount || '',
			company.bankCorrAccount || '',
			company.industry || '',
			company.notes || '',
			company.bitrixCompanyId || '',
			company.syncStatus,
			company.isActive ? 'Да' : 'Нет',
			company.createdAt?.toISOString() || '',
			company.updatedAt?.toISOString() || '',
		])

		const sheetData = [headers, ...data]
		const sheet = XLSX.utils.aoa_to_sheet(sheetData)

		// Устанавливаем ширину колонок
		sheet['!cols'] = [
			{ wch: 40 }, // ID
			{ wch: 30 }, // Название
			{ wch: 20 }, // Краткое название
			{ wch: 15 }, // ИНН
			{ wch: 12 }, // КПП
			{ wch: 18 }, // ОГРН
			{ wch: 12 }, // Тип
			{ wch: 18 }, // Телефон
			{ wch: 25 }, // Доп. телефоны
			{ wch: 25 }, // Email
			{ wch: 25 }, // Сайт
			{ wch: 40 }, // Юр. адрес
			{ wch: 40 }, // Факт. адрес
			{ wch: 40 }, // Почт. адрес
			{ wch: 25 }, // Банк
			{ wch: 12 }, // БИК
			{ wch: 25 }, // Р/с
			{ wch: 25 }, // Корр/с
			{ wch: 20 }, // Отрасль
			{ wch: 30 }, // Примечания
			{ wch: 15 }, // Bitrix ID
			{ wch: 15 }, // Статус синхронизации
			{ wch: 10 }, // Активна
			{ wch: 20 }, // Создана
			{ wch: 20 }, // Обновлена
		]

		XLSX.utils.book_append_sheet(workbook, sheet, 'Компании')

		const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
		return buffer
	}

	/**
	 * Парсинг строки Excel в объект
	 */
	private parseRow(row: any[]): CompanyImportRow {
		return {
			name: this.cleanString(row[0]),
			shortName: this.cleanString(row[1]),
			inn: this.cleanString(row[2]),
			kpp: this.cleanString(row[3]),
			ogrn: this.cleanString(row[4]),
			companyType: this.cleanString(row[5]),
			phone: this.cleanString(row[6]),
			email: this.cleanString(row[7]),
			website: this.cleanString(row[8]),
			legalAddress: this.cleanString(row[9]),
			actualAddress: this.cleanString(row[10]),
			postalAddress: this.cleanString(row[11]),
			bankName: this.cleanString(row[12]),
			bankBik: this.cleanString(row[13]),
			bankAccount: this.cleanString(row[14]),
			bankCorrAccount: this.cleanString(row[15]),
			industry: this.cleanString(row[16]),
			notes: this.cleanString(row[17]),
			bitrixCompanyId: this.cleanString(row[18]),
		}
	}

	/**
	 * Валидация строки импорта
	 */
	private validateRow(row: CompanyImportRow): Array<{ field: string; message: string }> {
		const errors: Array<{ field: string; message: string }> = []

		// Проверка обязательных полей
		if (!row.name || row.name.trim() === '') {
			errors.push({ field: 'name', message: 'Название компании обязательно' })
		}

		// Валидация ИНН
		if (row.inn) {
			const innClean = row.inn.replace(/\D/g, '')
			if (innClean.length !== 10 && innClean.length !== 12) {
				errors.push({ field: 'inn', message: 'ИНН должен содержать 10 или 12 цифр' })
			}
		}

		// Валидация КПП
		if (row.kpp) {
			const kppClean = row.kpp.replace(/\D/g, '')
			if (kppClean.length !== 9) {
				errors.push({ field: 'kpp', message: 'КПП должен содержать 9 цифр' })
			}
		}

		// Валидация ОГРН
		if (row.ogrn) {
			const ogrnClean = row.ogrn.replace(/\D/g, '')
			if (ogrnClean.length !== 13 && ogrnClean.length !== 15) {
				errors.push({ field: 'ogrn', message: 'ОГРН должен содержать 13 или 15 цифр' })
			}
		}

		// Валидация типа компании
		if (row.companyType) {
			const validTypes = ['customer', 'supplier', 'partner', 'contractor', 'other']
			if (!validTypes.includes(row.companyType.toLowerCase())) {
				errors.push({
					field: 'companyType',
					message: `Недопустимый тип компании. Допустимые: ${validTypes.join(', ')}`,
				})
			}
		}

		// Валидация БИК
		if (row.bankBik) {
			const bikClean = row.bankBik.replace(/\D/g, '')
			if (bikClean.length !== 9) {
				errors.push({ field: 'bankBik', message: 'БИК должен содержать 9 цифр' })
			}
		}

		// Валидация расчётного счёта
		if (row.bankAccount) {
			const accountClean = row.bankAccount.replace(/\D/g, '')
			if (accountClean.length !== 20) {
				errors.push({ field: 'bankAccount', message: 'Расчётный счёт должен содержать 20 цифр' })
			}
		}

		// Валидация корр. счёта
		if (row.bankCorrAccount) {
			const corrClean = row.bankCorrAccount.replace(/\D/g, '')
			if (corrClean.length !== 20) {
				errors.push({ field: 'bankCorrAccount', message: 'Корр. счёт должен содержать 20 цифр' })
			}
		}

		// Валидация email
		if (row.email) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
			if (!emailRegex.test(row.email)) {
				errors.push({ field: 'email', message: 'Некорректный формат email' })
			}
		}

		return errors
	}

	/**
	 * Маппинг строки импорта в сущность Company
	 */
	private mapRowToEntity(row: CompanyImportRow): Partial<Company> {
		const companyType = this.mapCompanyType(row.companyType)

		return {
			name: row.name.trim(),
			shortName: row.shortName?.trim() || null,
			inn: row.inn?.replace(/\D/g, '') || null,
			kpp: row.kpp?.replace(/\D/g, '') || null,
			ogrn: row.ogrn?.replace(/\D/g, '') || null,
			companyType,
			phone: row.phone?.trim() || null,
			email: row.email?.trim().toLowerCase() || null,
			website: row.website?.trim() || null,
			legalAddress: row.legalAddress?.trim() || null,
			actualAddress: row.actualAddress?.trim() || null,
			postalAddress: row.postalAddress?.trim() || null,
			bankName: row.bankName?.trim() || null,
			bankBik: row.bankBik?.replace(/\D/g, '') || null,
			bankAccount: row.bankAccount?.replace(/\D/g, '') || null,
			bankCorrAccount: row.bankCorrAccount?.replace(/\D/g, '') || null,
			industry: row.industry?.trim() || null,
			notes: row.notes?.trim() || null,
			bitrixCompanyId: row.bitrixCompanyId?.trim() || null,
			syncStatus: row.bitrixCompanyId
				? CompanySyncStatus.SYNCED
				: CompanySyncStatus.LOCAL_ONLY,
			isActive: true,
		}
	}

	/**
	 * Маппинг типа компании из строки в enum
	 */
	private mapCompanyType(typeStr?: string): CompanyType {
		if (!typeStr) return CompanyType.CUSTOMER

		const typeMap: Record<string, CompanyType> = {
			customer: CompanyType.CUSTOMER,
			supplier: CompanyType.SUPPLIER,
			partner: CompanyType.PARTNER,
			contractor: CompanyType.CONTRACTOR,
			other: CompanyType.OTHER,
			заказчик: CompanyType.CUSTOMER,
			поставщик: CompanyType.SUPPLIER,
			партнёр: CompanyType.PARTNER,
			партнер: CompanyType.PARTNER,
			подрядчик: CompanyType.CONTRACTOR,
			прочее: CompanyType.OTHER,
		}

		return typeMap[typeStr.toLowerCase()] || CompanyType.CUSTOMER
	}

	/**
	 * Очистка строкового значения
	 */
	private cleanString(value: any): string {
		if (value === undefined || value === null) return ''
		return String(value).trim()
	}
}

export const companyExcelService = new CompanyExcelService()
