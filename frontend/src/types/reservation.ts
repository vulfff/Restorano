export interface Reservation {
  id: number;
  tableIds: number[];
  guestName: string;
  partySize: number;
  startsAt: string;   // ISO 8601
  endsAt: string;     // startsAt + 2.5h
  notes: string | null;
  createdAt: string;
}

export interface CreateReservationRequest {
  tableIds: number[];
  guestName: string;
  partySize: number;
  startsAt: string;   // ISO 8601
  notes?: string;
  durationHours?: number;
}

export interface ReservationFilter {
  date?: string;          // ISO date "2026-03-15"
  partySize?: number;
  areaId?: number;
}
