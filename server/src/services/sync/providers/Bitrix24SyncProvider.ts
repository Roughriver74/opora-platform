/**
 * Bitrix24SyncProvider - Провайдер синхронизации с Bitrix24
 * Импортирует компании, контакты и номенклатуру из Bitrix24 в локальную БД
 */

import {
	ISyncProvider,
	ProviderConfig,
	SyncEntityType,
	SyncDirection,
	SyncOptions,
	SyncResult,
	SyncError,
} from '../interfaces'
import bitrix24Service from '../../bitrix24Service'
import { AppDataSource } from '../../../database/config/database.config'
import { Company, CompanyType } from '../../../database/entities/Company.entity'
import { Contact, ContactType } from '../../../database/entities/Contact.entity'
import { Nomenclature } from '../../../database/entities/Nomenclature.entity'
import { NomenclatureCategory } from '../../../database/entities/NomenclatureCategory.entity'
import { NomenclatureUnit } from '../../../database/entities/NomenclatureUnit.entity'
import { logger } from '../../../utils/logger'
import { In } from 'typeorm'

const getErrorMessage = (error: any): string => {
	if (error?.response?.data?.error_description) {
		return String(error.response.data.error_description)
	}
	if (error?.response?.data?.error) {
		return String(error.response.data.error)
	}
	if (error?.detail) {
		return String(error.detail)
	}
	if (error?.message) {
		return String(error.message)
	}
	try {
		return JSON.stringify(error)
	} catch {
		return String(error)
	}
}

export class Bitrix24SyncProvider implements ISyncProvider {
	readonly id = 'bitrix24'
	readonly name = 'Bitrix24 CRM'
	readonly supportedEntities: SyncEntityType[] = [
		'company',
		'contact',
		'nomenclature',
	]
	readonly supportedDirections: SyncDirection[] = ['import', 'export']

	private config: ProviderConfig | null = null

	async initialize(config: ProviderConfig): Promise<void> {
		this.config = config
		logger.info(`[Bitrix24SyncProvider] Инициализация провайдера`)
	}

	async testConnection(): Promise<{ success: boolean; message: string }> {
		try {
			// Пробуем получить текущего пользователя
			const response = await bitrix24Service.getCurrentUser()
			if (response?.result) {
				return {
					success: true,
					message: `Подключено к Bitrix24 (пользователь: ${response.result.NAME} ${response.result.LAST_NAME})`,
				}
			}
			return { success: false, message: 'Не удалось получить данные пользователя' }
		} catch (error: any) {
			return { success: false, message: `Ошибка подключения: ${error.message}` }
		}
	}

	async importData(
		entityType: SyncEntityType,
		options: SyncOptions = {}
	): Promise<SyncResult> {
		const startedAt = new Date()
		const errors: SyncError[] = []
		let created = 0
		let updated = 0
		let failed = 0
		let totalProcessed = 0

		try {
			switch (entityType) {
				case 'company':
					const companyResult = await this.importCompanies(options)
					created = companyResult.created
					updated = companyResult.updated
					failed = companyResult.failed
					totalProcessed = companyResult.total
					errors.push(...companyResult.errors)
					break

				case 'contact':
					const contactResult = await this.importContacts(options)
					created = contactResult.created
					updated = contactResult.updated
					failed = contactResult.failed
					totalProcessed = contactResult.total
					errors.push(...contactResult.errors)
					break

				case 'nomenclature':
					const nomenclatureResult = await this.importNomenclature(options)
					created = nomenclatureResult.created
					updated = nomenclatureResult.updated
					failed = nomenclatureResult.failed
					totalProcessed = nomenclatureResult.total
					errors.push(...nomenclatureResult.errors)
					break

				default:
					throw new Error(`Неподдерживаемый тип сущности: ${entityType}`)
			}
		} catch (error: any) {
			errors.push({ message: error.message })
			failed++
		}

		const completedAt = new Date()

		return {
			success: errors.length === 0,
			entityType,
			direction: 'import',
			totalProcessed,
			created,
			updated,
			deleted: 0,
			failed,
			errors,
			startedAt,
			completedAt,
			duration: completedAt.getTime() - startedAt.getTime(),
			provider: this.id,
		}
	}

