import React, { useState } from 'react'
import {
	Container,
	Typography,
	Box,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Button,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	IconButton,
	Chip,
	Alert,
	CircularProgress,
	Stack,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Tooltip,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import PeopleIcon from '@mui/icons-material/People'
import DeleteIcon from '@mui/icons-material/Delete'
import BusinessIcon from '@mui/icons-material/Business'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { organizationService } from '../../../services/organizationService'
import {
	Organization,
	OrganizationMember,
	OrganizationRole,
	CreateOrganizationData,
	AddMemberData,
} from '../../../types/organization'

const roleLabels: Record<OrganizationRole, string> = {
	org_admin: 'Администратор',
	manager: 'Менеджер',
	distributor: 'Дистрибьютор',
}

const OrganizationsPage: React.FC = () => {
	const queryClient = useQueryClient()
	const navigate = useNavigate()

	// Состояния диалогов
	const [createDialogOpen, setCreateDialogOpen] = useState(false)
	const [membersDialogOpen, setMembersDialogOpen] = useState(false)
	const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false)
	const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
	const [error, setError] = useState<string | null>(null)

	// Форма создания организации
	const [createForm, setCreateForm] = useState<CreateOrganizationData>({
		name: '',
		slug: '',
		inn: '',
	})

	// Форма добавления участника
	const [memberForm, setMemberForm] = useState<AddMemberData>({
		email: '',
		role: 'manager',
	})

	// Запрос списка организаций
	const {
		data: organizations = [],
		isLoading,
		error: loadError,
	} = useQuery<Organization[]>({
		queryKey: ['organizations'],
		queryFn: () => organizationService.getAll(),
	})

	// Запрос участников выбранной организации
	const {
		data: members = [],
		isLoading: membersLoading,
	} = useQuery<OrganizationMember[]>({
		queryKey: ['organization-members', selectedOrg?.id],
		queryFn: () => organizationService.getMembers(selectedOrg!.id),
		enabled: !!selectedOrg && membersDialogOpen,
	})

	// Мутация создания организации
	const createMutation = useMutation({
		mutationFn: (data: CreateOrganizationData) =>
			organizationService.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['organizations'] })
			setCreateDialogOpen(false)
			setCreateForm({ name: '', slug: '', inn: '' })
			setError(null)
		},
		onError: (err: any) => {
			setError(err.response?.data?.message || err.message || 'Ошибка создания')
		},
	})

	// Мутация добавления участника
	const addMemberMutation = useMutation({
		mutationFn: (data: AddMemberData) =>
			organizationService.addMember(selectedOrg!.id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['organization-members', selectedOrg?.id],
			})
			setAddMemberDialogOpen(false)
			setMemberForm({ email: '', role: 'manager' })
			setError(null)
		},
		onError: (err: any) => {
			setError(
				err.response?.data?.message || err.message || 'Ошибка добавления'
			)
		},
	})

	// Мутация удаления участника
	const removeMemberMutation = useMutation({
		mutationFn: (userId: string) =>
			organizationService.removeMember(selectedOrg!.id, userId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['organization-members', selectedOrg?.id],
			})
		},
		onError: (err: any) => {
			setError(err.response?.data?.message || err.message || 'Ошибка удаления')
		},
	})

	const handleCreateOrg = () => {
		if (!createForm.name.trim() || !createForm.slug.trim()) {
			setError('Заполните название и slug')
			return
		}
		setError(null)
		createMutation.mutate(createForm)
	}

	const handleAddMember = () => {
		if (!memberForm.email.trim()) {
			setError('Заполните email')
			return
		}
		setError(null)
		addMemberMutation.mutate(memberForm)
	}

	const handleRemoveMember = (userId: string) => {
		if (window.confirm('Удалить участника из организации?')) {
			removeMemberMutation.mutate(userId)
		}
	}

	const handleOpenMembers = (org: Organization) => {
		setSelectedOrg(org)
		setMembersDialogOpen(true)
		setError(null)
	}

	// Автогенерация slug из названия
	const handleNameChange = (name: string) => {
		const slug = name
			.toLowerCase()
			.replace(/[^a-zа-яё0-9\s-]/gi, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
		setCreateForm(prev => ({ ...prev, name, slug }))
	}

	if (isLoading) {
		return (
			<Box display='flex' justifyContent='center' py={6}>
				<CircularProgress />
			</Box>
		)
	}

	return (
		<Container maxWidth='lg' sx={{ mt: 3, mb: 6 }}>
			{/* Заголовок */}
			<Paper
				elevation={0}
				sx={{
					p: { xs: 2, md: 3 },
					mb: 3,
					borderRadius: 3,
					border: '1px solid',
					borderColor: 'divider',
					background: theme =>
						`linear-gradient(135deg, ${alpha(
							theme.palette.primary.main,
							0.12
						)}, ${alpha(theme.palette.primary.main, 0.02)})`,
				}}
			>
				<Stack
					direction='row'
					alignItems='center'
					justifyContent='space-between'
				>
					<Box>
						<Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1 }}>
							<BusinessIcon sx={{ color: 'primary.main' }} />
							<Typography
								variant='overline'
								color='text.secondary'
								sx={{ letterSpacing: '0.08em' }}
							>
								Управление
							</Typography>
						</Stack>
						<Typography variant='h4' fontWeight={700} gutterBottom>
							Организации
						</Typography>
						<Typography variant='body1' color='text.secondary'>
							Управление организациями и их участниками
						</Typography>
					</Box>
					<Stack direction='row' spacing={1}>
						<Button
							variant='outlined'
							startIcon={<ArrowBackIcon />}
							onClick={() => navigate('/admin')}
							sx={{ textTransform: 'none' }}
						>
							Назад
						</Button>
						<Button
							variant='contained'
							startIcon={<AddIcon />}
							onClick={() => {
								setError(null)
								setCreateDialogOpen(true)
							}}
							sx={{ textTransform: 'none' }}
						>
							Создать организацию
						</Button>
					</Stack>
				</Stack>
			</Paper>

			{loadError && (
				<Alert severity='error' sx={{ mb: 3 }}>
					Ошибка загрузки организаций
				</Alert>
			)}

			{/* Таблица организаций */}
			<TableContainer
				component={Paper}
				elevation={0}
				sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
			>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell>Название</TableCell>
							<TableCell>Slug</TableCell>
							<TableCell>ИНН</TableCell>
							<TableCell>Дата создания</TableCell>
							<TableCell align='right'>Действия</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{organizations.length === 0 ? (
							<TableRow>
								<TableCell colSpan={5} align='center' sx={{ py: 4 }}>
									<Typography color='text.secondary'>
										Нет организаций
									</Typography>
								</TableCell>
							</TableRow>
						) : (
							organizations.map(org => (
								<TableRow key={org.id} hover>
									<TableCell>
										<Typography fontWeight={600}>
											{org.name}
										</Typography>
									</TableCell>
									<TableCell>
										<Chip
											label={org.slug}
											size='small'
											variant='outlined'
										/>
									</TableCell>
									<TableCell>{org.inn || '-'}</TableCell>
									<TableCell>
										{org.createdAt
											? new Date(org.createdAt).toLocaleDateString(
													'ru-RU'
											  )
											: '-'}
									</TableCell>
									<TableCell align='right'>
										<Tooltip title='Участники'>
											<IconButton
												onClick={() => handleOpenMembers(org)}
												color='primary'
											>
												<PeopleIcon />
											</IconButton>
										</Tooltip>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</TableContainer>

			{/* Диалог создания организации */}
			<Dialog
				open={createDialogOpen}
				onClose={() => setCreateDialogOpen(false)}
				maxWidth='sm'
				fullWidth
			>
				<DialogTitle>Создать организацию</DialogTitle>
				<DialogContent>
					{error && (
						<Alert severity='error' sx={{ mb: 2 }}>
							{error}
						</Alert>
					)}
					<TextField
						label='Название'
						fullWidth
						margin='normal'
						value={createForm.name}
						onChange={e => handleNameChange(e.target.value)}
						required
					/>
					<TextField
						label='Slug (URL-идентификатор)'
						fullWidth
						margin='normal'
						value={createForm.slug}
						onChange={e =>
							setCreateForm(prev => ({
								...prev,
								slug: e.target.value,
							}))
						}
						required
						helperText='Латиница, цифры и дефисы'
					/>
					<TextField
						label='ИНН'
						fullWidth
						margin='normal'
						value={createForm.inn}
						onChange={e =>
							setCreateForm(prev => ({
								...prev,
								inn: e.target.value,
							}))
						}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
					<Button
						onClick={handleCreateOrg}
						variant='contained'
						disabled={createMutation.isPending}
					>
						{createMutation.isPending ? (
							<CircularProgress size={20} />
						) : (
							'Создать'
						)}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Диалог участников */}
			<Dialog
				open={membersDialogOpen}
				onClose={() => setMembersDialogOpen(false)}
				maxWidth='md'
				fullWidth
			>
				<DialogTitle>
					Участники: {selectedOrg?.name}
				</DialogTitle>
				<DialogContent>
					{error && (
						<Alert severity='error' sx={{ mb: 2 }}>
							{error}
						</Alert>
					)}

					<Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
						<Button
							startIcon={<AddIcon />}
							variant='outlined'
							size='small'
							onClick={() => {
								setError(null)
								setAddMemberDialogOpen(true)
							}}
						>
							Добавить участника
						</Button>
					</Box>

					{membersLoading ? (
						<Box display='flex' justifyContent='center' py={3}>
							<CircularProgress />
						</Box>
					) : (
						<Table size='small'>
							<TableHead>
								<TableRow>
									<TableCell>Имя</TableCell>
									<TableCell>Email</TableCell>
									<TableCell>Роль</TableCell>
									<TableCell>Дата вступления</TableCell>
									<TableCell align='right'>Действия</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{members.length === 0 ? (
									<TableRow>
										<TableCell colSpan={5} align='center' sx={{ py: 3 }}>
											<Typography color='text.secondary'>
												Нет участников
											</Typography>
										</TableCell>
									</TableRow>
								) : (
									members.map(member => (
										<TableRow key={member.id} hover>
											<TableCell>
												{member.fullName ||
													[member.firstName, member.lastName]
														.filter(Boolean)
														.join(' ') ||
													'-'}
											</TableCell>
											<TableCell>{member.email}</TableCell>
											<TableCell>
												<Chip
													label={
														roleLabels[member.role] ||
														member.role
													}
													size='small'
													color={
														member.role === 'org_admin'
															? 'primary'
															: 'default'
													}
													variant='outlined'
												/>
											</TableCell>
											<TableCell>
												{member.joinedAt
													? new Date(
															member.joinedAt
													  ).toLocaleDateString('ru-RU')
													: '-'}
											</TableCell>
											<TableCell align='right'>
												<Tooltip title='Удалить'>
													<IconButton
														size='small'
														color='error'
														onClick={() =>
															handleRemoveMember(
																member.userId
															)
														}
														disabled={
															removeMemberMutation.isPending
														}
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
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setMembersDialogOpen(false)}>Закрыть</Button>
				</DialogActions>
			</Dialog>

			{/* Диалог добавления участника */}
			<Dialog
				open={addMemberDialogOpen}
				onClose={() => setAddMemberDialogOpen(false)}
				maxWidth='sm'
				fullWidth
			>
				<DialogTitle>Добавить участника</DialogTitle>
				<DialogContent>
					{error && (
						<Alert severity='error' sx={{ mb: 2 }}>
							{error}
						</Alert>
					)}
					<TextField
						label='Email пользователя'
						fullWidth
						margin='normal'
						type='email'
						value={memberForm.email}
						onChange={e =>
							setMemberForm(prev => ({
								...prev,
								email: e.target.value,
							}))
						}
						required
					/>
					<FormControl fullWidth margin='normal'>
						<InputLabel>Роль</InputLabel>
						<Select
							value={memberForm.role}
							label='Роль'
							onChange={e =>
								setMemberForm(prev => ({
									...prev,
									role: e.target.value as OrganizationRole,
								}))
							}
						>
							<MenuItem value='org_admin'>Администратор</MenuItem>
							<MenuItem value='manager'>Менеджер</MenuItem>
							<MenuItem value='distributor'>Дистрибьютор</MenuItem>
						</Select>
					</FormControl>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setAddMemberDialogOpen(false)}>
						Отмена
					</Button>
					<Button
						onClick={handleAddMember}
						variant='contained'
						disabled={addMemberMutation.isPending}
					>
						{addMemberMutation.isPending ? (
							<CircularProgress size={20} />
						) : (
							'Добавить'
						)}
					</Button>
				</DialogActions>
			</Dialog>
		</Container>
	)
}

export default OrganizationsPage
