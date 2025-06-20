# 📋 Field Groups - Группировка полей по разделителям

Система умной группировки полей формы с использованием разделителей (`divider` fields) для создания сворачиваемых секций.

## 🎯 Назначение

Разделители позволяют:

- **Структурировать большие формы** - логично группировать связанные поля
- **Улучшить UX** - пользователи могут сворачивать неактуальные секции
- **Повысить производительность** - меньше полей рендерится одновременно
- **Упростить навигацию** - быстрый переход к нужным разделам

## 🛠️ Техническая реализация

### 1. Компонент FieldGroup

**Файл**: `client/src/components/form/BetoneForm/components/FieldGroup.tsx`

```typescript
interface FieldGroupProps {
	id: string
	title: string
	fields: FormFieldType[]
	isExpanded: boolean
	onToggleExpanded: () => void
	// ... остальные пропсы
}

export const FieldGroup: React.FC<FieldGroupProps> = ({
	id,
	title,
	fields,
	isExpanded,
	onToggleExpanded,
	// ...
}) => {
	// Android-оптимизированный рендеринг
	// Сворачиваемый контент с анимацией
	// Увеличенные области нажатия для мобильных
}
```

**Особенности**:

- 🎨 **Визуальная индикация** - цветная левая граница и заголовок
- 📱 **Mobile-friendly** - увеличенные области нажатия (48px)
- ⚡ **Android оптимизация** - сокращенные анимации, упрощенные стили
- ♿ **Accessibility** - поддержка клавиатурной навигации

### 2. Хук управления группами

**Файл**: `client/src/components/form/BetoneForm/hooks/useFieldGroups.ts`

```typescript
export const useFieldGroups = (fields: FormFieldType[]) => {
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

	const fieldGroups = useMemo(() => {
		return groupFieldsByDividers(fields)
	}, [fields])

	return {
		fieldGroups,
		hasDividers,
		isGroupExpanded,
		toggleGroup,
		expandAllGroups,
		collapseAllGroups,
		groupsStats,
	}
}
```

**Возможности**:

- 📊 **Статистика групп** - количество развернутых/свернутых групп
- 🔄 **Массовые операции** - свернуть/развернуть все группы
- 🧠 **Умная автоматика** - автораскрытие групп без разделителей
- 💾 **Состояние** - сохранение состояния групп

### 3. Функция группировки

**Файл**: `client/src/components/form/BetoneForm/utils/sectionHelpers.ts`

```typescript
export const groupFieldsByDividers = (
	fields: FormFieldType[]
): FormSection[] => {
	const sections: FormSection[] = []
	let currentFields: FormFieldType[] = []
	let currentDivider: FormFieldType | null = null

	for (const field of sortedFields) {
		if (field.type === 'divider') {
			// Сохраняем предыдущую группу
			if (currentFields.length > 0) {
				sections.push(createSection(currentFields, currentDivider))
			}
			// Начинаем новую группу
			currentFields = []
			currentDivider = field
		} else {
			currentFields.push(field)
		}
	}

	return sections
}
```

**Алгоритм**:

1. Проходим по всем полям формы по порядку
2. При встрече `divider` поля - завершаем текущую группу
3. Создаем новую группу с заголовком из label разделителя
4. Добавляем последующие поля в новую группу
5. Повторяем до конца списка полей

## 🎨 Визуальное оформление

### Стили группы:

- **Заголовок**: цветной фон с левой границей
- **Иконка**: стрелка вверх/вниз для индикации состояния
- **Контент**: плавная анимация сворачивания/разворачивания
- **Счетчик**: показывает количество полей в группе

### Цветовая схема:

```typescript
const getGroupColor = (groupName: string): string => {
	const colors = [
		'#2196f3', // blue - основная информация
		'#4caf50', // green - технические параметры
		'#ff9800', // orange - контактные данные
		'#9c27b0', // purple - дополнительные поля
		// ...
	]
	return colors[hash(groupName) % colors.length]
}
```

## 📱 Mobile & Android оптимизации

### Увеличенные области нажатия:

