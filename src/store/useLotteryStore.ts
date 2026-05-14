import { create } from 'zustand';
import { Person } from '@/store/useAffinityStore';

export interface LotteryItem {
  id: string;
  name: string;
  color: string;
}

interface LotteryState {
  itemsMap: Record<Person, LotteryItem[]>;
  addItem: (person: Person, name: string) => void;
  removeItem: (person: Person, id: string) => void;
}

const STORAGE_KEY = 'llyyds_lottery_map';

const DEFAULT_COLORS = [
  '#FF6B8A', '#B088F9', '#6EC6FF', '#FFD93D',
  '#6BCB77', '#FF8E53', '#A78BFA', '#F472B6',
  '#34D399', '#FBBF24', '#60A5FA', '#F87171',
];

function loadItemsMap(): Record<Person, LotteryItem[]> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
    const oldKey = 'llyyds_lottery';
    const oldData = localStorage.getItem(oldKey);
    if (oldData) {
      const oldItems: LotteryItem[] = JSON.parse(oldData);
      localStorage.removeItem(oldKey);
      const map = { chaochao: oldItems, linlin: [] as LotteryItem[] };
      saveItemsMap(map);
      return map;
    }
    return { chaochao: [], linlin: [] };
  } catch {
    return { chaochao: [], linlin: [] };
  }
}

function saveItemsMap(itemsMap: Record<Person, LotteryItem[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(itemsMap));
}

export const useLotteryStore = create<LotteryState>((set) => ({
  itemsMap: loadItemsMap(),
  addItem: (person, name) =>
    set((state) => {
      const items = state.itemsMap[person];
      const colorIndex = items.length % DEFAULT_COLORS.length;
      const newItem: LotteryItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name,
        color: DEFAULT_COLORS[colorIndex],
      };
      const itemsMap = { ...state.itemsMap, [person]: [...items, newItem] };
      saveItemsMap(itemsMap);
      return { itemsMap };
    }),
  removeItem: (person, id) =>
    set((state) => {
      const items = state.itemsMap[person].filter((i) => i.id !== id);
      const itemsMap = { ...state.itemsMap, [person]: items };
      saveItemsMap(itemsMap);
      return { itemsMap };
    }),
}));
