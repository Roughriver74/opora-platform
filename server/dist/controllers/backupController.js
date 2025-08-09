"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBackup = exports.restoreBackup = exports.createBackup = exports.listBackups = void 0;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const PROD_BACKUP_DIR = '/var/www/beton-crm-backups';
const LOCAL_BACKUP_DIR = path_1.default.resolve(process.cwd(), '../backups'); // Локальная папка для бэкапов
// Хелпер для выполнения Node.js скриптов
const executeNodeScript = (scriptPath, args = []) => {
    return new Promise((resolve, reject) => {
        const command = `node ${scriptPath} ${args.join(' ')}`;
        console.log(`Executing command: ${command}`);
        (0, child_process_1.exec)(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing script: ${stderr}`);
                return reject(new Error(`Script execution failed: ${stderr}`));
            }
            resolve(stdout);
        });
    });
};
const listBackups = async (req, res) => {
    try {
        // В зависимости от окружения используем разные папки
        const backupDir = process.env.NODE_ENV === 'production' ? PROD_BACKUP_DIR : LOCAL_BACKUP_DIR;
        if (!fs_1.default.existsSync(backupDir)) {
            res.json([]);
            return;
        }
        const backups = fs_1.default
            .readdirSync(backupDir)
            .filter(name => fs_1.default.statSync(path_1.default.join(backupDir, name)).isDirectory())
            .sort()
            .reverse();
        res.json(backups);
    }
    catch (error) {
        console.error('Error listing backups:', error);
        res.status(500).json({
            message: 'Ошибка получения списка бэкапов',
            error: error.message,
        });
    }
};
exports.listBackups = listBackups;
const createBackup = async (req, res) => {
    try {
        // Используем Node.js скрипт вместо bash
        const scriptPath = path_1.default.resolve(process.cwd(), '../scripts/backup-node.js');
        const environment = process.env.NODE_ENV === 'production' ? 'production' : 'local';
        console.log(`Creating backup with script: ${scriptPath}, environment: ${environment}`);
        // Проверяем существование скрипта
        if (!fs_1.default.existsSync(scriptPath)) {
            throw new Error(`Backup script not found at: ${scriptPath}`);
        }
        const output = await executeNodeScript(scriptPath, [environment]);
        res.status(201).json({ message: 'Бэкап успешно создан.', output });
    }
    catch (error) {
        console.error('Error creating backup:', error);
        res
            .status(500)
            .json({ message: 'Ошибка создания бэкапа', error: error.message });
    }
};
exports.createBackup = createBackup;
const restoreBackup = async (req, res) => {
    const { timestamp } = req.params;
    const backupDir = process.env.NODE_ENV === 'production' ? PROD_BACKUP_DIR : LOCAL_BACKUP_DIR;
    const backupPath = path_1.default.join(backupDir, timestamp);
    if (!timestamp || !fs_1.default.existsSync(backupPath)) {
        res.status(404).json({ message: 'Бэкап не найден.' });
        return;
    }
    try {
        const scriptPath = path_1.default.resolve(process.cwd(), '../scripts/restore-node.js');
        const environment = process.env.NODE_ENV === 'production' ? 'production' : 'local';
        console.log(`Starting restore from backup: ${timestamp}`);
        // Проверяем существование скрипта
        if (!fs_1.default.existsSync(scriptPath)) {
            throw new Error(`Restore script not found at: ${scriptPath}`);
        }
        // ВАЖНО: Восстановление - это критическая операция
        // Отвечаем клиенту сразу, а процесс выполняем в фоне
        res.status(202).json({
            message: `Процесс восстановления из бэкапа '${timestamp}' запущен. Это может занять несколько минут.`,
            warning: 'ВНИМАНИЕ: Это действие перезапишет все текущие данные!',
        });
        // Запускаем восстановление в фоне с автоматическим подтверждением
        const command = `echo "y" | node ${scriptPath} ${environment} ${timestamp}`;
        (0, child_process_1.exec)(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Restore Error: ${stderr}`);
                // В продакшене здесь можно добавить уведомление админу
            }
            else {
                console.log(`Restore Success: ${stdout}`);
                // В продакшене здесь можно добавить уведомление об успехе
            }
        });
    }
    catch (error) {
        console.error('Error restoring backup:', error);
        res.status(500).json({
            message: 'Ошибка восстановления из бэкапа',
            error: error.message,
        });
    }
};
exports.restoreBackup = restoreBackup;
const deleteBackup = async (req, res) => {
    const { timestamp } = req.params;
    const backupDir = process.env.NODE_ENV === 'production' ? PROD_BACKUP_DIR : LOCAL_BACKUP_DIR;
    const backupPath = path_1.default.join(backupDir, timestamp);
    if (!timestamp || !fs_1.default.existsSync(backupPath)) {
        res.status(404).json({ message: 'Бэкап не найден.' });
        return;
    }
    try {
        fs_1.default.rmSync(backupPath, { recursive: true, force: true });
        res.status(200).json({ message: `Бэкап '${timestamp}' успешно удален.` });
    }
    catch (error) {
        console.error('Error deleting backup:', error);
        res
            .status(500)
            .json({ message: 'Ошибка удаления бэкапа', error: error.message });
    }
};
exports.deleteBackup = deleteBackup;
