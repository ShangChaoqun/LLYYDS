import { create } from 'zustand';

export interface CookingRecord {
  id: string;
  date: string;
  photos: string[];
  note: string;
  createdAt: number;
}

interface CookingState {
  records: CookingRecord[];
  addRecord: (record: Omit<CookingRecord, 'id' | 'createdAt'>) => void;
  deleteRecord: (id: string) => void;
}

const STORAGE_KEY = 'llyyds_cooking';

function loadRecords(): CookingRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.map((r: Record<string, unknown>) => ({
        ...r,
        photos: (r.photos as string[]) || ((r.photo as string) ? [r.photo as string] : []),
      }));
    }
    return [];
  } catch {
    return [];
  }
}

function saveRecords(records: CookingRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export const useCookingStore = create<CookingState>((set) => ({
  records: loadRecords(),
  addRecord: (record) =>
    set((state) => {
      const newRecord: CookingRecord = {
        ...record,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
      };
      const records = [newRecord, ...state.records];
      saveRecords(records);
      return { records };
    }),
  deleteRecord: (id) =>
    set((state) => {
      const records = state.records.filter((r) => r.id !== id);
      saveRecords(records);
      return { records };
    }),
}));
