import axiosClient from './axiosClient';

export async function login(username: string, password: string): Promise<{ token: string }> {
  const response = await axiosClient.post<{ token: string }>('/auth/login', { username, password });
  return response.data;
}

export async function signup(username: string, email: string, password: string): Promise<void> {
  await axiosClient.post('/auth/signup', { username, email, password });
}
