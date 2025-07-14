import React from 'react'
import { Divider, Typography, Box, IconButton } from '@mui/material'
import { ExpandMore, ExpandLess } from '@mui/icons-material'
import { FormField as FormFieldType } from '../../../../../types'

interface DividerFieldProps {
	field: FormFieldType
	compact?: boolean
	isCollapsible?: boolean
	isExpanded?: boolean
	onToggleExpanded?: () => void
	color?: string
}

export const DividerField: React.FC<DividerFieldProps> = ({
	field,
	compact = false,
	isCollapsible = false,
	isExpanded = true,
	onToggleExpanded,
	color = '#2196f3',
}) => {
	const isAndroid = /Android/i.test(navigator.userAgent)
	const isMobile =
		/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
			navigator.userAgent
		)

	const containerStyles = {
		margin: compact ? '12px 0' : '20px 0',
		padding: isCollapsible ? '8px 0' : '0',
	}

	const headerStyles = isCollapsible
		? {
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				cursor: 'pointer',
				padding: '8px 12px',
				borderRadius: '8px',
				backgroundColor: `${color}08`,
				borderLeft: `4px solid ${color}`,
				transition: isAndroid ? 'none' : 'background-color 0.2s ease',
				minHeight: isMobile ? '48px' : '40px',
				userSelect: 'none',
				WebkitUserSelect: 'none',
				WebkitTapHighlightColor: 'transparent',
				'&:hover': isAndroid
					? {}
					: {
							backgroundColor: `${color}15`,
					  },
		  }
		: {}

	const titleStyles = {
		fontSize: compact ? '0.9rem' : '1rem',
		fontWeight: isCollapsible ? 600 : 500,
		color: isCollapsible ? color : 'textSecondary',
		margin: 0,
	}

	const iconButtonStyles = {
		padding: isMobile ? '8px' : '4px',
		color: color,
		minWidth: isMobile ? '44px' : '32px',
		minHeight: isMobile ? '44px' : '32px',
	}

	const handleClick = () => {
		if (isCollapsible && onToggleExpanded) {
			onToggleExpanded()
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (isCollapsible && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault()
			handleClick()
		}
	}

	if (isCollapsible) {
		return (
			<Box sx={containerStyles}>
				<Box
					sx={headerStyles}
					onClick={handleClick}
					role='button'
					tabIndex={0}
					onKeyDown={handleKeyDown}
					aria-label={isExpanded ? 'Свернуть группу' : 'Развернуть группу'}
				>
					<Typography sx={titleStyles}>
						{field.label || 'Группа полей'}
					</Typography>

					<IconButton
						sx={iconButtonStyles}
						size={compact ? 'small' : 'medium'}
						aria-hidden='true'
					>
						{isExpanded ? <ExpandLess /> : <ExpandMore />}
					</IconButton>
				</Box>

				<Divider sx={{ mt: 1, opacity: 0.3 }} />
			</Box>
		)
	}

	return (
		<Box sx={containerStyles}>
			{field.label && (
				<Typography
					variant={compact ? 'body2' : 'body1'}
					color='textSecondary'
					gutterBottom
					sx={titleStyles}
				>
					{field.label}
				</Typography>
			)}
			<Divider />
		</Box>
	)
}
