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
} from '@mui/icons-material'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { SubmissionsTableProps } from '../types'
import { ITEMS_PER_PAGE_OPTIONS } from '../constants'
import {
	getCleanStatus,
	getSyncStatusColor,
	getSyncStatusText,
} from '../utils/statusUtils'

export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({
	submissions,
	bitrixStages,
	onEditSubmission,
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
						<TableCell>№ заявки</TableCell>
						<TableCell>Форма</TableCell>
						<TableCell>Клиент</TableCell>
						<TableCell>Статус</TableCell>
						<TableCell>Битрикс24</TableCell>
						<TableCell>Дата создания</TableCell>
						<TableCell>Действия</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{submissions.map(submission => (
						<TableRow key={submission._id}>
							<TableCell>
								<Typography variant='body2' fontWeight='bold'>
									{submission.submissionNumber}
								</Typography>
							</TableCell>
							<TableCell>{submission.formId.title}</TableCell>
							<TableCell>
								{submission.userId
									? submission.userId.firstName && submission.userId.lastName
										? `${submission.userId.firstName} ${submission.userId.lastName}`
										: submission.userId.name
									: 'Анонимная заявка'}
							</TableCell>
							<TableCell>
								<FormControl size='small' sx={{ minWidth: 120 }}>
									<Select
										value={getCleanStatus(submission.status)}
										onChange={e =>
											onStatusChange(submission._id, e.target.value)
										}
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
													getSyncIcon(submission.bitrixSyncStatus) || undefined
												}
												label={getSyncStatusText(submission.bitrixSyncStatus)}
												color={getSyncStatusColor(submission.bitrixSyncStatus)}
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
								<IconButton
									onClick={() => onEditSubmission(submission)}
									color='primary'
									title='Редактировать заявку'
								>
									<EditIcon />
								</IconButton>
							</TableCell>
						</TableRow>
					))}
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
