import React from 'react'
import {
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	Typography,
	FormControl,
	Select,
	MenuItem,
	IconButton,
	Stack,
	Chip,
	Tooltip,
} from '@mui/material'
import {
	Edit as EditIcon,
	CheckCircle as CheckCircleIcon,
	Error as ErrorIcon,
	Pending as PendingIcon,
	FileCopy as FileCopyIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { SubmissionsTableProps } from '../types'
import { ITEMS_PER_PAGE_OPTIONS } from '../constants'
import {
	getCleanStatus,
	getSyncStatusColor,
	getSyncStatusText,
	getStatusName,
} from '../utils/statusUtils'

export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({
	submissions,
	bitrixStages,
	onEditSubmission,
	onCopySubmission,
	onStatusChange,
	page,
	rowsPerPage,
	total,
	onPageChange,
	onRowsPerPageChange,
}) => {
	const getSyncIcon = (status: string) => {
		switch (status) {
			case 'synced':
				return <CheckCircleIcon />
			case 'failed':
				return <ErrorIcon />
			case 'pending':
				return <PendingIcon />
			default:
				return null
		}
	}

	return (
		<TableContainer component={Paper}>
			<Table>
				<TableHead>
					<TableRow>
						<TableCell>Bitrix ID</TableCell>
						<TableCell>User</TableCell>
						<TableCell>Статус</TableCell>
						<TableCell>Битрикс24</TableCell>
						<TableCell>Дата создания</TableCell>
						<TableCell>Действия</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{submissions.map(submission => {
						// Проверяем, является ли статус "Отгружено" (C1:WON)
						const isShipped = submission.status === 'C1:WON'

						return (
							<TableRow key={submission.id}>
								<TableCell>
									<Typography variant='body2' fontWeight='bold'>
										{submission.bitrixDealId || 'Не указан'}
									</Typography>
								</TableCell>
								<TableCell>
									{submission.userId
										? submission.userId.firstName && submission.userId.lastName
											? `${submission.userId.firstName} ${submission.userId.lastName}`
											: submission.userId.name || 'Не указан'
										: 'Анонимная заявка'}
								</TableCell>
								<TableCell>
									<FormControl size='small' sx={{ minWidth: 120 }}>
										<Select
											value={getCleanStatus(submission.status)}
											onChange={e =>
												onStatusChange(submission.id, e.target.value)
											}
											displayEmpty
											renderValue={value => {
												// Используем fallback для отображения понятного текста
												switch (submission.status) {
													case 'C1:NEW':
														return 'Новая'
													case 'C1:UC_GJLIZP':
														return 'Отправлено'
													case 'C1:WON':
														return 'Отгружено'
													default:
														const statusName = getStatusName(
															submission.status,
															bitrixStages
														)
														return statusName || 'Не указан'
												}
											}}
										>
											{bitrixStages.map(stage => (
												<MenuItem key={stage.id} value={stage.id}>
													{stage.name}
												</MenuItem>
											))}
										</Select>
									</FormControl>
								</TableCell>
								<TableCell>
									<Stack direction='row' spacing={1} alignItems='center'>
										{submission.bitrixDealId ? (
											<Tooltip title={`Сделка ID: ${submission.bitrixDealId}`}>
												<Chip
													icon={
														getSyncIcon(submission.bitrixSyncStatus) ||
														undefined
													}
													label={getSyncStatusText(submission.bitrixSyncStatus)}
													color={getSyncStatusColor(
														submission.bitrixSyncStatus
													)}
													size='small'
												/>
											</Tooltip>
										) : (
											<Chip label='Не создано' color='default' size='small' />
										)}
									</Stack>
								</TableCell>
								<TableCell>
									{format(new Date(submission.createdAt), 'dd.MM.yyyy HH:mm', {
										locale: ru,
									})}
								</TableCell>
								<TableCell>
									<Stack direction='row' spacing={1}>
										{!isShipped && (
											<IconButton
												onClick={() => onEditSubmission(submission)}
												color='primary'
												title='Редактировать заявку'
											>
												<EditIcon />
											</IconButton>
										)}
										<IconButton
											onClick={() => onCopySubmission(submission)}
											color='secondary'
											title='Копировать заявку'
										>
											<FileCopyIcon />
										</IconButton>
									</Stack>
								</TableCell>
							</TableRow>
						)
					})}
				</TableBody>
			</Table>
			<TablePagination
				rowsPerPageOptions={ITEMS_PER_PAGE_OPTIONS}
				component='div'
				count={total}
				rowsPerPage={rowsPerPage}
				page={page}
				onPageChange={onPageChange}
				onRowsPerPageChange={onRowsPerPageChange}
				labelRowsPerPage='Строк на странице:'
				labelDisplayedRows={({ from, to, count }) =>
					`${from}-${to} из ${count}`
				}
			/>
		</TableContainer>
	)
}
