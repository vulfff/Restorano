import axiosClient from './axiosClient';
import type { MealSummary } from '../types/meal';

export async function suggestMeals(keyword: string): Promise<MealSummary[]> {
  const response = await axiosClient.get<MealSummary[]>('/meals/suggest', {
    params: { keyword },
  });
  return response.data ?? [];
}
