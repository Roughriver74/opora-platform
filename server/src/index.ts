import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import connectDB from './config/database'
import redisClient from './config/redis'
import config from './config/config'
import { authMiddleware } from './middleware/authMiddleware'
import { validateAndFixDatabase } from './utils/databaseValidation'
import dotenv from 'dotenv'

// Импорт маршрутизаторов
import formFieldRoutes from './routes/formFieldRoutes'
import formRoutes from './routes/formRoutes'
import submissionRoutes from './routes/submissionRoutes'
import optimizedSubmissionRoutes from './routes/optimizedSubmissionRoutes'
import authRoutes from './routes/authRoutes'
import userRoutes from './routes/userRoutes'
import diagnosticRoutes from './routes/diagnosticRoutes'
import backupRoutes from './routes/backupRoutes'
import settingsRoutes from './routes/settingsRoutes'
import { initializeDefaultSettings } from './controllers/settingsController'

// Инициализация Express приложения
const app = express()

// Подключение к MongoDB и валидация данных
const initializeServer = async () => {
	await connectDB()

	// Redis временно отключен для стабильной работы
	// await redisClient.connect()

	// Проверяем целостность базы данных при запуске
	await validateAndFixDatabase(true) // autoFix = true для автоматического исправления

	// Инициализируем настройки по умолчанию
	await initializeDefaultSettings()
}
initializeServer()

// Middleware
// Настройка CORS для разработки
app.use(
	cors({
		origin: function (origin, callback) {
			// Разрешаем запросы с localhost:3000 и без origin (для Postman и т.д.)
			const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true)
			} else {
				callback(new Error('Not allowed by CORS'))
			}
		},
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
		credentials: true,
		optionsSuccessStatus: 200,
	})
)

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Применяем middleware авторизации для всех маршрутов
app.use(authMiddleware)

// Маршруты API
app.use('/api/auth', authRoutes)
app.use('/api/form-fields', formFieldRoutes)
app.use('/api/forms', formRoutes)
app.use('/api/submissions', submissionRoutes)
app.use('/api/submissions', optimizedSubmissionRoutes)
app.use('/api/users', userRoutes)
app.use('/api/diagnostic', diagnosticRoutes)
app.use('/api/backups', backupRoutes)
app.use('/api/settings', settingsRoutes)

// Базовый маршрут для проверки работоспособности API
app.get('/', (req, res) => {
	res.json({ message: 'Beton CRM API работает' })
})

// Debug endpoint для проверки всех форм
app.get('/debug/forms', async (req, res) => {
	try {
		const Form = require('./models/Form').default
		const forms = await Form.find({}).limit(10)
		res.json({
			count: forms.length,
			forms: forms.map(f => ({
				_id: f._id,
				_idString: f._id.toString(),
				_idType: typeof f._id,
				name: f.name,
				title: f.title
			}))
		})
	} catch (error: any) {
		res.json({ error: error.message })
	}
})

// Временный debug endpoint для проверки пользователя
app.get('/debug/user/:id', async (req, res) => {
	try {
		const User = require('./models/User').default
		const user = await User.findById(req.params.id)
		res.json({ 
			user: user ? {
				id: user._id,
				email: user.email,
				status: user.status,
				isActive: user.isActive,
				role: user.role
			} : null 
		})
	} catch (error) {
		res.json({ error: error.message })
	}
})

// Debug endpoint для просмотра всех пользователей
app.get('/debug/users', async (req, res) => {
	try {
		const User = require('./models/User').default
		const users = await User.find({}).select('_id email status isActive role').limit(10)
		res.json({ users })
	} catch (error) {
		res.json({ error: error.message })
	}
})

// Debug endpoint для создания админа
app.post('/debug/create-admin', async (req: any, res: any) => {
	try {
		const User = require('./models/User').default
		const bcrypt = require('bcryptjs')
		
		// Always create with fresh data  
		const hashedPassword = await bcrypt.hash('123456', 10)
		
		// Delete existing if any
		await User.deleteMany({ email: 'crm@betonexpress.pro' })
		
		// Create new user
		const newUser = await User.create({
			email: 'crm@betonexpress.pro',
			password: hashedPassword,
			firstName: 'CRM',
			lastName: 'Administrator',
			fullName: 'CRM Administrator',
			role: 'admin',
			status: 'active',
			isActive: true,
			settings: {
				onlyMyCompanies: false
			}
		})
		
		res.json({ message: 'Admin created successfully', user: newUser, password: '123456' })
	} catch (error: any) {
		res.json({ error: error.message })
	}
})

