import axiosClient from './axiosClient';
import type { Reservation, ReservationFilter, CreateReservationRequest } from '../types/reservation';
import type { ScoredTable } from '../types/recommendation';
import type { RecommendRequest } from '../types/recommendation';

export async function getReservations(filters: ReservationFilter): Promise<Reservation[]> {
  const params: Record<string, string | number> = {};
  if (filters.date !== undefined) params.date = filters.date;
  if (filters.partySize !== undefined) params.partySize = filters.partySize;
  if (filters.areaId !== undefined) params.areaId = filters.areaId;
  const response = await axiosClient.get<Reservation[]>('/reservations', { params });
  return response.data;
}

export async function createReservation(req: CreateReservationRequest): Promise<Reservation> {
  const response = await axiosClient.post<Reservation>('/reservations', req);
  return response.data;
}

export async function deleteReservation(id: number): Promise<void> {
  await axiosClient.delete(`/reservations/${id}`);
}

export async function getReservationsForTable(tableId: number): Promise<Reservation[]> {
  const response = await axiosClient.get<Reservation[]>(`/reservations/table/${tableId}`);
  return response.data;
}

export async function recommend(req: RecommendRequest): Promise<ScoredTable[]> {
  const response = await axiosClient.post<ScoredTable[]>('/reservations/recommend', req);
  return response.data;
}
