import { create } from 'zustand';

export type Person = 'chaochao' | 'linlin';

export interface AffinityEvent {
  id: string;
  person: Person;
  description: string;
  change: number;
  createdAt: number;
}

interface AffinityState {
  scores: Record<Person, number>;
  events: AffinityEvent[];
  addEvent: (person: Person, description: string, change: number) => void;
  deleteEvent: (id: string) => void;
}

const STORAGE_KEY_SCORES = 'llyyds_affinity_scores';
const STORAGE_KEY_EVENTS = 'llyyds_affinity_events';
const INITIAL_SCORES: Record<Person, number> = { chaochao: 60, linlin: 60 };

function loadScores(): Record<Person, number> {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SCORES);
    return data ? JSON.parse(data) : { ...INITIAL_SCORES };
  } catch {
    return { ...INITIAL_SCORES };
  }
}

function loadEvents(): AffinityEvent[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_EVENTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveScores(scores: Record<Person, number>) {
  localStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(scores));
}

function saveEvents(events: AffinityEvent[]) {
  localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
}

export const useAffinityStore = create<AffinityState>((set) => ({
  scores: loadScores(),
  events: loadEvents(),
  addEvent: (person, description, change) =>
    set((state) => {
      const newEvent: AffinityEvent = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        person,
        description,
        change,
        createdAt: Date.now(),
      };
      const newScore = Math.max(0, Math.min(100, state.scores[person] + change));
      const scores = { ...state.scores, [person]: newScore };
      const events = [newEvent, ...state.events];
      saveScores(scores);
      saveEvents(events);
      return { scores, events };
    }),
  deleteEvent: (id) =>
    set((state) => {
      const event = state.events.find((e) => e.id === id);
      if (!event) return state;
      const newScore = Math.max(0, Math.min(100, state.scores[event.person] - event.change));
      const scores = { ...state.scores, [event.person]: newScore };
      const events = state.events.filter((e) => e.id !== id);
      saveScores(scores);
      saveEvents(events);
      return { scores, events };
    }),
}));
