import React, { useState, useEffect } from 'react'
import {
	Box,
	Typography,
	Card,
	CardContent,
	Button,
	CircularProgress,
	Stack,
	Divider,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNavigate, useParams } from 'react-router-dom'
import { visitService } from '../../services/visitService'
import { Visit, VisitStatus } from '../../types/visit'
import { VisitStatusBadge } from '../../components/visits/VisitStatusBadge'

const VisitDetailsPage: React.FC = () => {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()

	const [visit, setVisit] = useState<Visit | null>(null)
	const [loading, setLoading] = useState(true)
	const [actionLoading, setActionLoading] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

	const loadVisit = async () => {
		if (!id) return
		setLoading(true)
		try {
			const data = await visitService.getVisitById(id)
			setVisit(data)
		} catch (err) {
			console.error('Ошибка загрузки визита:', err)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadVisit()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id])

	const handleStatusChange = async (newStatus: VisitStatus) => {
		if (!id) return
		setActionLoading(true)
		try {
			const updated = await visitService.updateStatus(id, newStatus)
			setVisit(updated)
		} catch (err) {
			console.error('Ошибка обновления статуса:', err)
		} finally {
			setActionLoading(false)
		}
	}

	const handleDelete = async () => {
		if (!id) return
		setActionLoading(true)
		try {
			await visitService.deleteVisit(id)
			navigate('/visits')
		} catch (err) {
			console.error('Ошибка удаления визита:', err)
			setActionLoading(false)
		}
	}

	const handleEditClick = () => {
		alert('Редактирование визита будет доступно в следующей версии.')
	}

	if (loading) {
		return (
			<Box display='flex' justifyContent='center' py={8}>
				<CircularProgress />
			</Box>
		)
	}

	if (!visit) {
		return (
			<Box p={3}>
				<Typography color='text.secondary'>Визит не найден</Typography>
				<Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/visits')} sx={{ mt: 2 }}>
					Назад к списку
				</Button>
			</Box>
		)
	}

	const formattedDate = new Date(visit.date).toLocaleString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})

	const companyName = visit.company?.name ?? visit.companyName ?? '—'

	const userName = visit.user
		? `${visit.user.firstName} ${visit.user.lastName}`.trim() || visit.user.email
		: visit.userName ?? '—'

	return (
		<Box p={3} maxWidth={700} mx='auto'>
			<Button
				startIcon={<ArrowBackIcon />}
				onClick={() => navigate('/visits')}
				sx={{ mb: 2 }}
			>
				Назад к списку
			</Button>

			<Card variant='outlined'>
				<CardContent>
					<Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
						<Typography variant='h6' fontWeight={600}>
							Визит
						</Typography>
						<VisitStatusBadge status={visit.status} />
					</Box>

					<Divider sx={{ mb: 2 }} />

					<Stack spacing={1.5}>
						<Box>
							<Typography variant='caption' color='text.secondary'>
								Компания
							</Typography>
							<Typography variant='body1'>{companyName}</Typography>
						</Box>

						<Box>
							<Typography variant='caption' color='text.secondary'>
								Дата и время
							</Typography>
							<Typography variant='body1'>{formattedDate}</Typography>
						</Box>

						<Box>
							<Typography variant='caption' color='text.secondary'>
								Ответственный
							</Typography>
							<Typography variant='body1'>{userName}</Typography>
						</Box>

						{visit.visitType && (
							<Box>
								<Typography variant='caption' color='text.secondary'>
									Тип визита
								</Typography>
								<Typography variant='body1'>{visit.visitType}</Typography>
							</Box>
						)}

						{visit.comment && (
							<Box>
								<Typography variant='caption' color='text.secondary'>
									Комментарий
								</Typography>
								<Typography variant='body1' sx={{ whiteSpace: 'pre-wrap' }}>
									{visit.comment}
								</Typography>
							</Box>
						)}

						{visit.bitrixId && (
							<Box>
								<Typography variant='caption' color='text.secondary'>
									Bitrix24 ID
								</Typography>
								<Typography variant='body1'>{visit.bitrixId}</Typography>
							</Box>
						)}
					</Stack>

					<Divider sx={{ mt: 3, mb: 2 }} />

					{/* Action buttons */}
					<Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
						{visit.status === 'planned' && (
							<>
								<Button
									variant='contained'
									color='success'
									size='small'
									disabled={actionLoading}
									onClick={() => handleStatusChange('completed')}
								>
									Выполнен
								</Button>
								<Button
									variant='outlined'
									color='warning'
									size='small'
									disabled={actionLoading}
									onClick={() => handleStatusChange('cancelled')}
								>
									Отменить
								</Button>
								<Button
									variant='outlined'
									color='error'
									size='small'
									disabled={actionLoading}
									onClick={() => handleStatusChange('failed')}
								>
									Неудачный
								</Button>
							</>
						)}

						<Box sx={{ flexGrow: 1 }} />

						<Button
							variant='outlined'
							size='small'
							disabled={actionLoading}
							onClick={handleEditClick}
						>
							Редактировать
						</Button>
						<Button
							variant='outlined'
							color='error'
							size='small'
							disabled={actionLoading}
							onClick={() => setDeleteDialogOpen(true)}
						>
							Удалить
						</Button>
					</Stack>
				</CardContent>
			</Card>

			{/* Delete confirmation dialog */}
			<Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
				<DialogTitle>Удалить визит?</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Это действие нельзя отменить. Визит будет удалён безвозвратно.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteDialogOpen(false)} disabled={actionLoading}>
						Отмена
					</Button>
					<Button
						color='error'
						variant='contained'
						onClick={handleDelete}
						disabled={actionLoading}
					>
						Удалить
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	)
}

export default VisitDetailsPage
