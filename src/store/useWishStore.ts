import { create } from 'zustand';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
import { uploadImage } from '@/lib/storage';
import { useRoomStore, Gender, getRoomId } from '@/store/useRoomStore';
import { generateThumbnail } from '@/utils/helpers';

export interface Wish {
  id: string;
  title: string;
  description: string;
  hasPhoto: boolean;
  dueDate: string;
  proposedAt: string;
  completed: boolean;
  completedAt: string;
  hasCompletedPhoto: boolean;
  createdBy: Gender;
  createdAt: number;
}

export interface WishPhotos {
  [wishId: string]: {
    photo?: string;
    photoThumbnail?: string;
    completedPhoto?: string;
    completedPhotoThumbnail?: string;
  };
}

interface WishState {
  wishes: Wish[];
  photos: WishPhotos;
  loaded: boolean;
  photosLoading: boolean;
  loadFromFirebase: () => void;
  loadPhotos: () => void;
  subscribeToFirebase: () => () => void;
  addWish: (wish: Omit<Wish, 'id' | 'completed' | 'completedAt' | 'hasCompletedPhoto' | 'createdBy' | 'createdAt' | 'hasPhoto'> & { photo?: string }) => void;
  completeWish: (id: string, completedPhoto?: string) => void;
  uncompleteWish: (id: string) => void;
}

