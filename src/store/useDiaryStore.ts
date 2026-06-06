import { create } from 'zustand';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
import { useRoomStore, Gender, getRoomId } from '@/store/useRoomStore';
import { generateThumbnail } from '@/utils/helpers';

export interface DiaryEntry {
  id: string;
  content: string;
  photoCount: number;
  createdBy: Gender;
  createdAt: number;
  updatedAt: number;
}

export interface DiaryPhotos {
  [entryId: string]: {
    photos: string[];
    thumbnails: string[];
  };
}

interface DiaryState {
  entries: DiaryEntry[];
  photos: DiaryPhotos;
  loaded: boolean;
  photosLoaded: boolean;
  loadFromFirebase: () => void;
  loadPhotos: () => void;
  subscribeToFirebase: () => () => void;
  addEntry: (entry: { content: string; photos: string[] }) => void;
  updateEntry: (id: string, updates: { content?: string; photos?: string[] }) => void;
  getEntryPhotos: (entryId: string) => { photos: string[]; thumbnails: string[] };
}

// Migrate old data format (entries with photos/thumbnails inline) to new format
async function migrateOldData(roomId: string): Promise<{ entries: DiaryEntry[]; photos: DiaryPhotos } | null> {
  const oldData = await supabaseGet<any[]>(roomId, 'diaryEntries');
  if (!oldData || oldData.length === 0) return null;

  // Check if data is in old format (has photos array on entries)
  const firstEntry = oldData[0];
  if (!firstEntry || !Array.isArray(firstEntry.photos)) return null;

  // Migrate
  const entries: DiaryEntry[] = [];
  const photos: DiaryPhotos = {};

  for (const old of oldData) {
    const entryThumbnails = old.thumbnails && Array.isArray(old.thumbnails) && old.thumbnails.length > 0
      ? old.thumbnails
      : await Promise.all((old.photos || []).map((p: string) => generateThumbnail(p)));

    entries.push({
      id: old.id,
      content: old.content || '',
      photoCount: (old.photos || []).length,
      createdBy: old.createdBy,
      createdAt: old.createdAt,
      updatedAt: old.updatedAt,
    });

    if ((old.photos || []).length > 0) {
      photos[old.id] = {
        photos: old.photos,
        thumbnails: entryThumbnails,
      };
    }
  }

  // Save migrated data
  await supabaseSet(roomId, 'diaryEntries', entries);
  await supabaseSet(roomId, 'diaryPhotos', photos);

  return { entries, photos };
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: [],
  photos: {},
  loaded: false,
  photosLoaded: false,

  loadFromFirebase: async () => {
    const roomId = getRoomId();
    if (!roomId) return;

    // Try loading new format first
    const data = await supabaseGet<DiaryEntry[]>(roomId, 'diaryEntries');
    if (!data || data.length === 0) {
      set({ entries: [], loaded: true });
      return;
    }

    // Check if data is in old format (has photos array)
    const firstEntry = data[0];
    if (firstEntry && Array.isArray((firstEntry as any).photos)) {
      // Old format - migrate
      const migrated = await migrateOldData(roomId);
      if (migrated) {
        set({ entries: migrated.entries, photos: migrated.photos, loaded: true, photosLoaded: true });
        return;
      }
    }

    // New format - entries without photos
    set({ entries: data, loaded: true });
    // Load photos in background
    get().loadPhotos();
  },

  loadPhotos: async () => {
    const roomId = getRoomId();
    if (!roomId) return;
    const data = await supabaseGet<DiaryPhotos>(roomId, 'diaryPhotos');
    if (data) {
      // Generate thumbnails for entries that don't have them
      const updated = { ...data };
      let needsSave = false;
      for (const entryId of Object.keys(updated)) {
        const entryPhotos = updated[entryId];
        if (entryPhotos.photos.length > 0 && (!entryPhotos.thumbnails || entryPhotos.thumbnails.length === 0)) {
          entryPhotos.thumbnails = await Promise.all(
            entryPhotos.photos.map((photo) => generateThumbnail(photo))
          );
          needsSave = true;
        }
      }
      set({ photos: updated, photosLoaded: true });
      if (needsSave && roomId) {
        supabaseSet(roomId, 'diaryPhotos', updated);
      }
    } else {
      set({ photosLoaded: true });
    }
  },

  subscribeToFirebase: () => {
    const roomId = getRoomId();
    if (!roomId) return () => {};
    const unsub1 = supabaseOn(roomId, 'diaryEntries', (data) => {
      set({ entries: data || [], loaded: true });
    });
    const unsub2 = supabaseOn(roomId, 'diaryPhotos', (data) => {
      set({ photos: data || {}, photosLoaded: true });
    });
    return () => {
      unsub1();
      unsub2();
    };
  },

  addEntry: async (entry) => {
    const state = get();
    const now = Date.now();
    const gender = useRoomStore.getState().gender || 'male';
    const entryId = now.toString() + Math.random().toString(36).substr(2, 9);

    const thumbnails = await Promise.all(
      entry.photos.map((photo) => generateThumbnail(photo))
    );

    const newEntry: DiaryEntry = {
      id: entryId,
      content: entry.content,
      photoCount: entry.photos.length,
      createdBy: gender as Gender,
      createdAt: now,
      updatedAt: now,
    };

    const entries = [newEntry, ...state.entries];
    const photos = {
      ...state.photos,
      [entryId]: { photos: entry.photos, thumbnails },
    };

    set({ entries, photos });
    const roomId = getRoomId();
    if (roomId) {
      supabaseSet(roomId, 'diaryEntries', entries);
      supabaseSet(roomId, 'diaryPhotos', photos);
    }
  },

  updateEntry: async (id, updates) => {
    const state = get();
    const entries = state.entries.map((e) =>
      e.id === id ? {
        ...e,
        ...(updates.content !== undefined ? { content: updates.content } : {}),
        ...(updates.photos !== undefined ? { photoCount: updates.photos.length } : {}),
        updatedAt: Date.now(),
      } : e
    );

    let photos = state.photos;
    if (updates.photos) {
      const thumbnails = await Promise.all(
        updates.photos.map((photo) => generateThumbnail(photo))
      );
      photos = {
        ...photos,
        [id]: { photos: updates.photos, thumbnails },
      };
    }

    set({ entries, photos });
    const roomId = getRoomId();
    if (roomId) {
      supabaseSet(roomId, 'diaryEntries', entries);
      supabaseSet(roomId, 'diaryPhotos', photos);
    }
  },

  getEntryPhotos: (entryId: string) => {
    return get().photos[entryId] || { photos: [], thumbnails: [] };
  },
}));
