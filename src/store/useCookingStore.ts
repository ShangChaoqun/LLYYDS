import { create } from 'zustand';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
import { uploadImage } from '@/lib/storage';
import { useRoomStore, Gender, getRoomId } from '@/store/useRoomStore';
import { generateThumbnail } from '@/utils/helpers';

export interface CookingRecord {
  id: string;
  date: string;
  photoCount: number;
  note: string;
  createdBy: Gender;
  createdAt: number;
}

export interface CookingPhotos {
  [recordId: string]: {
    photos: string[];
    thumbnails: string[];
  };
}

interface CookingState {
  records: CookingRecord[];
  photos: CookingPhotos;
  loaded: boolean;
  photosLoading: boolean;
  loadFromFirebase: () => void;
  loadPhotos: () => void;
  subscribeToFirebase: () => () => void;
  addRecord: (record: Omit<CookingRecord, 'id' | 'createdBy' | 'createdAt' | 'photoCount'> & { photos: string[] }) => void;
}

export const useCookingStore = create<CookingState>((set, get) => ({
  records: [],
  photos: {},
  loaded: false,
  photosLoading: false,

  // Only load text data, no photos
  loadFromFirebase: async () => {
    const roomId = getRoomId();
    if (!roomId) return;

    const data = await supabaseGet<any[]>(roomId, 'cookingRecords');
    if (!data || data.length === 0) {
      set({ records: [], loaded: true });
      return;
    }

    // Check if data is in old format (has photos array)
    const firstRecord = data[0];
    if (firstRecord && Array.isArray(firstRecord.photos)) {
      // Old format - migrate
      const records: CookingRecord[] = [];
      const photos: CookingPhotos = {};

      for (const old of data) {
        const photoArr: string[] = old.photos || [];
        const uploadedPhotos: string[] = [];
        const uploadedThumbnails: string[] = [];

        for (let i = 0; i < photoArr.length; i++) {
          const photoUrl = await uploadImage(photoArr[i], `cooking/${old.id}/${i}.jpg`);
          const thumbBase64 = await generateThumbnail(photoArr[i], 200, 0.5);
          const thumbUrl = await uploadImage(thumbBase64, `cooking/${old.id}/${i}_thumb.jpg`);
          uploadedPhotos.push(photoUrl);
          uploadedThumbnails.push(thumbUrl);
        }

        records.push({
          id: old.id,
          date: old.date || '',
          photoCount: photoArr.length,
          note: old.note || '',
          createdBy: old.createdBy,
          createdAt: old.createdAt,
        });
        if (photoArr.length > 0) {
          photos[old.id] = { photos: uploadedPhotos, thumbnails: uploadedThumbnails };
        }
      }

      await supabaseSet(roomId, 'cookingRecords', records);
      await supabaseSet(roomId, 'cookingPhotos', photos);
      set({ records, photos, loaded: true });
      return;
    }

    // New format - records without inline photos, don't load photos here
    set({ records: data, loaded: true });
  },

  // Load photos separately when page is visited
  loadPhotos: async () => {
    const state = get();
    if (state.photosLoading) return;
    // Skip if already loaded
    if (Object.keys(state.photos).length > 0 && state.records.every(r => r.photoCount === 0 || state.photos[r.id])) return;
    set({ photosLoading: true });

    const roomId = getRoomId();
    if (!roomId) { set({ photosLoading: false }); return; }

    const photoData = await supabaseGet<CookingPhotos>(roomId, 'cookingPhotos');
    if (photoData) {
      set({ photos: photoData, photosLoading: false });
    } else {
      set({ photosLoading: false });
    }
  },

  subscribeToFirebase: () => {
    const roomId = getRoomId();
    if (!roomId) return () => {};
    const unsub1 = supabaseOn(roomId, 'cookingRecords', (data) => {
      set({ records: data || [], loaded: true });
    });
    const unsub2 = supabaseOn(roomId, 'cookingPhotos', (data) => {
      set({ photos: data || {} });
    });
    return () => {
      unsub1();
      unsub2();
    };
  },

  addRecord: async (record) => {
    const state = get();
    const gender = useRoomStore.getState().gender || 'male';
    const recordId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    const uploadedPhotos: string[] = [];
    const uploadedThumbnails: string[] = [];

    for (let i = 0; i < record.photos.length; i++) {
      const photoUrl = await uploadImage(record.photos[i], `cooking/${recordId}/${i}.jpg`);
      const thumbBase64 = await generateThumbnail(record.photos[i], 200, 0.5);
      const thumbUrl = await uploadImage(thumbBase64, `cooking/${recordId}/${i}_thumb.jpg`);
      uploadedPhotos.push(photoUrl);
      uploadedThumbnails.push(thumbUrl);
    }

    const newRecord: CookingRecord = {
      id: recordId,
      date: record.date,
      photoCount: record.photos.length,
      note: record.note,
      createdBy: gender as Gender,
      createdAt: Date.now(),
    };

    const records = [newRecord, ...state.records];
    const photos = {
      ...state.photos,
      ...(record.photos.length > 0 ? { [recordId]: { photos: uploadedPhotos, thumbnails: uploadedThumbnails } } : {}),
    };

    set({ records, photos });
    const roomId = getRoomId();
    if (roomId) {
      supabaseSet(roomId, 'cookingRecords', records);
      supabaseSet(roomId, 'cookingPhotos', photos);
    }
  },
}));
