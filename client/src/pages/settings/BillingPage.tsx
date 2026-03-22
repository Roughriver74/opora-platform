import React, { useState, useEffect } from 'react'
import {
	Box,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Container,
	LinearProgress,
	Typography,
	Button,
} from '@mui/material'

interface UsageStat {
	current: number
	limit: number
}

interface UsageData {
	plan: 'free' | 'pro'
	users: UsageStat
	submissions: UsageStat
	visits: UsageStat
}

// Temporary mock — replace with real API endpoint when available
const getUsageData = async (): Promise<UsageData> => {
	return {
		plan: 'free',
		users: { current: 1, limit: 2 },
		submissions: { current: 0, limit: 100 },
		visits: { current: 0, limit: 100 },
	}
}

interface StatCardProps {
	label: string
	stat: UsageStat
}

const StatCard: React.FC<StatCardProps> = ({ label, stat }) => {
	const { current, limit } = stat
	const percent = limit > 0 ? Math.min((current / limit) * 100, 100) : 0
	const isWarning = percent >= 80 && percent < 100
	const isError = percent >= 100

	let progressColor: 'primary' | 'warning' | 'error' = 'primary'
	if (isWarning) progressColor = 'warning'
	if (isError) progressColor = 'error'

	return (
		<Card variant='outlined' sx={{ flex: 1, minWidth: 200 }}>
			<CardContent>
				<Typography variant='subtitle2' color='text.secondary' gutterBottom>
					{label}
				</Typography>
				<Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 1 }}>
					<Typography variant='h5' fontWeight='bold'>
						{current}
					</Typography>
					<Typography variant='body2' color='text.secondary'>
						/ {limit}
					</Typography>
				</Box>
				<LinearProgress
					variant='determinate'
					value={percent}
					color={progressColor}
					sx={{ height: 6, borderRadius: 3, mb: 0.5 }}
				/>
				{isError && (
					<Typography variant='caption' color='error.main'>
						Лимит исчерпан
					</Typography>
				)}
				{isWarning && (
					<Typography variant='caption' color='warning.main'>
						Лимит почти исчерпан
					</Typography>
				)}
				{!isError && !isWarning && (
					<Typography variant='caption' color='text.disabled'>
						{percent.toFixed(0)}% использовано
					</Typography>
				)}
			</CardContent>
		</Card>
	)
}

const BillingPage: React.FC = () => {
	const [usageData, setUsageData] = useState<UsageData | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		getUsageData()
			.then(setUsageData)
			.finally(() => setLoading(false))
	}, [])

	if (loading) {
		return (
			<Box display='flex' justifyContent='center' alignItems='center' minHeight='40vh'>
				<CircularProgress />
			</Box>
		)
	}

	if (!usageData) return null

	const isPro = usageData.plan === 'pro'

	return (
		<Container maxWidth='md' sx={{ mt: 4, mb: 4 }}>
			<Typography variant='h4' component='h1' gutterBottom>
				Тарификация и лимиты
			</Typography>

			{/* Plan badge */}
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
				<Typography variant='body1' color='text.secondary'>
					Тарифный план:
				</Typography>
				{isPro ? (
					<Chip label='Pro' color='success' size='medium' />
				) : (
					<Chip label='Free' color='default' size='medium' />
				)}
			</Box>

			{isPro ? (
				<Card variant='outlined'>
					<CardContent>
						<Typography variant='body1' color='success.main'>
							У вас тарифный план Pro — все лимиты сняты.
						</Typography>
					</CardContent>
				</Card>
			) : (
				<>
					<Typography variant='subtitle1' gutterBottom sx={{ mb: 2 }}>
						Использование ресурсов
					</Typography>
					<Box
						sx={{
							display: 'flex',
							gap: 2,
							flexWrap: 'wrap',
							mb: 4,
						}}
					>
						<StatCard label='Пользователи' stat={usageData.users} />
						<StatCard label='Заявки в этом месяце' stat={usageData.submissions} />
						<StatCard label='Визиты в этом месяце' stat={usageData.visits} />
					</Box>

					<Box
						sx={{
							p: 3,
							border: '1px solid',
							borderColor: 'divider',
							borderRadius: 2,
							display: 'flex',
							flexDirection: { xs: 'column', sm: 'row' },
							alignItems: { sm: 'center' },
							justifyContent: 'space-between',
							gap: 2,
						}}
					>
						<Box>
							<Typography variant='h6' gutterBottom>
								Перейти на Pro
							</Typography>
							<Typography variant='body2' color='text.secondary'>
								Безлимитные пользователи, заявки и визиты. Приоритетная поддержка.
							</Typography>
						</Box>
						<Button
							variant='contained'
							color='primary'
							size='large'
							onClick={() => alert('Свяжитесь с нами')}
							sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
						>
							Перейти на Pro
						</Button>
					</Box>
				</>
			)}
		</Container>
	)
}

export default BillingPage
