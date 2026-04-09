import { api } from './api';
import { User } from '../context/AuthContext';

export interface UserUpdateInput {
  is_admin?: boolean;
  regions?: string[];
  is_active?: boolean;
}

export interface RegionsResponse {
  regions: string[];
}

export const userService = {
  getUsers: async (): Promise<User[]> => {
    const response = await api.get('/users/');
    return response.data;
  },

  getUser: async (id: number): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  updateUser: async (id: number, userData: UserUpdateInput): Promise<User> => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  getAvailableRegions: async (): Promise<string[]> => {
    const response = await api.get<RegionsResponse>('/regions/');
    return response.data.regions;
  }
};

export default userService;
