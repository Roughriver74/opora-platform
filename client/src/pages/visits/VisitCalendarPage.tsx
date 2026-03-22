import React, { useState, useEffect } from 'react'
import {
	Box,
	Typography,
	IconButton,
	CircularProgress,
	Paper,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { visitService } from '../../services/visitService'
import { Visit } from '../../types/visit'
import { VisitStatusBadge } from '../../components/visits/VisitStatusBadge'
import { useNavigate } from 'react-router-dom'

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const MONTH_NAMES = [
	'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
	'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

/** Returns ISO date string "YYYY-MM-DD" */
const toISODate = (date: Date): string => date.toISOString().slice(0, 10)

/** Monday-based weekday index (0 = Mon, 6 = Sun) */
const mondayWeekday = (date: Date): number => (date.getDay() + 6) % 7

const VisitCalendarPage: React.FC = () => {
	const navigate = useNavigate()
	const now = new Date()

	const [year, setYear] = useState(now.getFullYear())
	const [month, setMonth] = useState(now.getMonth()) // 0-indexed
	const [visits, setVisits] = useState<Visit[]>([])
	const [loading, setLoading] = useState(false)

	const loadCalendar = async () => {
		setLoading(true)
		try {
			const firstDay = new Date(year, month, 1)
			const lastDay = new Date(year, month + 1, 0)
			const data = await visitService.getCalendar(toISODate(firstDay), toISODate(lastDay))
			setVisits(data)
		} catch (err) {
			console.error('Ошибка загрузки календаря:', err)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadCalendar()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [year, month])

	const handlePrev = () => {
		if (month === 0) {
			setMonth(11)
			setYear(y => y - 1)
		} else {
			setMonth(m => m - 1)
		}
	}

	const handleNext = () => {
		if (month === 11) {
			setMonth(0)
			setYear(y => y + 1)
		} else {
			setMonth(m => m + 1)
		}
	}

	// Build calendar grid
	const firstDay = new Date(year, month, 1)
	const daysInMonth = new Date(year, month + 1, 0).getDate()
	const startOffset = mondayWeekday(firstDay)

	// Total cells: fill to complete weeks
	const totalCells = Math.ceil((daysInMonth + startOffset) / 7) * 7
	const cells: (number | null)[] = Array.from({ length: totalCells }, (_, i) => {
		const dayNum = i - startOffset + 1
		return dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null
	})

	// Group visits by date string
	const visitsByDate: Record<string, Visit[]> = {}
	visits.forEach(v => {
		const key = toISODate(new Date(v.date))
		if (!visitsByDate[key]) visitsByDate[key] = []
		visitsByDate[key].push(v)
	})

	const today = toISODate(new Date())

	return (
		<Box p={3}>
			{/* Header */}
			<Box display='flex' alignItems='center' mb={3} gap={1}>
				<IconButton onClick={handlePrev} size='small'>
					<ChevronLeftIcon />
				</IconButton>
				<Typography variant='h6' fontWeight={600} sx={{ minWidth: 200, textAlign: 'center' }}>
					{MONTH_NAMES[month]} {year}
				</Typography>
				<IconButton onClick={handleNext} size='small'>
					<ChevronRightIcon />
				</IconButton>
			</Box>

			{loading ? (
				<Box display='flex' justifyContent='center' py={8}>
					<CircularProgress />
				</Box>
			) : (
				<Box
					sx={{
						display: 'grid',
						gridTemplateColumns: 'repeat(7, 1fr)',
						gap: 0.5,
					}}
				>
					{/* Weekday headers */}
					{WEEKDAY_LABELS.map(label => (
						<Box
							key={label}
							sx={{
								textAlign: 'center',
								py: 1,
								fontWeight: 600,
								fontSize: 13,
								color: 'text.secondary',
							}}
						>
							{label}
						</Box>
					))}

					{/* Day cells */}
					{cells.map((dayNum, idx) => {
						if (!dayNum) {
							return <Box key={`empty-${idx}`} sx={{ minHeight: 80 }} />
						}

						const dateStr = toISODate(new Date(year, month, dayNum))
						const dayVisits = visitsByDate[dateStr] ?? []
						const isToday = dateStr === today

						return (
							<Paper
								key={dateStr}
								variant='outlined'
								sx={{
									minHeight: 80,
									p: 0.75,
									backgroundColor: isToday
										? 'action.hover'
										: 'background.paper',
									borderColor: isToday ? 'primary.main' : 'divider',
									overflow: 'hidden',
								}}
							>
								<Typography
									variant='caption'
									fontWeight={isToday ? 700 : 400}
									color={isToday ? 'primary.main' : 'text.primary'}
									display='block'
									mb={0.5}
								>
									{dayNum}
								</Typography>
								<Box display='flex' flexDirection='column' gap={0.25}>
									{dayVisits.map(v => {
										const companyName = v.company?.name ?? v.companyName ?? '—'
										return (
											<Box
												key={v.id}
												onClick={() => navigate(`/visits/${v.id}`)}
												sx={{
													cursor: 'pointer',
													'&:hover': { opacity: 0.75 },
												}}
											>
												<Typography
													variant='caption'
													display='block'
													noWrap
													sx={{ fontSize: 11, lineHeight: 1.3 }}
												>
													{companyName}
												</Typography>
												<VisitStatusBadge status={v.status} />
											</Box>
										)
									})}
								</Box>
							</Paper>
						)
					})}
				</Box>
			)}
		</Box>
	)
}

export default VisitCalendarPage
