import { create } from 'zustand';

interface FilterState {
  date: string;
  time: string;
  partySize: number | '';
  areaId: number | '';

  setDate: (date: string) => void;
  setTime: (time: string) => void;
  setPartySize: (size: number | '') => void;
  setAreaId: (id: number | '') => void;
  reset: () => void;
}

const today = new Date().toISOString().split('T')[0];

export const useFilterStore = create<FilterState>((set) => ({
  date: today,
  time: '',
  partySize: '',
  areaId: '',

  setDate: (date) => set({ date }),
  setTime: (time) => set({ time }),
  setPartySize: (size) => set({ partySize: size }),
  setAreaId: (id) => set({ areaId: id }),
  reset: () => set({ date: today, time: '', partySize: '', areaId: '' }),
}));
