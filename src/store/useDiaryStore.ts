import { create } from 'zustand';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
import { useRoomStore, Gender, getRoomId } from '@/store/useRoomStore';
import { uploadImage, isStorageUrl } from '@/lib/storage';
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
  photos: string[];    // URLs from Storage (or base64 for legacy)
  thumbnails: string[]; // Thumbnail URLs from Storage (or base64 for legacy)
}

export interface DiaryPhotos {
  [entryId: string]: DiaryPhotoData;
}

interface DiaryState {
  entries: DiaryEntry[];
  photos: DiaryPhotos;
  loaded: boolean;
  photosLoading: boolean;
  loadFromFirebase: () => void;
  loadPhotosProgressive: () => void;
  subscribeToFirebase: () => () => void;
  addEntry: (entry: { content: string; photos: string[] }) => void;
  updateEntry: (id: string, updates: { content?: string; photos?: string[] }) => void;
  getEntryPhotos: (entryId: string) => DiaryPhotoData;
}

/**
 * Upload a base64 photo and its thumbnail to Storage, returning URLs.
 * Falls back to base64 if upload fails.
 */
async function uploadPhotoWithThumbnail(
  photo: string,
  entryId: string,
  index: number
): Promise<{ photoUrl: string; thumbUrl: string }> {
  const photoUrl = await uploadImage(photo, `diary/${entryId}/${index}.jpg`);
  const thumbBase64 = await generateThumbnail(photo, 200, 0.5);
  const thumbUrl = await uploadImage(thumbBase64, `diary/${entryId}/${index}_thumb.jpg`);
  return { photoUrl, thumbUrl };
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: [],
  photos: {},
  loaded: false,
  photosLoading: false,

  // Only load text data, no photos
  loadFromFirebase: async () => {
    const roomId = getRoomId();
    if (!roomId) return;

    const data = await supabaseGet<any[]>(roomId, 'diaryEntries');
    if (!data || data.length === 0) {
      set({ entries: [], loaded: true });
      return;
    }

    // Check if data is in old format (has photos array on entries)
    const firstEntry = data[0];
    if (firstEntry && Array.isArray(firstEntry.photos)) {
      // Old format - migrate inline photos to Storage and separate collections
      const entries: DiaryEntry[] = [];
      const photos: DiaryPhotos = {};

      for (const old of data) {
        const photoArr: string[] = old.photos || [];
        const thumbArr: string[] = [];

        // Upload each photo to Storage
        for (let i = 0; i < photoArr.length; i++) {
          const { photoUrl, thumbUrl } = await uploadPhotoWithThumbnail(photoArr[i], old.id, i);
          photoArr[i] = photoUrl;
          thumbArr.push(thumbUrl);
        }

        entries.push({
          id: old.id,
          content: old.content || '',
          photoCount: photoArr.length,
          createdBy: old.createdBy,
          createdAt: old.createdAt,
          updatedAt: old.updatedAt,
        });

        if (photoArr.length > 0) {
          photos[old.id] = { photos: photoArr, thumbnails: thumbArr };
        }
      }

      // Save migrated data
      await supabaseSet(roomId, 'diaryEntries', entries);
      for (const entryId of Object.keys(photos)) {
        await supabaseSet(roomId, `diaryPhotos:${entryId}`, photos[entryId]);
      }

      set({ entries, photos, loaded: true });
      return;
    }

    // New format - entries without inline photos, don't load photos here
    set({ entries: data, loaded: true });
  },

  // Load photos progressively, one entry at a time
  loadPhotosProgressive: async () => {
    const state = get();
    if (state.photosLoading) return;
    set({ photosLoading: true });

    const roomId = getRoomId();
    if (!roomId) { set({ photosLoading: false }); return; }

    const { entries } = get();

    // Try loading old single-collection format and migrate to per-entry
    const oldPhotos = await supabaseGet<DiaryPhotos>(roomId, 'diaryPhotos');
    if (oldPhotos && Object.keys(oldPhotos).length > 0) {
      // Migrate old single-collection to per-entry collections
      for (const entryId of Object.keys(oldPhotos)) {
        const photoData = oldPhotos[entryId];
        // If photos contain base64 (legacy), upload to Storage and update URLs
        if (photoData.photos && photoData.photos.some((p) => !isStorageUrl(p))) {
          const uploadedPhotos: string[] = [];
          const uploadedThumbs: string[] = [];
          for (let i = 0; i < photoData.photos.length; i++) {
            const photo = photoData.photos[i];
            if (isStorageUrl(photo)) {
              uploadedPhotos.push(photo);
              uploadedThumbs.push(photoData.thumbnails?.[i] || '');
            } else {
              const { photoUrl, thumbUrl } = await uploadPhotoWithThumbnail(photo, entryId, i);
              uploadedPhotos.push(photoUrl);
              uploadedThumbs.push(thumbUrl);
            }
          }
          photoData.photos = uploadedPhotos;
          photoData.thumbnails = uploadedThumbs;
        }
        await supabaseSet(roomId, `diaryPhotos:${entryId}`, photoData);
      }
      // Clear old collection so next time we use per-entry loading
      await supabaseSet(roomId, 'diaryPhotos', {});
    }

    // Load photos entry by entry, updating state after each one
    for (const entry of entries) {
      if (entry.photoCount <= 0) continue;
      if (get().photos[entry.id]) continue;

      const photoData = await supabaseGet<DiaryPhotoData>(roomId, `diaryPhotos:${entry.id}`);
      if (photoData) {
        // No need to generate thumbnails on load - they're already in Storage
        // Backward compatibility: if photos are base64 (no http prefix), display as-is
        // Update state immediately so this entry's photos appear on screen
        set((state) => ({
          photos: { ...state.photos, [entry.id]: photoData },
        }));
      }
    }

    set({ photosLoading: false });
  },

  subscribeToFirebase: () => {
    const roomId = getRoomId();
    if (!roomId) return () => {};
    const unsub1 = supabaseOn(roomId, 'diaryEntries', (data) => {
      set({ entries: data || [], loaded: true });
    });
    return () => {
      unsub1();
    };
  },

  addEntry: async (entry) => {
    const state = get();
    const now = Date.now();
    const gender = useRoomStore.getState().gender || 'male';
    const entryId = now.toString() + Math.random().toString(36).substr(2, 9);

    // Upload each photo to Storage and collect URLs
    const photoUrls: string[] = [];
    const thumbUrls: string[] = [];
    for (let i = 0; i < entry.photos.length; i++) {
      const { photoUrl, thumbUrl } = await uploadPhotoWithThumbnail(entry.photos[i], entryId, i);
      photoUrls.push(photoUrl);
      thumbUrls.push(thumbUrl);
    }

    const newEntry: DiaryEntry = {
      id: entryId,
      content: entry.content,
      photoCount: entry.photos.length,
      createdBy: gender as Gender,
      createdAt: now,
      updatedAt: now,
    };

    const photoData: DiaryPhotoData = { photos: photoUrls, thumbnails: thumbUrls };
    const entries = [newEntry, ...state.entries];
    const photos = { ...state.photos, [entryId]: photoData };

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
      // Upload only new base64 photos to Storage; keep existing URLs as-is
      const photoUrls: string[] = [];
      const thumbUrls: string[] = [];
      for (let i = 0; i < updates.photos.length; i++) {
        const photo = updates.photos[i];
        if (isStorageUrl(photo)) {
          // Already a Storage URL - keep it, and keep existing thumbnail if available
          photoUrls.push(photo);
          const existingThumbs = state.photos[id]?.thumbnails;
          thumbUrls.push(existingThumbs?.[i] || '');
        } else {
          // New base64 photo - upload to Storage
          const { photoUrl, thumbUrl } = await uploadPhotoWithThumbnail(photo, id, i);
          photoUrls.push(photoUrl);
          thumbUrls.push(thumbUrl);
        }
      }
      const photoData: DiaryPhotoData = { photos: photoUrls, thumbnails: thumbUrls };
      photos = { ...photos, [id]: photoData };
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
