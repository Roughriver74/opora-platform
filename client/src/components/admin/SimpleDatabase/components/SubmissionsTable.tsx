import React, { useState, useEffect, useCallback } from 'react'
import {
	DataGrid,
	GridColDef,
	GridRenderCellParams,
} from '@mui/x-data-grid'
import {
	Box,
	Chip,
	Typography,
	IconButton,
	Tooltip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	Alert,
	Stack,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { SubmissionService, Submission } from '../../../../services/submissionService'

interface SubmissionsTableProps {
	onError?: (error: string) => void
}

export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({ onError }) => {
	const [submissions, setSubmissions] = useState<Submission[]>([])
	const [loading, setLoading] = useState(true)
	const [total, setTotal] = useState(0)
	const [page, setPage] = useState(0)
	const [pageSize, setPageSize] = useState(25)
	const [editDialog, setEditDialog] = useState<{
		open: boolean
		submission: Submission | null
	}>({ open: false, submission: null })
	const [editNotes, setEditNotes] = useState('')
	const [editTags, setEditTags] = useState('')
	const [saving, setSaving] = useState(false)

	const loadSubmissions = useCallback(async () => {
		setLoading(true)
		try {
			const response = await SubmissionService.getSubmissions({
				page: page + 1,
				limit: pageSize,
			})
			setSubmissions(response.data || [])
			setTotal(response.pagination?.total || response.total || 0)
		} catch (error: any) {
			onError?.(error.message || 'Ошибка загрузки заявок')
		} finally {
			setLoading(false)
		}
	}, [page, pageSize, onError])

	useEffect(() => {
		loadSubmissions()
	}, [loadSubmissions])

	const handleEdit = (submission: Submission) => {
		setEditDialog({ open: true, submission })
		setEditNotes(submission.notes || '')
		setEditTags(submission.tags?.join(', ') || '')
	}

	const handleSaveEdit = async () => {
		if (!editDialog.submission) return
		setSaving(true)
		try {
			await SubmissionService.updateSubmission(editDialog.submission.id, {
				notes: editNotes,
				tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
			})
			setEditDialog({ open: false, submission: null })
			loadSubmissions()
		} catch (error: any) {
			onError?.(error.message || 'Ошибка сохранения')
		} finally {
			setSaving(false)
		}
	}

	const handleDelete = async (id: string) => {
		if (!window.confirm('Удалить заявку? Это действие необратимо.')) return
		try {
			await SubmissionService.deleteSubmission(id)
			loadSubmissions()
		} catch (error: any) {
			onError?.(error.message || 'Ошибка удаления')
		}
	}

	const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
		if (status.includes('NEW')) return 'info'
		if (status.includes('WON') || status.includes('COMPLETED')) return 'success'
		if (status.includes('LOSE') || status.includes('CANCELLED')) return 'error'
		if (status.includes('PROGRESS') || status.includes('EXECUTING')) return 'warning'
		return 'default'
	}

	const getPriorityColor = (priority: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
		switch (priority) {
			case 'urgent': return 'error'
			case 'high': return 'warning'
			case 'medium': return 'primary'
			default: return 'default'
		}
	}

	const columns: GridColDef[] = [
		{
			field: 'submissionNumber',
			headerName: '№',
			width: 130,
			renderCell: (params: GridRenderCellParams) => (
				<Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
					{params.value}
				</Typography>
			),
		},
		{
			field: 'title',
			headerName: 'Название',
			width: 250,
			editable: false,
		},
		{
			field: 'status',
			headerName: 'Статус',
			width: 140,
			renderCell: (params: GridRenderCellParams) => (
				<Chip
					label={params.value}
					size='small'
					color={getStatusColor(params.value)}
					variant='outlined'
				/>
			),
		},
		{
			field: 'priority',
			headerName: 'Приоритет',
			width: 110,
			renderCell: (params: GridRenderCellParams) => (
				<Chip
					label={params.value}
					size='small'
					color={getPriorityColor(params.value)}
				/>
			),
		},
		{
			field: 'userName',
			headerName: 'Пользователь',
			width: 150,
		},
		{
			field: 'bitrixDealId',
			headerName: 'Bitrix ID',
			width: 100,
			renderCell: (params: GridRenderCellParams) => (
				<Typography variant='caption' sx={{ color: 'text.secondary' }}>
					{params.value || '-'}
				</Typography>
			),
		},
		{
			field: 'bitrixSyncStatus',
			headerName: 'Синхр.',
			width: 100,
			renderCell: (params: GridRenderCellParams) => {
				const colors: Record<string, 'success' | 'warning' | 'error'> = {
					synced: 'success',
					pending: 'warning',
					failed: 'error',
				}
				return (
					<Chip
						label={params.value}
						size='small'
						color={colors[params.value] || 'default'}
						variant='outlined'
					/>
				)
			},
		},
		{
			field: 'createdAt',
			headerName: 'Создана',
			width: 160,
			renderCell: (params: GridRenderCellParams) => (
				<Typography variant='caption'>
					{new Date(params.value).toLocaleString('ru-RU')}
				</Typography>
			),
		},
		{
			field: 'actions',
			headerName: 'Действия',
			width: 130,
			sortable: false,
			renderCell: (params: GridRenderCellParams) => (
				<Stack direction='row' spacing={0.5}>
					<Tooltip title='Редактировать'>
						<IconButton size='small' onClick={() => handleEdit(params.row)}>
							<EditIcon fontSize='small' />
						</IconButton>
					</Tooltip>
					<Tooltip title='Открыть в Дашборде'>
						<IconButton
							size='small'
							onClick={() => window.open(`/dashboard?submission=${params.row.id}`, '_blank')}
						>
							<OpenInNewIcon fontSize='small' />
						</IconButton>
					</Tooltip>
					<Tooltip title='Удалить'>
						<IconButton
							size='small'
							color='error'
							onClick={() => handleDelete(params.row.id)}
						>
							<DeleteIcon fontSize='small' />
						</IconButton>
					</Tooltip>
				</Stack>
			),
		},
	]

	return (
		<Box sx={{ height: 600, width: '100%' }}>
			<DataGrid
				rows={submissions}
				columns={columns}
				getRowId={row => row.id}
				loading={loading}
				rowCount={total}
				paginationMode='server'
				paginationModel={{ page, pageSize }}
				onPaginationModelChange={model => {
					setPage(model.page)
					setPageSize(model.pageSize)
				}}
				pageSizeOptions={[25, 50, 100]}
				disableRowSelectionOnClick
				sx={{
					'& .MuiDataGrid-cell': { paddingX: 1 },
					'& .MuiDataGrid-row:hover': {
						backgroundColor: 'rgba(0, 0, 0, 0.04)',
					},
				}}
			/>

			<Dialog
				open={editDialog.open}
				onClose={() => setEditDialog({ open: false, submission: null })}
				maxWidth='sm'
				fullWidth
			>
				<DialogTitle>
					Редактирование заявки #{editDialog.submission?.submissionNumber}
				</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<Alert severity='info' sx={{ mb: 1 }}>
							Для полного редактирования используйте Дашборд. Здесь можно изменить только заметки и теги.
						</Alert>
						<TextField
							label='Заметки'
							multiline
							rows={3}
							value={editNotes}
							onChange={e => setEditNotes(e.target.value)}
							fullWidth
						/>
						<TextField
							label='Теги (через запятую)'
							value={editTags}
							onChange={e => setEditTags(e.target.value)}
							fullWidth
							helperText='Например: срочно, VIP, проверить'
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditDialog({ open: false, submission: null })}>
						Отмена
					</Button>
					<Button onClick={handleSaveEdit} variant='contained' disabled={saving}>
						{saving ? 'Сохранение...' : 'Сохранить'}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	)
}
