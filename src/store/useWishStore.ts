import { create } from 'zustand';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
import { useRoomStore, Gender } from '@/store/useRoomStore';

export interface Wish {
  id: string;
  title: string;
  description: string;
  photo: string;
  dueDate: string;
  proposedAt: string;
  completed: boolean;
  completedAt: string;
  completedPhoto: string;
  createdBy: Gender;
  createdAt: number;
}

interface WishState {
  wishes: Wish[];
  loaded: boolean;
  loadFromFirebase: () => void;
  subscribeToFirebase: () => () => void;
  addWish: (wish: Omit<Wish, 'id' | 'completed' | 'completedAt' | 'completedPhoto' | 'createdBy' | 'createdAt'>) => void;
  completeWish: (id: string, completedPhoto?: string) => void;
  uncompleteWish: (id: string) => void;
  deleteWish: (id: string) => void;
}

export const useWishStore = create<WishState>((set, get) => ({
  wishes: [],
  loaded: false,

  loadFromFirebase: async () => {
    const roomId = useRoomStore.getState().roomId;
    if (!roomId) return;
    const data = await supabaseGet<Wish[]>(roomId, 'wishes');
    set({ wishes: data || [], loaded: true });
  },

  subscribeToFirebase: () => {
    const roomId = useRoomStore.getState().roomId;
    if (!roomId) return () => {};
    return supabaseOn(roomId, 'wishes', (data) => {
      set({ wishes: data || [], loaded: true });
    });
  },

  addWish: (wish) => {
    const state = get();
    const gender = useRoomStore.getState().gender || 'male';
    const newWish: Wish = {
      ...wish,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      completed: false,
      completedAt: '',
      completedPhoto: '',
      createdBy: gender as Gender,
      createdAt: Date.now(),
    };
    const wishes = [newWish, ...state.wishes];
    set({ wishes });
    const roomId = useRoomStore.getState().roomId;
    if (roomId) supabaseSet(roomId, 'wishes', wishes);
  },

  completeWish: (id, completedPhoto) => {
    const state = get();
    const wishes = state.wishes.map((w) =>
      w.id === id
        ? { ...w, completed: true, completedAt: new Date().toISOString(), completedPhoto: completedPhoto || '' }
        : w
    );
    set({ wishes });
    const roomId = useRoomStore.getState().roomId;
    if (roomId) supabaseSet(roomId, 'wishes', wishes);
  },

  uncompleteWish: (id) => {
    const state = get();
    const wishes = state.wishes.map((w) =>
      w.id === id ? { ...w, completed: false, completedAt: '', completedPhoto: '' } : w
    );
    set({ wishes });
    const roomId = useRoomStore.getState().roomId;
    if (roomId) supabaseSet(roomId, 'wishes', wishes);
  },

  deleteWish: (id) => {
    const state = get();
    const wishes = state.wishes.filter((w) => w.id !== id);
    set({ wishes });
    const roomId = useRoomStore.getState().roomId;
    if (roomId) supabaseSet(roomId, 'wishes', wishes);
  },
}));
