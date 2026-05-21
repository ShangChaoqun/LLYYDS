import { useState } from 'react';
import { useRoomStore, Gender } from '@/store/useRoomStore';
import { Heart } from 'lucide-react';

export default function Welcome() {
  const { setGender } = useRoomStore();
  const [loading, setLoading] = useState(false);

  const handleSelect = async (g: Gender) => {
    setLoading(true);
    setGender(g);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      <div className="gradient-primary rounded-full w-24 h-24 flex items-center justify-center mb-6 shadow-soft">
        <Heart size={40} className="text-white" fill="white" />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">LLYYDS</h1>
      <p className="text-sm text-gray-400 mb-8">属于你们的甜蜜空间</p>

      <div className="w-full max-w-sm animate-fade-in">
        <p className="text-center text-sm text-gray-500 mb-4">你是谁？</p>
        <div className="flex gap-3">
          <button
            onClick={() => handleSelect('male')}
            disabled={loading}
            className="flex-1 card-base text-center py-8 active:scale-[0.97] transition-transform disabled:opacity-40"
          >
            <span className="text-5xl block mb-3">🧑</span>
            <span className="text-base font-semibold text-gray-700">超超</span>
          </button>
          <button
            onClick={() => handleSelect('female')}
            disabled={loading}
            className="flex-1 card-base text-center py-8 active:scale-[0.97] transition-transform disabled:opacity-40"
          >
            <span className="text-5xl block mb-3">👩</span>
            <span className="text-base font-semibold text-gray-700">琳琳</span>
          </button>
        </div>
      </div>
    </div>
  );
}
