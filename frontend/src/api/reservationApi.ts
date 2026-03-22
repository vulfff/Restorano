import axiosClient from './axiosClient';
import type { Reservation, ReservationFilter, CreateReservationRequest } from '../types/reservation';
import type { ScoredTable } from '../types/recommendation';
import type { RecommendRequest } from '../types/recommendation';

// Backend filters by date/partySize/areaId only; time-of-day filtering is computed client-side
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

export interface UpdateReservationRequest {
  guestName: string;
  partySize: number;
  startsAt: string;   // ISO 8601
  notes?: string;
}

export async function updateReservation(id: number, req: UpdateReservationRequest): Promise<Reservation> {
  const response = await axiosClient.put<Reservation>(`/reservations/${id}`, req);
  return response.data;
}

export async function getReservationsForTable(tableId: number): Promise<Reservation[]> {
  const response = await axiosClient.get<Reservation[]>(`/reservations/table/${tableId}`);
  return response.data;
}

export async function recommend(req: RecommendRequest): Promise<ScoredTable[]> {
  const response = await axiosClient.post<ScoredTable[]>('/reservations/recommend', req);
  return response.data;
}
