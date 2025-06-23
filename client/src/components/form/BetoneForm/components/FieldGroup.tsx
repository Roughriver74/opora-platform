import React from 'react'
import {
	Box,
	Typography,
	Collapse,
	IconButton,
	Divider,
	Paper,
} from '@mui/material'
import { ExpandMore, ExpandLess } from '@mui/icons-material'
import FormField from '../../FormField'
import { FormField as FormFieldType } from '../../../../types'

interface FieldGroupProps {
	id: string
	title: string
	fields: FormFieldType[]
	isExpanded: boolean
	onToggleExpanded: () => void
	values: Record<string, any>
	onFieldChange: (name: string, value: any) => void
	getFieldError: (fieldName: string) => string | undefined
	compact?: boolean
	preloadedOptions?: Record<string, any[]>
	showDivider?: boolean
	color?: string
}

export const FieldGroup: React.FC<FieldGroupProps> = ({
	id,
	title,
	fields,
	isExpanded,
	onToggleExpanded,
	values,
	onFieldChange,
	getFieldError,
	compact = false,
	preloadedOptions,
	showDivider = true,
	color = '#2196f3',
}) => {
	// Определяем устройство для оптимизации
	const isAndroid = /Android/i.test(navigator.userAgent)
	const isMobile =
		/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
			navigator.userAgent
		)

	// Android оптимизированные стили
	const groupStyles = {
		marginBottom: compact ? '12px' : '16px',
		border: `1px solid ${color}20`,
		borderRadius: '8px',
		overflow: 'hidden',
		backgroundColor: '#ffffff',
		boxShadow: isAndroid ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
		// Аппаратное ускорение для Android
		transform: 'translateZ(0)',
		willChange: isAndroid ? 'auto' : 'transform',
	}

	const headerStyles = {
		padding: compact ? '8px 12px' : '12px 16px',
		backgroundColor: `${color}08`,
		borderLeft: `4px solid ${color}`,
		cursor: 'pointer',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		transition: isAndroid ? 'none' : 'background-color 0.2s ease',
		// Увеличенная область нажатия для мобильных
		minHeight: isMobile ? '48px' : '40px',
		'&:hover': isAndroid
			? {}
			: {
					backgroundColor: `${color}15`,
			  },
		// Предотвращение выделения текста
		userSelect: 'none',
		WebkitUserSelect: 'none',
		WebkitTapHighlightColor: 'transparent',
	}

	const titleStyles = {
		fontSize: compact ? '0.9rem' : '1rem',
		fontWeight: 600,
		color: color,
		flex: 1,
		margin: 0,
	}

	const iconButtonStyles = {
		padding: isMobile ? '8px' : '4px',
		color: color,
		// Увеличенная область нажатия для мобильных
		minWidth: isMobile ? '44px' : '32px',
		minHeight: isMobile ? '44px' : '32px',
	}

	const fieldsContainerStyles = {
		padding: compact ? '8px 12px 12px' : '12px 16px 16px',
	}

	const fieldStyles = {
		marginBottom: compact ? '8px' : '12px',
		'&:last-child': {
			marginBottom: 0,
		},
	}

	// Функция для группировки полей - числовые поля компактно
	const renderGroupedFields = () => {
		const groupedElements: React.ReactNode[] = []
		let i = 0

		while (i < fields.length) {
			const currentField = fields[i]

			// Если текущее поле числовое, собираем все подряд идущие числовые поля
			if (currentField.type === 'number') {
				const consecutiveNumberFields: FormFieldType[] = []
				let j = i

				// Собираем все подряд идущие числовые поля
				while (j < fields.length && fields[j].type === 'number') {
					consecutiveNumberFields.push(fields[j])
					j++
				}

				// Группируем числовые поля по 2 в ряд
				for (let k = 0; k < consecutiveNumberFields.length; k += 2) {
					const field1 = consecutiveNumberFields[k]
					const field2 = consecutiveNumberFields[k + 1]

					if (field2) {
						// Пара числовых полей
						groupedElements.push(
							<Box
								key={`number-group-${k}`}
								sx={{
									...fieldStyles,
									display: 'flex',
									gap: 1.5,
									'& > div': {
										flex: '0 1 calc(50% - 6px)',
										minWidth: 0,
									},
								}}
							>
								<Box>
									<FormField
										field={field1}
										value={values[field1.name]}
										onChange={onFieldChange}
										error={getFieldError(field1.name)}
										compact={true}
										preloadedOptions={preloadedOptions?.[field1.name]}
									/>
								</Box>
								<Box>
									<FormField
										field={field2}
										value={values[field2.name]}
										onChange={onFieldChange}
										error={getFieldError(field2.name)}
										compact={true}
										preloadedOptions={preloadedOptions?.[field2.name]}
									/>
								</Box>
							</Box>
						)
					} else {
						// Одиночное числовое поле (нечетное)
						groupedElements.push(
							<Box
								key={field1._id || field1.name}
								sx={{
									...fieldStyles,
									maxWidth: '300px',
								}}
							>
								<FormField
									field={field1}
									value={values[field1.name]}
									onChange={onFieldChange}
									error={getFieldError(field1.name)}
									compact={true}
									preloadedOptions={preloadedOptions?.[field1.name]}
								/>
							</Box>
						)
					}
				}

				// Переходим к следующему не-числовому полю
				i = j
			} else {
				// Обычное не-числовое поле
				groupedElements.push(
					<Box key={currentField._id || currentField.name} sx={fieldStyles}>
						<FormField
							field={currentField}
							value={values[currentField.name]}
							onChange={onFieldChange}
							error={getFieldError(currentField.name)}
							compact={compact}
							preloadedOptions={preloadedOptions?.[currentField.name]}
						/>
					</Box>
				)
				i += 1
			}
		}

		return groupedElements
	}

	return (
		<Paper sx={groupStyles} elevation={0}>
			{/* Заголовок группы */}
			<Box
				sx={headerStyles}
				onClick={onToggleExpanded}
				role='button'
				tabIndex={0}
				onKeyDown={e => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault()
						onToggleExpanded()
					}
				}}
			>
				<Typography sx={titleStyles}>
					{title}
					{fields.length > 0 && (
						<span
							style={{
								fontSize: '0.8em',
								opacity: 0.7,
								marginLeft: '8px',
								fontWeight: 400,
							}}
						>
							({fields.length} {fields.length === 1 ? 'поле' : 'полей'})
						</span>
					)}
				</Typography>

				<IconButton
					sx={iconButtonStyles}
					size={compact ? 'small' : 'medium'}
					aria-label={isExpanded ? 'Свернуть группу' : 'Развернуть группу'}
				>
					{isExpanded ? <ExpandLess /> : <ExpandMore />}
				</IconButton>
			</Box>

			{/* Разделитель */}
			{showDivider && <Divider />}

			{/* Поля группы */}
			<Collapse
				in={isExpanded}
				timeout={isAndroid ? 200 : 300}
				unmountOnExit={false}
			>
				<Box sx={fieldsContainerStyles}>{renderGroupedFields()}</Box>
			</Collapse>
		</Paper>
	)
}