export const useWishStore = create<WishState>((set, get) => ({
  wishes: [],
  photos: {},
  loaded: false,
  photosLoading: false,

  // Only load text data, no photos
  loadFromFirebase: async () => {
    const roomId = getRoomId();
    if (!roomId) return;

    const data = await supabaseGet<any[]>(roomId, 'wishes');
    if (!data || data.length === 0) {
      set({ wishes: [], loaded: true });
      return;
    }

    // Check if data is in old format (has 'photo' as string property)
    const first = data[0];
    if (first && 'photo' in first && typeof first.photo === 'string') {
      // Old format - migrate
      const wishes: Wish[] = [];
      const photos: WishPhotos = {};

      for (const old of data) {
        const hasPhoto = !!(old.photo && old.photo.length > 0);
        const hasCompletedPhoto = !!(old.completedPhoto && old.completedPhoto.length > 0);
        wishes.push({
          id: old.id,
          title: old.title,
          description: old.description || '',
          hasPhoto,
          dueDate: old.dueDate || '',
          proposedAt: old.proposedAt || '',
          completed: old.completed || false,
          completedAt: old.completedAt || '',
          hasCompletedPhoto,
          createdBy: old.createdBy,
          createdAt: old.createdAt,
        });
        const entry: any = {};
        if (hasPhoto) {
          entry.photo = await uploadImage(old.photo, `wishes/${old.id}/photo.jpg`);
          const thumbBase64 = await generateThumbnail(old.photo, 200, 0.5);
          entry.photoThumbnail = await uploadImage(thumbBase64, `wishes/${old.id}/photo_thumb.jpg`);
        }
        if (hasCompletedPhoto) {
          entry.completedPhoto = await uploadImage(old.completedPhoto, `wishes/${old.id}/completed.jpg`);
          const thumbBase64 = await generateThumbnail(old.completedPhoto, 200, 0.5);
          entry.completedPhotoThumbnail = await uploadImage(thumbBase64, `wishes/${old.id}/completed_thumb.jpg`);
        }
        if (hasPhoto || hasCompletedPhoto) {
          photos[old.id] = entry;
        }
      }

      await supabaseSet(roomId, 'wishes', wishes);
      await supabaseSet(roomId, 'wishPhotos', photos);
      set({ wishes, photos, loaded: true });
      return;
    }

    // New format - wishes without inline photos, don't load photos here
    set({ wishes: data, loaded: true });
  },

  // Load photos separately when page is visited
  loadPhotos: async () => {
    const state = get();
    if (state.photosLoading) return;
    // Skip if already loaded
    if (Object.keys(state.photos).length > 0 && state.wishes.every(w => (!w.hasPhoto && !w.hasCompletedPhoto) || state.photos[w.id])) return;
    set({ photosLoading: true });

    const roomId = getRoomId();
    if (!roomId) { set({ photosLoading: false }); return; }

    const photoData = await supabaseGet<WishPhotos>(roomId, 'wishPhotos');
    if (photoData) {
      set({ photos: photoData, photosLoading: false });
    } else {
      set({ photosLoading: false });
    }
  },

  subscribeToFirebase: () => {
    const roomId = getRoomId();
    if (!roomId) return () => {};
    const unsub1 = supabaseOn(roomId, 'wishes', (data) => {
      set({ wishes: data || [], loaded: true });
    });
    const unsub2 = supabaseOn(roomId, 'wishPhotos', (data) => {
      set({ photos: data || {} });
    });
    return () => {
      unsub1();
      unsub2();
    };
  },

  addWish: async (wish) => {
    const state = get();
    const gender = useRoomStore.getState().gender || 'male';
    const wishId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const hasPhoto = !!(wish.photo && wish.photo.length > 0);

    const newWish: Wish = {
      id: wishId,
      title: wish.title,
      description: wish.description,
      hasPhoto,
      dueDate: wish.dueDate,
      proposedAt: wish.proposedAt,
      completed: false,
      completedAt: '',
      hasCompletedPhoto: false,
      createdBy: gender as Gender,
      createdAt: Date.now(),
    };

    const wishes = [newWish, ...state.wishes];
    let photos = { ...state.photos };

    if (hasPhoto) {
      const photoUrl = await uploadImage(wish.photo!, `wishes/${wishId}/photo.jpg`);
      const thumbBase64 = await generateThumbnail(wish.photo!, 200, 0.5);
      const thumbUrl = await uploadImage(thumbBase64, `wishes/${wishId}/photo_thumb.jpg`);
      photos[wishId] = {
        photo: photoUrl,
        photoThumbnail: thumbUrl,
      };
    }

    set({ wishes, photos });
    const roomId = getRoomId();
    if (roomId) {
      supabaseSet(roomId, 'wishes', wishes);
      supabaseSet(roomId, 'wishPhotos', photos);
    }
  },

  completeWish: async (id, completedPhoto) => {
    const state = get();
    const hasCompletedPhoto = !!(completedPhoto && completedPhoto.length > 0);
    const wishes = state.wishes.map((w) =>
      w.id === id
        ? { ...w, completed: true, completedAt: new Date().toISOString(), hasCompletedPhoto }
        : w
    );

    let photos = { ...state.photos };
    if (hasCompletedPhoto) {
      const completedUrl = await uploadImage(completedPhoto!, `wishes/${id}/completed.jpg`);
      const thumbBase64 = await generateThumbnail(completedPhoto!, 200, 0.5);
      const completedThumbUrl = await uploadImage(thumbBase64, `wishes/${id}/completed_thumb.jpg`);
      photos = {
        ...photos,
        [id]: {
          ...photos[id],
          completedPhoto: completedUrl,
          completedPhotoThumbnail: completedThumbUrl,
        },
      };
    }

    set({ wishes, photos });
    const roomId = getRoomId();
    if (roomId) {
      supabaseSet(roomId, 'wishes', wishes);
      supabaseSet(roomId, 'wishPhotos', photos);
    }
  },

  uncompleteWish: (id) => {
    const state = get();
    const wishes = state.wishes.map((w) =>
      w.id === id ? { ...w, completed: false, completedAt: '', hasCompletedPhoto: false } : w
    );

    let photos = { ...state.photos };
    if (photos[id]) {
      const { completedPhoto, completedPhotoThumbnail, ...rest } = photos[id];
      if (rest.photo || rest.photoThumbnail) {
        photos[id] = rest;
      } else {
        delete photos[id];
      }
    }

    set({ wishes, photos });
    const roomId = getRoomId();
    if (roomId) {
      supabaseSet(roomId, 'wishes', wishes);
      supabaseSet(roomId, 'wishPhotos', photos);
    }
  },
}));
