import axiosClient from './axiosClient';
import type { MealSummary } from '../types/meal';

interface TheMealDbResponse {
  meals: Array<{
    idMeal: string;
    strMeal: string;
    strMealThumb: string;
    strCategory: string;
    strArea: string;
  }> | null;
}

export async function suggestMeals(keyword: string): Promise<MealSummary[]> {
  const response = await axiosClient.get<TheMealDbResponse>('/meals/suggest', {
    params: { keyword },
  });
  return (response.data.meals ?? []) as MealSummary[];
}
