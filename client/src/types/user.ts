export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  firstName?: string;
  lastName?: string;
  phone?: string;
  bitrix_id?: string;
  status: 'active' | 'inactive';
  settings?: {
    onlyMyCompanies: boolean;
  };
  fullName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  role?: 'admin' | 'user';
  firstName?: string;
  lastName?: string;
  phone?: string;
  bitrix_id?: string;
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  role?: 'admin' | 'user';
  firstName?: string;
  lastName?: string;
  phone?: string;
  bitrix_id?: string;
  status?: 'active' | 'inactive';
}

export interface UsersFilter {
  search: string;
  role: string;
  status: string;
}

export interface UsersPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface UsersResponse {
  success: boolean;
  data: User[];
  pagination: UsersPagination;
}

export interface UserResponse {
  success: boolean;
  data: User;
  message?: string;
}

export interface SyncBitrixResponse {
  success: boolean;
  message: string;
  stats: {
    created: number;
    updated: number;
    errors: number;
    total: number;
  };
} 