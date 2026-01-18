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
import PersonIcon from '@mui/icons-material/Person'
import StarIcon from '@mui/icons-material/Star'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DownloadIcon from '@mui/icons-material/Download'
import { useContacts, useDeleteContact } from '../hooks/useContacts'
import { Contact, ContactType, ContactSyncStatus, ContactService } from '../../../../services/contactService'
import { ContactForm } from './ContactForm'
import { ContactImportDialog } from './ContactImportDialog'

const contactTypeLabels: Record<ContactType, string> = {
	[ContactType.DECISION_MAKER]: 'ЛПР',
	[ContactType.DIRECTOR]: 'Директор',
	[ContactType.MANAGER]: 'Менеджер',
	[ContactType.ACCOUNTANT]: 'Бухгалтер',
	[ContactType.DISPATCHER]: 'Диспетчер',
	[ContactType.OTHER]: 'Другое',
}

const syncStatusColors: Record<ContactSyncStatus, 'success' | 'warning' | 'error' | 'default'> = {
	[ContactSyncStatus.SYNCED]: 'success',
	[ContactSyncStatus.PENDING]: 'warning',
	[ContactSyncStatus.ERROR]: 'error',
	[ContactSyncStatus.LOCAL_ONLY]: 'default',
}

export const ContactsTable: React.FC = () => {
	const [page, setPage] = useState(0)
	const [rowsPerPage, setRowsPerPage] = useState(10)
	const [search, setSearch] = useState('')
	const [editingContact, setEditingContact] = useState<Contact | null>(null)
	const [isFormOpen, setIsFormOpen] = useState(false)
	const [isImportOpen, setIsImportOpen] = useState(false)

	const { data, isLoading, error } = useContacts({
		page: page + 1,
		limit: rowsPerPage,
		search: search || undefined,
	})

	const deleteContact = useDeleteContact()

	const handleChangePage = (_: unknown, newPage: number) => {
		setPage(newPage)
	}

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10))
		setPage(0)
	}

	const handleEdit = (contact: Contact) => {
		setEditingContact(contact)
		setIsFormOpen(true)
	}

	const handleDelete = async (id: string) => {
		if (window.confirm('Вы уверены, что хотите удалить этот контакт?')) {
			try {
				await deleteContact.mutateAsync(id)
			} catch (error: any) {
				alert(`Ошибка при удалении: ${error.message}`)
			}
		}
	}

	const handleAdd = () => {
		setEditingContact(null)
		setIsFormOpen(true)
	}

	const handleFormClose = () => {
		setIsFormOpen(false)
		setEditingContact(null)
	}

	const handleExport = async () => {
		try {
			const blob = await ContactService.exportExcel()
			ContactService.downloadFile(blob, `contacts_${new Date().toISOString().split('T')[0]}.xlsx`)
		} catch (error: any) {
			alert(`Ошибка экспорта: ${error.message}`)
		}
	}

	const handleDownloadTemplate = async () => {
		try {
			const blob = await ContactService.downloadTemplate()
			ContactService.downloadFile(blob, 'contacts_template.xlsx')
		} catch (error: any) {
			alert(`Ошибка загрузки шаблона: ${error.message}`)
		}
	}

	const getFullName = (contact: Contact) => {
		return [contact.lastName, contact.firstName, contact.middleName]
			.filter(Boolean)
			.join(' ')
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
					placeholder='Поиск по ФИО, телефону...'
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
				<Tooltip title='Скачать шаблон Excel'>
					<Button
						variant='outlined'
						size='small'
						startIcon={<DownloadIcon />}
						onClick={handleDownloadTemplate}
					>
						Шаблон
					</Button>
				</Tooltip>
				<Tooltip title='Экспорт в Excel'>
					<Button
						variant='outlined'
						size='small'
						startIcon={<DownloadIcon />}
						onClick={handleExport}
					>
						Экспорт
					</Button>
				</Tooltip>
				<Button
					variant='outlined'
					startIcon={<UploadFileIcon />}
					onClick={() => setIsImportOpen(true)}
				>
					Импорт
				</Button>
				<Button
					variant='contained'
					startIcon={<AddIcon />}
					onClick={handleAdd}
				>
					Добавить контакт
				</Button>
			</Stack>

			<TableContainer component={Paper} variant='outlined'>
				<Table size='small'>
					<TableHead>
						<TableRow>
							<TableCell>ФИО</TableCell>
							<TableCell>Должность</TableCell>
							<TableCell>Тип</TableCell>
							<TableCell>Компания</TableCell>
							<TableCell>Телефон</TableCell>
							<TableCell>Email</TableCell>
							<TableCell>Статус синхр.</TableCell>
							<TableCell align='right'>Действия</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={8} align='center'>
									<CircularProgress size={24} />
								</TableCell>
							</TableRow>
						) : data?.data.length === 0 ? (
							<TableRow>
								<TableCell colSpan={8} align='center'>
									<Stack alignItems='center' spacing={1} py={4}>
										<PersonIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
										<Typography color='text.secondary'>
											Контакты не найдены
										</Typography>
									</Stack>
								</TableCell>
							</TableRow>
						) : (
							data?.data.map(contact => (
								<TableRow key={contact.id} hover>
									<TableCell>
										<Stack direction='row' alignItems='center' spacing={1}>
											<Typography variant='body2' fontWeight={500}>
												{getFullName(contact)}
											</Typography>
											{contact.isPrimary && (
												<Tooltip title='Основной контакт'>
													<StarIcon
														fontSize='small'
														sx={{ color: 'warning.main' }}
													/>
												</Tooltip>
											)}
										</Stack>
									</TableCell>
									<TableCell>{contact.position || '-'}</TableCell>
									<TableCell>
										<Chip
											label={contactTypeLabels[contact.contactType]}
											size='small'
											variant='outlined'
										/>
									</TableCell>
									<TableCell>
										{contact.company?.shortName || contact.company?.name || '-'}
									</TableCell>
									<TableCell>{contact.phone || '-'}</TableCell>
									<TableCell>{contact.email || '-'}</TableCell>
									<TableCell>
										<Chip
											label={contact.syncStatus}
											size='small'
											color={syncStatusColors[contact.syncStatus]}
										/>
									</TableCell>
									<TableCell align='right'>
										<Tooltip title='Редактировать'>
											<IconButton
												size='small'
												onClick={() => handleEdit(contact)}
											>
												<EditIcon fontSize='small' />
											</IconButton>
										</Tooltip>
										<Tooltip title='Удалить'>
											<IconButton
												size='small'
												color='error'
												onClick={() => handleDelete(contact.id)}
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

			<ContactForm
				open={isFormOpen}
				onClose={handleFormClose}
				contact={editingContact}
			/>

			<ContactImportDialog
				open={isImportOpen}
				onClose={() => setIsImportOpen(false)}
			/>
		</Box>
	)
}
