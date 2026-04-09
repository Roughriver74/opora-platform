import { api } from './api';
import { cleanAddressString } from '../utils/addressUtils';

// Кэш для хранения данных из Bitrix24 API
const bitrixDataCache = new Map<number, any>();

// Время жизни кэша в миллисекундах (5 минут)
const CACHE_TTL = 5 * 60 * 1000;

interface AddressData {
  country: string;
  city: string;
  street: string;
  number: string;
  postal_code: string;
  latitude: string;
  longitude: string;
  company_id: number;
}

export interface FieldMapping {
  id: number;
  entity_type: string;
  local_field_id: string;
  bitrix_field_id: string;
  field_type: string;
  required: boolean;
  description?: string;
}

export interface Clinic {
  id: number;
  name: string;
  company_type: string;
  address: string;
  city: string;
  country: string;
  inn: string;
  kpp: string;
  main_manager: string;
  last_sale_date?: string;
  document_amount?: string;
  working_mode?: string;
  uses_tokuama?: string;
  bitrix_id?: number;
  region?: string;
  uid_1c?: string;
  sync_status: string;
  last_synced?: string;
  company_id?: number;
  dynamic_fields?: Record<string, any>;
  field_mappings?: FieldMapping[];
  last_visit_date?: string; // Дата последнего визита
  visits_count?: number; // Количество визитов
  is_network?: boolean; // Признак сети клиник
  UF_CRM_1742890765753?: string,
  bitrixMainClinicID?: number,
  clinic_coordinates: {
    latitude: number;
    longitude: number;
  }


}

export interface ClinicInput {
  name: string;
  company_type?: string;
  address?: string;
  city?: string;
  country?: string;
  inn?: string;
  kpp?: string;
  main_manager?: string;
  document_amount?: string;
  working_mode?: string;
  uses_tokuama?: string;
  region?: string;
  uid_1c?: string;
  is_network?: boolean;
  dynamic_fields?: Record<string, any>;
  bitrix_id?: number
  doctor_bitrix_id?: number[] | [],
  company_id?: number
}

