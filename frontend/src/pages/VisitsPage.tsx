import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
	Box,
	Paper,
	Typography,
	Button,
	Grid,
	Card,
	CardContent,
	IconButton,
	Chip,
	CardActionArea,
	CircularProgress,
	Alert,
	Divider,
	ToggleButtonGroup,
	ToggleButton,
	useTheme,
	useMediaQuery,
	Pagination,
	Modal,
} from '@mui/material'
import {
	Add as AddIcon,
	Edit as EditIcon,
	Visibility as VisibilityIcon,
	Refresh as RefreshIcon,
} from '@mui/icons-material'
import {
	visitService,
	Visit,
	VisitStatus,
	visitStatusDisplayNames,
	visitStatusColors,
} from '../services/visitService'

export const VisitsPage: React.FC = () => {
	const navigate = useNavigate()
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
	// Filter state for upcoming vs completed visits
	const [visitFilter, setVisitFilter] = useState<'upcoming' | 'completed'>(
		'upcoming'
	)
	const [filteredVisits, setFilteredVisits] = useState<Visit[]>([])

	// Pagination state
	const [page, setPage] = useState(1)
	const [visitsPerPage] = useState(12)
	const [totalPages, setTotalPages] = useState(1)

	const {
		data: visits,
		isLoading,
		error,
		refetch,
	} = useQuery<Visit[]>({
		queryKey: ['visits'],
		queryFn: visitService.getVisits,
	})

	// Filter visits based on date and status
	// Функция для получения статуса визита - использует только поле status из БД
	const getVisitStatus = (visit: any): VisitStatus => {
		console.log('Getting status for visit:', visit.id)

		// Используем поле status из базы данных
		if (visit.status) {
			console.log('Using status from database:', visit.status)
			return visit.status as VisitStatus
		}

		// Если по какой-то причине статус отсутствует, используем planned по умолчанию
		console.log('Status not found, defaulting to planned')
		return VisitStatus.planned
	}

	useEffect(() => {
		if (!visits) return

		const now = new Date()
		console.log('Current date for filtering:', now.toISOString())
		console.log('Current filter:', visitFilter)
		console.log('All visits:', visits)

		// Детальное логирование всех визитов
		visits.forEach(visit => {
			const status = getVisitStatus(visit)
			console.log(`VISIT ${visit.id}: date=${visit.date}, status=${status}`)
		})

		// Filter by status
		let filtered = []
		if (visitFilter === 'upcoming') {
			// Filter for upcoming visits: status is planned or in_progress
			filtered = visits.filter(visit => {
				// Получаем статус визита из БД
				const visitStatus = getVisitStatus(visit)
				console.log(`Visit ${visit.id} status:`, visitStatus)

				// Визит считается предстоящим, если статус 'planned' или 'in_progress'
				const statusIsActive =
					visitStatus === VisitStatus.planned ||
					visitStatus === VisitStatus.in_progress
				console.log(`Visit ${visit.id} is active:`, statusIsActive)
				return statusIsActive
			})
		} else {
			// Filter for completed visits: status is completed, failed, or cancelled
			filtered = visits.filter(visit => {
				// Получаем статус визита из БД
				const visitStatus = getVisitStatus(visit)
				console.log(`Visit ${visit.id} status:`, visitStatus)

				// Визит считается завершенным, если статус "completed", "failed" или "cancelled"
				const isCompleted =
					visitStatus === VisitStatus.completed ||
					visitStatus === VisitStatus.failed ||
					visitStatus === VisitStatus.cancelled

				console.log(`Visit ${visit.id} is completed:`, isCompleted)
				return isCompleted
			})
		}

		// Сортировка визитов в зависимости от фильтра
		filtered.sort((a, b) => {
			const dateA = new Date(a.date).getTime()
			const dateB = new Date(b.date).getTime()

			if (visitFilter === 'upcoming') {
				// Для предстоящих визитов - от ранних к поздним
				return dateA - dateB
			} else {
				// Для состоявшихся визитов - от поздних (ближайших) к ранним (более прошлым)
				return dateB - dateA
			}
		})

		console.log('Filtered and sorted visits:', filtered)
		setFilteredVisits(filtered)

		// Обновляем количество страниц для пагинации
		setTotalPages(Math.max(1, Math.ceil(filtered.length / visitsPerPage)))

		// Сбрасываем страницу на первую при изменении фильтра
		if (page > 1 && filtered.length <= visitsPerPage) {
			setPage(1)
		}
	}, [visits, visitFilter, visitsPerPage, page])

	const getStatusColor = (status?: VisitStatus) => {
		if (!status) return 'default'
		return visitStatusColors[status] || 'default'
	}

	const getStatusDisplayName = (status?: VisitStatus) => {
		if (!status) return ''
		return visitStatusDisplayNames[status] || status
	}

	return (
		<Box>
			<Paper sx={{ p: 2, mb: 2 }}>
				<Grid
					container
					justifyContent='space-between'
					alignItems='center'
					spacing={2}
				>
					<Grid item xs={12} sm={6}>
						<Typography variant='h5' component='h1'>
							Визиты
						</Typography>
					</Grid>
					<Grid item xs={12} sm={6}>
						<Box
							display='flex'
							gap={1}
							justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
							flexWrap='wrap'
						>
							<Button
								variant='outlined'
								startIcon={<RefreshIcon />}
								onClick={() => refetch()}
								size={isMobile ? 'small' : 'medium'}
							>
								Обновить
							</Button>
						</Box>
					</Grid>

					{/* Filter toggle buttons */}
					<Grid item xs={12}>
						<Box
							display='flex'
							flexDirection='column'
							alignItems='center'
							mt={1}
							gap={2}
						>
							<ToggleButtonGroup
								value={visitFilter}
								exclusive
								onChange={(e, newValue) => {
									if (newValue !== null) {
										setVisitFilter(newValue)
									}
								}}
								aria-label='visit filter'
								size={isMobile ? 'small' : 'medium'}
							>
								<ToggleButton value='upcoming' aria-label='upcoming visits'>
									Предстоящие
								</ToggleButton>
								<ToggleButton value='completed' aria-label='completed visits'>
									Состоявшиеся
								</ToggleButton>
							</ToggleButtonGroup>
						</Box>
					</Grid>
				</Grid>
			</Paper>

			<Divider sx={{ my: 3 }} />

			{isLoading && (
				<Box display='flex' justifyContent='center' my={4}>
					<CircularProgress />
				</Box>
			)}

			{error ? (
				<Alert severity='error' sx={{ mb: 2 }}>
					Ошибка при загрузке визитов. Пожалуйста, попробуйте обновить страницу.
				</Alert>
			) : null}

			{!isLoading && filteredVisits && filteredVisits.length > 0 ? (
				<>
					<Grid container spacing={2}>
						{/* Показываем только текущую страницу */}
						{filteredVisits
							.slice((page - 1) * visitsPerPage, page * visitsPerPage)
							.map(visit => (
								<Grid item xs={12} sm={6} md={4} lg={3} key={visit.id}>
									<Card
										sx={{
											height: '100%',
											display: 'flex',
											flexDirection: 'column',
											position: 'relative',
										}}
									>
										{/* Кнопка просмотра вынесена за пределы CardActionArea и позиционирована абсолютно */}
										<Box
											sx={{
												position: 'absolute',
												top: '8px',
												right: '8px',
												zIndex: 2,
											}}
										>
											<IconButton
												size='small'
												onClick={e => {
													e.stopPropagation()
													navigate(`/visits/${visit.id}`)
												}}
											>
												<VisibilityIcon />
											</IconButton>


										</Box>


										<CardActionArea
											onClick={() => navigate(`/visits/${visit.id}`)}
											sx={{
												height: '100%',
												display: 'flex',
												flexDirection: 'column',
												alignItems: 'stretch',
												justifyContent: 'flex-start',
											}}
										>
											<CardContent
												sx={{
													flexGrow: 1,
													display: 'flex',
													flexDirection: 'column',
												}}
											>
												{/* Status indicator at the top */}
												<Box
													display='flex'
													justifyContent='space-between'
													alignItems='center'
													mb={1}
												>
													{visit.status ? (
														<Chip
															label={getStatusDisplayName(visit.status)}
															color={getStatusColor(visit.status) as any}
															size='small'
														/>
													) : (
														<Box /> /* Empty box for spacing when no status */
													)}
													{/* Пустое место для выравнивания, так как кнопка теперь абсолютно позиционирована */}
													<Box width={28} height={28} />
												</Box>

												{/* Company name - prominently displayed */}
												<Typography
													variant='h6'
													component='h3'
													sx={{
														mb: 1,
														wordBreak: 'break-word',
														overflow: 'hidden',
														display: '-webkit-box',
														WebkitLineClamp: 2,
														WebkitBoxOrient: 'vertical',
														lineHeight: 1.2,
													}}
												>
													{visit.company?.name ||
														`Клиника №${visit.company_id}` ||
														'Неизвестная клиника'}
												</Typography>

												{/* Visit type - clearly visible */}
												<Typography
													color='primary'
													variant='subtitle1'
													gutterBottom
													sx={{ fontWeight: 'small' }}
												>
													{visit.dynamic_fields?.['ufcrm18type'] ||
														visit.visit_type ||
														'Визит'}
												</Typography>

												{/* Date formatted with time */}
												<Typography variant='body2' sx={{ mb: 1.5 }}>
													<strong>Дата:</strong>{' '}
													{new Date(visit.date).toLocaleString('ru-RU', {
														year: 'numeric',
														month: 'long',
														day: 'numeric',
														hour: '2-digit',
														minute: '2-digit',
													})}
												</Typography>

												{/* Additional tags */}
											</CardContent>
										</CardActionArea>
									</Card>
								</Grid>
							))}
					</Grid>

					{/* Пагинация */}
					{totalPages > 1 && (
						<Box display='flex' justifyContent='center' my={4}>
							<Pagination
								count={totalPages}
								page={page}
								onChange={(event, newPage) => setPage(newPage)}
								color='primary'
								size={isMobile ? 'small' : 'medium'}
							/>
						</Box>
					)}
				</>
			) : (
				!isLoading && (
					<Box p={3} textAlign='center'>
						<Typography variant='h6' color='textSecondary' gutterBottom>
							{visitFilter === 'upcoming'
								? 'Будущие визиты не найдены'
								: 'Состоявшиеся визиты не найдены'}
						</Typography>
					</Box>
				)
			)}


		</Box>
	)
}
