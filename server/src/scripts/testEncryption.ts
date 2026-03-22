import dotenv from 'dotenv'
import { encrypt, decrypt, isEncrypted, maskSensitiveData } from '../utils/encryption'

// Загружаем переменные окружения
dotenv.config()

/**
 * Тестовый скрипт для проверки утилиты шифрования
 * Запуск: npx ts-node src/scripts/testEncryption.ts
 */
async function testEncryption() {
	console.log('='.repeat(60))
	console.log('ТЕСТИРОВАНИЕ УТИЛИТЫ ШИФРОВАНИЯ')
	console.log('='.repeat(60))

	// Тестовые данные
	const webhookUrl = process.env.BITRIX24_WEBHOOK_URL || '';
	const testCases = [
		{
			name: 'Webhook URL',
			plainText: webhookUrl,
		},
		{
			name: 'API ключ',
			plainText: 'sk_test_51NZxxxxxxxxxxxxxxxxxxxxxxxxxxx',
		},
		{
			name: 'Простая строка',
			plainText: 'Hello, World!',
		},
		{
			name: 'Юникод текст',
			plainText: 'Привет, мир! 🚀',
		},
		{
			name: 'Пустая строка',
			plainText: '',
		},
	]

	console.log('\nПроверка JWT_SECRET:')
	if (!process.env.JWT_SECRET) {
		console.error('❌ JWT_SECRET не установлен!')
		console.log('Установите JWT_SECRET в .env файле и повторите тест')
		process.exit(1)
	}
	console.log(`✅ JWT_SECRET установлен (длина: ${process.env.JWT_SECRET.length} символов)`)

	console.log('\n' + '-'.repeat(60))
	console.log('ТЕСТЫ ШИФРОВАНИЯ/ДЕШИФРОВАНИЯ')
	console.log('-'.repeat(60))

	let passedTests = 0
	let failedTests = 0

	for (const testCase of testCases) {
		console.log(`\nТест: ${testCase.name}`)
		console.log(`Исходный текст: "${testCase.plainText}"`)

		try {
			// Шифрование
			const encrypted = encrypt(testCase.plainText)
			console.log(`Зашифрованный: ${encrypted}`)

			// Проверка формата
			if (testCase.plainText && !isEncrypted(encrypted)) {
				throw new Error('Зашифрованный текст не соответствует формату <IV>:<data>')
			}

			// Дешифрование
			const decrypted = decrypt(encrypted)
			console.log(`Расшифрованный: "${decrypted}"`)

			// Проверка соответствия
			if (decrypted !== testCase.plainText) {
				throw new Error(`Несоответствие! Ожидалось: "${testCase.plainText}", получено: "${decrypted}"`)
			}

			// Маскировка
			const masked = maskSensitiveData(testCase.plainText)
			console.log(`Замаскированный: ${masked}`)

			console.log('✅ Тест пройден')
			passedTests++
		} catch (error: any) {
			console.error(`❌ Тест провален: ${error.message}`)
			failedTests++
		}
	}

	console.log('\n' + '-'.repeat(60))
	console.log('ТЕСТЫ ОШИБОК')
	console.log('-'.repeat(60))

	// Тест: неверный формат
	console.log('\nТест: Дешифрование неверного формата')
	try {
		decrypt('invalid_format_data')
		console.error('❌ Тест провален: должна была быть ошибка')
		failedTests++
	} catch (error: any) {
		console.log(`✅ Ожидаемая ошибка: ${error.message}`)
		passedTests++
	}

	// Тест: изменённые данные
	console.log('\nТест: Дешифрование изменённых данных')
	try {
		const encrypted = encrypt('test')
		const parts = encrypted.split(':')
		const corrupted = parts[0] + ':' + 'ffffffff' // Испортим данные
		decrypt(corrupted)
		console.error('❌ Тест провален: должна была быть ошибка')
		failedTests++
	} catch (error: any) {
		console.log(`✅ Ожидаемая ошибка: ${error.message}`)
		passedTests++
	}

	console.log('\n' + '='.repeat(60))
	console.log('РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ')
	console.log('='.repeat(60))
	console.log(`Пройдено тестов: ${passedTests}`)
	console.log(`Провалено тестов: ${failedTests}`)
	console.log(`Всего тестов: ${passedTests + failedTests}`)

	if (failedTests === 0) {
		console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!')
		process.exit(0)
	} else {
		console.log('\n❌ НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ')
		process.exit(1)
	}
}

// Запуск тестов
testEncryption().catch((error) => {
	console.error('Критическая ошибка при выполнении тестов:', error)
	process.exit(1)
})
