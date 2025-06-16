import React, { useState } from 'react'
import {
	Button,
	Menu,
	MenuItem,
	ListItemText,
	ListItemIcon,
	Divider,
	Badge,
	Tooltip,
	Box,
	Typography,
} from '@mui/material'
import {
	ContentCopy as CopyIcon,
	ArrowForward as ArrowIcon,
	Warning as WarningIcon,
	Source as SourceIcon,
} from '@mui/icons-material'
import { CopyPreview } from '../types'

interface CopyButtonProps {
	sourceSection: string
	targetSections: string[]
	onCopyRequest: (fromSection: string, toSection: string) => void
	onPreviewRequest: (
		fromSection: string,
		toSection: string
	) => CopyPreview | null
	disabled?: boolean
	size?: 'small' | 'medium' | 'large'
	variant?: 'contained' | 'outlined' | 'text'
}

export const CopyButton: React.FC<CopyButtonProps> = ({
	sourceSection,
	targetSections,
	onCopyRequest,
	onPreviewRequest,
	disabled = false,
	size = 'medium',
	variant = 'outlined',
}) => {
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
	const open = Boolean(anchorEl)

	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		if (targetSections.length === 1) {
			// Если только одна целевая секция, копируем сразу
			onCopyRequest(sourceSection, targetSections[0])
		} else {
			// Показываем меню выбора
			setAnchorEl(event.currentTarget)
		}
	}

	const handleClose = () => {
		setAnchorEl(null)
	}

	const handleMenuItemClick = (targetSection: string) => {
		onCopyRequest(sourceSection, targetSection)
		handleClose()
	}

	const getPreviewForSection = (targetSection: string): CopyPreview | null => {
		return onPreviewRequest(sourceSection, targetSection)
	}

	// Получаем информацию о доступных источниках для текущей секции
	const getSourceInfo = (): string => {
		if (targetSections.length === 0) return ''

		// Проверяем доступные источники для каждой секции
		const sourcesInfo: string[] = []
		targetSections.forEach(targetSection => {
			const preview = getPreviewForSection(targetSection)
			if (preview && preview.changes.length > 0) {
				const uniqueSources = new Set<string>()
				preview.changes.forEach(change => {
					// Пытаемся определить источник поля (пока просто используем sourceSection)
					uniqueSources.add(sourceSection)
				})
				if (uniqueSources.size > 0) {
					sourcesInfo.push(`из "${sourceSection}"`)
				}
			}
		})

		const uniqueSources = Array.from(new Set(sourcesInfo))
		return uniqueSources.length > 0 ? uniqueSources.join(', ') : ''
	}

	const sourceInfo = getSourceInfo()

	if (targetSections.length === 0) {
		return (
			<Tooltip title='Нет доступных секций для копирования'>
				<span>
					<Button
						disabled
						size={size}
						variant={variant}
						startIcon={<CopyIcon />}
					>
						Копировать поля
					</Button>
				</span>
			</Tooltip>
		)
	}

	const buttonText =
		targetSections.length === 1
			? `Копировать из "${sourceSection}"`
			: `Копировать поля (${targetSections.length})`

	return (
		<>
			<Tooltip
				title={
					sourceInfo
						? `Копирование ${sourceInfo}`
						: 'Копировать поля между разделами'
				}
			>
				<Button
					onClick={handleClick}
					disabled={disabled}
					size={size}
					variant={variant}
					startIcon={<CopyIcon />}
					endIcon={targetSections.length > 1 ? <ArrowIcon /> : undefined}
					sx={{ minWidth: 160 }}
				>
					{size === 'small' ? 'Копировать' : buttonText}
				</Button>
			</Tooltip>

			{targetSections.length > 1 && (
				<Menu
					anchorEl={anchorEl}
					open={open}
					onClose={handleClose}
					anchorOrigin={{
						vertical: 'bottom',
						horizontal: 'left',
					}}
					transformOrigin={{
						vertical: 'top',
						horizontal: 'left',
					}}
					PaperProps={{
						sx: { minWidth: 280 },
					}}
				>
					<MenuItem disabled>
						<ListItemText
							primary='Выберите секцию для копирования'
							primaryTypographyProps={{
								variant: 'caption',
								color: 'text.secondary',
							}}
						/>
					</MenuItem>
					<Divider />

					{targetSections.map(targetSection => {
						const preview = getPreviewForSection(targetSection)
						const hasChanges = preview && preview.changes.length > 0
						const hasWarnings =
							preview && preview.changes.some(change => change.isOverwrite)

						return (
							<MenuItem
								key={targetSection}
								onClick={() => handleMenuItemClick(targetSection)}
								disabled={!hasChanges}
							>
								<ListItemIcon>
									{hasWarnings ? (
										<Tooltip title='Некоторые поля будут перезаписаны'>
											<WarningIcon color='warning' fontSize='small' />
										</Tooltip>
									) : hasChanges ? (
										<SourceIcon color='primary' fontSize='small' />
									) : null}
								</ListItemIcon>
								<ListItemText>
									<Box>
										<Typography variant='body2' fontWeight='medium'>
											{targetSection}
										</Typography>
										<Typography variant='caption' color='text.secondary'>
											{hasChanges
												? `${preview.changes.length} полей из "${sourceSection}"`
												: 'Нет данных для копирования'}
										</Typography>
									</Box>
								</ListItemText>
								{hasChanges && (
									<Badge
										badgeContent={preview.changes.length}
										color={hasWarnings ? 'warning' : 'primary'}
										sx={{ ml: 1 }}
									/>
								)}
							</MenuItem>
						)
					})}
				</Menu>
			)}
		</>
	)
}
