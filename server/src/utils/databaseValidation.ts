import mongoose from 'mongoose'
import Form from '../models/Form'
import FormField from '../models/FormField'

interface ValidationResult {
	isValid: boolean
	issues: string[]
	statistics: {
		totalForms: number
		totalFields: number
		fieldsWithForm: number
		fieldsWithoutForm: number
	}
}

/**
 * Проверяет целостность связей между формами и полями
 */
export async function validateFormFieldsIntegrity(): Promise<ValidationResult> {
	const issues: string[] = []

	try {
		// Получаем статистику
		const totalForms = await Form.countDocuments()
		const totalFields = await FormField.countDocuments()
		const fieldsWithForm = await FormField.countDocuments({
			formId: { $exists: true },
		})
		const fieldsWithoutForm = await FormField.countDocuments({
			formId: { $exists: false },
		})

		console.log('📊 Статистика базы данных:')
		console.log(`  Форм: ${totalForms}`)
		console.log(`  Полей: ${totalFields}`)
		console.log(`  Полей с formId: ${fieldsWithForm}`)
		console.log(`  Полей без formId: ${fieldsWithoutForm}`)

		// Проверка 1: Все поля должны иметь formId
		if (fieldsWithoutForm > 0) {
			issues.push(`❌ Найдено ${fieldsWithoutForm} полей без связи с формой`)
		}

		// Проверка 2: Все formId должны ссылаться на существующие формы
		const forms = await Form.find({}, { _id: 1 })
		const formIds = forms.map(form => form._id.toString())

		for (const formId of formIds) {
			const fieldsCount = await FormField.countDocuments({ formId })
			console.log(`  Форма ${formId}: ${fieldsCount} полей`)

			if (fieldsCount === 0) {
				issues.push(`⚠️ Форма ${formId} не имеет полей`)
			}
		}

		// Проверка 3: Поиск полей с недействительными formId
		const fieldsWithInvalidFormId = await FormField.find({
			formId: { $exists: true, $nin: formIds },
		})

		if (fieldsWithInvalidFormId.length > 0) {
			issues.push(
				`❌ Найдено ${fieldsWithInvalidFormId.length} полей с недействительными formId`
			)
		}

		// Проверка 4: Типы данных
		const sampleField = await FormField.findOne({ formId: { $exists: true } })
		if (sampleField) {
			const formIdType = typeof sampleField.formId
			console.log(`  Тип formId в базе: ${formIdType}`)

			if (formIdType !== 'string') {
				issues.push(`❌ formId хранится как ${formIdType}, ожидается string`)
			}
		}

		const statistics = {
			totalForms,
			totalFields,
			fieldsWithForm,
			fieldsWithoutForm,
		}

		return {
			isValid: issues.length === 0,
			issues,
			statistics,
		}
	} catch (error) {
		issues.push(`❌ Ошибка валидации: ${error}`)
		return {
			isValid: false,
			issues,
			statistics: {
				totalForms: 0,
				totalFields: 0,
				fieldsWithForm: 0,
				fieldsWithoutForm: 0,
			},
		}
	}
}

/**
 * Автоматически исправляет найденные проблемы
 */
export async function autoFixDatabaseIssues(): Promise<{
	fixed: string[]
	errors: string[]
}> {
	const fixed: string[] = []
	const errors: string[] = []

	try {
		// Исправление 1: Привязка полей без formId к первой форме
		const fieldsWithoutForm = await FormField.find({
			formId: { $exists: false },
		})
		if (fieldsWithoutForm.length > 0) {
			const firstForm = await Form.findOne()
			if (firstForm) {
				await FormField.updateMany(
					{ formId: { $exists: false } },
					{ formId: firstForm._id.toString() }
				)
				fixed.push(
					`✅ Привязано ${fieldsWithoutForm.length} полей к форме ${firstForm._id}`
				)
			}
		}

		// Исправление 2: Удаление полей с недействительными formId
		const forms = await Form.find({}, { _id: 1 })
		const validFormIds = forms.map(form => form._id.toString())

		const orphanFields = await FormField.find({
			formId: { $exists: true, $nin: validFormIds },
		})

		if (orphanFields.length > 0) {
			await FormField.deleteMany({
				formId: { $exists: true, $nin: validFormIds },
			})
			fixed.push(
				`✅ Удалено ${orphanFields.length} полей с недействительными formId`
			)
		}
	} catch (error) {
		errors.push(`❌ Ошибка автоисправления: ${error}`)
	}

	return { fixed, errors }
}

/**
 * Запускает полную проверку и исправление при необходимости
 */
export async function validateAndFixDatabase(
	autoFix: boolean = false
): Promise<void> {
	console.log('🔍 Запуск валидации базы данных...')

	const validation = await validateFormFieldsIntegrity()

	if (validation.isValid) {
		console.log('✅ База данных прошла все проверки')
		return
	}

	console.log('⚠️ Обнаружены проблемы:')
	validation.issues.forEach(issue => console.log(`  ${issue}`))

	if (autoFix) {
		console.log('🔧 Запуск автоисправления...')
		const fixResult = await autoFixDatabaseIssues()

		fixResult.fixed.forEach(fix => console.log(`  ${fix}`))
		fixResult.errors.forEach(error => console.log(`  ${error}`))

		if (fixResult.fixed.length > 0) {
			console.log('✅ Повторная проверка после исправлений...')
			await validateFormFieldsIntegrity()
		}
	} else {
		console.log('💡 Для автоисправления запустите с параметром autoFix: true')
	}
}
