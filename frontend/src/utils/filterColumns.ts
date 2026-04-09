import { Column } from "../components/FilterForm";

export const generateColumns = (data: any[]): Column[] => {
    if (!Array.isArray(data) || data.length === 0) return [];

    const columns: Column[] = [];
    const seenDynamicKeys = new Set<string>();

    data.forEach(item => {
        if (item.dynamic_fields && typeof item.dynamic_fields === 'object') {
            Object.keys(item.dynamic_fields).forEach(key => {
                seenDynamicKeys.add(key);
            });
        }
    });

    const dynamicFieldToColumn = {
        city: 'Город',
        country: 'Страна'
    } as any;

    Array.from(seenDynamicKeys).forEach(key => {
        const standardKey = Object.keys(dynamicFieldToColumn).find(k => k === key);
        if (standardKey) {
            const label: string = dynamicFieldToColumn[standardKey];
            const sampleValue = data.find(item =>
                item.dynamic_fields && item.dynamic_fields[key] !== undefined
            )?.dynamic_fields[key];

            columns.push({
                id: `${key}`,
                label,
                operator: 'contains'
            });
        }
    });

    const topLevelKeys = Object.keys(data[0]).filter(key => {
        const value = data[0][key];
        return value !== null && (typeof value !== 'object' || Array.isArray(value));
    });

    const labelMap: Record<string, string> = {
        id: 'ID',
        name: 'Название',
        bitrix_id: 'Bitrix ID',
        inn: 'ИНН',
        sync_status: 'Статус синхронизации',
        last_synced: 'Последняя синхронизация',
        main_manager: 'Основной менеджер',
        last_sale_date: 'Последняя продажа',
        document_amount: 'Сумма продажи',
        last_visit_date: 'Последний визит',
        visits_count: 'Количество визитов',
    };

    topLevelKeys.forEach(key => {
        const label = labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
        columns.push({
            id: key,
            label,
            operator: 'contains'

        });
    });

    return columns;
};


