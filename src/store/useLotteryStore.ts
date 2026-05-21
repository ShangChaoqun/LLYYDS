import { create } from 'zustand';
import { Person } from '@/store/useAffinityStore';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
import { useRoomStore } from '@/store/useRoomStore';

export interface LotteryItem {
  id: string;
  name: string;
  color: string;
}

interface LotteryState {
  itemsMap: Record<Person, LotteryItem[]>;
  loaded: boolean;
  loadFromFirebase: () => void;
  subscribeToFirebase: () => () => void;
  addItem: (person: Person, name: string) => void;
  removeItem: (person: Person, id: string) => void;
}

const DEFAULT_COLORS = [
  '#FF6B8A', '#B088F9', '#6EC6FF', '#FFD93D',
  '#6BCB77', '#FF8E53', '#A78BFA', '#F472B6',
  '#34D399', '#FBBF24', '#60A5FA', '#F87171',
];

const INITIAL_MAP: Record<Person, LotteryItem[]> = { chaochao: [], linlin: [] };

export const useLotteryStore = create<LotteryState>((set, get) => ({
  itemsMap: { ...INITIAL_MAP },
  loaded: false,

  loadFromFirebase: async () => {
    const roomId = useRoomStore.getState().roomId;
    if (!roomId) return;
    const data = await supabaseGet<Record<Person, LotteryItem[]>>(roomId, 'lotteryItemsMap');
    set({ itemsMap: data || { ...INITIAL_MAP }, loaded: true });
  },

  subscribeToFirebase: () => {
    const roomId = useRoomStore.getState().roomId;
    if (!roomId) return () => {};
    return supabaseOn(roomId, 'lotteryItemsMap', (data) => {
      set({ itemsMap: data || { ...INITIAL_MAP }, loaded: true });
    });
  },

  addItem: (person, name) => {
    const state = get();
    const items = state.itemsMap[person];
    const colorIndex = items.length % DEFAULT_COLORS.length;
    const newItem: LotteryItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      color: DEFAULT_COLORS[colorIndex],
    };
    const itemsMap = { ...state.itemsMap, [person]: [...items, newItem] };
    set({ itemsMap });
    const roomId = useRoomStore.getState().roomId;
    if (roomId) supabaseSet(roomId, 'lotteryItemsMap', itemsMap);
  },

  removeItem: (person, id) => {
    const state = get();
    const items = state.itemsMap[person].filter((i) => i.id !== id);
    const itemsMap = { ...state.itemsMap, [person]: items };
    set({ itemsMap });
    const roomId = useRoomStore.getState().roomId;
    if (roomId) supabaseSet(roomId, 'lotteryItemsMap', itemsMap);
  },
}));
