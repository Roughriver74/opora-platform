import { api } from './api'
import { ReactNode } from 'react'

export interface GlobalSetting {
	id: number
	key: string
	value: string
	description?: string
	created_at?: string
	updated_at?: string | null
}

export interface GlobalSettingUpdate {
	key: string
	value: string
	description?: string
}

export interface FieldMapping {
	name: ReactNode
	description: any
	options: never[]
	id: number
	entity_type: string
	app_field_name: string
	bitrix_field_id: string
	field_type: string
	is_required: boolean
	display_name: string
	show_in_card: boolean // Флаг, показывающий, что поле должно отображаться на карточке визита
	show_in_visit?: boolean // Флаг, показывающий, что поле клиники должно отображаться на странице визита
	is_multiple?: boolean // Флаг, показывающий, что поле поддерживает множественный выбор
	value_options?: string // JSON string for list/enum values mapping {"app_value": "bitrix_value"}
	section?: string // Раздел для группировки полей в формах
	sort_order?: number // Порядок сортировки полей в форме
	created_at: string
	updated_at: string | null
}

export interface FieldMappingCreate {
	entity_type: string
	app_field_name: string
	bitrix_field_id: string
	field_type: string
	is_required: boolean
	display_name: string
	show_in_card: boolean // Флаг, показывающий, что поле должно отображаться на карточке визита
	show_in_visit?: boolean // Флаг, показывающий, что поле клиники должно отображаться на странице визита
	is_multiple?: boolean // Флаг, показывающий, что поле поддерживает множественный выбор
	value_options?: string // JSON string for list/enum values mapping {"app_value": "bitrix_value"}
	section?: string // Раздел для группировки полей в формах
	sort_order?: number // Порядок сортировки полей в форме
}

export const adminApi = {
	// Global Settings
	getGlobalSettings: async (): Promise<GlobalSetting[]> => {
		const response = await api.get('/admin/settings')
		return response.data
	},

	getGlobalSetting: async (key: string): Promise<GlobalSetting> => {
		const response = await api.get(`/admin/settings/${key}`)
		return response.data
	},

	updateGlobalSetting: async (key: string, setting: GlobalSettingUpdate): Promise<GlobalSetting> => {
		const response = await api.put(`/admin/settings/${key}`, setting)
		return response.data
	},
	// Field Mappings
	getFieldMappings: async (entityType?: string): Promise<FieldMapping[]> => {
		const params = entityType ? { entity_type: entityType } : {}
		const response = await api.get('/admin/field-mappings', { params })
		return response.data
	},

	// Публичный метод для получения маппингов полей, не требующий прав администратора
	getPublicFieldMappings: async (entityType?: string): Promise<FieldMapping[]> => {
		const params = entityType ? { entity_type: entityType } : {}
		const response = await api.get('/admin/public/field-mappings', { params })
		return response.data
	},

	getFieldMapping: async (id: number): Promise<FieldMapping> => {
		const response = await api.get(`/admin/field-mappings/${id}`)
		return response.data
	},

	createFieldMapping: async (
		mapping: FieldMappingCreate
	): Promise<FieldMapping> => {
		const response = await api.post('/admin/field-mappings', mapping)
		return response.data
	},

	updateFieldMapping: async (
		id: number,
		mapping: FieldMappingCreate
	): Promise<FieldMapping> => {
		const response = await api.put(`/admin/field-mappings/${id}`, mapping)
		return response.data
	},

	deleteFieldMapping: async (id: number): Promise<void> => {
		await api.delete(`/admin/field-mappings/${id}`)
	},

	// Обновление списочных значений для полей типа 'list'
	updateFieldListValues: async (): Promise<any> => {
		const response = await api.post('/admin/field-mappings/update-list-values')
		return response.data
	},

	// Получение полей из Bitrix24
	getBitrixVisitFields: async (entityTypeId: number = 1054): Promise<any> => {
		const response = await api.get('/admin/bitrix/fields/visit', {
			params: { entity_type_id: entityTypeId },
		})
		return response.data
	},

	// Получение списочных значений для поля Smart Process
	getBitrixSmartProcessFieldValues: async (
		entityTypeId: number,
		fieldId: string
	): Promise<any> => {
		const response = await api.get('/admin/bitrix/field-values', {
			params: {
				entity_type: 'visit',
				entity_type_id: entityTypeId,
				field_id: fieldId,
			},
		})
		return response.data
	},

	// Получение списочных значений для поля компании
	getBitrixCompanyFieldValues: async (fieldId: string): Promise<any> => {
		const response = await api.get('/admin/bitrix/field-values', {
			params: { entity_type: 'company', field_id: fieldId },
		})
		return response.data
	},

	// Получение списочных значений для поля контакта
	getBitrixContactFieldValues: async (fieldId: string): Promise<any> => {
		const response = await api.get('/admin/bitrix/field-values', {
			params: { entity_type: 'contact', field_id: fieldId },
		})
		return response.data
	},

	// Получение списочных значений для поля продукта
	getBitrixProductFieldValues: async (fieldId: string): Promise<any> => {
		const response = await api.get('/admin/bitrix/field-values', {
			params: { entity_type: 'product', field_id: fieldId },
		})
		return response.data
	},

	getBitrixCompanyFields: async (): Promise<any> => {
		const response = await api.get('/admin/bitrix/fields/company')
		return response.data
	},

	getBitrixDoctorFields: async (): Promise<any> => {
		const response = await api.get('/admin/bitrix/fields/doctor')
		return response.data
	},

	getNetworkClinicsFields: async (): Promise<any> => {
		const response = await api.get('/admin/bitrix/fields/network-clinic')
		return response.data
	},

	getBitrixProductFields: async (): Promise<any> => {
		const response = await api.get('/admin/bitrix/fields/product')
		return response.data
	},

	// Вспомогательные функции для работы с маппингами
	getFieldMappingsByEntity: async (
		entityType: string
	): Promise<FieldMapping[]> => {
		return adminApi.getFieldMappings(entityType)
	},

	// Функция для получения маппинга для Bitrix24
	mapEntityToBitrix: async <T extends Record<string, any>>(
		entityType: string,
		data: T
	): Promise<Record<string, any>> => {
		const mappings = await adminApi.getFieldMappingsByEntity(entityType)
		const result: Record<string, any> = {}

		if (!mappings || mappings.length === 0) {
			console.warn(`No field mappings found for entity type: ${entityType}`)
			return result
		}

		for (const mapping of mappings) {
			const appFieldName = mapping.app_field_name
			const bitrixFieldId = mapping.bitrix_field_id

			if (appFieldName in data) {
				// @ts-ignore - мы не можем заранее знать, какие поля будут в data
				const value = data[appFieldName]
				result[bitrixFieldId] = value
			}
		}

		return result
	},

	// Функция для преобразования данных из Bitrix24 в формат приложения
	mapBitrixToEntity: async <T>(
		entityType: string,
		bitrixData: Record<string, any>
	): Promise<Partial<T>> => {
		const mappings = await adminApi.getFieldMappingsByEntity(entityType)
		const result: Record<string, any> = {}

		if (!mappings || mappings.length === 0) {
			console.warn(`No field mappings found for entity type: ${entityType}`)
			return result as Partial<T>
		}

		for (const mapping of mappings) {
			const appFieldName = mapping.app_field_name
			const bitrixFieldId = mapping.bitrix_field_id

			if (bitrixFieldId in bitrixData) {
				const value = bitrixData[bitrixFieldId]
				result[appFieldName] = value
			}
		}

		return result as Partial<T>
	},
}
