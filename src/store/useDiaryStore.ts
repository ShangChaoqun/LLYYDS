import { create } from 'zustand';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
import { useRoomStore, Gender, getRoomId } from '@/store/useRoomStore';
import { generateThumbnail } from '@/utils/helpers';

export interface DiaryEntry {
  id: string;
  content: string;
  photos: string[];
  thumbnails: string[];
  createdBy: Gender;
  createdAt: number;
  updatedAt: number;
}

interface DiaryState {
  entries: DiaryEntry[];
  loaded: boolean;
  loadFromFirebase: () => void;
  subscribeToFirebase: () => () => void;
  addEntry: (entry: Omit<DiaryEntry, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'thumbnails'> & { photos: string[] }) => void;
  updateEntry: (id: string, updates: Partial<Pick<DiaryEntry, 'content' | 'photos' | 'thumbnails'>>) => void;
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: [],
  loaded: false,

  loadFromFirebase: async () => {
    const roomId = getRoomId();
    if (!roomId) return;
    const data = await supabaseGet<DiaryEntry[]>(roomId, 'diaryEntries');
    const entries = data || [];
    // Generate thumbnails for entries that don't have them
    for (const entry of entries) {
      if (!entry.thumbnails || entry.thumbnails.length === 0) {
        if (entry.photos.length > 0) {
          const thumbnails = await Promise.all(
            entry.photos.map((photo) => generateThumbnail(photo))
          );
          entry.thumbnails = thumbnails;
        } else {
          entry.thumbnails = [];
        }
      }
    }
    // Save back if any thumbnails were generated
    const needsSave = entries.some((e) => !e.thumbnails || e.thumbnails.length === 0);
    if (needsSave && roomId) {
      supabaseSet(roomId, 'diaryEntries', entries);
    }
    set({ entries, loaded: true });
  },

  subscribeToFirebase: () => {
    const roomId = getRoomId();
    if (!roomId) return () => {};
    return supabaseOn(roomId, 'diaryEntries', (data) => {
      set({ entries: data || [], loaded: true });
    });
  },

  addEntry: async (entry) => {
    const state = get();
    const now = Date.now();
    const gender = useRoomStore.getState().gender || 'male';
    const thumbnails = await Promise.all(
      entry.photos.map((photo) => generateThumbnail(photo))
    );
    const newEntry: DiaryEntry = {
      ...entry,
      thumbnails,
      id: now.toString() + Math.random().toString(36).substr(2, 9),
      createdBy: gender as Gender,
      createdAt: now,
      updatedAt: now,
    };
    const entries = [newEntry, ...state.entries];
    set({ entries });
    const roomId = getRoomId();
    if (roomId) supabaseSet(roomId, 'diaryEntries', entries);
  },

  updateEntry: async (id, updates) => {
    const state = get();
    let thumbnails = updates.thumbnails;
    if (updates.photos && !thumbnails) {
      thumbnails = await Promise.all(
        updates.photos.map((photo) => generateThumbnail(photo))
      );
    }
    const entries = state.entries.map((e) =>
      e.id === id ? { ...e, ...updates, ...(thumbnails ? { thumbnails } : {}), updatedAt: Date.now() } : e
    );
    set({ entries });
    const roomId = getRoomId();
    if (roomId) supabaseSet(roomId, 'diaryEntries', entries);
  },
}));
