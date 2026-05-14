import { create } from 'zustand';

export interface KeyMoment {
  id: string;
  name: string;
  date: string;
}

interface KeyMomentState {
  moments: KeyMoment[];
  addMoment: (moment: Omit<KeyMoment, 'id'>) => void;
  updateMoment: (id: string, updates: Partial<Pick<KeyMoment, 'name' | 'date'>>) => void;
  deleteMoment: (id: string) => void;
}

const STORAGE_KEY = 'llyyds_key_moments';

function loadMoments(): KeyMoment[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveMoments(moments: KeyMoment[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(moments));
}

export const useKeyMomentStore = create<KeyMomentState>((set) => ({
  moments: loadMoments(),
  addMoment: (moment) =>
    set((state) => {
      const newMoment: KeyMoment = {
        ...moment,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      };
      const moments = [...state.moments, newMoment];
      saveMoments(moments);
      return { moments };
    }),
  updateMoment: (id, updates) =>
    set((state) => {
      const moments = state.moments.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      );
      saveMoments(moments);
      return { moments };
    }),
  deleteMoment: (id) =>
    set((state) => {
      const moments = state.moments.filter((m) => m.id !== id);
      saveMoments(moments);
      return { moments };
    }),
}));
