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
				<Box sx={fieldsContainerStyles}>
					{fields.map(field => (
						<Box key={field._id || field.name} sx={fieldStyles}>
							<FormField
								field={field}
								value={values[field.name]}
								onChange={onFieldChange}
								error={getFieldError(field.name)}
								compact={compact}
								preloadedOptions={preloadedOptions?.[field.name]}
							/>
						</Box>
					))}
				</Box>
			</Collapse>
		</Paper>
	)
}
