import { create } from 'zustand';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
import { uploadImage } from '@/lib/storage';
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
  photosLoading: boolean;
  loadFromFirebase: () => void;
  loadPhotos: () => void;
  subscribeToFirebase: () => () => void;
  addMenuItem: (item: { name: string; description: string; photo: string }) => void;
  updateMenuItem: (id: string, updates: Partial<Pick<MenuItem, 'description'>> & { photo?: string }) => void;
  getItemPhoto: (itemId: string) => { photo: string; thumbnail: string } | undefined;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  menuItems: [],
  photos: {},
  loaded: false,
  photosLoading: false,

  // Only load text data, no photos
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
          const photoUrl = await uploadImage(old.photo, `menu/${old.id}/photo.jpg`);
          const thumbBase64 = await generateThumbnail(old.photo, 200, 0.5);
          const thumbUrl = await uploadImage(thumbBase64, `menu/${old.id}/photo_thumb.jpg`);
          photos[old.id] = { photo: photoUrl, thumbnail: thumbUrl };
        }
      }

      await supabaseSet(roomId, 'menuItems', items);
      await supabaseSet(roomId, 'menuPhotos', photos);
      set({ menuItems: items, photos, loaded: true });
      return;
    }

    // New format - items without inline photos, don't load photos here
    set({ menuItems: data, loaded: true });
  },

  // Load photos separately when page is visited
  loadPhotos: async () => {
    const state = get();
    if (state.photosLoading) return;
    // Skip if already loaded
    if (Object.keys(state.photos).length > 0 && state.menuItems.every(i => !i.hasPhoto || state.photos[i.id])) return;
    set({ photosLoading: true });

    const roomId = getRoomId();
    if (!roomId) { set({ photosLoading: false }); return; }

    const photoData = await supabaseGet<MenuPhotos>(roomId, 'menuPhotos');
    if (photoData) {
      set({ photos: photoData, photosLoading: false });
    } else {
      set({ photosLoading: false });
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
    let photoUrl = '';
    let thumbUrl = '';
    if (hasPhoto) {
      photoUrl = await uploadImage(item.photo, `menu/${itemId}/photo.jpg`);
      const thumbBase64 = await generateThumbnail(item.photo, 200, 0.5);
      thumbUrl = await uploadImage(thumbBase64, `menu/${itemId}/photo_thumb.jpg`);
    }

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
      ? { ...state.photos, [itemId]: { photo: photoUrl, thumbnail: thumbUrl } }
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
        const photoUrl = await uploadImage(updates.photo, `menu/${id}/photo.jpg`);
        const thumbBase64 = await generateThumbnail(updates.photo, 200, 0.5);
        const thumbUrl = await uploadImage(thumbBase64, `menu/${id}/photo_thumb.jpg`);
        photos = { ...photos, [id]: { photo: photoUrl, thumbnail: thumbUrl } };
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
