import { Client } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

async function checkTables() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    })
    
    try {
        await client.connect()
        
        // List all tables
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `)
        
        for (const row of tablesResult.rows) {
        }
        
        // Check columns in users table if it exists
        const userTableExists = tablesResult.rows.some(row => row.table_name === 'users')
        if (userTableExists) {
            const columnsResult = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position
            `)
            
            for (const col of columnsResult.rows) {
            }
        }
        
        await client.end()
    } catch (error) {
        console.error('Error:', error)
    }
}

checkTables()