import api from './api';

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface GetUsersResponse {
  success: boolean;
  data: User[];
}

class UserService {
  async getUsers(): Promise<GetUsersResponse> {
    const response = await api.get('/users');
    return response.data;
  }
}

export default new UserService(); 