```typescript
const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
const touchAreaSize = isMobile ? '48px' : '32px'
```

### Упрощенные анимации для Android:

```typescript
const isAndroid = /Android/i.test(navigator.userAgent)
const animationTimeout = isAndroid ? 200 : 300

// Отключение hover эффектов на Android
const hoverStyles = isAndroid
	? {}
	: {
			'&:hover': { backgroundColor: `${color}15` },
	  }
```

### Предотвращение нежелательных эффектов:

```typescript
const preventStyles = {
	userSelect: 'none',
	WebkitUserSelect: 'none',
	WebkitTapHighlightColor: 'transparent',
}
```

## 🚀 Использование в проекте

### 1. В основной форме:

```typescript
import { useFieldGroups } from './hooks/useFieldGroups'
import { FieldGroup } from './components/FieldGroup'

const BetoneForm = ({ fields }) => {
	const {
		fieldGroups,
		hasDividers,
		isGroupExpanded,
		toggleGroup,
		expandAllGroups,
		collapseAllGroups,
	} = useFieldGroups(fields)

	if (hasDividers) {
		return (
			<div>
				{/* Кнопки массового управления */}
				<Box sx={{ mb: 2 }}>
					<Button onClick={expandAllGroups}>Развернуть все</Button>
					<Button onClick={collapseAllGroups}>Свернуть все</Button>
				</Box>

				{/* Группы полей */}
				{fieldGroups.map(group => (
					<FieldGroup
						key={group.id}
						id={group.id}
						title={group.title}
						fields={group.fields}
						isExpanded={isGroupExpanded(group.id)}
						onToggleExpanded={() => toggleGroup(group.id)}
						values={values}
						onFieldChange={onFieldChange}
						getFieldError={getFieldError}
					/>
				))}
			</div>
		)
	}

	// Обычный рендеринг без группировки
	return <StandardFormRender fields={fields} />
}
```

### 2. В админке (создание разделителей):

```typescript
const addNewDivider = () => {
	const newDivider = {
		name: `divider_${Date.now()}`,
		label: 'Новая группа полей',
		type: 'divider',
		order: getNextOrder(),
		required: false,
	}

	onFieldAdd(newDivider)
}
```

## 📊 Преимущества системы

### Для пользователей:

✅ **Лучшая навигация** - быстрый доступ к нужным разделам  
✅ **Уменьшение визуального шума** - фокус на важных полях  
✅ **Персонализация** - каждый может настроить видимые секции  
✅ **Мобильный UX** - оптимизировано для касаний

### Для производительности:

✅ **Меньше DOM элементов** - свернутые группы не рендерят поля  
✅ **Уменьшение re-renders** - изолированные группы полей  
✅ **Лучшая память** - виртуализация контента в группах  
✅ **Android оптимизация** - упрощенные стили и анимации

### Для разработчиков:

✅ **Простое API** - один хук для всей функциональности  
✅ **Автоматическая группировка** - на основе существующих divider полей  
✅ **Гибкость** - легко расширить новыми типами группировки  
✅ **Обратная совместимость** - работает с существующими формами

## 🔧 Настройки по умолчанию

```typescript
const defaultSettings = {
	// Все группы свернуты по умолчанию для экономии ресурсов
	defaultCollapsed: true,

	// Автораскрытие групп без разделителей
	autoExpandUngrouped: true,

	// Показывать кнопки массового управления при наличии > 2 групп
	showMassControls: fieldGroups.length > 2,

	// Цветная индикация групп
	colorizeGroups: true,

	// Счетчики полей в заголовках
	showFieldCounts: true,
}
```

## 🎯 Планы развития

🔄 **Виртуализация** - для форм с сотнями полей  
🎨 **Темы оформления** - настраиваемые цветовые схемы  
💾 **Персистентность** - сохранение состояния в localStorage  
🔍 **Поиск по группам** - быстрый поиск и фильтрация  
📱 **Жесты** - swipe для управления группами на мобильных

Система группировки значительно улучшает UX больших форм и готова к продакшену!