	async exportData(
		entityType: SyncEntityType,
		options: SyncOptions = {}
	): Promise<SyncResult> {
		// Экспорт пока не реализован - возвращаем пустой результат
		const now = new Date()
		return {
			success: true,
			entityType,
			direction: 'export',
			totalProcessed: 0,
			created: 0,
			updated: 0,
			deleted: 0,
			failed: 0,
			errors: [],
			startedAt: now,
			completedAt: now,
			duration: 0,
			provider: this.id,
		}
	}

	async getExternalCount(entityType: SyncEntityType): Promise<number> {
		try {
			switch (entityType) {
				case 'company':
					const companies = await bitrix24Service.getAllCompaniesWithRequisites()
					return companies?.length || 0

				case 'contact':
					// Получаем контакты с большим лимитом для подсчёта
					const contacts = await bitrix24Service.getContacts('', 10000)
					return contacts?.result?.length || 0

				case 'nomenclature':
					const products = await bitrix24Service.getAllProducts()
					return products?.length || 0

				default:
					return 0
			}
		} catch {
			return -1
		}
	}

	async getLastModifiedDate(entityType: SyncEntityType): Promise<Date | null> {
		// Bitrix24 не предоставляет простой способ получить последнюю дату изменения
		return null
	}

	async dispose(): Promise<void> {
		this.config = null
		logger.info(`[Bitrix24SyncProvider] Провайдер отключен`)
	}

	// =====================================================
	// Приватные методы импорта
	// =====================================================

	private async importCompanies(options: SyncOptions): Promise<{
		total: number
		created: number
		updated: number
		failed: number
		errors: SyncError[]
	}> {
		logger.info(`[Bitrix24SyncProvider] Импорт компаний из Bitrix24...`)

		const errors: SyncError[] = []
		let created = 0
		let updated = 0
		let failed = 0

		try {
			const bitrixCompanies = await bitrix24Service.getAllCompaniesWithRequisites()
			const total = bitrixCompanies?.length || 0

			if (!bitrixCompanies || total === 0) {
				logger.info(`[Bitrix24SyncProvider] Нет компаний для импорта`)
				return { total: 0, created: 0, updated: 0, failed: 0, errors: [] }
			}

			logger.info(`[Bitrix24SyncProvider] Получено ${total} компаний из Bitrix24`)

			const companyRepository = AppDataSource.getRepository(Company)
			const batchSize = options.batchSize || 50

			for (let i = 0; i < bitrixCompanies.length; i += batchSize) {
				const batch = bitrixCompanies.slice(i, i + batchSize)

				for (const bitrixCompany of batch) {
					try {
						const bitrixCompanyId = String(bitrixCompany.ID)

						// Ищем существующую компанию
						let company = await companyRepository.findOne({
							where: { bitrixCompanyId },
						})

						const companyData = this.mapBitrixCompanyToEntity(bitrixCompany)

						if (company) {
							// Обновляем существующую
							if (!options.skipExisting) {
								Object.assign(company, companyData)
								await companyRepository.save(company)
								updated++
							}
						} else {
							// Создаем новую
							company = companyRepository.create({
								...companyData,
								bitrixCompanyId,
							})
							await companyRepository.save(company)
							created++
						}
					} catch (error: any) {
						const message = getErrorMessage(error)
						failed++
						errors.push({
							externalId: String(bitrixCompany.ID),
							message,
						})
						logger.error(
							`[Bitrix24SyncProvider] Ошибка импорта компании ${bitrixCompany.ID}:`,
							message
						)
					}
				}

				// Задержка между пакетами
				if (options.delayBetweenRequests && i + batchSize < bitrixCompanies.length) {
					await this.delay(options.delayBetweenRequests)
				}
			}

			logger.info(
				`[Bitrix24SyncProvider] ✅ Импорт компаний завершен: ${created} создано, ${updated} обновлено, ${failed} ошибок`
			)

			return { total, created, updated, failed, errors }
		} catch (error: any) {
			logger.error(`[Bitrix24SyncProvider] ❌ Ошибка импорта компаний:`, error)
			errors.push({ message: getErrorMessage(error) })
			return { total: 0, created, updated, failed: failed + 1, errors }
		}
	}

