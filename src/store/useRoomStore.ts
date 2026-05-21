import { create } from 'zustand';

export type Gender = 'male' | 'female';

const FIXED_ROOM_ID = 'llyyds';

interface RoomState {
  gender: Gender | null;
  setGender: (gender: Gender) => void;
  logout: () => void;
}

const STORAGE_KEY_GENDER = 'llyyds_gender';

export const useRoomStore = create<RoomState>((set) => ({
  gender: (localStorage.getItem(STORAGE_KEY_GENDER) as Gender) || null,

  setGender: (gender) => {
    localStorage.setItem(STORAGE_KEY_GENDER, gender);
    set({ gender });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY_GENDER);
    set({ gender: null });
  },
}));

export function getRoomId(): string {
  return FIXED_ROOM_ID;
}

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
