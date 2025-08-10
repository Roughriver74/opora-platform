import { Client } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

async function cleanDatabase() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    })
    
    try {
        await client.connect()
        
        // Удаление таблиц в правильном порядке (с учетом зависимостей)
        await client.query('DROP TABLE IF EXISTS submissions CASCADE')
        await client.query('DROP TABLE IF EXISTS form_fields CASCADE')
        await client.query('DROP TABLE IF EXISTS forms CASCADE')
        await client.query('DROP TABLE IF EXISTS users CASCADE')
        
        
        await client.end()
    } catch (error) {
        console.error('❌ Ошибка:', error)
    }
}

cleanDatabase()