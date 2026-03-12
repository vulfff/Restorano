import axiosClient from './axiosClient';
import type { FloorPlan } from '../types/layout';

export async function getLayout(): Promise<FloorPlan> {
  const response = await axiosClient.get<FloorPlan>('/layout');
  return response.data;
}

export async function saveLayout(floorPlan: FloorPlan): Promise<FloorPlan> {
  const response = await axiosClient.put<FloorPlan>('/layout', floorPlan);
  return response.data;
}
