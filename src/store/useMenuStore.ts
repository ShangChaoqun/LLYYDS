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
  photosLoaded: boolean;
  loadFromFirebase: () => void;
  loadPhotos: () => void;
  subscribeToFirebase: () => () => void;
  addMenuItem: (item: { name: string; description: string; photo: string }) => void;
  updateMenuItem: (id: string, updates: Partial<Pick<MenuItem, 'description'>> & { photo?: string }) => void;
  getItemPhoto: (itemId: string) => { photo: string; thumbnail: string } | undefined;
}

// Migrate old data format (items with photo field inline) to new format
async function migrateOldData(roomId: string): Promise<{ items: MenuItem[]; photos: MenuPhotos } | null> {
  const oldData = await supabaseGet<any[]>(roomId, 'menuItems');
  if (!oldData || oldData.length === 0) return null;
  const first = oldData[0];
  if (!first || typeof first.photo !== 'string' || !('photo' in first)) return null;
  // Only migrate if photo field exists as string (old format)
  if (!('hasPhoto' in first) && !('photo' in first)) return null;

  const items: MenuItem[] = [];
  const photos: MenuPhotos = {};

  for (const old of oldData) {
    const hasPhoto = !!(old.photo && typeof old.photo === 'string' && old.photo.length > 0);
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
  return { items, photos };
}

export const useMenuStore = create<MenuState>((set, get) => ({
  menuItems: [],
  photos: {},
  loaded: false,
  photosLoaded: false,

  loadFromFirebase: async () => {
    const roomId = getRoomId();
    if (!roomId) return;

    // Try loading new format first
    const data = await supabaseGet<MenuItem[]>(roomId, 'menuItems');
    if (!data || data.length === 0) {
      set({ menuItems: [], loaded: true });
      return;
    }

    // Check if data is in old format (has photo as string)
    const firstItem = data[0];
    if (firstItem && typeof (firstItem as any).photo === 'string') {
      // Old format - migrate
      const migrated = await migrateOldData(roomId);
      if (migrated) {
        set({ menuItems: migrated.items, photos: migrated.photos, loaded: true, photosLoaded: true });
        return;
      }
    }

    // New format - items without photos
    set({ menuItems: data, loaded: true });
    // Load photos in background
    get().loadPhotos();
  },

  loadPhotos: async () => {
    const roomId = getRoomId();
    if (!roomId) return;
    const data = await supabaseGet<MenuPhotos>(roomId, 'menuPhotos');
    if (data) {
      // Generate thumbnails for items that don't have them
      const updated = { ...data };
      let needsSave = false;
      for (const itemId of Object.keys(updated)) {
        const itemPhotos = updated[itemId];
        if (itemPhotos.photo && !itemPhotos.thumbnail) {
          itemPhotos.thumbnail = await generateThumbnail(itemPhotos.photo);
          needsSave = true;
        }
      }
      set({ photos: updated, photosLoaded: true });
      if (needsSave && roomId) {
        supabaseSet(roomId, 'menuPhotos', updated);
      }
    } else {
      set({ photosLoaded: true });
    }
  },

  subscribeToFirebase: () => {
    const roomId = getRoomId();
    if (!roomId) return () => {};
    const unsub1 = supabaseOn(roomId, 'menuItems', (data) => {
      set({ menuItems: data || [], loaded: true });
    });
    const unsub2 = supabaseOn(roomId, 'menuPhotos', (data) => {
      set({ photos: data || {}, photosLoaded: true });
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
