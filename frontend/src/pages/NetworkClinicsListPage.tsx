import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Box,
    Card,
    CardContent,
    CircularProgress,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    IconButton,
    Button,
    Chip,
    Alert,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Snackbar,
    useTheme,
    useMediaQuery,
    TableSortLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Fab
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import { clinicService, Clinic, ClinicFilters, ClinicInput } from '../services/clinicService'
import { useAuth } from '../context/AuthContext'
import LprCell from './LprCell'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'


const NetworkClinicsListPage: React.FC = () => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { user } = useAuth()
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))

    const [filters, setFilters] = useState<ClinicFilters>({
        page: 1,
        page_size: 10,
        region: user?.regions?.length === 1 ? user.regions[0] : undefined,
        sort_by: 'name',
        sort_direction: 'asc',
    })

    const [searchName, setSearchName] = useState('')
    const [loading, setLoading] = useState<number | null>(null)
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info' | 'warning';
    }>({
        open: false,
        message: '',
        severity: 'info',
    })

    // Состояния для модального окна создания компании
    const [createModalOpen, setCreateModalOpen] = useState(false)
    const [newCompany, setNewCompany] = useState<{
        name: string;
        bitrixId: string;
        sync_status: string;
        companyId: number | null;
    }>({
        name: '',
        bitrixId: '',
        sync_status: '',
        companyId: null,
    })

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const pageParam = urlParams.get('page')
        const pageSizeParam = urlParams.get('page_size')
        const nameParam = urlParams.get('name')
        const sortByParam = urlParams.get('sort_by')
        const sortDirectionParam = urlParams.get('sort_direction')

        const initialFilters: ClinicFilters = {
            page: pageParam ? parseInt(pageParam) : 1,
            page_size: pageSizeParam ? parseInt(pageSizeParam) : 10,
            sort_by: sortByParam || 'name',
            sort_direction: (sortDirectionParam as 'asc' | 'desc') || 'asc',
        }

        if (nameParam) {
            initialFilters.name = nameParam
            setSearchName(nameParam)
        }


        setFilters(initialFilters)
    }, [])

    useEffect(() => {
        const urlParams = new URLSearchParams()
        if (filters.page && filters.page > 1)
            urlParams.set('page', filters.page.toString())
        if (filters.page_size && filters.page_size !== 10)
            urlParams.set('page_size', filters.page_size.toString())
        if (filters.region) urlParams.set('region', filters.region)
        if (filters.name) urlParams.set('name', filters.name)
        if (filters.inn) urlParams.set('inn', filters.inn)
        if (filters.sort_by) urlParams.set('sort_by', filters.sort_by)
        if (filters.sort_direction) urlParams.set('sort_direction', filters.sort_direction)

        const queryString = urlParams.toString()
        const newUrl = queryString ? `?${queryString}` : window.location.pathname

        window.history.replaceState({}, '', newUrl)
    }, [filters])


    const { bitrixId } = useParams<{ bitrixId: string }>()
    if (!bitrixId) {
        return <div>Нет данных</div>
    }
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // const { data, isLoading, isError } = useQuery(
    //     ['networkClinic', bitrixId],
    //     () => clinicService.getNetworkClinics(bitrixId),
    //     {
    //         keepPreviousData: true,
    //     }
    // )

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data, isLoading, isError } = useQuery(
        ['networkClinic', bitrixId, filters],
        () => clinicService.getNetworkClinics(bitrixId, filters),
        {
            keepPreviousData: true,
        }
    )

    // Мутация для создания новой компании
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const createClinicMutation = useMutation(
        async (clinicData: ClinicInput) => {
            return clinicService.createNetworkClinic(clinicData)
        },
        {
            onSuccess: (data) => {
                queryClient.invalidateQueries(['clinics'])

                setSnackbar({
                    open: true,
                    message: 'Компания успешно создана',
                    severity: 'success'
                })

                handleCloseCreateModal()

                clinicService.getNetworkClinic(data?.bitrix_id)
                    .then((clinic: Clinic) => {
                        handleEditClick(clinic);
                    })
                    .catch((error: any) => {
                        navigate(`/networkClinics/${data.bitrix_id}/edit`, {
                            state: {
                                directOpen: true
                            }
                        });
                    });
            },
            onError: (error: any) => {
                setSnackbar({
                    open: true,
                    message: `Ошибка при создании компании: ${error?.response?.data?.detail || error.message || 'Неизвестная ошибка'}`,
                    severity: 'error'
                })
            }
        }
    )

    const handlePageChange = (event: unknown, newPage: number) => {
        setFilters({ ...filters, page: newPage + 1 })
    }

    // Функция для закрытия уведомлений
    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    }

    const handleRowsPerPageChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setFilters({
            ...filters,
            page: 1,
            page_size: parseInt(event.target.value, 10),
        })
    }


    const handleSortRequest = (column: string) => {
        const isAsc = filters.sort_by === column && filters.sort_direction === 'asc'
        setFilters({
            ...filters,
            sort_by: column,
            sort_direction: isAsc ? 'desc' : 'asc',
        })
    }

    const getSyncStatusColor = (status: string) => {
        switch (status) {
            case 'synced':
                return 'success'
            case 'pending':
                return 'warning'
            case 'error':
                return 'error'
            default:
                return 'default'
        }
    }


    const handleEditClick = (clinic: any) => {
        console.log('=== НАЖАТА КНОПКА РЕДАКТИРОВАНИЯ ===');
        console.log('Информация о клинике:', clinic);
        setLoading(clinic.bitrix_id);



        // БЕЗУСЛОВНЫЙ ПЕРЕХОД к карточке клиники в первую очередь
        // Исправляем маршрут в соответствии с конфигурацией в App.tsx
        console.log('Выполняем навигацию к /networkClinics/' + clinic.bitrix_id + '/edit');
        navigate(`/networkClinics/${clinic.bitrix_id}/edit`, {
            state: {
                directOpen: true
            }
        });



        if (!clinic.bitrix_id && clinic.inn) {
            setSnackbar({
                open: true,
                message: 'Поиск/создание компании в Битрикс...',
                severity: 'info'
            });


            clinicService.findOrCreateInBitrix(clinic.id)
                .then(result => {
                    console.log('Результат синхронизации:', result);
                    if (result.success) {
                        // Успешная синхронизация
                        console.log('Синхронизация успешна, обновляем UI');
                        setSnackbar({
                            open: true,
                            message: result.message,
                            severity: 'success'
                        });


                        queryClient.invalidateQueries(['clinics']);
                        queryClient.invalidateQueries(['clinic', clinic.id.toString()]);
                    } else {
                        // Ошибка при синхронизации
                        setSnackbar({
                            open: true,
                            message: result.message || 'Ошибка синхронизации с Битрикс',
                            severity: 'error'
                        });
                    }
                })
                .catch(error => {
                    console.error('Ошибка при работе с Битрикс:', error);
                    setSnackbar({
                        open: true,
                        message: 'Произошла ошибка при работе с Битрикс',
                        severity: 'error'
                    });
                })
                .finally(() => {

                    setLoading(null);
                });
        }
    }

    const handleCreateCompany = () => {
        if (!newCompany.name) {
            setSnackbar({
                open: true,
                message: 'Пожалуйста, заполните обязательные поля: Название',
                severity: 'warning'
            });
            return;
        }
        console.log('!!!!!!DATA=', data)
        const baseData = {
            name: newCompany.name,
            dynamic_fields: {
            },
            companyId: bitrixId,
        };

        const createCompanyData = {
            name: baseData.name,
            company_id: Number(bitrixId),
            dynamic_fields: baseData.dynamic_fields
        };

        console.log('Отправка данных для создания компании:', createCompanyData);

        createClinicMutation.mutate(createCompanyData as any);
    };;


    const handleOpenCreateModal = () => {
        setNewCompany({
            name: '',
            sync_status: '',
            bitrixId: '',
            companyId: null,
        });
        setCreateModalOpen(true);
    };

    const handleCloseCreateModal = () => {
        setCreateModalOpen(false);
        setConfirmDialogOpen(false);
    };

    const handleNewCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewCompany({ ...newCompany, [name]: value });
    };




    if (isLoading) {
        return (
            <Box
                display='flex'
                justifyContent='center'
                alignItems='center'
                minHeight='80vh'
            >
                <CircularProgress />
            </Box>
        )
    }

    if (isError) {
        return (
            <Box p={3}>
                <Alert severity='error'>
                    Ошибка при загрузке филиалов. Попробуйте еще раз
                </Alert>
            </Box>
        )
    }

    const renderMobileClinicCard = (clinic: Clinic) => (
        <Card sx={{ mb: 2, position: 'relative' }} key={clinic.id}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    {clinic.name}
                </Typography>

                <Grid container spacing={1}>
                    <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                            Филиал:
                        </Typography>
                        <Typography variant="body1">
                            {clinic.name || '-'}
                        </Typography>
                    </Grid>

                    <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                            Bitrix ID:
                        </Typography>
                        <Typography variant="body1">
                            {clinic.bitrix_id || '-'}
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sx={{ mt: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Chip
                                size='small'
                                label={clinic.sync_status}
                                color={getSyncStatusColor(clinic.sync_status)}
                            />

                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={loading === clinic.bitrix_id ? <CircularProgress size={16} /> : <EditIcon />}
                                onClick={() => handleEditClick(clinic)}
                                disabled={loading === clinic.bitrix_id}
                            >
                                Редактировать
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ p: 3 }}>

			<Card style={{ marginBottom: '24px' }}>
				<CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
					<Grid container spacing={2} alignItems="center" wrap="nowrap">
						<Grid item xs="auto" container alignItems="center" wrap="nowrap">
							<IconButton
								onClick={() => navigate(-1)}
								aria-label="Назад"
								size="small"
								color="primary"
							>
								<ArrowBackIcon />
							</IconButton>
							<Typography variant="h6" sx={{ ml: 1, fontWeight: 700 }}>
							  Сетевые клиники
							</Typography>
						</Grid>
					</Grid>
				</CardContent>
			</Card>




            <Card>
                <CardContent>
                    {data?.length === 0 ? (
                        <Alert severity='info'>
                            Не найдено компаний с указанными параметрами фильтрации
                        </Alert>
                    ) : (
                        <>
							<Box>
								<Box sx={{ mb: 2 }}>
									<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
										Найдено: {data?.length} филиалов
									</Typography>
									{/* Сортировка */}
									<FormControl variant="outlined" size="small" sx={{ width: '100%' }}>
										<InputLabel id="mobile-sort-label">Сортировка</InputLabel>
										<Select
											labelId="mobile-sort-label"
											value={`${filters.sort_by}|${filters.sort_direction}`}
											label="Сортировка"
											MenuProps={{
												PaperProps: { style: { maxHeight: 300 } },
												anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
												transformOrigin: { vertical: 'top', horizontal: 'center' },
											}}
											onChange={(e) => {
												const [sortBy, sortDirection] = e.target.value.split('|')
												setFilters({
													...filters,
													sort_by: sortBy,
													sort_direction: sortDirection as 'asc' | 'desc',
												})
											}}
										>
											<MenuItem value="name|asc">Название (А-Я)</MenuItem>
											<MenuItem value="name|desc">Название (Я-А)</MenuItem>
										</Select>
									</FormControl>
								</Box>

								{data.data?.map((clinic: any) => renderMobileClinicCard(clinic))}
							</Box>

                            <TablePagination
                                component='div'
                                count={data?.length || 0}
                                page={(filters.page || 1) - 1}
                                rowsPerPage={filters.page_size || 10}
                                onPageChange={handlePageChange}
                                onRowsPerPageChange={handleRowsPerPageChange}
                                rowsPerPageOptions={[5, 10, 25, 50, 100]}
                                labelRowsPerPage={isMobile ? 'Строк:' : 'Строк на странице:'}
                                labelDisplayedRows={({ from, to, count }) =>
                                    `${from}-${to} из ${count}`
                                }
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Snackbar для уведомлений */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                message={snackbar.message}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            />

            {/* Модальное окно создания компании */}
            <Dialog open={createModalOpen} onClose={handleCloseCreateModal} maxWidth="sm" fullWidth>
                <DialogTitle>Создание новой компании</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Название компании"
                            name="name"
                            value={newCompany.name}
                            onChange={handleNewCompanyChange}
                            fullWidth
                            required
                        />


                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCreateModal} color="inherit">
                        Отмена
                    </Button>
                    <Button
                        onClick={handleCreateCompany}
                        color="primary"
                        variant="contained"
                        disabled={!newCompany.name}
                    >
                        Создать
                    </Button>
                </DialogActions>
            </Dialog>

			<Fab
				color="primary"
				onClick={handleOpenCreateModal}
				sx={{
					position: 'fixed',
					bottom: 84, // Above bottom nav
					right: 'calc(50% - 280px)', // Centered wrapper logic
					'@media (max-width: 600px)': {
						right: 20,
					}
				}}
			>
				<AddCircleOutlineIcon fontSize="large" />
			</Fab>
        </Box>
    )
}

export default NetworkClinicsListPage