import { create } from 'zustand';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
import { useRoomStore, Gender, getRoomId } from '@/store/useRoomStore';
import { generateThumbnail } from '@/utils/helpers';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  hasPhoto: boolean;
  createdBy: Gender;
  createdAt: number;
}

export interface MenuPhotos {
  [itemId: string]: {
    photo: string;
    thumbnail: string;
  };
}

interface MenuState {
  menuItems: MenuItem[];
  photos: MenuPhotos;
  loaded: boolean;
  loadFromFirebase: () => void;
  subscribeToFirebase: () => () => void;
  addMenuItem: (item: { name: string; description: string; photo: string }) => void;
  updateMenuItem: (id: string, updates: Partial<Pick<MenuItem, 'description'>> & { photo?: string }) => void;
  getItemPhoto: (itemId: string) => { photo: string; thumbnail: string } | undefined;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  menuItems: [],
  photos: {},
  loaded: false,

  loadFromFirebase: async () => {
    const roomId = getRoomId();
    if (!roomId) return;

    const data = await supabaseGet<any[]>(roomId, 'menuItems');
    if (!data || data.length === 0) {
      set({ menuItems: [], loaded: true });
      return;
    }

    // Check if data is in old format (has photo as string field)
    const firstItem = data[0];
    if (firstItem && typeof firstItem.photo === 'string') {
      // Old format - migrate
      const items: MenuItem[] = [];
      const photos: MenuPhotos = {};

      for (const old of data) {
        const hasPhoto = !!(old.photo && old.photo.length > 0);
        items.push({
          id: old.id,
          name: old.name,
          description: old.description || '',
          hasPhoto,
          createdBy: old.createdBy,
          createdAt: old.createdAt,
        });
        if (hasPhoto) {
          const thumbnail = await generateThumbnail(old.photo);
          photos[old.id] = { photo: old.photo, thumbnail };
        }
      }

      await supabaseSet(roomId, 'menuItems', items);
      await supabaseSet(roomId, 'menuPhotos', photos);
      set({ menuItems: items, photos, loaded: true });
      return;
    }

    // New format - items without inline photos
    set({ menuItems: data, loaded: true });
    // Load photos
    const photoData = await supabaseGet<MenuPhotos>(roomId, 'menuPhotos');
    if (photoData) {
      const updated = { ...photoData };
      let needsSave = false;
      for (const itemId of Object.keys(updated)) {
        if (updated[itemId].photo && !updated[itemId].thumbnail) {
          updated[itemId].thumbnail = await generateThumbnail(updated[itemId].photo);
          needsSave = true;
        }
      }
      set({ photos: updated });
      if (needsSave) {
        supabaseSet(roomId, 'menuPhotos', updated);
      }
    }
  },

  subscribeToFirebase: () => {
    const roomId = getRoomId();
    if (!roomId) return () => {};
    const unsub1 = supabaseOn(roomId, 'menuItems', (data) => {
      set({ menuItems: data || [], loaded: true });
    });
    const unsub2 = supabaseOn(roomId, 'menuPhotos', (data) => {
      set({ photos: data || {} });
    });
    return () => {
      unsub1();
      unsub2();
    };
  },

  addMenuItem: async (item) => {
    const state = get();
    const gender = useRoomStore.getState().gender || 'male';
    const itemId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    const hasPhoto = !!(item.photo && item.photo.length > 0);
    const thumbnail = hasPhoto ? await generateThumbnail(item.photo) : '';

    const newItem: MenuItem = {
      id: itemId,
      name: item.name,
      description: item.description,
      hasPhoto,
      createdBy: gender as Gender,
      createdAt: Date.now(),
    };

    const menuItems = [newItem, ...state.menuItems];
    const photos = hasPhoto
      ? { ...state.photos, [itemId]: { photo: item.photo, thumbnail } }
      : state.photos;

    set({ menuItems, photos });
    const roomId = getRoomId();
    if (roomId) {
      supabaseSet(roomId, 'menuItems', menuItems);
      supabaseSet(roomId, 'menuPhotos', photos);
    }
  },

  updateMenuItem: async (id, updates) => {
    const state = get();
    const menuItems = state.menuItems.map((i) => {
      if (i.id !== id) return i;
      return {
        ...i,
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.photo !== undefined ? { hasPhoto: !!updates.photo } : {}),
      };
    });

    let photos = state.photos;
    if (updates.photo !== undefined) {
      if (updates.photo) {
        const thumbnail = await generateThumbnail(updates.photo);
        photos = { ...photos, [id]: { photo: updates.photo, thumbnail } };
      } else {
        const { [id]: _, ...rest } = photos;
        photos = rest;
      }
    }

    set({ menuItems, photos });
    const roomId = getRoomId();
    if (roomId) {
      supabaseSet(roomId, 'menuItems', menuItems);
      supabaseSet(roomId, 'menuPhotos', photos);
    }
  },

  getItemPhoto: (itemId: string) => {
    return get().photos[itemId];
  },
}));
