import React, { useState } from 'react'
import {
	Box,
	Typography,
	Button,
	Alert,
	CircularProgress,
	Paper,
	Stack,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	LinearProgress,
	Card,
	CardContent,
	Divider,
} from '@mui/material'
import SyncIcon from '@mui/icons-material/Sync'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import InfoIcon from '@mui/icons-material/Info'
import { useSyncNomenclature, useSyncErrors, useNomenclatureStats } from '../hooks/useNomenclature'
import { SyncResult } from '../../../../services/nomenclatureService'

export const SyncPanel: React.FC = () => {
	const [lastResult, setLastResult] = useState<SyncResult | null>(null)

	const syncMutation = useSyncNomenclature()
	const { data: syncErrors, isLoading: loadingErrors, refetch: refetchErrors } = useSyncErrors()
	const { data: stats, refetch: refetchStats } = useNomenclatureStats()

	const handleSync = async () => {
		try {
			const result = await syncMutation.mutateAsync()
			setLastResult(result)
			refetchErrors()
			refetchStats()
		} catch (err) {
			console.error('Sync error:', err)
		}
	}

	return (
		<Box>
			{/* Info */}
			<Alert severity='info' sx={{ mb: 3 }}>
				<Typography variant='body2'>
					Синхронизация загружает товары из Bitrix24 и обновляет локальную базу номенклатуры.
					Существующие товары будут обновлены, новые — добавлены.
				</Typography>
			</Alert>

			{/* Stats Cards */}
			<Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3}>
				<Card sx={{ flexGrow: 1 }}>
					<CardContent>
						<Stack direction='row' alignItems='center' spacing={1} mb={1}>
							<CheckCircleIcon color='success' />
							<Typography variant='subtitle2'>Синхронизировано</Typography>
						</Stack>
						<Typography variant='h4'>
							{stats?.synced || 0}
						</Typography>
					</CardContent>
				</Card>

				<Card sx={{ flexGrow: 1 }}>
					<CardContent>
						<Stack direction='row' alignItems='center' spacing={1} mb={1}>
							<InfoIcon color='primary' />
							<Typography variant='subtitle2'>Только локально</Typography>
						</Stack>
						<Typography variant='h4'>
							{stats?.localOnly || 0}
						</Typography>
					</CardContent>
				</Card>

				<Card sx={{ flexGrow: 1 }}>
					<CardContent>
						<Stack direction='row' alignItems='center' spacing={1} mb={1}>
							<WarningIcon color='warning' />
							<Typography variant='subtitle2'>Ожидает синхронизации</Typography>
						</Stack>
						<Typography variant='h4'>
							{stats?.pending || 0}
						</Typography>
					</CardContent>
				</Card>

				<Card sx={{ flexGrow: 1 }}>
					<CardContent>
						<Stack direction='row' alignItems='center' spacing={1} mb={1}>
							<ErrorIcon color='error' />
							<Typography variant='subtitle2'>С ошибками</Typography>
						</Stack>
						<Typography variant='h4' color={stats?.errors ? 'error' : 'inherit'}>
							{stats?.errors || 0}
						</Typography>
					</CardContent>
				</Card>
			</Stack>

			{/* Sync Button */}
			<Paper sx={{ p: 3, mb: 3 }}>
				<Stack
					direction={{ xs: 'column', sm: 'row' }}
					spacing={2}
					alignItems={{ xs: 'stretch', sm: 'center' }}
					justifyContent='space-between'
				>
					<Box>
						<Typography variant='h6' gutterBottom>
							Синхронизация с Bitrix24
						</Typography>
						<Typography variant='body2' color='text.secondary'>
							Нажмите кнопку для запуска синхронизации товаров
						</Typography>
					</Box>
					<Button
						variant='contained'
						size='large'
						startIcon={
							syncMutation.isPending ? (
								<CircularProgress size={20} color='inherit' />
							) : (
								<SyncIcon />
							)
						}
						onClick={handleSync}
						disabled={syncMutation.isPending}
						sx={{ minWidth: 200 }}
					>
						{syncMutation.isPending ? 'Синхронизация...' : 'Синхронизировать'}
					</Button>
				</Stack>

				{syncMutation.isPending && (
					<Box sx={{ mt: 2 }}>
						<LinearProgress />
						<Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
							Загрузка товаров из Bitrix24. Это может занять несколько минут...
						</Typography>
					</Box>
				)}
			</Paper>

			{/* Last Sync Result */}
			{lastResult && (
				<Paper sx={{ p: 3, mb: 3 }}>
					<Typography variant='h6' gutterBottom>
						Результат синхронизации
					</Typography>

					<Alert
						severity={lastResult.errors > 0 ? 'warning' : 'success'}
						sx={{ mb: 2 }}
					>
						{lastResult.message}
					</Alert>

					<Stack direction='row' spacing={1} flexWrap='wrap'>
						<Chip
							icon={<CheckCircleIcon />}
							label={`Создано: ${lastResult.created}`}
							color='success'
						/>
						<Chip
							icon={<CheckCircleIcon />}
							label={`Обновлено: ${lastResult.updated}`}
							color='primary'
						/>
						{lastResult.errors > 0 && (
							<Chip
								icon={<ErrorIcon />}
								label={`Ошибок: ${lastResult.errors}`}
								color='error'
							/>
						)}
					</Stack>

					{lastResult.errorDetails && lastResult.errorDetails.length > 0 && (
						<Box sx={{ mt: 2 }}>
							<Divider sx={{ my: 2 }} />
							<Typography variant='subtitle2' gutterBottom>
								Детали ошибок:
							</Typography>
							<TableContainer sx={{ maxHeight: 200 }}>
								<Table size='small'>
									<TableHead>
										<TableRow>
											<TableCell>Bitrix ID</TableCell>
											<TableCell>Ошибка</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{lastResult.errorDetails.slice(0, 10).map((err, index) => (
											<TableRow key={index}>
												<TableCell>{err.id}</TableCell>
												<TableCell>{err.message || 'Неизвестная ошибка'}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
							{lastResult.errorDetails.length > 10 && (
								<Typography variant='caption' color='text.secondary'>
									... и ещё {lastResult.errorDetails.length - 10} ошибок
								</Typography>
							)}
						</Box>
					)}
				</Paper>
			)}

			{/* Mutation Error */}
			{syncMutation.error && (
				<Alert severity='error' sx={{ mb: 3 }}>
					Ошибка синхронизации: {(syncMutation.error as Error).message}
				</Alert>
			)}

			{/* Items with Sync Errors */}
			<Paper sx={{ p: 3 }}>
				<Typography variant='h6' gutterBottom>
					Номенклатура с ошибками синхронизации
				</Typography>

				{loadingErrors ? (
					<Box display='flex' justifyContent='center' py={4}>
						<CircularProgress />
					</Box>
				) : syncErrors && syncErrors.length > 0 ? (
					<TableContainer sx={{ maxHeight: 400 }}>
						<Table size='small' stickyHeader>
							<TableHead>
								<TableRow>
									<TableCell>Артикул</TableCell>
									<TableCell>Название</TableCell>
									<TableCell>Bitrix ID</TableCell>
									<TableCell>Ошибка</TableCell>
									<TableCell>Последняя синхронизация</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{syncErrors.map(item => (
									<TableRow key={item.id}>
										<TableCell>
											<Chip label={item.sku} size='small' variant='outlined' />
										</TableCell>
										<TableCell>{item.name}</TableCell>
										<TableCell>{item.bitrixProductId || '-'}</TableCell>
										<TableCell>
											<Typography variant='body2' color='error'>
												{(typeof item.syncError === 'string'
													? item.syncError
													: item.syncError?.message) || 'Неизвестная ошибка'}
											</Typography>
										</TableCell>
										<TableCell>
											{item.lastSyncAt
												? new Date(item.lastSyncAt).toLocaleString('ru-RU')
												: '-'}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				) : (
					<Alert severity='success'>
						Нет номенклатуры с ошибками синхронизации
					</Alert>
				)}
			</Paper>
		</Box>
	)
}