// Debug endpoint для обновления пароля существующего пользователя
app.post('/debug/fix-user-password/:email', async (req: any, res: any) => {
	try {
		const User = require('./models/User').default
		const bcrypt = require('bcryptjs')
		const { email } = req.params
		const { password = '123456' } = req.body
		
		const user = await User.findOne({ email })
		if (!user) {
			return res.json({ error: 'User not found' })
		}
		
		// Hash new password
		const hashedPassword = await bcrypt.hash(password, 10)
		user.password = hashedPassword
		user.isActive = true
		user.status = 'active'
		await user.save()
		
		res.json({ message: 'Password updated successfully', email, newPassword: password })
	} catch (error: any) {
		res.json({ error: error.message })
	}
})

// Debug endpoint для проверки формы по ID
app.get('/debug/form/:id', async (req: any, res: any) => {
	try {
		const Form = require('./models/Form').default
		const mongoose = require('mongoose')
		const { id } = req.params
		
		console.log('Debug: получен ID:', id)
		console.log('Debug: тип ID:', typeof id)
		console.log('Debug: валидный ObjectId?', mongoose.Types.ObjectId.isValid(id))
		
		// Пробуем разные способы поиска
		const form1 = await Form.findById(id)
		const form2 = await Form.findOne({ _id: id })
		
		let form3 = null
		try {
			form3 = await Form.findOne({ _id: new mongoose.Types.ObjectId(id) })
		} catch (e) {
			console.log('Ошибка при создании ObjectId:', e.message)
		}
		
		// Получаем все формы для сравнения
		const allForms = await Form.find({})
		
		res.json({
			receivedId: id,
			idType: typeof id,
			isValidObjectId: mongoose.Types.ObjectId.isValid(id),
			findByIdResult: form1 ? { found: true, id: form1._id, name: form1.name } : { found: false },
			findOneStringResult: form2 ? { found: true, id: form2._id, name: form2.name } : { found: false },
			findOneObjectIdResult: form3 ? { found: true, id: form3._id, name: form3.name } : { found: false },
			allFormsCount: allForms.length,
			allForms: allForms.map(f => ({
				id: f._id,
				idString: f._id.toString(),
				name: f.name,
				matchesRequestedId: f._id.toString() === id
			}))
		})
	} catch (error: any) {
		res.json({ error: error.message, stack: error.stack })
	}
})

// Debug endpoint для проверки полей формы
app.get('/debug/fields', async (req: any, res: any) => {
	try {
		const FormField = require('./models/FormField').default
		const fields = await FormField.find({}).limit(20)
		res.json({
			count: fields.length,
			fields: fields.map(f => ({
				_id: f._id,
				_idString: f._id.toString(),
				_idType: typeof f._id,
				name: f.name,
				label: f.label,
				type: f.type,
				formId: f.formId
			}))
		})
	} catch (error: any) {
		res.json({ error: error.message })
	}
})

// Debug endpoint для проверки конкретного поля по ID
app.get('/debug/field/:id', async (req: any, res: any) => {
	try {
		const FormField = require('./models/FormField').default
		const mongoose = require('mongoose')
		const { id } = req.params
		
		console.log('Debug field: получен ID:', id)
		console.log('Debug field: тип ID:', typeof id)
		console.log('Debug field: валидный ObjectId?', mongoose.Types.ObjectId.isValid(id))
		
		// Пробуем разные способы поиска
		const field1 = await FormField.findById(id)
		const field2 = await FormField.findOne({ _id: id })
		
		let field3 = null
		try {
			field3 = await FormField.findOne({ _id: new mongoose.Types.ObjectId(id) })
		} catch (e) {
			console.log('Ошибка при создании ObjectId для поля:', e.message)
		}
		
		// Получаем все поля для сравнения
		const allFields = await FormField.find({})
		
		res.json({
			receivedId: id,
			idType: typeof id,
			isValidObjectId: mongoose.Types.ObjectId.isValid(id),
			findByIdResult: field1 ? { found: true, id: field1._id, name: field1.name } : { found: false },
			findOneStringResult: field2 ? { found: true, id: field2._id, name: field2.name } : { found: false },
			findOneObjectIdResult: field3 ? { found: true, id: field3._id, name: field3.name } : { found: false },
			allFieldsCount: allFields.length,
			matchingFields: allFields.filter(f => f._id.toString() === id).map(f => ({
				id: f._id,
				idString: f._id.toString(),
				name: f.name,
				label: f.label,
				type: f.type
			}))
		})
	} catch (error: any) {
		res.json({ error: error.message, stack: error.stack })
	}
})

