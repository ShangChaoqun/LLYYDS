import { create } from 'zustand';

export interface DiaryEntry {
  id: string;
  content: string;
  photos: string[];
  createdAt: number;
  updatedAt: number;
}

interface DiaryState {
  entries: DiaryEntry[];
  addEntry: (entry: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEntry: (id: string, updates: Partial<Pick<DiaryEntry, 'content' | 'photos'>>) => void;
  deleteEntry: (id: string) => void;
}

const STORAGE_KEY = 'llyyds_diary';

function loadEntries(): DiaryEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: DiaryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export const useDiaryStore = create<DiaryState>((set) => ({
  entries: loadEntries(),
  addEntry: (entry) =>
    set((state) => {
      const now = Date.now();
      const newEntry: DiaryEntry = {
        ...entry,
        id: now.toString() + Math.random().toString(36).substr(2, 9),
        createdAt: now,
        updatedAt: now,
      };
      const entries = [newEntry, ...state.entries];
      saveEntries(entries);
      return { entries };
    }),
  updateEntry: (id, updates) =>
    set((state) => {
      const entries = state.entries.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e
      );
      saveEntries(entries);
      return { entries };
    }),
  deleteEntry: (id) =>
    set((state) => {
      const entries = state.entries.filter((e) => e.id !== id);
      saveEntries(entries);
      return { entries };
    }),
}));
