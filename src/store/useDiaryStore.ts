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

export interface DiaryPhotoData {
  photos: string[];
  thumbnails: string[];
}

export interface DiaryPhotos {
  [entryId: string]: DiaryPhotoData;
}

interface DiaryState {
  entries: DiaryEntry[];
  photos: DiaryPhotos;
  loaded: boolean;
  loadFromFirebase: () => void;
  loadPhotosProgressive: () => void;
  subscribeToFirebase: () => () => void;
  addEntry: (entry: { content: string; photos: string[] }) => void;
  updateEntry: (id: string, updates: { content?: string; photos?: string[] }) => void;
  getEntryPhotos: (entryId: string) => DiaryPhotoData;
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

  // Save migrated data - entries without photos, and each entry's photos separately
  await supabaseSet(roomId, 'diaryEntries', entries);
  for (const entryId of Object.keys(photos)) {
    await supabaseSet(roomId, `diaryPhotos:${entryId}`, photos[entryId]);
  }

  return { entries, photos };
}

// Migrate old single-collection diaryPhotos to per-entry collections
async function migrateOldPhotosCollection(roomId: string): Promise<DiaryPhotos | null> {
  const oldPhotos = await supabaseGet<DiaryPhotos>(roomId, 'diaryPhotos');
  if (!oldPhotos || Object.keys(oldPhotos).length === 0) return null;

  // Save each entry's photos separately
  for (const entryId of Object.keys(oldPhotos)) {
    await supabaseSet(roomId, `diaryPhotos:${entryId}`, oldPhotos[entryId]);
  }

  return oldPhotos;
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: [],
  photos: {},
  loaded: false,

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
        set({ entries: migrated.entries, photos: migrated.photos, loaded: true });
        return;
      }
    }

    // New format - entries without photos
    set({ entries: data, loaded: true });
    // Load photos progressively in background
    get().loadPhotosProgressive();
  },

  loadPhotosProgressive: async () => {
    const roomId = getRoomId();
    if (!roomId) return;

    const { entries } = get();

    // First, try migrating old single-collection format
    const oldPhotos = await migrateOldPhotosCollection(roomId);

    // Load photos entry by entry, updating state after each one
    for (const entry of entries) {
      if (entry.photoCount <= 0) continue;

      // Check if already loaded
      if (get().photos[entry.id]) continue;

      // Check if we got it from migration
      if (oldPhotos && oldPhotos[entry.id]) {
        set((state) => ({
          photos: { ...state.photos, [entry.id]: oldPhotos[entry.id] },
        }));
        continue;
      }

      // Load this entry's photos individually
      const photoData = await supabaseGet<DiaryPhotoData>(roomId, `diaryPhotos:${entry.id}`);
      if (photoData) {
        // Generate thumbnails if missing
        if (photoData.photos.length > 0 && (!photoData.thumbnails || photoData.thumbnails.length === 0)) {
          photoData.thumbnails = await Promise.all(
            photoData.photos.map((photo) => generateThumbnail(photo))
          );
          supabaseSet(roomId, `diaryPhotos:${entry.id}`, photoData);
        }
        // Update state immediately so this entry's photos appear on screen
        set((state) => ({
          photos: { ...state.photos, [entry.id]: photoData },
        }));
      }
    }
  },

  subscribeToFirebase: () => {
    const roomId = getRoomId();
    if (!roomId) return () => {};
    const unsub1 = supabaseOn(roomId, 'diaryEntries', (data) => {
      set({ entries: data || [], loaded: true });
    });
    // We don't subscribe to individual photo collections since they change infrequently
    // Photos are loaded on demand
    return () => {
      unsub1();
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

    const photoData: DiaryPhotoData = { photos: entry.photos, thumbnails };

    const entries = [newEntry, ...state.entries];
    const photos = {
      ...state.photos,
      [entryId]: photoData,
    };

    set({ entries, photos });
    const roomId = getRoomId();
    if (roomId) {
      supabaseSet(roomId, 'diaryEntries', entries);
      supabaseSet(roomId, `diaryPhotos:${entryId}`, photoData);
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
      const photoData: DiaryPhotoData = { photos: updates.photos, thumbnails };
      photos = {
        ...photos,
        [id]: photoData,
      };
      const roomId = getRoomId();
      if (roomId) {
        supabaseSet(roomId, `diaryPhotos:${id}`, photoData);
      }
    }

    set({ entries, photos });
    const roomId = getRoomId();
    if (roomId) {
      supabaseSet(roomId, 'diaryEntries', entries);
    }
  },

  getEntryPhotos: (entryId: string) => {
    return get().photos[entryId] || { photos: [], thumbnails: [] };
  },
}));