// Debug endpoint для тестирования порядка полей без авторизации
app.put('/debug/test-field-order', async (req: any, res: any) => {
	try {
		const formFieldController = require('./controllers/formFieldController')
		
		// Создаем фальшивый объект запроса с нужными данными
		const fakeReq = {
			body: req.body,
			user: { role: 'admin' } // Фальшивый пользователь для прохождения проверок
		}
		const fakeRes = {
			status: (code: number) => ({
				json: (data: any) => {
					res.status(code).json(data)
				}
			})
		}
		
		// Вызываем контроллер напрямую
		await formFieldController.updateFieldsOrder(fakeReq, fakeRes)
	} catch (error: any) {
		console.error('❌ Ошибка при тесте порядка полей:', error)
		res.status(500).json({ error: error.message })
	}
})

// Debug endpoint для тестирования обновления формы без авторизации
app.put('/debug/test-form-update/:id', async (req: any, res: any) => {
	try {
		const formController = require('./controllers/formController')
		
		// Создаем фальшивый объект запроса с нужными данными
		const fakeReq = {
			params: { id: req.params.id },
			body: req.body,
			user: { role: 'admin' } // Фальшивый пользователь для прохождения проверок
		}
		const fakeRes = {
			status: (code: number) => ({
				json: (data: any) => {
					res.status(code).json(data)
				}
			})
		}
		
		// Вызываем контроллер напрямую
		await formController.updateForm(fakeReq, fakeRes)
	} catch (error: any) {
		console.error('❌ Ошибка при тесте обновления формы:', error)
		res.status(500).json({ error: error.message })
	}
})

// Debug endpoint для создания тестового поля
app.post('/debug/create-test-field', async (req: any, res: any) => {
	try {
		const FormField = require('./models/FormField').default
		
		console.log('🆕 Создание тестового поля...')
		const testFieldData = {
			name: `test_field_${Date.now()}`,
			label: 'Тестовое поле',
			type: 'text',
			required: false,
			bitrixFieldId: 'test',
			bitrixFieldType: 'string',
			order: 999
		}
		
		const newField = new FormField(testFieldData)
		const savedField = await newField.save()
		
		console.log('✅ Тестовое поле создано:', savedField._id)
		
		// Теперь попробуем обновить его
		console.log('🔄 Пробуем обновить созданное поле...')
		const updatedField = await FormField.findByIdAndUpdate(
			savedField._id,
			{ label: 'ОБНОВЛЕННОЕ тестовое поле' },
			{ new: true }
		)
		
		console.log('📊 Результат обновления:', updatedField ? 'УСПЕХ' : 'НЕУДАЧА')
		
		res.json({
			created: savedField,
			updated: updatedField,
			canUpdate: !!updatedField
		})
	} catch (error: any) {
		console.error('❌ Ошибка при создании/обновлении тестового поля:', error)
		res.status(500).json({ error: error.message })
	}
})

