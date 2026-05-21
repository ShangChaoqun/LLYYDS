import { create } from 'zustand';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
import { useRoomStore, Gender, getRoomId } from '@/store/useRoomStore';

export interface DiaryEntry {
  id: string;
  content: string;
  photos: string[];
  createdBy: Gender;
  createdAt: number;
  updatedAt: number;
}

interface DiaryState {
  entries: DiaryEntry[];
  loaded: boolean;
  loadFromFirebase: () => void;
  subscribeToFirebase: () => () => void;
  addEntry: (entry: Omit<DiaryEntry, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) => void;
  updateEntry: (id: string, updates: Partial<Pick<DiaryEntry, 'content' | 'photos'>>) => void;
  deleteEntry: (id: string) => void;
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: [],
  loaded: false,

  loadFromFirebase: async () => {
    const roomId = getRoomId();
    if (!roomId) return;
    const data = await supabaseGet<DiaryEntry[]>(roomId, 'diaryEntries');
    set({ entries: data || [], loaded: true });
  },

  subscribeToFirebase: () => {
    const roomId = getRoomId();
    if (!roomId) return () => {};
    return supabaseOn(roomId, 'diaryEntries', (data) => {
      set({ entries: data || [], loaded: true });
    });
  },

  addEntry: (entry) => {
    const state = get();
    const now = Date.now();
    const gender = useRoomStore.getState().gender || 'male';
    const newEntry: DiaryEntry = {
      ...entry,
      id: now.toString() + Math.random().toString(36).substr(2, 9),
      createdBy: gender as Gender,
      createdAt: now,
      updatedAt: now,
    };
    const entries = [newEntry, ...state.entries];
    set({ entries });
    const roomId = getRoomId();
    if (roomId) supabaseSet(roomId, 'diaryEntries', entries);
  },

  updateEntry: (id, updates) => {
    const state = get();
    const entries = state.entries.map((e) =>
      e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e
    );
    set({ entries });
    const roomId = getRoomId();
    if (roomId) supabaseSet(roomId, 'diaryEntries', entries);
  },

  deleteEntry: (id) => {
    const state = get();
    const entries = state.entries.filter((e) => e.id !== id);
    set({ entries });
    const roomId = getRoomId();
    if (roomId) supabaseSet(roomId, 'diaryEntries', entries);
  },
}));
