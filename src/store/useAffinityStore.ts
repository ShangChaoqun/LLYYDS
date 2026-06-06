import { create } from 'zustand';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
import { useRoomStore, Gender, getRoomId } from '@/store/useRoomStore';

export type Person = 'chaochao' | 'linlin';

export interface AffinityEvent {
  id: string;
  person: Person;
  description: string;
  change: number;
  createdBy: Gender;
  createdAt: number;
}

interface AffinityScores {
  chaochao: number;
  linlin: number;
}

interface AffinityState {
  scores: AffinityScores;
  events: AffinityEvent[];
  loaded: boolean;
  loadFromFirebase: () => void;
  subscribeToFirebase: () => () => void;
  addEvent: (person: Person, description: string, change: number) => void;
}

const INITIAL_SCORES: AffinityScores = { chaochao: 60, linlin: 60 };

export const useAffinityStore = create<AffinityState>((set, get) => ({
  scores: { ...INITIAL_SCORES },
  events: [],
  loaded: false,

  loadFromFirebase: async () => {
    const roomId = getRoomId();
    if (!roomId) return;
    const [scoresData, eventsData] = await Promise.all([
      supabaseGet<AffinityScores>(roomId, 'affinityScores'),
      supabaseGet<AffinityEvent[]>(roomId, 'affinityEvents'),
    ]);
    set({
      scores: scoresData || { ...INITIAL_SCORES },
      events: eventsData || [],
      loaded: true,
    });
  },

  subscribeToFirebase: () => {
    const roomId = getRoomId();
    if (!roomId) return () => {};
    const unsub1 = supabaseOn(roomId, 'affinityScores', (data) => {
      if (data) set({ scores: data });
    });
    const unsub2 = supabaseOn(roomId, 'affinityEvents', (data) => {
      set({ events: data || [] });
    });
    return () => { unsub1(); unsub2(); };
  },

  addEvent: (person, description, change) => {
    const state = get();
    const gender = useRoomStore.getState().gender || 'male';
    const newEvent: AffinityEvent = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      person,
      description,
      change,
      createdBy: gender as Gender,
      createdAt: Date.now(),
    };
    const newScore = Math.max(0, Math.min(100, state.scores[person] + change));
    const scores = { ...state.scores, [person]: newScore };
    const events = [newEvent, ...state.events];
    set({ scores, events });
    const roomId = getRoomId();
    if (roomId) {
      supabaseSet(roomId, 'affinityScores', scores);
      supabaseSet(roomId, 'affinityEvents', events);
    }
  },
}));
