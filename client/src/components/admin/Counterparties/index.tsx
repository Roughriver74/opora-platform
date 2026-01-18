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
import BusinessIcon from '@mui/icons-material/Business'
import PersonIcon from '@mui/icons-material/Person'
import { CompaniesTable } from './components/CompaniesTable'
import { ContactsTable } from './components/ContactsTable'
import { useCompanyStats } from './hooks/useCompanies'
import { useContactStats } from './hooks/useContacts'

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

export const Counterparties: React.FC = () => {
	const [activeTab, setActiveTab] = useState(0)
	const { data: companyStats, isLoading: companyStatsLoading, error: companyStatsError } = useCompanyStats()
	const { data: contactStats, isLoading: contactStatsLoading, error: contactStatsError } = useContactStats()

	const statsLoading = companyStatsLoading || contactStatsLoading
	const statsError = companyStatsError || contactStatsError

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
							<BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
							Контрагенты
						</Typography>
						<Typography variant='body2' color='text.secondary'>
							Управление компаниями и контактами
						</Typography>
					</Box>

					{/* Статистика */}
					{statsLoading ? (
						<CircularProgress size={24} />
					) : (
						<Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
							{companyStats && (
								<>
									<Chip
										icon={<BusinessIcon />}
										label={`Компаний: ${companyStats.total}`}
										size='small'
										variant='outlined'
									/>
									<Chip
										label={`Активных: ${companyStats.active}`}
										color='success'
										size='small'
										variant='outlined'
									/>
								</>
							)}
							{contactStats && (
								<>
									<Chip
										icon={<PersonIcon />}
										label={`Контактов: ${contactStats.total}`}
										size='small'
										variant='outlined'
									/>
								</>
							)}
							{(companyStats?.errors || 0) + (contactStats?.errors || 0) > 0 && (
								<Chip
									label={`Ошибок: ${(companyStats?.errors || 0) + (contactStats?.errors || 0)}`}
									color='error'
									size='small'
									variant='filled'
								/>
							)}
						</Stack>
					)}
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
						icon={<BusinessIcon />}
						iconPosition='start'
						label='Компании'
					/>
					<Tab
						icon={<PersonIcon />}
						iconPosition='start'
						label='Контакты'
					/>
				</Tabs>

				{/* Вкладка: Компании */}
				<TabPanel value={activeTab} index={0}>
					<CompaniesTable />
				</TabPanel>

				{/* Вкладка: Контакты */}
				<TabPanel value={activeTab} index={1}>
					<ContactsTable />
				</TabPanel>
			</Paper>
		</Box>
	)
}

export default Counterparties
