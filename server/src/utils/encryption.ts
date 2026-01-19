import crypto from 'crypto'

/**
 * Утилита для шифрования/дешифрования конфиденциальных данных
 * Использует AES-256-CBC с ключом, полученным из JWT_SECRET
 */

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16 // Для AES это всегда 16 байт

/**
 * Получение ключа шифрования из JWT_SECRET
 * Использует SHA-256 хеш для получения 32-байтового ключа
 */
export function getEncryptionKey(): Buffer {
	const jwtSecret = process.env.JWT_SECRET

	if (!jwtSecret) {
		throw new Error('JWT_SECRET не установлен в переменных окружения')
	}

	// Создаем 32-байтовый ключ из JWT_SECRET
	return crypto.createHash('sha256').update(jwtSecret).digest()
}

/**
 * Шифрование текста с использованием AES-256-CBC
 * @param text - Текст для шифрования
 * @returns Зашифрованная строка в формате: <IV>:<encrypted_data>
 */
export function encrypt(text: string): string {
	if (!text) {
		return ''
	}

	try {
		const key = getEncryptionKey()
		const iv = crypto.randomBytes(IV_LENGTH)
		const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

		let encrypted = cipher.update(text, 'utf8', 'hex')
		encrypted += cipher.final('hex')

		// Формат: <IV>:<encrypted_data>
		return `${iv.toString('hex')}:${encrypted}`
	} catch (error: any) {
		throw new Error(`Ошибка шифрования: ${error.message}`)
	}
}

/**
 * Дешифрование текста, зашифрованного методом encrypt()
 * @param encryptedText - Зашифрованный текст в формате <IV>:<encrypted_data>
 * @returns Расшифрованный текст
 */
export function decrypt(encryptedText: string): string {
	if (!encryptedText) {
		return ''
	}

	try {
		const key = getEncryptionKey()
		const parts = encryptedText.split(':')

		if (parts.length !== 2) {
			throw new Error('Неверный формат зашифрованных данных')
		}

		const iv = Buffer.from(parts[0], 'hex')
		const encrypted = parts[1]

		const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)

		let decrypted = decipher.update(encrypted, 'hex', 'utf8')
		decrypted += decipher.final('utf8')

		return decrypted
	} catch (error: any) {
		throw new Error(`Ошибка дешифрования: ${error.message}`)
	}
}

/**
 * Проверка, является ли строка зашифрованной
 * @param text - Текст для проверки
 * @returns true если текст имеет формат зашифрованных данных
 */
export function isEncrypted(text: string): boolean {
	if (!text) {
		return false
	}

	const parts = text.split(':')
	return parts.length === 2 && /^[0-9a-f]+$/.test(parts[0]) && /^[0-9a-f]+$/.test(parts[1])
}

/**
 * Маскировка конфиденциального текста для отображения в логах и UI
 * @param text - Текст для маскировки
 * @param showChars - Количество символов для отображения в начале/конце (по умолчанию 4)
 * @returns Замаскированный текст
 */
export function maskSensitiveData(text: string, showChars: number = 4): string {
	if (!text || text.length <= showChars * 2) {
		return '***hidden***'
	}

	const start = text.substring(0, showChars)
	const end = text.substring(text.length - showChars)
	return `${start}...${end}`
}
