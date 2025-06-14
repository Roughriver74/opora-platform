---
trigger: always_on
---

# Стандарты кодирования 

## Размер файлов

- ✅ Максимум 200 строк на файл
- ✅ Если компонент больше 150 строк - разбить на части
- ✅ Хуки в отдельные файлы при превышении 50 строк
- ✅ Утилиты в отдельные файлы

## Архитектура компонентов

### Крупные компоненты разбивать на:

1. **Основной файл** (index.tsx) - только JSX и основная логика
2. **Хуки** (hooks/) - вся логика состояния
3. **Подкомпоненты** (components/) - отдельные UI элементы
4. **Типы** (types.ts) - все интерфейсы и типы
5. **Утилиты** (utils/) - чистые функции
6. **Константы** (constants.ts) - статические данные



// FormField/index.tsx - ХОРОШО (50 строк)
import { useFormField } from './hooks/useFormField'
import { TextInput, SelectInput, AutocompleteInput } from './components'

const FormField = ({ field, value, onChange, error, compact }) => {
	const { fieldProps, handlers } = useFormField({ field, value, onChange })

	const renderField = () => {
		switch (field.type) {
			case 'text':
				return <TextInput {...fieldProps} />
			case 'select':
				return <SelectInput {...fieldProps} />
			case 'autocomplete':
				return <AutocompleteInput {...fieldProps} />
			// ... остальные типы
		}
	}

	return <div className='form-field'>{renderField()}</div>
}
```

## Правила именования файлов

- Компоненты: `PascalCase.tsx`
- Хуки: `useCamelCase.ts`
- Утилиты: `camelCase.ts`
- Типы: `types.ts` или `ComponentName.types.ts`
- Константы: `constants.ts`

## Принцип единственной ответственности

Каждый файл должен отвечать только за одну вещь:

- Компонент отвечает только за рендеринг
- Хук отвечает только за логику состояния
- Утилита отвечает только за обработку данных

## Переиспользование

- Выносить общую логику в кастомные хуки
- Создавать переиспользуемые компоненты
- Группировать связанные файлы в папки
