import { create } from 'zustand';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
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
  photosLoaded: boolean;
  loadFromFirebase: () => void;
  loadPhotos: () => void;
  subscribeToFirebase: () => () => void;
  addRecord: (record: Omit<CookingRecord, 'id' | 'createdBy' | 'createdAt' | 'photoCount'> & { photos: string[] }) => void;
}

// Migrate old data format (records with photos array inline) to new format
async function migrateOldData(roomId: string): Promise<{ records: CookingRecord[]; photos: CookingPhotos } | null> {
  const oldData = await supabaseGet<any[]>(roomId, 'cookingRecords');
  if (!oldData || oldData.length === 0) return null;

  // Check if data is in old format (has photos array on records)
  const first = oldData[0];
  if (!first || !Array.isArray(first.photos)) return null;

  // Migrate
  const records: CookingRecord[] = [];
  const photos: CookingPhotos = {};

  for (const old of oldData) {
    const photoArr = old.photos || [];
    const thumbnails = await Promise.all(photoArr.map((p: string) => generateThumbnail(p)));
    records.push({
      id: old.id,
      date: old.date || '',
      photoCount: photoArr.length,
      note: old.note || '',
      createdBy: old.createdBy,
      createdAt: old.createdAt,
    });
    if (photoArr.length > 0) {
      photos[old.id] = { photos: photoArr, thumbnails };
    }
  }

  // Save migrated data
  await supabaseSet(roomId, 'cookingRecords', records);
  await supabaseSet(roomId, 'cookingPhotos', photos);

  return { records, photos };
}

export const useCookingStore = create<CookingState>((set, get) => ({
  records: [],
  photos: {},
  loaded: false,
  photosLoaded: false,

  loadFromFirebase: async () => {
    const roomId = getRoomId();
    if (!roomId) return;

    // Try loading new format first
    const data = await supabaseGet<CookingRecord[]>(roomId, 'cookingRecords');
    if (!data || data.length === 0) {
      set({ records: [], loaded: true });
      return;
    }

    // Check if data is in old format (has photos array)
    const firstRecord = data[0];
    if (firstRecord && Array.isArray((firstRecord as any).photos)) {
      // Old format - migrate
      const migrated = await migrateOldData(roomId);
      if (migrated) {
        set({ records: migrated.records, photos: migrated.photos, loaded: true, photosLoaded: true });
        return;
      }
    }

    // New format - records without photos
    set({ records: data, loaded: true });
    // Load photos in background
    get().loadPhotos();
  },

  loadPhotos: async () => {
    const roomId = getRoomId();
    if (!roomId) return;
    const data = await supabaseGet<CookingPhotos>(roomId, 'cookingPhotos');
    if (data) {
      // Generate thumbnails for records that don't have them
      const updated = { ...data };
      let needsSave = false;
      for (const recordId of Object.keys(updated)) {
        const recordPhotos = updated[recordId];
        if (recordPhotos.photos.length > 0 && (!recordPhotos.thumbnails || recordPhotos.thumbnails.length === 0)) {
          recordPhotos.thumbnails = await Promise.all(
            recordPhotos.photos.map((photo) => generateThumbnail(photo))
          );
          needsSave = true;
        }
      }
      set({ photos: updated, photosLoaded: true });
      if (needsSave && roomId) {
        supabaseSet(roomId, 'cookingPhotos', updated);
      }
    } else {
      set({ photosLoaded: true });
    }
  },

  subscribeToFirebase: () => {
    const roomId = getRoomId();
    if (!roomId) return () => {};
    const unsub1 = supabaseOn(roomId, 'cookingRecords', (data) => {
      set({ records: data || [], loaded: true });
    });
    const unsub2 = supabaseOn(roomId, 'cookingPhotos', (data) => {
      set({ photos: data || {}, photosLoaded: true });
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

    const thumbnails = await Promise.all(
      record.photos.map((photo) => generateThumbnail(photo))
    );

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
      ...(record.photos.length > 0 ? { [recordId]: { photos: record.photos, thumbnails } } : {}),
    };

    set({ records, photos });
    const roomId = getRoomId();
    if (roomId) {
      supabaseSet(roomId, 'cookingRecords', records);
      supabaseSet(roomId, 'cookingPhotos', photos);
    }
  },
}));
