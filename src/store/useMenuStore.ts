import { create } from 'zustand';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  photo: string;
  createdAt: number;
}

interface MenuState {
  menuItems: MenuItem[];
  addMenuItem: (item: Omit<MenuItem, 'id' | 'createdAt'>) => void;
  updateMenuItem: (id: string, updates: Partial<Pick<MenuItem, 'description' | 'photo'>>) => void;
  deleteMenuItem: (id: string) => void;
}

const STORAGE_KEY = 'llyyds_menu';

function loadMenuItems(): MenuItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveMenuItems(items: MenuItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const useMenuStore = create<MenuState>((set) => ({
  menuItems: loadMenuItems(),
  addMenuItem: (item) =>
    set((state) => {
      const newItem: MenuItem = {
        ...item,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
      };
      const menuItems = [newItem, ...state.menuItems];
      saveMenuItems(menuItems);
      return { menuItems };
    }),
  updateMenuItem: (id, updates) =>
    set((state) => {
      const menuItems = state.menuItems.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      );
      saveMenuItems(menuItems);
      return { menuItems };
    }),
  deleteMenuItem: (id) =>
    set((state) => {
      const menuItems = state.menuItems.filter((i) => i.id !== id);
      saveMenuItems(menuItems);
      return { menuItems };
    }),
}));
