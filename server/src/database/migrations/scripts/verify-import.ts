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
        console.log('🔍 Проверка импортированных данных...\n')
        
        // Проверка пользователей
        const usersCount = await client.query('SELECT COUNT(*) FROM users')
        console.log(`✅ Пользователи: ${usersCount.rows[0].count}`)
        
        // Проверка форм
        const formsCount = await client.query('SELECT COUNT(*) FROM forms')
        console.log(`✅ Формы: ${formsCount.rows[0].count}`)
        
        // Проверка полей форм
        const fieldsCount = await client.query('SELECT COUNT(*) FROM form_fields')
        console.log(`✅ Поля форм: ${fieldsCount.rows[0].count}`)
        
        // Проверка заявок
        const submissionsCount = await client.query('SELECT COUNT(*) FROM submissions')
        console.log(`✅ Заявки: ${submissionsCount.rows[0].count}`)
        
        // Примеры данных
        console.log('\n📋 Примеры данных:')
        
        const sampleUsers = await client.query('SELECT email, first_name, last_name, role FROM users LIMIT 3')
        console.log('\nПользователи:')
        sampleUsers.rows.forEach(user => {
            console.log(`  - ${user.email} (${user.first_name} ${user.last_name}) - ${user.role}`)
        })
        
        const sampleForms = await client.query('SELECT name, title FROM forms')
        console.log('\nФормы:')
        sampleForms.rows.forEach(form => {
            console.log(`  - ${form.name}: ${form.title}`)
        })
        
        await client.end()
    } catch (error) {
        console.error('❌ Ошибка:', error)
    }
}

verifyImport()