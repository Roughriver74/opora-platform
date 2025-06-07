/**
 * Скрипт мониторинга для Beton CRM
 * Проверяет доступность API и отправляет уведомления при проблемах
 */

const axios = require('axios');
const nodemailer = require('nodemailer');
const fs = require('fs');
require('dotenv').config();

// Конфигурация
const config = {
  // URL для проверки API
  apiUrl: process.env.API_URL || 'http://localhost:5000/api',
  
  // Интервал проверки (в миллисекундах), по умолчанию 5 минут
  checkInterval: process.env.CHECK_INTERVAL || 5 * 60 * 1000,
  
  // Email для отправки уведомлений
  alertEmail: process.env.ALERT_EMAIL,
  
  // SMTP конфигурация для отправки email
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  
  // Путь к логам
  logPath: process.env.LOG_PATH || './monitor.log',
  
  // Максимальное количество последовательных ошибок перед отправкой оповещения
  maxErrors: process.env.MAX_ERRORS || 3
};

// Счетчик последовательных ошибок
let errorCount = 0;
let lastAlertTime = 0;

// Транспорт для отправки email
let transporter = null;
if (config.alertEmail && config.smtp.host && config.smtp.auth.user && config.smtp.auth.pass) {
  transporter = nodemailer.createTransport(config.smtp);
}

/**
 * Запись в лог файл
 */
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${isError ? 'ERROR' : 'INFO'}: ${message}\n`;
  
  console.log(logMessage);
  
  // Запись в файл
  fs.appendFile(config.logPath, logMessage, (err) => {
    if (err) console.error('Ошибка записи в лог:', err);
  });
}

/**
 * Отправка уведомления о проблеме
 */
async function sendAlert(message) {
  if (!transporter || !config.alertEmail) return;
  
  // Проверяем, прошло ли достаточно времени с последнего оповещения (не чаще 1 раза в час)
  const now = Date.now();
  if (now - lastAlertTime < 60 * 60 * 1000) return;
  
  lastAlertTime = now;
  
  try {
    await transporter.sendMail({
      from: config.smtp.auth.user,
      to: config.alertEmail,
      subject: 'Beton CRM - Alert: Server Issue',
      text: message,
      html: `<p><strong>Beton CRM Monitor Alert</strong></p><p>${message}</p>`
    });
    log('Уведомление отправлено');
  } catch (error) {
    log(`Ошибка отправки уведомления: ${error.message}`, true);
  }
}

/**
 * Проверка доступности API
 */
async function checkApiStatus() {
  try {
    const startTime = Date.now();
    const response = await axios.get(config.apiUrl, { timeout: 10000 });
    const responseTime = Date.now() - startTime;
    
    if (response.status === 200) {
      log(`API доступен. Время ответа: ${responseTime}ms`);
      
      // Сбрасываем счетчик ошибок
      if (errorCount > 0) {
        log(`Восстановлено после ${errorCount} ошибок`);
        
        // Отправляем уведомление о восстановлении, если были ошибки
        if (errorCount >= config.maxErrors) {
          await sendAlert('Server recovered and API is now available');
        }
        
        errorCount = 0;
      }
    } else {
      handleApiError(`Неожиданный статус ответа: ${response.status}`);
    }
  } catch (error) {
    handleApiError(`Ошибка соединения: ${error.message}`);
  }
}

/**
 * Обработка ошибки API
 */
async function handleApiError(errorMessage) {
  errorCount++;
  log(`${errorMessage} (Ошибка ${errorCount} из ${config.maxErrors})`, true);
  
  // Отправляем уведомление после достижения порога ошибок
  if (errorCount === config.maxErrors) {
    await sendAlert(`API is not available. Error: ${errorMessage}`);
  }
}

// Запуск мониторинга
log('Мониторинг запущен');
checkApiStatus();
setInterval(checkApiStatus, config.checkInterval);

// Обработка завершения работы
process.on('SIGINT', () => {
  log('Мониторинг остановлен');
  process.exit();
});