	private async importContacts(options: SyncOptions): Promise<{
		total: number
		created: number
		updated: number
		failed: number
		errors: SyncError[]
	}> {
		logger.info(`[Bitrix24SyncProvider] Импорт контактов из Bitrix24...`)

		const errors: SyncError[] = []
		let created = 0
		let updated = 0
		let failed = 0

		try {
			// Получаем все контакты с пагинацией
			const bitrixContactsResponse = await bitrix24Service.getContacts('', 10000)
			const bitrixContacts = bitrixContactsResponse?.result || []
			const total = bitrixContacts.length

			if (total === 0) {
				logger.info(`[Bitrix24SyncProvider] Нет контактов для импорта`)
				return { total: 0, created: 0, updated: 0, failed: 0, errors: [] }
			}

			logger.info(`[Bitrix24SyncProvider] Получено ${total} контактов из Bitrix24`)

			const contactRepository = AppDataSource.getRepository(Contact)
			const companyRepository = AppDataSource.getRepository(Company)
			const batchSize = options.batchSize || 50

			for (let i = 0; i < bitrixContacts.length; i += batchSize) {
				const batch = bitrixContacts.slice(i, i + batchSize)

				for (const bitrixContact of batch) {
					try {
						const bitrixContactId = String(bitrixContact.ID)

						// Ищем существующий контакт
						let contact = await contactRepository.findOne({
							where: { bitrixContactId },
						})

						const contactData = this.mapBitrixContactToEntity(bitrixContact)

						// Связываем с компанией если есть
						if (bitrixContact.COMPANY_ID) {
							const company = await companyRepository.findOne({
								where: { bitrixCompanyId: String(bitrixContact.COMPANY_ID) },
							})
							if (company) {
								contactData.companyId = company.id
							}
						}

						if (contact) {
							if (!options.skipExisting) {
								Object.assign(contact, contactData)
								await contactRepository.save(contact)
								updated++
							}
						} else {
							contact = contactRepository.create({
								...contactData,
								bitrixContactId,
							})
							await contactRepository.save(contact)
							created++
						}
					} catch (error: any) {
						const message = getErrorMessage(error)
						failed++
						errors.push({
							externalId: String(bitrixContact.ID),
							message,
						})
						logger.error(
							`[Bitrix24SyncProvider] Ошибка импорта контакта ${bitrixContact.ID}:`,
							message
						)
					}
				}

				if (options.delayBetweenRequests && i + batchSize < bitrixContacts.length) {
					await this.delay(options.delayBetweenRequests)
				}
			}

			logger.info(
				`[Bitrix24SyncProvider] ✅ Импорт контактов завершен: ${created} создано, ${updated} обновлено, ${failed} ошибок`
			)

			return { total, created, updated, failed, errors }
		} catch (error: any) {
			logger.error(`[Bitrix24SyncProvider] ❌ Ошибка импорта контактов:`, error)
			errors.push({ message: getErrorMessage(error) })
			return { total: 0, created, updated, failed: failed + 1, errors }
		}
	}

