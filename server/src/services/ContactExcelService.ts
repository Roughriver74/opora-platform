/**
 * ContactExcelService - Сервис импорта/экспорта контактов через Excel
 */

import * as XLSX from 'xlsx'
import { AppDataSource } from '../database/config/database.config'
import { Contact, ContactType, ContactSyncStatus } from '../database/entities/Contact.entity'
import { Company } from '../database/entities/Company.entity'
import { logger } from '../utils/logger'

export interface ContactImportRow {
	firstName: string
	lastName?: string
	middleName?: string
	phone?: string
	email?: string
	position?: string
	contactType?: string
	department?: string
	companyInn?: string
	companyId?: string
	bitrixContactId?: string
	notes?: string
	isPrimary?: boolean
}

export interface ContactImportResult {
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

export interface ContactExportOptions {
	contactType?: ContactType
	companyId?: string
	isActive?: boolean
	includeInactive?: boolean
}

class ContactExcelService {
	/**
	 * Генерация шаблона Excel для импорта контактов
	 */
	generateTemplate(): Buffer {
		const workbook = XLSX.utils.book_new()

		// Лист "Контакты" с заголовками и примером
		const contactsData = [
			[
				'Имя*',
				'Фамилия',
				'Отчество',
				'Телефон',
				'Email',
				'Должность',
				'Тип контакта (decision_maker/manager/accountant/director/dispatcher/other)',
				'Отдел',
				'ИНН компании*',
				'ID компании (если известен)',
				'Bitrix24 ID',
				'Примечания',
				'Основной контакт (Да/Нет)',
			],
			[
				'Иван',
				'Иванов',
				'Иванович',
				'+7 (495) 123-45-67',
				'ivanov@example.com',
				'Менеджер по закупкам',
				'manager',
				'Отдел закупок',
				'7701234567',
				'',
				'',
				'Предпочтительная связь по email',
				'Да',
			],
		]

		const contactsSheet = XLSX.utils.aoa_to_sheet(contactsData)

		// Устанавливаем ширину колонок
		contactsSheet['!cols'] = [
			{ wch: 15 }, // Имя
			{ wch: 15 }, // Фамилия
			{ wch: 15 }, // Отчество
			{ wch: 20 }, // Телефон
			{ wch: 25 }, // Email
			{ wch: 25 }, // Должность
			{ wch: 60 }, // Тип контакта
			{ wch: 20 }, // Отдел
			{ wch: 15 }, // ИНН компании
			{ wch: 40 }, // ID компании
			{ wch: 15 }, // Bitrix ID
			{ wch: 30 }, // Примечания
			{ wch: 20 }, // Основной контакт
		]

		XLSX.utils.book_append_sheet(workbook, contactsSheet, 'Контакты')

		// Лист "Справочник типов"
		const typesData = [
			['Код типа', 'Описание'],
			['decision_maker', 'ЛПР (Лицо, принимающее решения)'],
			['manager', 'Менеджер'],
			['accountant', 'Бухгалтер'],
			['director', 'Директор'],
			['dispatcher', 'Диспетчер'],
			['other', 'Прочее'],
		]
		const typesSheet = XLSX.utils.aoa_to_sheet(typesData)
		typesSheet['!cols'] = [{ wch: 15 }, { wch: 35 }]
		XLSX.utils.book_append_sheet(workbook, typesSheet, 'Справочник типов')

		// Лист "Инструкция"
		const instructionsData = [
			['Инструкция по заполнению'],
			[''],
			['1. Обязательные поля отмечены звёздочкой (*)'],
			['2. Имя контакта обязательно'],
			['3. Для привязки контакта к компании укажите ИНН компании или ID компании'],
			['4. Если компания с указанным ИНН не найдена, контакт будет создан без привязки'],
			['5. Тип контакта выбирается из справочника (см. лист "Справочник типов")'],
			['6. При указании Bitrix24 ID система попытается связать запись с Bitrix24'],
			['7. Если контакт с таким Bitrix24 ID уже существует, он будет обновлен'],
			['8. "Основной контакт" - указывает, является ли контакт основным для компании'],
			[''],
			['Допустимые форматы телефона:'],
			['+7 (495) 123-45-67'],
			['8-495-123-45-67'],
			['+74951234567'],
		]
		const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData)
		instructionsSheet['!cols'] = [{ wch: 70 }]
		XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Инструкция')

