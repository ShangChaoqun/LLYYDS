import { create } from 'zustand';

export interface BillRecord {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  createdAt: number;
}

interface BillState {
  records: BillRecord[];
  addRecord: (record: Omit<BillRecord, 'id' | 'createdAt'>) => void;
  deleteRecord: (id: string) => void;
}

const STORAGE_KEY = 'llyyds_bills';

const CATEGORIES = [
  { key: 'food', label: '餐饮', emoji: '🍜' },
  { key: 'transport', label: '交通', emoji: '🚗' },
  { key: 'shopping', label: '购物', emoji: '🛍️' },
  { key: 'entertainment', label: '娱乐', emoji: '🎮' },
  { key: 'housing', label: '住房', emoji: '🏠' },
  { key: 'medical', label: '医疗', emoji: '💊' },
  { key: 'gift', label: '礼物', emoji: '🎁' },
  { key: 'other', label: '其他', emoji: '📝' },
];

export { CATEGORIES };

function loadRecords(): BillRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: BillRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export const useBillStore = create<BillState>((set) => ({
  records: loadRecords(),
  addRecord: (record) =>
    set((state) => {
      const newRecord: BillRecord = {
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