	private async importNomenclature(options: SyncOptions): Promise<{
		total: number
		created: number
		updated: number
		failed: number
		errors: SyncError[]
	}> {
		logger.info(`[Bitrix24SyncProvider] Импорт номенклатуры из Bitrix24...`)

		const errors: SyncError[] = []
		let created = 0
		let updated = 0
		let failed = 0

		try {
			const bitrixProducts = await bitrix24Service.getAllProducts()
			const total = bitrixProducts?.length || 0

			if (!bitrixProducts || total === 0) {
				logger.info(`[Bitrix24SyncProvider] Нет номенклатуры для импорта`)
				return { total: 0, created: 0, updated: 0, failed: 0, errors: [] }
			}

			logger.info(`[Bitrix24SyncProvider] Получено ${total} товаров из Bitrix24`)

			const nomenclatureRepository = AppDataSource.getRepository(Nomenclature)
			const categoryRepository = AppDataSource.getRepository(NomenclatureCategory)
			const unitRepository = AppDataSource.getRepository(NomenclatureUnit)
			const batchSize = options.batchSize || 50

			// Получаем или создаем единицу измерения по умолчанию
			let defaultUnit = await unitRepository.findOne({
				where: { code: 'шт' },
			})
			if (!defaultUnit) {
				defaultUnit = unitRepository.create({
					code: 'шт',
					name: 'Штука',
					shortName: 'шт.',
				})
				await unitRepository.save(defaultUnit)
			}

			for (let i = 0; i < bitrixProducts.length; i += batchSize) {
				const batch = bitrixProducts.slice(i, i + batchSize)

				for (const bitrixProduct of batch) {
					try {
						const bitrixProductId = String(bitrixProduct.ID)

						let nomenclature = await nomenclatureRepository.findOne({
							where: { bitrixProductId },
						})

						const nomenclatureData = this.mapBitrixProductToEntity(bitrixProduct)

						// Связываем с категорией если есть
						if (bitrixProduct.SECTION_ID) {
							let category = await categoryRepository.findOne({
								where: { bitrixSectionId: String(bitrixProduct.SECTION_ID) },
							})
							if (category) {
								nomenclatureData.categoryId = category.id
							}
						}

						// Связываем с единицей измерения
						nomenclatureData.unitId = defaultUnit.id

						if (nomenclature) {
							if (!options.skipExisting) {
								Object.assign(nomenclature, nomenclatureData)
								await nomenclatureRepository.save(nomenclature)
								updated++
							}
						} else {
							nomenclature = nomenclatureRepository.create({
								...nomenclatureData,
								bitrixProductId,
							})
							await nomenclatureRepository.save(nomenclature)
							created++
						}
					} catch (error: any) {
						const message = getErrorMessage(error)
						failed++
						errors.push({
							externalId: String(bitrixProduct.ID),
							message,
						})
						logger.error(
							`[Bitrix24SyncProvider] Ошибка импорта товара ${bitrixProduct.ID}:`,
							message
						)
					}
				}

				if (options.delayBetweenRequests && i + batchSize < bitrixProducts.length) {
					await this.delay(options.delayBetweenRequests)
				}
			}

			logger.info(
				`[Bitrix24SyncProvider] ✅ Импорт номенклатуры завершен: ${created} создано, ${updated} обновлено, ${failed} ошибок`
			)

			return { total, created, updated, failed, errors }
		} catch (error: any) {
			logger.error(`[Bitrix24SyncProvider] ❌ Ошибка импорта номенклатуры:`, error)
			errors.push({ message: getErrorMessage(error) })
			return { total: 0, created, updated, failed: failed + 1, errors }
		}
	}

	// =====================================================
	// Маппинг данных из Bitrix24 в локальные сущности
	// =====================================================

