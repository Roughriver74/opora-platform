import { Request, Response } from 'express'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'

const PROD_BACKUP_DIR = '/var/www/opora-backups'
const LOCAL_BACKUP_DIR = path.resolve(process.cwd(), '../backups') // Локальная папка для бэкапов

// Хелпер для выполнения Node.js скриптов
const executeNodeScript = (
	scriptPath: string,
	args: string[] = []
): Promise<string> => {
	return new Promise((resolve, reject) => {
		const command = `node ${scriptPath} ${args.join(' ')}`
		exec(command, (error, stdout, stderr) => {
			if (error) {
				console.error(`Error executing script: ${stderr}`)
				return reject(new Error(`Script execution failed: ${stderr}`))
			}
			resolve(stdout)
		})
	})
}

export const listBackups = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		// В зависимости от окружения используем разные папки
		const backupDir =
			process.env.NODE_ENV === 'production' ? PROD_BACKUP_DIR : LOCAL_BACKUP_DIR

		if (!fs.existsSync(backupDir)) {
			res.json([])
			return
		}
		const backups = fs
			.readdirSync(backupDir)
			.filter(name => fs.statSync(path.join(backupDir, name)).isDirectory())
			.sort()
			.reverse()
		res.json(backups)
	} catch (error: any) {
		console.error('Error listing backups:', error)
		res.status(500).json({
			message: 'Ошибка получения списка бэкапов',
			error: error.message,
		})
	}
}

export const createBackup = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		// Используем Node.js скрипт вместо bash
		const scriptPath = path.resolve(process.cwd(), '../scripts/backup-node.js')
		const environment =
			process.env.NODE_ENV === 'production' ? 'production' : 'local'

		console.log(
			`Creating backup with script: ${scriptPath}, environment: ${environment}`
		)

		// Проверяем существование скрипта
		if (!fs.existsSync(scriptPath)) {
			throw new Error(`Backup script not found at: ${scriptPath}`)
		}

		const output = await executeNodeScript(scriptPath, [environment])
		res.status(201).json({ message: 'Бэкап успешно создан.', output })
	} catch (error: any) {
		console.error('Error creating backup:', error)
		res
			.status(500)
			.json({ message: 'Ошибка создания бэкапа', error: error.message })
	}
}

export const restoreBackup = async (
	req: Request,
	res: Response
): Promise<void> => {
	const { timestamp } = req.params
	const backupDir =
		process.env.NODE_ENV === 'production' ? PROD_BACKUP_DIR : LOCAL_BACKUP_DIR
	const backupPath = path.join(backupDir, timestamp)

	if (!timestamp || !fs.existsSync(backupPath)) {
		res.status(404).json({ message: 'Бэкап не найден.' })
		return
	}

	try {
		const scriptPath = path.resolve(process.cwd(), '../scripts/restore-node.js')
		const environment =
			process.env.NODE_ENV === 'production' ? 'production' : 'local'


		// Проверяем существование скрипта
		if (!fs.existsSync(scriptPath)) {
			throw new Error(`Restore script not found at: ${scriptPath}`)
		}

		// ВАЖНО: Восстановление - это критическая операция
		// Отвечаем клиенту сразу, а процесс выполняем в фоне
		res.status(202).json({
			message: `Процесс восстановления из бэкапа '${timestamp}' запущен. Это может занять несколько минут.`,
			warning: 'ВНИМАНИЕ: Это действие перезапишет все текущие данные!',
		})

		// Запускаем восстановление в фоне с автоматическим подтверждением
		const command = `echo "y" | node ${scriptPath} ${environment} ${timestamp}`
		exec(command, (error, stdout, stderr) => {
			if (error) {
				console.error(`Restore Error: ${stderr}`)
				// В продакшене здесь можно добавить уведомление админу
			} else {
				// В продакшене здесь можно добавить уведомление об успехе
			}
		})
	} catch (error: any) {
		console.error('Error restoring backup:', error)
		res.status(500).json({
			message: 'Ошибка восстановления из бэкапа',
			error: error.message,
		})
	}
}

export const deleteBackup = async (
	req: Request,
	res: Response
): Promise<void> => {
	const { timestamp } = req.params
	const backupDir =
		process.env.NODE_ENV === 'production' ? PROD_BACKUP_DIR : LOCAL_BACKUP_DIR
	const backupPath = path.join(backupDir, timestamp)

	if (!timestamp || !fs.existsSync(backupPath)) {
		res.status(404).json({ message: 'Бэкап не найден.' })
		return
	}

	try {
		fs.rmSync(backupPath, { recursive: true, force: true })
		res.status(200).json({ message: `Бэкап '${timestamp}' успешно удален.` })
	} catch (error: any) {
		console.error('Error deleting backup:', error)
		res
			.status(500)
			.json({ message: 'Ошибка удаления бэкапа', error: error.message })
	}
}
