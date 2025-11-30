import React from 'react'
import {
	Grid,
	Card,
	CardContent,
	Typography,
	Box,
	List,
	ListItem,
	ListItemText,
	ListItemIcon,
	LinearProgress,
	Chip,
	Avatar,
} from '@mui/material'
import {
	Person,
	Business,
	Inventory,
} from '@mui/icons-material'
import { DashboardTopLists as IDashboardTopLists } from '../../types/dashboard'

interface DashboardTopListsProps {
	data: IDashboardTopLists
}

export const DashboardTopLists: React.FC<DashboardTopListsProps> = ({
	data,
}) => {
	const formatNumber = (num: number): string => {
		return new Intl.NumberFormat('ru-RU').format(num)
	}

	const TopListCard: React.FC<{
		title: string
		icon: React.ReactNode
		items: any[]
		color: string
		maxItems?: number
	}> = ({ title, icon, items, color, maxItems = 5 }) => {
		const displayItems = items.slice(0, maxItems)

		return (
			<Card sx={{ height: '100%' }}>
				<CardContent>
					<Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
						<Avatar sx={{ backgroundColor: `${color}20`, color, mr: 2 }}>
							{icon}
						</Avatar>
						<Typography variant='h6'>{title}</Typography>
					</Box>

					{displayItems.length > 0 ? (
						<List dense>
							{displayItems.map((item, index) => (
								<ListItem key={item.id} sx={{ px: 0 }}>
									<ListItemIcon sx={{ minWidth: 40 }}>
										<Chip
											label={index + 1}
											size='small'
											sx={{
												backgroundColor: `${color}20`,
												color,
												fontWeight: 'bold',
												minWidth: 24,
												height: 24,
											}}
										/>
									</ListItemIcon>
									<ListItemText
										primary={
											<Box
												sx={{
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'center',
												}}
											>
												<Typography
													variant='body2'
													sx={{ fontWeight: 'medium' }}
												>
													{item.name}
												</Typography>
												<Box
													sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
												>
													<Typography variant='caption' color='text.secondary'>
														{formatNumber(item.count)}
													</Typography>
													<Typography variant='caption' color='text.secondary'>
														({item.percentage}%)
													</Typography>
												</Box>
											</Box>
										}
										secondary={
											<Box sx={{ mt: 1 }}>
												<LinearProgress
													variant='determinate'
													value={item.percentage}
													sx={{
														height: 4,
														borderRadius: 2,
														backgroundColor: `${color}20`,
														'& .MuiLinearProgress-bar': {
															backgroundColor: color,
														},
													}}
												/>
											</Box>
										}
									/>
								</ListItem>
							))}
						</List>
					) : (
						<Box sx={{ textAlign: 'center', py: 4 }}>
							<Typography color='text.secondary'>Нет данных</Typography>
						</Box>
					)}

					{items.length > maxItems && (
						<Typography
							variant='caption'
							color='text.secondary'
							sx={{ mt: 2, display: 'block' }}
						>
							И еще {items.length - maxItems} элементов...
						</Typography>
					)}
				</CardContent>
			</Card>
		)
	}

	return (
		<Grid container spacing={3}>
			{/* Топ авторов заявок */}
			<Grid size={{ xs: 12, sm: 6, md: 4 }}>
				<TopListCard
					title='Топ авторов заявок'
					icon={<Person />}
					items={data.topManagers}
					color='#1976d2'
				/>
			</Grid>

			{/* Топ клиентов */}
			<Grid size={{ xs: 12, sm: 6, md: 4 }}>
				<TopListCard
					title='Топ клиентов'
					icon={<Business />}
					items={data.topClients}
					color='#2e7d32'
				/>
			</Grid>

			{/* Топ товаров */}
			<Grid size={{ xs: 12, sm: 6, md: 4 }}>
				<TopListCard
					title='Топ товаров'
					icon={<Inventory />}
					items={data.topProducts}
					color='#ed6c02'
				/>
			</Grid>
		</Grid>
	)
}
