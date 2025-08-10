import { Client } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

async function verifyImport() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    })
    
    try {
        await client.connect()
        
        // Проверка пользователей
        const usersCount = await client.query('SELECT COUNT(*) FROM users')
        
        // Проверка форм
        const formsCount = await client.query('SELECT COUNT(*) FROM forms')
        
        // Проверка полей форм
        const fieldsCount = await client.query('SELECT COUNT(*) FROM form_fields')
        
        // Проверка заявок
        const submissionsCount = await client.query('SELECT COUNT(*) FROM submissions')
        
        // Примеры данных
        
        const sampleUsers = await client.query('SELECT email, first_name, last_name, role FROM users LIMIT 3')
        sampleUsers.rows.forEach(user => {
        })
        
        const sampleForms = await client.query('SELECT name, title FROM forms')
        sampleForms.rows.forEach(form => {
        })
        
        await client.end()
    } catch (error) {
        console.error('❌ Ошибка:', error)
    }
}

verifyImport()