export interface BitrixCompany {
  ID: string;
  TITLE: string;
  COMPANY_TYPE?: string;
  UF_CRM_1741267701427?: string; // ИНН
  ADDRESS?: string;
  CITY?: string;
  [key: string]: any; // Для динамических полей UF_CRM_*
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ClinicFilters {
  region?: string;
  name?: string;
  inn?: string;
  company_type?: string;
  page?: number;
  page_size?: number;
  sort_by?: string; // Поле для сортировки
  sort_direction?: 'asc' | 'desc'; // Направление сортировки
}

export const clinicService = {
  /**
   * Унифицированная функция для получения данных клиники из всех источников
   * @param id ID клиники
   * @param options Опции запроса
   * @returns Объект с данными клиники из локальной БД и Bitrix24
   */
  getUnifiedClinicData: async (id: number, options: {
    forceBitrixSync?: boolean,
    skipBitrix?: boolean
  } = {}) => {
    try {
      // Получаем данные из локальной БД
      const localClinic = await clinicService.getClinic(id, false);

      // Если не нужно получать данные из Bitrix, возвращаем только локальные
      if (options.skipBitrix || !localClinic.bitrix_id) {
        return {
          localData: localClinic,
          bitrixData: null,
          isSync: false
        };
      }

      // Получаем данные из Bitrix24
      try {
        const bitrixData = await clinicService.getClinicById(localClinic.bitrix_id);

        return {
          localData: localClinic,
          bitrixData,
          isSync: true
        };
      } catch (bitrixError) {
        console.error('Ошибка при получении данных из Bitrix24:', bitrixError);
        return {
          localData: localClinic,
          bitrixData: null,
          isSync: false,
          error: bitrixError
        };
      }
    } catch (error) {
      console.error('Ошибка при получении унифицированных данных клиники:', error);
      throw error;
    }
  },

  getUnifiedNetworkClinicData: async (id: number, options: {
    forceBitrixSync?: boolean,
    skipBitrix?: boolean
  } = {}) => {
    try {
      // Получаем данные из локальной БД
      const localClinic = await clinicService.getNetworkClinic(id, false);

      // Если не нужно получать данные из Bitrix, возвращаем только локальные
      if (options.skipBitrix || !localClinic.bitrix_id) {
        return {
          localData: localClinic,
          bitrixData: null,
          isSync: false
        };
      }

      // Получаем данные из Bitrix24
      try {
        const bitrixData = await clinicService.getNetworkClinicById(localClinic.bitrix_id);

        return {
          localData: localClinic,
          bitrixData,
          isSync: true
        };
      } catch (bitrixError) {
        console.error('Ошибка при получении данных из Bitrix24:', bitrixError);
        return {
          localData: localClinic,
          bitrixData: null,
          isSync: false,
          error: bitrixError
        };
      }
    } catch (error) {
      console.error('Ошибка при получении унифицированных данных клиники:', error);
      throw error;
    }
  },


  getClinics: async (
    filters?: ClinicFilters,
    advancedFilters?: any[]
  ): Promise<PaginatedResponse<Clinic>> => {
    try {
      const params: any = { ...filters };

      if (advancedFilters && advancedFilters.length > 0) {
        const filterGroup = {
          conditions: advancedFilters.map((f) => ({
            field: f.column,
            operator: mapCondition(f.condition),
            value: f.value,
          })),
          logical_operator: 'AND',
        };

        params.filter_groups = JSON.stringify([filterGroup]);
      }

      const response = await api.get('/clinics/', { params });
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении списка клиник:', error);
      throw error;
    }
  },




  getNetworkClinics: async (clinicBitrixId: string, filters?: ClinicFilters) => {
    try {
      const response = await api.get(`/network-clinics/clinic/${clinicBitrixId}`, {
        params: filters,
      })
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении списка клиник:', error);
      throw error;
    }
  },

  getClinic: async (id: number, syncWithBitrix: boolean = false): Promise<Clinic> => {
    const response = await api.get(`/clinics/${id}`, {
      params: { sync_with_bitrix: syncWithBitrix }
    });
    return response.data;
  },

  updateNetworkClinicStatus: async () => {
    const response = await api.post(`/network-clinics/clinic_update_network`);
    return response.data;
  },

  getNetworkClinic: async (id?: number, syncWithBitrix: boolean = false): Promise<Clinic> => {
    const response = await api.get(`/network-clinics/${id}`, {
      params: { sync_with_bitrix: syncWithBitrix }
    });
    return response.data;
  },



  /**
   * Оптимизированная функция для получения данных из Bitrix24 API с кэшированием
   * @param id ID компании в Bitrix24
   * @param forceRefresh Принудительное обновление данных из API
   * @returns Данные компании из Bitrix24
   */
  getBitrixDataOptimized: async (id: number, forceRefresh: boolean = false): Promise<BitrixCompany | null> => {
    // Проверяем наличие данных в кэше и их актуальность
    const cachedData = bitrixDataCache.get(id);
    const now = Date.now();

    if (!forceRefresh && cachedData && (now - cachedData.timestamp) < CACHE_TTL) {
      console.log('Используем кэшированные данные Bitrix для ID:', id);
      return cachedData.data;
    }

    try {
      console.log('Запрашиваем данные из Bitrix24 API для ID:', id);
      // Получаем данные из Bitrix24
      const response = await api.get(`/clinics/bitrix/${id}`);
      const data = response.data;

      // Очищаем адресные поля от служебных данных Bitrix24
      if (data && typeof data === 'object') {
        // Очищаем основное поле адреса
        if (data.ADDRESS) {
          data.ADDRESS = cleanAddressString(data.ADDRESS);
        }

        // Проверяем и очищаем все поля, которые могут содержать адрес
        Object.keys(data).forEach(key => {
          // Проверяем, является ли поле адресным или содержит разделитель |;|
          if (
            key.toLowerCase().includes('address') ||
            (typeof data[key] === 'string' && data[key].includes('|;|'))
          ) {
            data[key] = cleanAddressString(data[key]);
          }

          // Проверяем известное поле адреса с ID 6679726EB1750
          if (key === 'UF_CRM_6679726EB1750' && typeof data[key] === 'string') {
            data[key] = cleanAddressString(data[key]);
          }
        });
      }

      // Сохраняем данные в кэш
      bitrixDataCache.set(id, {
        data,
        timestamp: now
      });

      return data;
    } catch (error) {
      console.error('Ошибка при получении данных из Bitrix24:', error);
      return null;
    }
  },

  /**
  * Оптимизированная функция для получения данных из Bitrix24 API с кэшированием
  * @param id ID компании в Bitrix24
  * @param forceRefresh Принудительное обновление данных из API
  * @returns Данные компании из Bitrix24
  */
  getNetworkBitrixDataOptimized: async (id: number, forceRefresh: boolean = false): Promise<BitrixCompany | null> => {
    // Проверяем наличие данных в кэше и их актуальность
    const cachedData = bitrixDataCache.get(id);
    const now = Date.now();

    if (!forceRefresh && cachedData && (now - cachedData.timestamp) < CACHE_TTL) {
      console.log('Используем кэшированные данные Bitrix для ID:', id);
      return cachedData.data;
    }

    try {
      console.log('Запрашиваем данные из Bitrix24 API для ID:', id);
      // Получаем данные из Bitrix24
      const response = await api.get(`/network-clinics/${id}`);
      const data = response.data;

      // Очищаем адресные поля от служебных данных Bitrix24
      if (data && typeof data === 'object') {
        // Очищаем основное поле адреса
        if (data.ADDRESS) {
          data.ADDRESS = cleanAddressString(data.ADDRESS);
        }

        // Проверяем и очищаем все поля, которые могут содержать адрес
        Object.keys(data).forEach(key => {
          // Проверяем, является ли поле адресным или содержит разделитель |;|
          if (
            key.toLowerCase().includes('address') ||
            (typeof data[key] === 'string' && data[key].includes('|;|'))
          ) {
            data[key] = cleanAddressString(data[key]);
          }

          // Проверяем известное поле адреса с ID 6679726EB1750
          if (key === 'UF_CRM_6679726EB1750' && typeof data[key] === 'string') {
            data[key] = cleanAddressString(data[key]);
          }
        });
      }

      // Сохраняем данные в кэш
      bitrixDataCache.set(id, {
        data,
        timestamp: now
      });

      return data;
    } catch (error) {
      console.error('Ошибка при получении данных из Bitrix24:', error);
      return null;
    }
  },

  getClinicById: async (id: number, forceRefresh: boolean = false): Promise<BitrixCompany | Clinic> => {
    try {
      // Используем оптимизированную функцию с кэшированием
      const data = await clinicService.getBitrixDataOptimized(id, forceRefresh);

      if (data) {
        return data;
      }

      // Если данные из Bitrix не получены, продолжаем выполнение и пробуем получить данные из локальной БД
      const localClinic = await clinicService.getClinic(id, false);
      return localClinic;
    } catch (error) {
      console.error('Ошибка при получении данных клиники из Bitrix:', error);

      // Если не удалось получить из Битрикса, пытаемся получить из локальной БД
      try {
        console.log('Получаем данные клиники из локальной БД...');
        const localClinic = await clinicService.getClinic(id, false);

        // Очищаем адресные поля от служебных данных Bitrix24
        const cleanAddress = localClinic.address ? cleanAddressString(localClinic.address) : '';

        // Очищаем адресные поля в динамических полях
        const cleanDynamicFields: Record<string, any> = {};

        if (localClinic.dynamic_fields) {
          Object.keys(localClinic.dynamic_fields).forEach(key => {
            const value = localClinic.dynamic_fields?.[key];
            if (
              key.toLowerCase().includes('address') ||
              (typeof value === 'string' && value.includes('|;|'))
            ) {
              cleanDynamicFields[key] = cleanAddressString(value);
            } else {
              cleanDynamicFields[key] = value;
            }
          });
        }

        // Преобразуем в формат, совместимый с BitrixCompany
        return {
          ID: localClinic.bitrix_id?.toString() || id.toString(),
          TITLE: localClinic.name || `Компания #${id}`,
          COMPANY_TYPE: localClinic.company_type || '',
          ADDRESS: cleanAddress,
          CITY: localClinic.city || '',
          UF_CRM_1741267701427: localClinic.inn || '', // ИНН
          ...cleanDynamicFields // Добавляем очищенные динамические поля
        };
      } catch (localError) {
        console.error('Ошибка при получении локальных данных клиники:', localError);
        // Возвращаем минимальный объект с ID, чтобы не было ошибки
        return {
          ID: id.toString(),
          TITLE: `Компания #${id}`,
          COMPANY_TYPE: ''
        };
      }
    }
  },


  getNetworkClinicById: async (id: number, forceRefresh: boolean = false): Promise<BitrixCompany | Clinic> => {
    try {
      const data = await clinicService.getNetworkBitrixDataOptimized(id, forceRefresh);

      if (data) {
        return data;
      }

      const localClinic = await clinicService.getNetworkClinic(id, false);
      return localClinic;
    } catch (error) {
      try {
        const localClinic = await clinicService.getNetworkClinic(id, false);

        const cleanAddress = localClinic.address ? cleanAddressString(localClinic.address) : '';

        const cleanDynamicFields: Record<string, any> = {};

        if (localClinic.dynamic_fields) {
          Object.keys(localClinic.dynamic_fields).forEach(key => {
            const value = localClinic.dynamic_fields?.[key];
            if (
              key.toLowerCase().includes('address') ||
              (typeof value === 'string' && value.includes('|;|'))
            ) {
              cleanDynamicFields[key] = cleanAddressString(value);
            } else {
              cleanDynamicFields[key] = value;
            }
          });
        }

        return {
          ID: localClinic.bitrix_id?.toString() || id.toString(),
          TITLE: localClinic.name || `Компания #${id}`,
          COMPANY_TYPE: localClinic.company_type || '',
          ADDRESS: cleanAddress,
          CITY: localClinic.city || '',
          UF_CRM_1741267701427: localClinic.inn || '',
          ...cleanDynamicFields
        };
      } catch (localError) {
        console.error('Ошибка при получении локальных данных клиники:', localError);

        return {
          ID: id.toString(),
          TITLE: `Компания #${id}`,
          COMPANY_TYPE: ''
        };
      }
    }
  },

  createClinic: async (clinic: ClinicInput): Promise<Clinic> => {
    const response = await api.post('/clinics/', clinic);
    return response.data;
  },

  updateClinicAddress: async (address: AddressData) => {
    const response = await api.post('/clinics/set-company-address', address);
    return response.data;
  },

  createNetworkClinic: async (clinic: ClinicInput): Promise<Clinic> => {
    const response = await api.post('/network-clinics/', clinic);
    return response.data;
  },

  updateClinic: async (id: number, clinic: ClinicInput): Promise<Clinic> => {
    const clinicToUpdate = {
      ...clinic,
      dynamic_fields: clinic.dynamic_fields || {}
    };
    console.log('clinicInService=', clinicToUpdate)

    try {
      const response = await api.put(`/clinics/${id}`, clinicToUpdate);
      console.log('Response from update:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating clinic:', error);
      throw error;
    }
  },

  updateNetworkClinic: async (id: number, clinic: any): Promise<Clinic> => {
    const clinicToUpdate = {
      ...clinic,
      dynamic_fields: clinic.dynamic_fields || {}
    };

    try {
      const response = await api.post(`/network-clinics/update_clinic?bitrix_network_clinic_id=${id}`, clinicToUpdate);
      return response.data;
    } catch (error) {
      console.error('Error updating clinic:', error);
      throw error;
    }
  },

  syncClinics: async (): Promise<Clinic[]> => {
    const response = await api.post('/clinics/sync');
    return response.data;
  },

  searchClinicsByInn: async (inn: string): Promise<BitrixCompany[]> => {
    try {
      console.log(`Поиск клиники по ИНН: ${inn}`);
      const response = await api.get(`/clinics/search/inn/${inn}`);
      console.log('Ответ от сервера:', response.data);
      return response.data.companies || [];
    } catch (error) {
      console.error('Ошибка при поиске клиники по ИНН:', error);
      throw error;
    }
  },
  searchClinicsByName: async (name: string): Promise<BitrixCompany[]> => {
    try {
      console.log(`Поиск клиники по названию: ${name}`);
      const response = await api.get(`/clinics/search/name/${encodeURIComponent(name)}`);
      console.log('Ответ от сервера:', response.data);
      return response.data.companies || [];
    } catch (error) {
      console.error('Ошибка при поиске клиники по названию:', error);
      throw error;
    }
  },

  searchClinics: async (searchTerm: string): Promise<BitrixCompany[]> => {
    try {
      console.log(`Поиск клиники по названию: ${searchTerm}`);
      const response = await api.get(`/clinics/search?term=${encodeURIComponent(searchTerm)}`);
      console.log('Ответ от сервера:', response.data);
      return response.data.companies || [];
    } catch (error) {
      console.error('Ошибка при поиске клиники:', error);
      throw error;
    }
  },

  // Метод для обновления данных клиники напрямую в Bitrix24
  updateClinicInBitrix: async (data: any, isNetwork: boolean): Promise<any> => {
    try {
      // Проверяем структуру данных
      if (!data.id || !data.fields) {
        throw new Error('Неверный формат данных для обновления в Bitrix24');
      }

      // Создаем копию fields, чтобы не мутировать исходные данные
      const updatedFields = {
        ...data.fields,
        UF_CRM_1742890765753: isNetwork ? 1 : 0,
      };

      // Формируем данные для запроса
      const requestData = {
        id: data.id,
        fields: updatedFields,
        params: { "REGISTER_SONET_EVENT": "Y" }
      };

      console.log('DATA=', requestData);

      // Отправляем обновленные данные
      const response = await api.post('/clinics/bitrix/update', requestData);
      console.log('Ответ от Bitrix24:', response.data);

      return response.data;
    } catch (error) {
      console.error('Ошибка при обновлении данных в Bitrix24:', error);
      throw error;
    }
  },

  // Метод для создания компании в Bitrix24 на основе данных из локальной БД
  createClinicInBitrix: async (clinicId: number): Promise<any> => {
    try {
      const response = await api.post(`/clinics/${clinicId}/create-in-bitrix`);
      return response.data;
    } catch (error) {
      console.error('Ошибка при создании клиники в Bitrix24:', error);
      throw error;
    }
  },

  // Метод для создания визита для клиники
  createVisitForClinic: async (clinicId: number, visitData: any): Promise<any> => {
    try {
      const response = await api.post(`/visits/`, {
        ...visitData,
        company_id: clinicId
      });
      return response.data;
    } catch (error) {
      console.error('Ошибка при создании визита:', error);
      throw error;
    }
  },

  // Метод для запуска импорта компаний из Excel-файла
  importFromExcel: async (): Promise<any> => {
    try {
      const response = await api.post('/clinics/import-excel');
      return response.data;
    } catch (error) {
      console.error('Ошибка при импорте компаний из Excel:', error);
      throw error;
    }
  },

  // Метод для загрузки Excel-файла на сервер
  uploadExcelFile: async (file: File): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/clinics/upload-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Ошибка при загрузке Excel-файла:', error);
      throw error;
    }
  },

  findOrCreateInBitrix: async (clinicId: number): Promise<{ success: boolean, message: string, clinic_id: number, bitrix_id?: number }> => {
    try {
      const response = await api.post(`/clinics/${clinicId}/find-or-create-in-bitrix`);
      return response.data;
    } catch (error: any) {
      console.error("Ошибка при поиске/создании компании в Битрикс:", error);
      return {
        success: false,
        message: error.response?.data?.detail || "Произошла ошибка при обработке запроса",
        clinic_id: clinicId
      };
    }
  },

  createInBitrix: async (clinicId: number): Promise<{ success: boolean, message: string, bitrix_id?: number }> => {
    try {
      const response = await api.post(`/clinics/${clinicId}/create-in-bitrix`);
      return response.data;
    } catch (error: any) {
      console.error("Ошибка при создании компании в Битрикс:", error);
      return {
        success: false,
        message: error.response?.data?.detail || "Произошла ошибка при создании компании"
      };
    }
  },



};


function mapCondition(condition: string): string {
  const map: Record<string, string> = {
    contains: 'contains',
    equals: 'equals',
    starts_with: 'starts_with',
    ends_with: 'ends_with',
    greater_than: 'gt',
    less_than: 'lt',
    not_contains: 'not_contains',
    not_equals: 'not_equals',
    in: 'in',
    is_empty: 'is_empty',
    between: 'between',
  };
  return map[condition] || 'contains';
}