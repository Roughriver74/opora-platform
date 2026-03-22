import React, { useState, useEffect } from 'react'
import {
	Box,
	Typography,
	TextField,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Button,
	CircularProgress,
	Pagination,
	Grid,
	Stack,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useNavigate } from 'react-router-dom'
import { visitService } from '../../services/visitService'
import { Visit, VisitFilters, VisitStatus } from '../../types/visit'
import { VisitCard } from '../../components/visits/VisitCard'

const STATUS_OPTIONS: { value: '' | VisitStatus; label: string }[] = [
	{ value: '', label: 'Все' },
	{ value: 'planned', label: 'Запланирован' },
	{ value: 'completed', label: 'Выполнен' },
	{ value: 'cancelled', label: 'Отменён' },
	{ value: 'failed', label: 'Неудачный' },
]

const PAGE_SIZE = 10

const VisitsPage: React.FC = () => {
	const navigate = useNavigate()

	const [visits, setVisits] = useState<Visit[]>([])
	const [total, setTotal] = useState(0)
	const [loading, setLoading] = useState(false)
	const [page, setPage] = useState(1)

	const [search, setSearch] = useState('')
	const [status, setStatus] = useState<'' | VisitStatus>('')
	const [dateFrom, setDateFrom] = useState('')
	const [dateTo, setDateTo] = useState('')

	const loadVisits = async () => {
		setLoading(true)
		try {
			const filters: VisitFilters = {
				page,
				limit: PAGE_SIZE,
				search: search || undefined,
				status: status || undefined,
				dateFrom: dateFrom || undefined,
				dateTo: dateTo || undefined,
			}
			const result = await visitService.getVisits(filters)
			setVisits(result.data)
			setTotal(result.total)
		} catch (err) {
			console.error('Ошибка загрузки визитов:', err)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadVisits()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, search, status, dateFrom, dateTo])

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearch(e.target.value)
		setPage(1)
	}

	const handleStatusChange = (value: '' | VisitStatus) => {
		setStatus(value)
		setPage(1)
	}

	const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setDateFrom(e.target.value)
		setPage(1)
	}

	const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setDateTo(e.target.value)
		setPage(1)
	}

	const pageCount = Math.ceil(total / PAGE_SIZE)

	return (
		<Box p={3}>
			<Box display='flex' justifyContent='space-between' alignItems='center' mb={3}>
				<Typography variant='h5' fontWeight={600}>
					Визиты
				</Typography>
				<Button
					variant='contained'
					startIcon={<AddIcon />}
					onClick={() => navigate('/visits/create')}
				>
					Новый визит
				</Button>
			</Box>

			{/* Filters */}
			<Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3}>
				<TextField
					label='Поиск'
					value={search}
					onChange={handleSearchChange}
					size='small'
					sx={{ minWidth: 200 }}
				/>

				<FormControl size='small' sx={{ minWidth: 180 }}>
					<InputLabel>Статус</InputLabel>
					<Select
						value={status}
						label='Статус'
						onChange={e => handleStatusChange(e.target.value as '' | VisitStatus)}
					>
						{STATUS_OPTIONS.map(opt => (
							<MenuItem key={opt.value} value={opt.value}>
								{opt.label}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<TextField
					label='Дата от'
					type='date'
					value={dateFrom}
					onChange={handleDateFromChange}
					size='small'
					slotProps={{ inputLabel: { shrink: true } }}
					sx={{ minWidth: 160 }}
				/>

				<TextField
					label='Дата до'
					type='date'
					value={dateTo}
					onChange={handleDateToChange}
					size='small'
					slotProps={{ inputLabel: { shrink: true } }}
					sx={{ minWidth: 160 }}
				/>
			</Stack>

			{/* Content */}
			{loading ? (
				<Box display='flex' justifyContent='center' py={6}>
					<CircularProgress />
				</Box>
			) : visits.length === 0 ? (
				<Box py={6} textAlign='center'>
					<Typography color='text.secondary'>Визиты не найдены</Typography>
				</Box>
			) : (
				<>
					<Grid container spacing={2}>
						{visits.map(visit => (
							<Grid size={{ xs: 12, sm: 6, md: 4 }} key={visit.id}>
								<VisitCard visit={visit} />
							</Grid>
						))}
					</Grid>

					{pageCount > 1 && (
						<Box display='flex' justifyContent='center' mt={4}>
							<Pagination
								count={pageCount}
								page={page}
								onChange={(_, value) => setPage(value)}
								color='primary'
							/>
						</Box>
					)}
				</>
			)}
		</Box>
	)
}

export default VisitsPage
