import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubmissionFilters } from '../../../../services/submissionService';
import submissionService from '../../../../services/submissionService';
import api from '../../../../services/api';
import { useAuth } from '../../../../contexts/auth';
import { MySubmissionsState, BitrixStage, User } from '../types';
import { DEFAULT_ROWS_PER_PAGE, DEFAULT_STATUS_LABELS } from '../constants';

export const useMySubmissions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [state, setState] = useState<MySubmissionsState>({
    submissions: [],
    loading: true,
    error: null,
    page: 0,
    rowsPerPage: DEFAULT_ROWS_PER_PAGE,
    total: 0,
    filters: {}
  });

  const [bitrixStages, setBitrixStages] = useState<BitrixStage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statusLabels, setStatusLabels] = useState(DEFAULT_STATUS_LABELS);

  // Проверяем, является ли пользователь администратором
  const isAdmin = user?.role === 'admin';

  // Загрузка статусов из Битрикс24
  const loadBitrixStages = async () => {
    try {
      const response = await submissionService.getBitrixDealStages('1');
      
      if (response.success && response.data && response.data.length > 0) {
        setBitrixStages(response.data);
      }
    } catch (err: any) {
      console.error('Ошибка загрузки статусов из Битрикс24:', err);
    }
  };

  // Загрузка пользователей для фильтра (только для админов)
  const loadUsers = async () => {
    if (!isAdmin) return;
    
    try {
      const response = await api.get('/users');
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (err: any) {
      console.error('Ошибка загрузки пользователей:', err);
    }
  };

  // Загрузка заявок
  const loadSubmissions = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const response = isAdmin 
        ? await submissionService.getSubmissions({
            ...state.filters,
            page: state.page + 1,
            limit: state.rowsPerPage
          })
        : await submissionService.getMySubmissions({
            page: state.page + 1,
            limit: state.rowsPerPage
          });
      
      setState(prev => ({
        ...prev,
        submissions: response.data,
        total: response.pagination.total,
        loading: false,
        error: null
      }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'Ошибка загрузки заявок',
        loading: false
      }));
    }
  };

  // Обработчики событий
  const handleEditSubmission = (submission: any) => {
    localStorage.setItem('editSubmissionData', JSON.stringify({
      submissionId: submission._id,
      formId: submission.formId._id,
      formData: submission.formData
    }));
    
    navigate(`/?edit=${submission._id}`);
  };

  const handleStatusChange = async (submissionId: string, newStatus: string, comment?: string) => {
    try {
      await submissionService.updateStatus(submissionId, newStatus, comment || '');
      loadSubmissions();
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'Ошибка изменения статуса'
      }));
    }
  };

  const handleFilterChange = (newFilters: Partial<SubmissionFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      page: 0
    }));
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setState(prev => ({ ...prev, page: newPage }));
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({
      ...prev,
      rowsPerPage: parseInt(event.target.value, 10),
      page: 0
    }));
  };

  const resetFilters = () => {
    setState(prev => ({
      ...prev,
      filters: {},
      page: 0
    }));
  };

  // Эффекты
  useEffect(() => {
    loadBitrixStages();
    loadUsers();
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadSubmissions();
  }, [state.page, state.rowsPerPage, state.filters, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Состояние
    ...state,
    bitrixStages,
    users,
    statusLabels,
    isAdmin,
    
    // Методы
    loadSubmissions,
    handleEditSubmission,
    handleStatusChange,
    handleFilterChange,
    handlePageChange,
    handleRowsPerPageChange,
    resetFilters
  };
}; 