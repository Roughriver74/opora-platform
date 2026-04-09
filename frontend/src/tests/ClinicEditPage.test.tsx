import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ClinicEditPage from '../pages/ClinicEditPage';
import { clinicService } from '../services/clinicService';
import { adminApi } from '../services/adminApi';

// Мокаем сервисы
jest.mock('../services/clinicService');
jest.mock('../services/adminApi');

// Создаем QueryClient для тестов
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
      staleTime: 0,
    },
  },
});

// Функция для рендеринга компонента с необходимыми провайдерами
const renderWithProviders = (ui: React.ReactElement, { route = '/clinics/1/edit' } = {}) => {
  const queryClient = createTestQueryClient();
  
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path="/clinics/:id/edit" element={ui} />
            </Routes>
          </MemoryRouter>
        </LocalizationProvider>
      </QueryClientProvider>
    ),
    queryClient,
  };
};

describe('ClinicEditPage', () => {
  // Сбрасываем моки перед каждым тестом
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Мокаем данные клиники
    const mockClinic = {
      id: 1,
      name: 'Тестовая клиника',
      company_type: 'Клиника',
      address: 'ул. Тестовая, 123',
      city: 'Москва',
      country: 'Россия',
      inn: '1234567890',
      bitrix_id: 42,
      sync_status: 'synced',
      last_synced: '2025-03-24T10:00:00',
      dynamic_fields: {
        working_mode: 'Пн-Пт: 9-18',
        uses_tokuama: 'Да'
      }
    };
    
    // Мокаем данные из Bitrix24
    const mockBitrixCompany = {
      ID: '42',
      TITLE: 'Тестовая клиника',
      COMPANY_TYPE: 'Клиника',
      ADDRESS: 'ул. Тестовая, 123',
      ADDRESS_CITY: 'Москва',
      ADDRESS_COUNTRY: 'Россия',
      UF_CRM_1741267701427: '1234567890', // ИНН
      UF_CRM_WORKING_MODE: 'Пн-Пт: 9-18',
      UF_CRM_USES_TOKUAMA: 'Да'
    };
    
    // Мокаем маппинги полей
    const mockFieldMappings = [
      { id: 1, app_field_name: 'name', bitrix_field_id: 'TITLE', display_name: 'Название', field_type: 'string', is_required: true },
      { id: 2, app_field_name: 'company_type', bitrix_field_id: 'COMPANY_TYPE', display_name: 'Тип компании', field_type: 'string', is_required: true },
      { id: 3, app_field_name: 'address', bitrix_field_id: 'ADDRESS', display_name: 'Адрес', field_type: 'string', is_required: false },
      { id: 4, app_field_name: 'city', bitrix_field_id: 'ADDRESS_CITY', display_name: 'Город', field_type: 'string', is_required: false },
      { id: 5, app_field_name: 'country', bitrix_field_id: 'ADDRESS_COUNTRY', display_name: 'Страна', field_type: 'string', is_required: false },
      { id: 6, app_field_name: 'inn', bitrix_field_id: '1741267701427', display_name: 'ИНН', field_type: 'string', is_required: false },
      { id: 7, app_field_name: 'working_mode', bitrix_field_id: 'WORKING_MODE', display_name: 'Режим работы', field_type: 'string', is_required: false },
      { id: 8, app_field_name: 'uses_tokuama', bitrix_field_id: 'USES_TOKUAMA', display_name: 'Использует Токуаму', field_type: 'string', is_required: false }
    ];
    
    // Настраиваем моки
    (clinicService.getClinic as jest.Mock).mockResolvedValue(mockClinic);
    (clinicService.getClinicById as jest.Mock).mockResolvedValue(mockBitrixCompany);
    (clinicService.updateClinic as jest.Mock).mockResolvedValue({ ...mockClinic, name: 'Обновленная клиника' });
    (adminApi.getFieldMappings as jest.Mock).mockResolvedValue(mockFieldMappings);
  });
  
  test('загружает данные клиники и данные из Bitrix24 при открытии страницы', async () => {
    renderWithProviders(<ClinicEditPage />);
    
    // Проверяем, что данные клиники загружаются
    await waitFor(() => {
      expect(clinicService.getClinic).toHaveBeenCalledWith(1, false);
    });
    
    // Проверяем, что данные из Bitrix24 загружаются автоматически
    await waitFor(() => {
      expect(clinicService.getClinicById).toHaveBeenCalledWith(42);
    });
    
    // Проверяем, что маппинги полей загружаются
    await waitFor(() => {
      expect(adminApi.getFieldMappings).toHaveBeenCalledWith('clinic');
    });
    
    // Проверяем, что данные отображаются на странице
    await waitFor(() => {
      expect(screen.getByText('Тестовая клиника')).toBeInTheDocument();
    });
  });
  
  test('обновляет данные клиники при нажатии на кнопку "Сохранить изменения"', async () => {
    renderWithProviders(<ClinicEditPage />);
    
    // Ждем загрузки данных
    await waitFor(() => {
      expect(screen.getByText('Редактирование клиники')).toBeInTheDocument();
    });
    
    // Находим поле ввода названия и меняем его значение
    const nameInput = await waitFor(() => {
      return screen.getByLabelText('Название');
    });
    
    fireEvent.change(nameInput, { target: { value: 'Обновленная клиника' } });
    
    // Находим кнопку "Сохранить изменения" и нажимаем на неё
    const saveButton = screen.getByText('Сохранить изменения');
    fireEvent.click(saveButton);
    
    // Проверяем, что вызвался метод updateClinic с правильными параметрами
    await waitFor(() => {
      expect(clinicService.updateClinic).toHaveBeenCalledWith(1, expect.objectContaining({
        name: 'Обновленная клиника'
      }));
    });
    
    // Проверяем, что после сохранения данные обновились из Bitrix24
    await waitFor(() => {
      expect(clinicService.getClinicById).toHaveBeenCalledTimes(2);
    });
  });
  
  test('обновляет данные из Bitrix24 при нажатии на кнопку "Обновить данные из Bitrix24"', async () => {
    renderWithProviders(<ClinicEditPage />);
    
    // Ждем загрузки данных
    await waitFor(() => {
      expect(screen.getByText('Редактирование клиники')).toBeInTheDocument();
    });
    
    // Сбрасываем счетчик вызовов, так как метод уже вызывался при загрузке страницы
    (clinicService.getClinicById as jest.Mock).mockClear();
    
    // Находим кнопку "Обновить данные из Bitrix24" и нажимаем на неё
    const syncButton = screen.getByText('Обновить данные из Bitrix24');
    fireEvent.click(syncButton);
    
    // Проверяем, что вызвался метод getClinicById с правильными параметрами
    await waitFor(() => {
      expect(clinicService.getClinicById).toHaveBeenCalledWith(42);
    });
  });
  
  test('показывает ошибку при неудачной загрузке данных из Bitrix24', async () => {
    // Мокаем ошибку при запросе к Bitrix24
    (clinicService.getClinicById as jest.Mock).mockRejectedValue(new Error('Ошибка API'));
    
    // Мокаем window.alert для проверки
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    renderWithProviders(<ClinicEditPage />);
    
    // Ждем загрузки данных клиники
    await waitFor(() => {
      expect(screen.getByText('Редактирование клиники')).toBeInTheDocument();
    });
    
    // Находим кнопку "Обновить данные из Bitrix24" и нажимаем на неё
    const syncButton = screen.getByText('Обновить данные из Bitrix24');
    fireEvent.click(syncButton);
    
    // Проверяем, что показывается сообщение об ошибке
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Не удалось получить данные из Bitrix24. Пожалуйста, попробуйте позже.');
    });
    
    // Восстанавливаем оригинальную функцию alert
    alertMock.mockRestore();
  });
});
