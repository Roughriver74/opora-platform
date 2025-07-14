import React, { useState, useEffect } from 'react'
import {
	Box,
	Paper,
	Typography,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	List,
	ListItem,
	ListItemText,
	Button,
	Chip,
	LinearProgress,
	Alert,
	IconButton,
	Fab,
} from '@mui/material'
import {
	ExpandMore as ExpandMoreIcon,
	Speed as SpeedIcon,
	Memory as MemoryIcon,
	Refresh as RefreshIcon,
	Close as CloseIcon,
} from '@mui/icons-material'
import {
	getPerformanceMetrics,
	clearPerformanceMetrics,
	checkLocalStorageLeaks,
	checkGlobalLeaks,
} from '../../utils/performanceUtils'

interface PerformanceMonitorProps {
	show?: boolean
	onClose?: () => void
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
	show = false,
	onClose,
}) => {
	const [metrics, setMetrics] = useState(getPerformanceMetrics())
	const [memoryInfo, setMemoryInfo] = useState<any>(null)
	const [expanded, setExpanded] = useState<string | false>(false)
	const [refreshKey, setRefreshKey] = useState(0)

	// Обновление метрик
	useEffect(() => {
		if (!show) return

		const interval = setInterval(() => {
			setMetrics(getPerformanceMetrics())

			// Получаем информацию о памяти
			if (window.performance && (window.performance as any).memory) {
				const memory = (window.performance as any).memory
				setMemoryInfo({
					used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
					total: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2),
					limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2),
				})
			}
		}, 1000)

		return () => clearInterval(interval)
	}, [show, refreshKey])

	const handleAccordionChange =
		(panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
			setExpanded(isExpanded ? panel : false)
		}

	const handleRefresh = () => {
		setRefreshKey(prev => prev + 1)
		checkLocalStorageLeaks()
		checkGlobalLeaks()
	}

	const handleClear = () => {
		clearPerformanceMetrics()
		setMetrics([])
	}

	const getMemoryUsageColor = (usage: number): string => {
		if (usage < 50) return 'success'
		if (usage < 100) return 'warning'
		return 'error'
	}

	const getRenderCountColor = (count: number): string => {
		if (count < 10) return 'success'
		if (count < 50) return 'warning'
		return 'error'
	}

	if (!show) {
		return (
			<Fab
				color='primary'
				size='small'
				onClick={() => onClose?.()}
				sx={{
					position: 'fixed',
					bottom: 16,
					right: 16,
					zIndex: 1000,
				}}
			>
				<SpeedIcon />
			</Fab>
		)
	}

	return (
		<Paper
			elevation={8}
			sx={{
				position: 'fixed',
				top: 16,
				right: 16,
				width: 400,
				maxHeight: 'calc(100vh - 32px)',
				overflow: 'auto',
				zIndex: 1000,
				p: 2,
			}}
		>
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					mb: 2,
				}}
			>
				<Typography variant='h6'>
					<SpeedIcon sx={{ mr: 1 }} />
					Performance Monitor
				</Typography>
				<Box>
					<IconButton size='small' onClick={handleRefresh}>
						<RefreshIcon />
					</IconButton>
					<IconButton size='small' onClick={handleClear}>
						<MemoryIcon />
					</IconButton>
					<IconButton size='small' onClick={onClose}>
						<CloseIcon />
					</IconButton>
				</Box>
			</Box>

			{/* Общая информация о памяти */}
			{memoryInfo && (
				<Alert
					severity={
						memoryInfo.used > 100
							? 'error'
							: memoryInfo.used > 50
							? 'warning'
							: 'success'
					}
					sx={{ mb: 2 }}
				>
					<Typography variant='body2'>
						<strong>Память:</strong> {memoryInfo.used}MB / {memoryInfo.limit}MB
					</Typography>
					<LinearProgress
						variant='determinate'
						value={
							(parseFloat(memoryInfo.used) / parseFloat(memoryInfo.limit)) * 100
						}
						sx={{ mt: 1 }}
					/>
				</Alert>
			)}

			{/* Метрики компонентов */}
			<Accordion
				expanded={expanded === 'components'}
				onChange={handleAccordionChange('components')}
			>
				<AccordionSummary expandIcon={<ExpandMoreIcon />}>
					<Typography>Компоненты ({metrics.length})</Typography>
				</AccordionSummary>
				<AccordionDetails>
					<List dense>
						{metrics.map((metric, index) => (
							<ListItem key={index} sx={{ px: 0 }}>
								<ListItemText
									primary={
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
											<Typography variant='body2' noWrap>
												{metric.componentName}
											</Typography>
											<Chip
												label={metric.renderCount}
												size='small'
												color={getRenderCountColor(metric.renderCount) as any}
											/>
										</Box>
									}
									secondary={
										<Box
											sx={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
											}}
										>
											<Typography variant='caption'>
												{metric.memoryUsage.toFixed(2)}MB
											</Typography>
											<Typography variant='caption' color='text.secondary'>
												{new Date(metric.timestamp).toLocaleTimeString()}
											</Typography>
										</Box>
									}
								/>
							</ListItem>
						))}
					</List>
				</AccordionDetails>
			</Accordion>

			{/* Детали производительности */}
			<Accordion
				expanded={expanded === 'details'}
				onChange={handleAccordionChange('details')}
			>
				<AccordionSummary expandIcon={<ExpandMoreIcon />}>
					<Typography>Детали</Typography>
				</AccordionSummary>
				<AccordionDetails>
					<List dense>
						<ListItem sx={{ px: 0 }}>
							<ListItemText
								primary='Всего компонентов'
								secondary={metrics.length}
							/>
						</ListItem>
						<ListItem sx={{ px: 0 }}>
							<ListItemText
								primary='Активных рендеров'
								secondary={
									metrics.filter(m => Date.now() - m.lastRenderTime < 5000)
										.length
								}
							/>
						</ListItem>
						<ListItem sx={{ px: 0 }}>
							<ListItemText
								primary='Средняя память'
								secondary={
									metrics.length > 0
										? (
												metrics.reduce((sum, m) => sum + m.memoryUsage, 0) /
												metrics.length
										  ).toFixed(2) + 'MB'
										: '0MB'
								}
							/>
						</ListItem>
						<ListItem sx={{ px: 0 }}>
							<ListItemText
								primary='LocalStorage'
								secondary={`${(
									JSON.stringify(localStorage).length / 1024
								).toFixed(2)}KB`}
							/>
						</ListItem>
					</List>
				</AccordionDetails>
			</Accordion>

			{/* Предупреждения */}
			<Accordion
				expanded={expanded === 'warnings'}
				onChange={handleAccordionChange('warnings')}
			>
				<AccordionSummary expandIcon={<ExpandMoreIcon />}>
					<Typography>Предупреждения</Typography>
				</AccordionSummary>
				<AccordionDetails>
					<List dense>
						{metrics
							.filter(m => m.renderCount > 20 || m.memoryUsage > 50)
							.map((metric, index) => (
								<ListItem key={index} sx={{ px: 0 }}>
									<ListItemText
										primary={
											<Alert severity='warning' sx={{ py: 0 }}>
												<Typography variant='body2'>
													{metric.componentName}
													{metric.renderCount > 20 &&
														` - много рендеров (${metric.renderCount})`}
													{metric.memoryUsage > 50 &&
														` - много памяти (${metric.memoryUsage.toFixed(
															2
														)}MB)`}
												</Typography>
											</Alert>
										}
									/>
								</ListItem>
							))}
						{metrics.filter(m => m.renderCount > 20 || m.memoryUsage > 50)
							.length === 0 && (
							<ListItem sx={{ px: 0 }}>
								<ListItemText
									primary={
										<Alert severity='success' sx={{ py: 0 }}>
											<Typography variant='body2'>
												Нет предупреждений
											</Typography>
										</Alert>
									}
								/>
							</ListItem>
						)}
					</List>
				</AccordionDetails>
			</Accordion>

			{/* Действия */}
			<Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
				<Button
					size='small'
					onClick={handleRefresh}
					startIcon={<RefreshIcon />}
				>
					Обновить
				</Button>
				<Button size='small' onClick={handleClear} startIcon={<MemoryIcon />}>
					Очистить
				</Button>
			</Box>
		</Paper>
	)
}

export default PerformanceMonitor
