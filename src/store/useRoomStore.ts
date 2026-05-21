import { create } from 'zustand';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export type Gender = 'male' | 'female';

interface RoomState {
  roomId: string | null;
  gender: Gender | null;
  initialized: boolean;
  setRoom: (roomId: string, gender: Gender) => void;
  createRoom: (gender: Gender) => Promise<string>;
  joinRoom: (code: string, gender: Gender) => Promise<boolean>;
  logout: () => void;
}

const STORAGE_KEY_ROOM = 'llyyds_room';
const STORAGE_KEY_GENDER = 'llyyds_gender';

function generateRoomId(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const useRoomStore = create<RoomState>((set, get) => ({
  roomId: localStorage.getItem(STORAGE_KEY_ROOM),
  gender: (localStorage.getItem(STORAGE_KEY_GENDER) as Gender) || null,
  initialized: false,

  setRoom: (roomId, gender) => {
    localStorage.setItem(STORAGE_KEY_ROOM, roomId);
    localStorage.setItem(STORAGE_KEY_GENDER, gender);
    set({ roomId, gender, initialized: true });
  },

  createRoom: async (gender) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase 未配置');
    }
    const supabase = getSupabase();
    let roomId = generateRoomId();
    let exists = true;
    while (exists) {
      const { data } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_id', roomId)
        .maybeSingle();
      if (data) {
        roomId = generateRoomId();
      } else {
        exists = false;
      }
    }
    await supabase.from('rooms').insert({
      room_id: roomId,
      created_by: gender,
    });
    get().setRoom(roomId, gender);
    return roomId;
  },

  joinRoom: async (code, gender) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase 未配置');
    }
    const supabase = getSupabase();
    const { data } = await supabase
      .from('rooms')
      .select('id')
      .eq('room_id', code)
      .maybeSingle();
    if (!data) return false;
    get().setRoom(code, gender);
    return true;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY_ROOM);
    localStorage.removeItem(STORAGE_KEY_GENDER);
    set({ roomId: null, gender: null, initialized: false });
  },
}));

export function getMyLabel(): string {
  const gender = useRoomStore.getState().gender;
  return gender === 'male' ? '超超' : '琳琳';
}

export function getPartnerLabel(): string {
  const gender = useRoomStore.getState().gender;
  return gender === 'male' ? '琳琳' : '超超';
}

export function genderToLabel(gender: Gender): string {
  return gender === 'male' ? '超超' : '琳琳';
}