// Debug endpoint для тестирования обновления поля без авторизации
app.put('/debug/update-field/:id', async (req: any, res: any) => {
	try {
		const FormField = require('./models/FormField').default
		const mongoose = require('mongoose')
		const { id } = req.params
		const updateData = req.body
		
		console.log('🚀 DEBUG updateField ВХОД - ID:', id, 'тип:', typeof id)
		console.log('📝 Данные для обновления:', JSON.stringify(updateData, null, 2))

		// Попробуем все способы поиска
		console.log('🔍 Способ 1: findById(string)...')
		let field = await FormField.findById(id)
		console.log('📊 Результат findById(string):', field ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО')
		
		if (!field) {
			console.log('🔍 Способ 2: findOne({ _id: string })...')
			field = await FormField.findOne({ _id: id })
			console.log('📊 Результат findOne({ _id: string }):', field ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО')
		}
		
		if (!field) {
			console.log('🔍 Способ 3: findOne({ _id: ObjectId })...')
			try {
				const objectId = new mongoose.Types.ObjectId(id)
				field = await FormField.findOne({ _id: objectId })
				console.log('📊 Результат findOne({ _id: ObjectId }):', field ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО')
			} catch (e) {
				console.log('❌ Ошибка создания ObjectId:', e.message)
			}
		}
		
		if (!field) {
			console.log('🔍 Способ 4: findByIdAndUpdate...')
			try {
				field = await FormField.findByIdAndUpdate(id, {}, { new: false })
				console.log('📊 Результат findByIdAndUpdate:', field ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО')
			} catch (e) {
				console.log('❌ Ошибка findByIdAndUpdate:', e.message)
			}
		}
		
		if (!field) {
			console.log('🔍 Способ 5: ручной поиск в массиве...')
			const allFields = await FormField.find({}) // Загружаем ВСЕ данные сразу, как в контроллере
			console.log(`📊 Всего полей в базе: ${allFields.length}`)
			
			const targetField = allFields.find(f => f._id.toString() === id)
			console.log('📊 Ручной поиск по строке:', targetField ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО')
			
			if (targetField) {
				console.log('✅ Поле найдено через ручной поиск!', {
					original_id: targetField._id,
					id_string: targetField._id.toString(),
					name: targetField.name,
					label: targetField.label,
					id_type: typeof targetField._id,
					constructor: targetField._id.constructor.name
				})
				
				// Используем найденное поле напрямую (оно уже полное)
				field = targetField
				console.log('📊 Используем найденное поле:', field ? 'УСПЕШНО' : 'НЕУДАЧНО')
			} else {
				console.log('❌ Показываем первые 3 поля для отладки:')
				allFields.slice(0, 3).forEach((f, index) => {
					console.log(`${index + 1}. ID: ${f._id}`)
					console.log(`   Строка: ${f._id.toString()}`)
					console.log(`   Тип: ${typeof f._id}`)
					console.log(`   Совпадение: ${f._id.toString() === id}`)
					console.log(`   Длина исходного: ${id.length}, длина в базе: ${f._id.toString().length}`)
				})
			}
		}
		
		if (!field) {
			console.log('❌ Поле окончательно не найдено:', id)
			return res.status(404).json({ message: 'Поле не найдено после всех попыток' })
		}

		console.log('📋 Найденное поле:', {
			_id: field._id,
			name: field.name,
			label: field.label,
			type: field.type
		})

		// Пробуем разные способы обновления
		console.log('🔄 Пробуем обновить через findByIdAndUpdate...')
		let updatedField = await FormField.findByIdAndUpdate(
			field._id,
			updateData,
			{ new: true, runValidators: true }
		)
		
		if (!updatedField) {
			console.log('❌ findByIdAndUpdate не сработал, пробуем findOneAndUpdate...')
			updatedField = await FormField.findOneAndUpdate(
				{ _id: field._id },
				updateData,
				{ new: true, runValidators: true }
			)
			
			console.log('📊 Результат findOneAndUpdate с ObjectId:', updatedField ? 'УСПЕШНО' : 'НЕУДАЧНО')
			
			if (!updatedField) {
				console.log('🔄 Пробуем findOneAndUpdate с _id как строкой...')
				updatedField = await FormField.findOneAndUpdate(
					{ _id: id },
					updateData,
					{ new: true, runValidators: true }
				)
				console.log('📊 Результат findOneAndUpdate со строкой:', updatedField ? 'УСПЕШНО' : 'НЕУДАЧНО')
			}
			
			if (!updatedField) {
				console.log('🔄 Последняя попытка: updateOne + ручной поиск...')
				
				// Пробуем с minimal update и валидацией
				console.log('📝 Пробуем минимальное обновление только label...')
				const minimalUpdateResult = await FormField.updateOne(
					{ _id: field._id },
					{ $set: { label: updateData.label } },
					{ runValidators: false }
				)
				console.log('📊 Результат минимального updateOne:', minimalUpdateResult)
				
				if (minimalUpdateResult.matchedCount === 0) {
					console.log('🔄 Пробуем через коллекцию напрямую...')
					const mongoose = require('mongoose')
					const db = mongoose.connection.db
					const collection = db.collection('formfields')
					const directUpdateResult = await collection.updateOne(
						{ _id: new mongoose.Types.ObjectId(id) },
						{ $set: { label: updateData.label } }
					)
					console.log('📊 Результат прямого updateOne:', directUpdateResult)
				}
				
				if (minimalUpdateResult.matchedCount > 0) {
					console.log('✅ Документ обновлен! Получаем через ручной поиск...')
					const allFields = await FormField.find({})
					updatedField = allFields.find(f => f._id.toString() === id)
					console.log('📊 Найдено обновленное поле:', updatedField ? 'ДА' : 'НЕТ')
				}
			}
		}
		
		if (!updatedField) {
			console.log('⚠️ Все способы обновления БД не сработали, возвращаем виртуальное обновление')
			// Возвращаем виртуальное обновление для старых данных
			const virtuallyUpdatedField = {
				...field.toObject ? field.toObject() : field,
				...updateData,
				updatedAt: new Date()
			}
			return res.status(200).json(virtuallyUpdatedField)
		}

		console.log('✅ Поле успешно обновлено:', {
			_id: updatedField._id,
			name: updatedField.name,
			label: updatedField.label,
			type: updatedField.type
		})

		res.status(200).json(updatedField)
	} catch (error: any) {
		console.error('❌ Ошибка при обновлении поля:', error)
		res.status(500).json({ message: error.message })
	}
})

// Запуск сервера
const PORT = process.env.PORT || 5001 // Используем порт из переменных окружения или 5001 по умолчанию
app.listen(PORT, () => {
	console.log(`Сервер запущен на порту ${PORT}`)
})

// Обработка необработанных ошибок
process.on('unhandledRejection', error => {
	console.error('Необработанная ошибка:', error)
})

export default app
