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
	Cancel as CancelIcon,
	Schedule as ScheduleIcon,
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

export const SubmissionsTable = ({
	submissions,
	bitrixStages,
	onEditSubmission,
	onCopySubmission,
	onCancelSubmission,
	onStatusChange,
	page,
	rowsPerPage,
	total,
	onPageChange,
	onRowsPerPageChange,
}: SubmissionsTableProps) => {
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
						// Проверяем, является ли статус завершенным (Отгружено или Отменено)
						const isCompleted = ['C1:WON', 'C1:LOSE'].includes(
							submission.status
						)
						const isCancelled = submission.status === 'C1:LOSE'
						const canCancel = ['C1:NEW', 'C1:UC_GJLIZP'].includes(
							submission.status
						)

						// Отладочный вывод
						console.log(
							`Submission ${submission.id}: status=${submission.status}, canCancel=${canCancel}, isCompleted=${isCompleted}`
						)

						return (
							<TableRow
								key={submission.id}
								sx={{
									backgroundColor: isCancelled
										? 'rgba(0, 0, 0, 0.04)'
										: 'inherit',
									opacity: isCancelled ? 0.7 : 1,
								}}
							>
								<TableCell>
									<Stack direction='row' spacing={1} alignItems='center'>
										<Typography
											variant='body2'
											fontWeight='bold'
											sx={{
												textDecoration: isCancelled ? 'line-through' : 'none',
												color: isCancelled ? 'text.secondary' : 'inherit',
											}}
										>
											{submission.bitrixDealId || 'Не указан'}
										</Typography>
										{submission.isPeriodSubmission && (
											<Tooltip title='Периодическая заявка'>
												<ScheduleIcon
													sx={{
														fontSize: 18,
														color: 'primary.main',
													}}
												/>
											</Tooltip>
										)}
									</Stack>
								</TableCell>
								<TableCell>
									{submission.userName || 'Анонимная заявка'}
								</TableCell>
								<TableCell>
									<FormControl size='small' sx={{ minWidth: 120 }}>
										<Select
											value={getCleanStatus(submission.status)}
											onChange={(e: { target: { value: string } }) =>
												onStatusChange(submission.id, e.target.value)
											}
											displayEmpty
											renderValue={() => {
												// Используем fallback для отображения понятного текста
												switch (submission.status) {
													case 'C1:NEW':
														return 'Новая'
													case 'C1:UC_GJLIZP':
														return 'Отправлено'
													case 'C1:WON':
														return 'Отгружено'
													case 'C1:LOSE':
														return 'Отменено'
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
										{!isCompleted && (
											<IconButton
												onClick={() => onEditSubmission(submission)}
												color='primary'
												title='Редактировать заявку'
											>
												<EditIcon />
											</IconButton>
										)}
										{canCancel && (
											<IconButton
												onClick={() => onCancelSubmission(submission)}
												color='error'
												title='Отменить заявку'
											>
												<CancelIcon />
											</IconButton>
										)}
										{/* Временная кнопка для тестирования - всегда видна */}
										<IconButton
											onClick={() => {
												console.log(
													'Cancel button clicked for submission:',
													submission.id
												)
												onCancelSubmission(submission)
											}}
											color='warning'
											title='ТЕСТ Отменить заявку'
											size='small'
										>
											<CancelIcon />
										</IconButton>
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
				labelDisplayedRows={({
					from,
					to,
					count,
				}: {
					from: number
					to: number
					count: number
				}) => `${from}-${to} из ${count}`}
			/>
		</TableContainer>
	)
}
