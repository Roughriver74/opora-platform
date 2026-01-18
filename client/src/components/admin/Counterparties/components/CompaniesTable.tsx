import React, { useState } from 'react'
import {
	Box,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	Paper,
	IconButton,
	Chip,
	TextField,
	Stack,
	Button,
	CircularProgress,
	Alert,
	Typography,
	Tooltip,
	InputAdornment,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import BusinessIcon from '@mui/icons-material/Business'
import { useCompanies, useDeleteCompany } from '../hooks/useCompanies'
import { Company, CompanyType, CompanySyncStatus } from '../../../../services/companyService'
import { CompanyForm } from './CompanyForm'

const companyTypeLabels: Record<CompanyType, string> = {
	[CompanyType.CUSTOMER]: 'Клиент',
	[CompanyType.SUPPLIER]: 'Поставщик',
	[CompanyType.PARTNER]: 'Партнер',
	[CompanyType.CONTRACTOR]: 'Подрядчик',
	[CompanyType.OTHER]: 'Другое',
}

const syncStatusColors: Record<CompanySyncStatus, 'success' | 'warning' | 'error' | 'default'> = {
	[CompanySyncStatus.SYNCED]: 'success',
	[CompanySyncStatus.PENDING]: 'warning',
	[CompanySyncStatus.ERROR]: 'error',
	[CompanySyncStatus.LOCAL_ONLY]: 'default',
}

export const CompaniesTable: React.FC = () => {
	const [page, setPage] = useState(0)
	const [rowsPerPage, setRowsPerPage] = useState(10)
	const [search, setSearch] = useState('')
	const [editingCompany, setEditingCompany] = useState<Company | null>(null)
	const [isFormOpen, setIsFormOpen] = useState(false)

	const { data, isLoading, error } = useCompanies({
		page: page + 1,
		limit: rowsPerPage,
		search: search || undefined,
	})

	const deleteCompany = useDeleteCompany()

	const handleChangePage = (_: unknown, newPage: number) => {
		setPage(newPage)
	}

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10))
		setPage(0)
	}

	const handleEdit = (company: Company) => {
		setEditingCompany(company)
		setIsFormOpen(true)
	}

	const handleDelete = async (id: string) => {
		if (window.confirm('Вы уверены, что хотите удалить эту компанию?')) {
			try {
				await deleteCompany.mutateAsync(id)
			} catch (error: any) {
				alert(`Ошибка при удалении: ${error.message}`)
			}
		}
	}

	const handleAdd = () => {
		setEditingCompany(null)
		setIsFormOpen(true)
	}

	const handleFormClose = () => {
		setIsFormOpen(false)
		setEditingCompany(null)
	}

	if (error) {
		return (
			<Alert severity='error'>
				Ошибка загрузки данных: {(error as Error).message}
			</Alert>
		)
	}

	return (
		<Box>
			<Stack direction='row' spacing={2} alignItems='center' mb={2}>
				<TextField
					size='small'
					placeholder='Поиск по названию, ИНН...'
					value={search}
					onChange={e => setSearch(e.target.value)}
					InputProps={{
						startAdornment: (
							<InputAdornment position='start'>
								<SearchIcon />
							</InputAdornment>
						),
					}}
					sx={{ minWidth: 300 }}
				/>
				<Box sx={{ flexGrow: 1 }} />
				<Button
					variant='contained'
					startIcon={<AddIcon />}
					onClick={handleAdd}
				>
					Добавить компанию
				</Button>
			</Stack>

			<TableContainer component={Paper} variant='outlined'>
				<Table size='small'>
					<TableHead>
						<TableRow>
							<TableCell>Название</TableCell>
							<TableCell>ИНН</TableCell>
							<TableCell>Тип</TableCell>
							<TableCell>Телефон</TableCell>
							<TableCell>Email</TableCell>
							<TableCell>Статус синхр.</TableCell>
							<TableCell align='right'>Действия</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={7} align='center'>
									<CircularProgress size={24} />
								</TableCell>
							</TableRow>
						) : data?.data.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} align='center'>
									<Stack alignItems='center' spacing={1} py={4}>
										<BusinessIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
										<Typography color='text.secondary'>
											Компании не найдены
										</Typography>
									</Stack>
								</TableCell>
							</TableRow>
						) : (
							data?.data.map(company => (
								<TableRow key={company.id} hover>
									<TableCell>
										<Typography variant='body2' fontWeight={500}>
											{company.name}
										</Typography>
										{company.shortName && (
											<Typography variant='caption' color='text.secondary'>
												{company.shortName}
											</Typography>
										)}
									</TableCell>
									<TableCell>{company.inn || '-'}</TableCell>
									<TableCell>
										<Chip
											label={companyTypeLabels[company.companyType]}
											size='small'
											variant='outlined'
										/>
									</TableCell>
									<TableCell>{company.phone || '-'}</TableCell>
									<TableCell>{company.email || '-'}</TableCell>
									<TableCell>
										<Chip
											label={company.syncStatus}
											size='small'
											color={syncStatusColors[company.syncStatus]}
										/>
									</TableCell>
									<TableCell align='right'>
										<Tooltip title='Редактировать'>
											<IconButton
												size='small'
												onClick={() => handleEdit(company)}
											>
												<EditIcon fontSize='small' />
											</IconButton>
										</Tooltip>
										<Tooltip title='Удалить'>
											<IconButton
												size='small'
												color='error'
												onClick={() => handleDelete(company.id)}
											>
												<DeleteIcon fontSize='small' />
											</IconButton>
										</Tooltip>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</TableContainer>

			{data && (
				<TablePagination
					rowsPerPageOptions={[5, 10, 25, 50]}
					component='div'
					count={data.pagination.total}
					rowsPerPage={rowsPerPage}
					page={page}
					onPageChange={handleChangePage}
					onRowsPerPageChange={handleChangeRowsPerPage}
					labelRowsPerPage='Строк на странице:'
					labelDisplayedRows={({ from, to, count }) =>
						`${from}-${to} из ${count}`
					}
				/>
			)}

			<CompanyForm
				open={isFormOpen}
				onClose={handleFormClose}
				company={editingCompany}
			/>
		</Box>
	)
}
