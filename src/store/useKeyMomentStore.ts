import { create } from 'zustand';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
import { useRoomStore, Gender, getRoomId } from '@/store/useRoomStore';

export interface KeyMoment {
  id: string;
  name: string;
  date: string;
  createdBy: Gender;
}

interface KeyMomentState {
  moments: KeyMoment[];
  loaded: boolean;
  loadFromFirebase: () => void;
  subscribeToFirebase: () => () => void;
  addMoment: (moment: Omit<KeyMoment, 'id' | 'createdBy'>) => void;
  updateMoment: (id: string, updates: Partial<Pick<KeyMoment, 'name' | 'date'>>) => void;
}

export const useKeyMomentStore = create<KeyMomentState>((set, get) => ({
  moments: [],
  loaded: false,

  loadFromFirebase: async () => {
    const roomId = getRoomId();
    if (!roomId) return;
    const data = await supabaseGet<KeyMoment[]>(roomId, 'keyMoments');
    set({ moments: data || [], loaded: true });
  },

  subscribeToFirebase: () => {
    const roomId = getRoomId();
    if (!roomId) return () => {};
    return supabaseOn(roomId, 'keyMoments', (data) => {
      set({ moments: data || [], loaded: true });
    });
  },

  addMoment: (moment) => {
    const state = get();
    const gender = useRoomStore.getState().gender || 'male';
    const newMoment: KeyMoment = {
      ...moment,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdBy: gender as Gender,
    };
    const moments = [...state.moments, newMoment];
    set({ moments });
    const roomId = getRoomId();
    if (roomId) supabaseSet(roomId, 'keyMoments', moments);
  },

  updateMoment: (id, updates) => {
    const state = get();
    const moments = state.moments.map((m) => m.id === id ? { ...m, ...updates } : m);
    set({ moments });
    const roomId = getRoomId();
    if (roomId) supabaseSet(roomId, 'keyMoments', moments);
  },
}));
