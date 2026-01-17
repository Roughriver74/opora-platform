import React, { useState } from 'react'
import {
	Box,
	Paper,
	Typography,
	Tabs,
	Tab,
	Stack,
	Chip,
	Alert,
	CircularProgress,
} from '@mui/material'
import InventoryIcon from '@mui/icons-material/Inventory'
import CategoryIcon from '@mui/icons-material/Category'
import SyncIcon from '@mui/icons-material/Sync'
import { NomenclatureTable } from './components/NomenclatureTable'
import { CategoryManager } from './components/CategoryManager'
import { SyncPanel } from './components/SyncPanel'
import { useNomenclatureStats } from './hooks/useNomenclature'

interface TabPanelProps {
	children?: React.ReactNode
	index: number
	value: number
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
	<div role='tabpanel' hidden={value !== index}>
		{value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
	</div>
)

export const Nomenclature: React.FC = () => {
	const [activeTab, setActiveTab] = useState(0)
	const { data: stats, isLoading: statsLoading, error: statsError } = useNomenclatureStats()

	return (
		<Box>
			<Paper
				sx={{
					p: { xs: 2, md: 3 },
					borderRadius: 3,
					border: '1px solid',
					borderColor: 'divider',
				}}
			>
				<Stack
					direction={{ xs: 'column', md: 'row' }}
					justifyContent='space-between'
					alignItems={{ xs: 'flex-start', md: 'center' }}
					spacing={2}
					mb={2}
				>
					<Box>
						<Typography variant='h5' component='h2' gutterBottom>
							<InventoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
							Номенклатура
						</Typography>
						<Typography variant='body2' color='text.secondary'>
							Управление справочником товаров и услуг, синхронизация с Bitrix24
						</Typography>
					</Box>

					{/* Статистика */}
					{statsLoading ? (
						<CircularProgress size={24} />
					) : stats ? (
						<Stack direction='row' spacing={1} flexWrap='wrap'>
							<Chip
								label={`Всего: ${stats.total}`}
								size='small'
								variant='outlined'
							/>
							<Chip
								label={`Активных: ${stats.active}`}
								color='success'
								size='small'
								variant='outlined'
							/>
							<Chip
								label={`Синхронизировано: ${stats.synced}`}
								color='primary'
								size='small'
								variant='outlined'
							/>
							{stats.errors > 0 && (
								<Chip
									label={`Ошибок: ${stats.errors}`}
									color='error'
									size='small'
									variant='filled'
								/>
							)}
						</Stack>
					) : null}
				</Stack>

				{statsError && (
					<Alert severity='error' sx={{ mb: 2 }}>
						Ошибка загрузки статистики: {(statsError as Error).message}
					</Alert>
				)}

				<Tabs
					value={activeTab}
					onChange={(_, newValue) => setActiveTab(newValue)}
					sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
				>
					<Tab
						icon={<InventoryIcon />}
						iconPosition='start'
						label='Номенклатура'
					/>
					<Tab
						icon={<CategoryIcon />}
						iconPosition='start'
						label='Категории'
					/>
					<Tab
						icon={<SyncIcon />}
						iconPosition='start'
						label='Синхронизация'
					/>
				</Tabs>

				{/* Вкладка: Номенклатура */}
				<TabPanel value={activeTab} index={0}>
					<NomenclatureTable />
				</TabPanel>

				{/* Вкладка: Категории */}
				<TabPanel value={activeTab} index={1}>
					<CategoryManager />
				</TabPanel>

				{/* Вкладка: Синхронизация */}
				<TabPanel value={activeTab} index={2}>
					<SyncPanel />
				</TabPanel>
			</Paper>
		</Box>
	)
}

export default Nomenclature