	private mapBitrixCompanyToEntity(bitrixCompany: any): Partial<Company> {
		const phones: string[] = []
		if (bitrixCompany.PHONE) {
			const phoneList = Array.isArray(bitrixCompany.PHONE)
				? bitrixCompany.PHONE
				: [bitrixCompany.PHONE]
			phoneList.forEach((p: any) => {
				if (p.VALUE) phones.push(p.VALUE)
			})
		}

		const emails: string[] = []
		if (bitrixCompany.EMAIL) {
			const emailList = Array.isArray(bitrixCompany.EMAIL)
				? bitrixCompany.EMAIL
				: [bitrixCompany.EMAIL]
			emailList.forEach((e: any) => {
				if (e.VALUE) emails.push(e.VALUE)
			})
		}

		// Получаем реквизиты
		const requisites = bitrixCompany.requisites?.[0] || {}
		const bankDetails = bitrixCompany.bankDetails?.[0] || {}

		return {
			name: bitrixCompany.TITLE || `Компания ${bitrixCompany.ID}`,
			shortName: bitrixCompany.SHORT_NAME || null,
			companyType: this.mapCompanyType(bitrixCompany.COMPANY_TYPE),
			inn: requisites.RQ_INN || bitrixCompany.UF_CRM_INN || null,
			kpp: requisites.RQ_KPP || null,
			ogrn: requisites.RQ_OGRN || null,
			phone: phones[0] || null,
			additionalPhones: phones.slice(1),
			email: emails[0] || null,
			website: bitrixCompany.WEB?.[0]?.VALUE || null,
			legalAddress: requisites.RQ_LEGAL_ADDRESS || null,
			postalAddress: requisites.RQ_ADDR?.postal || null,
			bankName: bankDetails.RQ_BANK_NAME || null,
			bankBik: bankDetails.RQ_BIK || null,
			bankAccount: bankDetails.RQ_ACC_NUM || null,
			bankCorrAccount: bankDetails.RQ_COR_ACC_NUM || null,
			isActive: bitrixCompany.OPENED === 'Y',
		}
	}

	private mapBitrixContactToEntity(bitrixContact: any): Partial<Contact> {
		const phones: string[] = []
		if (bitrixContact.PHONE) {
			const phoneList = Array.isArray(bitrixContact.PHONE)
				? bitrixContact.PHONE
				: [bitrixContact.PHONE]
			phoneList.forEach((p: any) => {
				if (p.VALUE) phones.push(p.VALUE)
			})
		}

		const emails: string[] = []
		if (bitrixContact.EMAIL) {
			const emailList = Array.isArray(bitrixContact.EMAIL)
				? bitrixContact.EMAIL
				: [bitrixContact.EMAIL]
			emailList.forEach((e: any) => {
				if (e.VALUE) emails.push(e.VALUE)
			})
		}

		return {
			firstName: bitrixContact.NAME || '',
			lastName: bitrixContact.LAST_NAME || '',
			middleName: bitrixContact.SECOND_NAME || null,
			contactType: ContactType.OTHER,
			phone: phones[0] || null,
			additionalPhones: phones.slice(1),
			email: emails[0] || null,
			position: bitrixContact.POST || null,
			isPrimary: false,
			isActive: bitrixContact.OPENED === 'Y',
		}
	}

	private mapBitrixProductToEntity(bitrixProduct: any): Partial<Nomenclature> {
		const sku = bitrixProduct.XML_ID || `BX-${bitrixProduct.ID}`

		return {
			name: bitrixProduct.NAME || `Товар ${bitrixProduct.ID}`,
			sku: sku || null,
			description: bitrixProduct.DESCRIPTION || null,
			price: bitrixProduct.PRICE ? parseFloat(bitrixProduct.PRICE) : null,
			isActive: bitrixProduct.ACTIVE === 'Y',
			sortOrder: bitrixProduct.SORT ? parseInt(bitrixProduct.SORT) : 500,
		}
	}

	private mapCompanyType(bitrixType: string): CompanyType {
		switch (bitrixType) {
			case 'CUSTOMER':
				return CompanyType.CUSTOMER
			case 'SUPPLIER':
				return CompanyType.SUPPLIER
			case 'PARTNER':
				return CompanyType.PARTNER
			default:
				return CompanyType.OTHER
		}
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms))
	}
}

// Экспортируем экземпляр провайдера
export const bitrix24SyncProvider = new Bitrix24SyncProvider()
