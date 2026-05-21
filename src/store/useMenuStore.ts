import { create } from 'zustand';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
import { useRoomStore, Gender } from '@/store/useRoomStore';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  photo: string;
  createdBy: Gender;
  createdAt: number;
}

interface MenuState {
  menuItems: MenuItem[];
  loaded: boolean;
  loadFromFirebase: () => void;
  subscribeToFirebase: () => () => void;
  addMenuItem: (item: Omit<MenuItem, 'id' | 'createdBy' | 'createdAt'>) => void;
  updateMenuItem: (id: string, updates: Partial<Pick<MenuItem, 'description' | 'photo'>>) => void;
  deleteMenuItem: (id: string) => void;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  menuItems: [],
  loaded: false,

  loadFromFirebase: async () => {
    const roomId = useRoomStore.getState().roomId;
    if (!roomId) return;
    const data = await supabaseGet<MenuItem[]>(roomId, 'menuItems');
    set({ menuItems: data || [], loaded: true });
  },

  subscribeToFirebase: () => {
    const roomId = useRoomStore.getState().roomId;
    if (!roomId) return () => {};
    return supabaseOn(roomId, 'menuItems', (data) => {
      set({ menuItems: data || [], loaded: true });
    });
  },

  addMenuItem: (item) => {
    const state = get();
    const gender = useRoomStore.getState().gender || 'male';
    const newItem: MenuItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdBy: gender as Gender,
      createdAt: Date.now(),
    };
    const menuItems = [newItem, ...state.menuItems];
    set({ menuItems });
    const roomId = useRoomStore.getState().roomId;
    if (roomId) supabaseSet(roomId, 'menuItems', menuItems);
  },

  updateMenuItem: (id, updates) => {
    const state = get();
    const menuItems = state.menuItems.map((i) => i.id === id ? { ...i, ...updates } : i);
    set({ menuItems });
    const roomId = useRoomStore.getState().roomId;
    if (roomId) supabaseSet(roomId, 'menuItems', menuItems);
  },

  deleteMenuItem: (id) => {
    const state = get();
    const menuItems = state.menuItems.filter((i) => i.id !== id);
    set({ menuItems });
    const roomId = useRoomStore.getState().roomId;
    if (roomId) supabaseSet(roomId, 'menuItems', menuItems);
  },
}));
