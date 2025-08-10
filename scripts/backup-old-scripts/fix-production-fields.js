const { MongoClient } = require('mongodb');

async function fixProductionFields() {
    const client = new MongoClient('mongodb://localhost:27017');
    
    try {
        await client.connect();
        
        const db = client.db('beton-crm-production');
        
        // Создание резервной копии
        const backup = {
            timestamp: new Date(),
            fields: await db.collection('formfields').find({}).toArray(),
            forms: await db.collection('forms').find({}).toArray(),
            submissions: await db.collection('submissions').find({}).toArray()
        };
        
        const fs = require('fs');
        const backupFile = `backup-production-fields-${Date.now()}.json`;
        fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
        
        // Анализ текущего состояния
        const fields = await db.collection('formfields').find({}).sort({ order: 1 }).toArray();
        
        if (fields.length === 0) {
            return;
        }
        
        // Показываем текущие проблемы
        const orders = fields.map(f => f.order).sort((a, b) => a - b);
        const duplicateOrders = orders.filter((item, index) => orders.indexOf(item) !== index);
        
        if (duplicateOrders.length > 0) {
        } else {
        }
        
        // Группируем по разделам
        const sections = {};
        for (const field of fields) {
            const sectionNum = Math.floor(field.order / 100);
            if (!sections[sectionNum]) {
                sections[sectionNum] = [];
            }
            sections[sectionNum].push(field);
        }
        
        for (const [sectionNum, sectionFields] of Object.entries(sections)) {
            const headerField = sectionFields.find(f => f.type === 'header');
        }
        
        let updateCount = 0;
        
        
        // Пересчитываем порядок для каждого раздела
        for (const [sectionNum, sectionFields] of Object.entries(sections)) {
            
            const sortedFields = sectionFields.sort((a, b) => {
                // Заголовки (header) должны быть первыми в разделе
                if (a.type === 'header' && b.type !== 'header') return -1;
                if (b.type === 'header' && a.type !== 'header') return 1;
                // Затем сортируем по текущему порядку
                return a.order - b.order;
            });
            
            for (let i = 0; i < sortedFields.length; i++) {
                const field = sortedFields[i];
                const newOrder = parseInt(sectionNum) * 100 + i + 1;
                
                if (field.order !== newOrder) {
                    await db.collection('formfields').updateOne(
                        { _id: field._id },
                        { $set: { order: newOrder } }
                    );
                    updateCount++;
                } else {
                }
            }
        }
        
        
        // Финальная проверка
        const finalFields = await db.collection('formfields').find({}).sort({ order: 1 }).toArray();
        const finalOrders = finalFields.map(f => f.order).sort((a, b) => a - b);
        const finalDuplicates = finalOrders.filter((item, index) => finalOrders.indexOf(item) !== index);
        
        if (finalDuplicates.length === 0) {
        } else {
        }
        
        
    } catch (error) {
    } finally {
        await client.close();
    }
}

// Функция для анализа без изменений
async function analyzeOnly() {
    const client = new MongoClient('mongodb://localhost:27017');
    
    try {
        await client.connect();
        const db = client.db('beton-crm-production');
        
        const fields = await db.collection('formfields').find({}).sort({ order: 1 }).toArray();
        
        const orders = fields.map(f => f.order).sort((a, b) => a - b);
        const duplicates = orders.filter((item, index) => orders.indexOf(item) !== index);
        
        
        const sections = {};
        for (const field of fields) {
            const sectionNum = Math.floor(field.order / 100);
            if (!sections[sectionNum]) {
                sections[sectionNum] = [];
            }
            sections[sectionNum].push(field);
        }
        
        for (const [sectionNum, sectionFields] of Object.entries(sections)) {
            const headerField = sectionFields.find(f => f.type === 'header');
            const regularFields = sectionFields.filter(f => f.type !== 'header');
            regularFields.forEach(f => {
            });
        }
        
    } catch (error) {
    } finally {
        await client.close();
    }
}

// Главная функция
async function main() {
    const action = process.argv[2];
    
    
    switch (action) {
        case 'analyze':
            await analyzeOnly();
            break;
        case 'fix':
            await fixProductionFields();
            break;
        default:
    }
}

