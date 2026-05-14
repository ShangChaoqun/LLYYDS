import { create } from 'zustand';

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
  createdAt: number;
}

interface WishState {
  wishes: Wish[];
  addWish: (wish: Omit<Wish, 'id' | 'completed' | 'completedAt' | 'completedPhoto' | 'createdAt'>) => void;
  completeWish: (id: string, completedPhoto?: string) => void;
  uncompleteWish: (id: string) => void;
  deleteWish: (id: string) => void;
}

const STORAGE_KEY = 'llyyds_wishes';

function loadWishes(): Wish[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveWishes(wishes: Wish[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes));
}

export const useWishStore = create<WishState>((set) => ({
  wishes: loadWishes(),
  addWish: (wish) =>
    set((state) => {
      const newWish: Wish = {
        ...wish,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        completed: false,
        completedAt: '',
        completedPhoto: '',
        createdAt: Date.now(),
      };
      const wishes = [newWish, ...state.wishes];
      saveWishes(wishes);
      return { wishes };
    }),
  completeWish: (id, completedPhoto) =>
    set((state) => {
      const wishes = state.wishes.map((w) =>
        w.id === id
          ? { ...w, completed: true, completedAt: new Date().toISOString(), completedPhoto: completedPhoto || '' }
          : w
      );
      saveWishes(wishes);
      return { wishes };
    }),
  uncompleteWish: (id) =>
    set((state) => {
      const wishes = state.wishes.map((w) =>
        w.id === id ? { ...w, completed: false, completedAt: '', completedPhoto: '' } : w
      );
      saveWishes(wishes);
      return { wishes };
    }),
  deleteWish: (id) =>
    set((state) => {
      const wishes = state.wishes.filter((w) => w.id !== id);
      saveWishes(wishes);
      return { wishes };
    }),
}));
