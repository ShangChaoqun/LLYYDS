import { create } from 'zustand';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
import { useRoomStore, Gender } from '@/store/useRoomStore';

export interface BillRecord {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  createdBy: Gender;
  createdAt: number;
}

interface BillState {
  records: BillRecord[];
  loaded: boolean;
  loadFromFirebase: () => void;
  subscribeToFirebase: () => () => void;
  addRecord: (record: Omit<BillRecord, 'id' | 'createdBy' | 'createdAt'>) => void;
  deleteRecord: (id: string) => void;
}

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

export const useBillStore = create<BillState>((set, get) => ({
  records: [],
  loaded: false,

  loadFromFirebase: async () => {
    const roomId = useRoomStore.getState().roomId;
    if (!roomId) return;
    const data = await supabaseGet<BillRecord[]>(roomId, 'billRecords');
    set({ records: data || [], loaded: true });
  },

  subscribeToFirebase: () => {
    const roomId = useRoomStore.getState().roomId;
    if (!roomId) return () => {};
    return supabaseOn(roomId, 'billRecords', (data) => {
      set({ records: data || [], loaded: true });
    });
  },

  addRecord: (record) => {
    const state = get();
    const gender = useRoomStore.getState().gender || 'male';
    const newRecord: BillRecord = {
      ...record,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdBy: gender as Gender,
      createdAt: Date.now(),
    };
    const records = [newRecord, ...state.records];
    set({ records });
    const roomId = useRoomStore.getState().roomId;
    if (roomId) supabaseSet(roomId, 'billRecords', records);
  },

  deleteRecord: (id) => {
    const state = get();
    const records = state.records.filter((r) => r.id !== id);
    set({ records });
    const roomId = useRoomStore.getState().roomId;
    if (roomId) supabaseSet(roomId, 'billRecords', records);
  },
}));
