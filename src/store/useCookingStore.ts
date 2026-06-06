import { create } from 'zustand';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
import { useRoomStore, Gender, getRoomId } from '@/store/useRoomStore';

export interface CookingRecord {
  id: string;
  date: string;
  photos: string[];
  note: string;
  createdBy: Gender;
  createdAt: number;
}

interface CookingState {
  records: CookingRecord[];
  loaded: boolean;
  loadFromFirebase: () => void;
  subscribeToFirebase: () => () => void;
  addRecord: (record: Omit<CookingRecord, 'id' | 'createdBy' | 'createdAt'>) => void;
}

export const useCookingStore = create<CookingState>((set, get) => ({
  records: [],
  loaded: false,

  loadFromFirebase: async () => {
    const roomId = getRoomId();
    if (!roomId) return;
    const data = await supabaseGet<CookingRecord[]>(roomId, 'cookingRecords');
    set({ records: data || [], loaded: true });
  },

  subscribeToFirebase: () => {
    const roomId = getRoomId();
    if (!roomId) return () => {};
    return supabaseOn(roomId, 'cookingRecords', (data) => {
      set({ records: data || [], loaded: true });
    });
  },

  addRecord: (record) => {
    const state = get();
    const gender = useRoomStore.getState().gender || 'male';
    const newRecord: CookingRecord = {
      ...record,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdBy: gender as Gender,
      createdAt: Date.now(),
    };
    const records = [newRecord, ...state.records];
    set({ records });
    const roomId = getRoomId();
    if (roomId) supabaseSet(roomId, 'cookingRecords', records);
  },
}));