		const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
		return buffer
	}

	/**
	 * Импорт контактов из Excel файла
	 */
	async importFromExcel(
		fileBuffer: Buffer,
		options: { skipExisting?: boolean; updateExisting?: boolean } = {}
	): Promise<ContactImportResult> {
		const { skipExisting = false, updateExisting = true } = options
		const result: ContactImportResult = {
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

			// Ищем лист "Контакты" или берём первый лист
			const sheetName = workbook.SheetNames.includes('Контакты')
				? 'Контакты'
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

			logger.info(`[ContactExcelService] Начало импорта ${dataRows.length} контактов`)

			const contactRepository = AppDataSource.getRepository(Contact)
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

					// Ищем компанию по ИНН или ID
					let company: Company | null = null

					if (importRow.companyId) {
						company = await companyRepository.findOne({
							where: { id: importRow.companyId },
						})
					}

					if (!company && importRow.companyInn) {
						const innClean = importRow.companyInn.replace(/\D/g, '')
						company = await companyRepository.findOne({
							where: { inn: innClean },
						})
					}

					if (!company && (importRow.companyInn || importRow.companyId)) {
						logger.warn(
							`[ContactExcelService] Компания не найдена для контакта в строке ${rowIndex}`
						)
					}

					// Проверяем существование контакта по Bitrix ID
					let existingContact: Contact | null = null

					if (importRow.bitrixContactId) {
						existingContact = await contactRepository.findOne({
							where: { bitrixContactId: importRow.bitrixContactId },
						})
					}

					// Если Bitrix ID не указан, ищем по ФИО + компании
					if (!existingContact && company) {
						existingContact = await contactRepository.findOne({
							where: {
								firstName: importRow.firstName,
								lastName: importRow.lastName || '',
								companyId: company.id,
							},
						})
					}

					if (existingContact) {
						if (skipExisting) {
							result.skipped++
							continue
						}

						if (updateExisting) {
							// Обновляем существующий контакт
							const updateData = this.mapRowToEntity(importRow)
							if (company) {
								updateData.companyId = company.id
							}
							Object.assign(existingContact, updateData)
							await contactRepository.save(existingContact)
							result.updated++
							logger.debug(
								`[ContactExcelService] Обновлен контакт: ${existingContact.firstName} ${existingContact.lastName}`
							)
						} else {
							result.skipped++
						}
					} else {
						// Создаём новый контакт
						const contactData = this.mapRowToEntity(importRow)
						if (company) {
							contactData.companyId = company.id
						}
						const newContact = contactRepository.create(contactData)
						await contactRepository.save(newContact)
						result.created++
						logger.debug(
							`[ContactExcelService] Создан контакт: ${newContact.firstName} ${newContact.lastName}`
						)
					}
				} catch (error: any) {
					result.failed++
					result.errors.push({
						row: rowIndex,
						message: error.message,
					})
					logger.error(
						`[ContactExcelService] Ошибка в строке ${rowIndex}:`,
						error.message
					)
				}
			}

			result.success = result.failed === 0

			logger.info(
				`[ContactExcelService] Импорт завершён: ${result.created} создано, ${result.updated} обновлено, ${result.skipped} пропущено, ${result.failed} ошибок`
			)

