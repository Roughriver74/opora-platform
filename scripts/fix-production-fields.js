const { MongoClient } = require('mongodb');

async function fixProductionFields() {
    const client = new MongoClient('mongodb://localhost:27017');
    
    try {
        await client.connect();
        console.log('Подключение к продакшн базе успешно');
        
        const db = client.db('beton-crm-production');
        
        // Создание резервной копии
        console.log('Создание резервной копии...');
        const backup = {
            timestamp: new Date(),
            fields: await db.collection('formfields').find({}).toArray(),
            forms: await db.collection('forms').find({}).toArray(),
            submissions: await db.collection('submissions').find({}).toArray()
        };
        
        const fs = require('fs');
        const backupFile = `backup-production-fields-${Date.now()}.json`;
        fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
        console.log(`✅ Резервная копия создана: ${backupFile}`);
        
        // Анализ текущего состояния
        const fields = await db.collection('formfields').find({}).sort({ order: 1 }).toArray();
        console.log(`Найдено полей: ${fields.length}`);
        
        if (fields.length === 0) {
            console.log('⚠️  Поля не найдены в базе данных');
            return;
        }
        
        // Показываем текущие проблемы
        const orders = fields.map(f => f.order).sort((a, b) => a - b);
        const duplicateOrders = orders.filter((item, index) => orders.indexOf(item) !== index);
        
        if (duplicateOrders.length > 0) {
            console.log(`⚠️  Найдены дублирующиеся порядковые номера: ${duplicateOrders.join(', ')}`);
        } else {
            console.log('✅ Дубликаты не найдены');
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
        
        console.log('\nТекущая структура разделов:');
        for (const [sectionNum, sectionFields] of Object.entries(sections)) {
            const headerField = sectionFields.find(f => f.type === 'header');
            console.log(`Раздел ${sectionNum}: ${sectionFields.length} полей, заголовок: ${headerField ? headerField.label : 'НЕТ'}`);
        }
        
        let updateCount = 0;
        
        console.log('\nНачинаем пересчет порядка полей...');
        
        // Пересчитываем порядок для каждого раздела
        for (const [sectionNum, sectionFields] of Object.entries(sections)) {
            console.log(`\nОбрабатываем раздел ${sectionNum}:`);
            
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
                    console.log(`  "${field.label}": ${field.order} → ${newOrder} (${field.type})`);
                    updateCount++;
                } else {
                    console.log(`  "${field.label}": ${field.order} (без изменений)`);
                }
            }
        }
        
        console.log(`\n✅ Обновлено полей: ${updateCount}`);
        
        // Финальная проверка
        console.log('\nФинальная проверка...');
        const finalFields = await db.collection('formfields').find({}).sort({ order: 1 }).toArray();
        const finalOrders = finalFields.map(f => f.order).sort((a, b) => a - b);
        const finalDuplicates = finalOrders.filter((item, index) => finalOrders.indexOf(item) !== index);
        
        if (finalDuplicates.length === 0) {
            console.log('✅ Дубликаты полностью устранены!');
        } else {
            console.log(`⚠️  Остались дубликаты: ${finalDuplicates.join(', ')}`);
        }
        
        console.log('🎉 Исправление завершено успешно!');
        console.log('\nРекомендации:');
        console.log('1. Перезапустите сервер: pm2 restart all');
        console.log('2. Проверьте форму в админке');
        console.log('3. Протестируйте создание заявки');
        
    } catch (error) {
        console.error('❌ Ошибка при исправлении:', error);
        console.log('Проверьте:');
        console.log('1. Запущена ли MongoDB');
        console.log('2. Доступна ли база beton-crm-production');
        console.log('3. Есть ли права на запись в базу');
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
        console.log(`Найдено полей: ${fields.length}`);
        
        const orders = fields.map(f => f.order).sort((a, b) => a - b);
        const duplicates = orders.filter((item, index) => orders.indexOf(item) !== index);
        
        console.log('\nАнализ структуры полей:');
        console.log(`Всего полей: ${fields.length}`);
        console.log(`Дубликаты порядка: ${duplicates.length > 0 ? duplicates.join(', ') : 'нет'}`);
        
        const sections = {};
        for (const field of fields) {
            const sectionNum = Math.floor(field.order / 100);
            if (!sections[sectionNum]) {
                sections[sectionNum] = [];
            }
            sections[sectionNum].push(field);
        }
        
        console.log('\nСтруктура разделов:');
        for (const [sectionNum, sectionFields] of Object.entries(sections)) {
            const headerField = sectionFields.find(f => f.type === 'header');
            const regularFields = sectionFields.filter(f => f.type !== 'header');
            console.log(`Раздел ${sectionNum}:`);
            console.log(`  Заголовок: ${headerField ? headerField.label : 'НЕТ ЗАГОЛОВКА'}`);
            console.log(`  Полей: ${regularFields.length}`);
            regularFields.forEach(f => {
                console.log(`    - ${f.label} (order: ${f.order}, type: ${f.type})`);
            });
        }
        
    } catch (error) {
        console.error('Ошибка анализа:', error);
    } finally {
        await client.close();
    }
}

// Главная функция
async function main() {
    const action = process.argv[2];
    
    console.log('=== ИСПРАВЛЕНИЕ ПОЛЕЙ ПРОДАКШН БАЗЫ ===\n');
    
    switch (action) {
        case 'analyze':
            console.log('Режим: Только анализ (без изменений)');
            await analyzeOnly();
            break;
        case 'fix':
            console.log('Режим: Исправление с резервной копией');
            await fixProductionFields();
            break;
        default:
            console.log('Использование:');
            console.log('  node fix-production-fields.js analyze - Анализ без изменений');
            console.log('  node fix-production-fields.js fix     - Исправление с резервной копией');
            console.log('\nПример:');
            console.log('  node fix-production-fields.js analyze');
    }
}

main().catch(console.error); 