			return result
		} catch (error: any) {
			logger.error('[ContactExcelService] Критическая ошибка импорта:', error)
			result.success = false
			result.errors.push({
				row: 0,
				message: `Ошибка чтения файла: ${error.message}`,
			})
			return result
		}
	}

	/**
	 * Экспорт контактов в Excel файл
	 */
	async exportToExcel(options: ContactExportOptions = {}): Promise<Buffer> {
		const contactRepository = AppDataSource.getRepository(Contact)

		const queryBuilder = contactRepository
			.createQueryBuilder('contact')
			.leftJoinAndSelect('contact.company', 'company')

		if (options.contactType) {
			queryBuilder.andWhere('contact.contactType = :contactType', {
				contactType: options.contactType,
			})
		}

		if (options.companyId) {
			queryBuilder.andWhere('contact.companyId = :companyId', {
				companyId: options.companyId,
			})
		}

		if (!options.includeInactive) {
			queryBuilder.andWhere('contact.isActive = :isActive', { isActive: true })
		}

		queryBuilder.orderBy('contact.lastName', 'ASC').addOrderBy('contact.firstName', 'ASC')

		const contacts = await queryBuilder.getMany()

		logger.info(`[ContactExcelService] Экспорт ${contacts.length} контактов`)

		const workbook = XLSX.utils.book_new()

		// Заголовки
		const headers = [
			'ID',
			'Имя',
			'Фамилия',
			'Отчество',
			'Телефон',
			'Доп. телефоны',
			'Email',
			'Должность',
			'Тип контакта',
			'Отдел',
			'Компания',
			'ИНН компании',
			'Bitrix24 ID',
			'Статус синхронизации',
			'Основной контакт',
			'Активен',
			'Примечания',
			'Создан',
			'Обновлен',
		]

		const data = contacts.map(contact => [
			contact.id,
			contact.firstName,
			contact.lastName || '',
			contact.middleName || '',
			contact.phone || '',
			contact.additionalPhones?.join(', ') || '',
			contact.email || '',
			contact.position || '',
			this.mapContactTypeToRussian(contact.contactType),
			contact.department || '',
			contact.company?.name || '',
			contact.company?.inn || '',
			contact.bitrixContactId || '',
			contact.syncStatus,
			contact.isPrimary ? 'Да' : 'Нет',
			contact.isActive ? 'Да' : 'Нет',
			contact.notes || '',
			contact.createdAt?.toISOString() || '',
			contact.updatedAt?.toISOString() || '',
		])

		const sheetData = [headers, ...data]
		const sheet = XLSX.utils.aoa_to_sheet(sheetData)

		// Устанавливаем ширину колонок
		sheet['!cols'] = [
			{ wch: 40 }, // ID
			{ wch: 15 }, // Имя
			{ wch: 15 }, // Фамилия
			{ wch: 15 }, // Отчество
			{ wch: 18 }, // Телефон
			{ wch: 25 }, // Доп. телефоны
			{ wch: 25 }, // Email
			{ wch: 25 }, // Должность
			{ wch: 15 }, // Тип контакта
			{ wch: 20 }, // Отдел
			{ wch: 30 }, // Компания
			{ wch: 15 }, // ИНН компании
			{ wch: 15 }, // Bitrix ID
			{ wch: 15 }, // Статус синхронизации
			{ wch: 15 }, // Основной контакт
			{ wch: 10 }, // Активен
			{ wch: 30 }, // Примечания
			{ wch: 20 }, // Создан
			{ wch: 20 }, // Обновлен
		]

		XLSX.utils.book_append_sheet(workbook, sheet, 'Контакты')

		const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
		return buffer
	}

	/**
	 * Парсинг строки Excel в объект
	 */
	private parseRow(row: any[]): ContactImportRow {
		return {
			firstName: this.cleanString(row[0]),
			lastName: this.cleanString(row[1]),
			middleName: this.cleanString(row[2]),
			phone: this.cleanString(row[3]),
			email: this.cleanString(row[4]),
			position: this.cleanString(row[5]),
			contactType: this.cleanString(row[6]),
			department: this.cleanString(row[7]),
			companyInn: this.cleanString(row[8]),
			companyId: this.cleanString(row[9]),
			bitrixContactId: this.cleanString(row[10]),
			notes: this.cleanString(row[11]),
			isPrimary: this.parseBoolean(row[12]),
		}
	}

	/**
	 * Валидация строки импорта
	 */
	private validateRow(row: ContactImportRow): Array<{ field: string; message: string }> {
		const errors: Array<{ field: string; message: string }> = []

		// Проверка обязательных полей
		if (!row.firstName || row.firstName.trim() === '') {
			errors.push({ field: 'firstName', message: 'Имя контакта обязательно' })
		}

		// Валидация типа контакта
		if (row.contactType) {
			const validTypes = [
				'decision_maker',
				'manager',
				'accountant',
				'director',
				'dispatcher',
				'other',
			]
			if (!validTypes.includes(row.contactType.toLowerCase())) {
				errors.push({
					field: 'contactType',
					message: `Недопустимый тип контакта. Допустимые: ${validTypes.join(', ')}`,
				})
			}
		}

		// Валидация email
		if (row.email) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
			if (!emailRegex.test(row.email)) {
				errors.push({ field: 'email', message: 'Некорректный формат email' })
			}
		}

		// Валидация ИНН компании
		if (row.companyInn) {
			const innClean = row.companyInn.replace(/\D/g, '')
			if (innClean.length !== 10 && innClean.length !== 12) {
				errors.push({
					field: 'companyInn',
					message: 'ИНН компании должен содержать 10 или 12 цифр',
				})
			}
		}

		return errors
	}

	/**
	 * Маппинг строки импорта в сущность Contact
	 */
	private mapRowToEntity(row: ContactImportRow): Partial<Contact> {
		const contactType = this.mapContactType(row.contactType)

		return {
			firstName: row.firstName.trim(),
			lastName: row.lastName?.trim() || null,
			middleName: row.middleName?.trim() || null,
			phone: row.phone?.trim() || null,
			email: row.email?.trim().toLowerCase() || null,
			position: row.position?.trim() || null,
			contactType,
			department: row.department?.trim() || null,
			notes: row.notes?.trim() || null,
			bitrixContactId: row.bitrixContactId?.trim() || null,
			isPrimary: row.isPrimary || false,
			syncStatus: row.bitrixContactId
				? ContactSyncStatus.SYNCED
				: ContactSyncStatus.LOCAL_ONLY,
			isActive: true,
		}
	}

	/**
	 * Маппинг типа контакта из строки в enum
	 */
	private mapContactType(typeStr?: string): ContactType {
		if (!typeStr) return ContactType.OTHER

		const typeMap: Record<string, ContactType> = {
			decision_maker: ContactType.DECISION_MAKER,
			manager: ContactType.MANAGER,
			accountant: ContactType.ACCOUNTANT,
			director: ContactType.DIRECTOR,
			dispatcher: ContactType.DISPATCHER,
			other: ContactType.OTHER,
			лпр: ContactType.DECISION_MAKER,
			менеджер: ContactType.MANAGER,
			бухгалтер: ContactType.ACCOUNTANT,
			директор: ContactType.DIRECTOR,
			диспетчер: ContactType.DISPATCHER,
			прочее: ContactType.OTHER,
		}

		return typeMap[typeStr.toLowerCase()] || ContactType.OTHER
	}

	/**
	 * Маппинг типа контакта в русское название для экспорта
	 */
	private mapContactTypeToRussian(type: ContactType): string {
		const typeMap: Record<ContactType, string> = {
			[ContactType.DECISION_MAKER]: 'ЛПР',
			[ContactType.MANAGER]: 'Менеджер',
			[ContactType.ACCOUNTANT]: 'Бухгалтер',
			[ContactType.DIRECTOR]: 'Директор',
			[ContactType.DISPATCHER]: 'Диспетчер',
			[ContactType.OTHER]: 'Прочее',
		}

		return typeMap[type] || 'Прочее'
	}

	/**
	 * Очистка строкового значения
	 */
	private cleanString(value: any): string {
		if (value === undefined || value === null) return ''
		return String(value).trim()
	}

	/**
	 * Парсинг булевого значения из различных форматов
	 */
	private parseBoolean(value: any): boolean {
		if (value === undefined || value === null) return false
		if (typeof value === 'boolean') return value
		if (typeof value === 'number') return value !== 0
		const strValue = String(value).toLowerCase().trim()
		return ['да', 'yes', 'true', '1', 'y'].includes(strValue)
	}
}

export const contactExcelService = new ContactExcelService()
