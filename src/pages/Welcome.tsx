import { useState } from 'react';
import { useRoomStore, Gender } from '@/store/useRoomStore';
import { Heart, Users, LogIn } from 'lucide-react';

export default function Welcome() {
  const { createRoom, joinRoom } = useRoomStore();
  const [step, setStep] = useState<'gender' | 'action' | 'create' | 'join'>('gender');
  const [gender, setGender] = useState<Gender | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState('');
  const [error, setError] = useState('');

  const handleGenderSelect = (g: Gender) => {
    setGender(g);
    setStep('action');
  };

  const handleCreate = async () => {
    if (!gender) return;
    setLoading(true);
    setError('');
    try {
      const code = await createRoom(gender);
      setCreatedCode(code);
      setStep('create');
    } catch {
      setError('创建失败，请重试');
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!gender || !roomCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const success = await joinRoom(roomCode.trim(), gender);
      if (!success) {
        setError('房间不存在，请检查房间号');
      }
    } catch {
      setError('加入失败，请重试');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      <div className="gradient-primary rounded-full w-24 h-24 flex items-center justify-center mb-6 shadow-soft">
        <Heart size={40} className="text-white" fill="white" />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">LLYYDS</h1>
      <p className="text-sm text-gray-400 mb-8">属于你们的甜蜜空间</p>

      {step === 'gender' && (
        <div className="w-full max-w-sm animate-fade-in">
          <p className="text-center text-sm text-gray-500 mb-4">你是谁？</p>
          <div className="flex gap-3">
            <button onClick={() => handleGenderSelect('male')}
              className="flex-1 card-base text-center py-6 active:scale-[0.97] transition-transform">
              <span className="text-4xl block mb-2">🧑</span>
              <span className="text-sm font-semibold text-gray-700">超超</span>
            </button>
            <button onClick={() => handleGenderSelect('female')}
              className="flex-1 card-base text-center py-6 active:scale-[0.97] transition-transform">
              <span className="text-4xl block mb-2">👩</span>
              <span className="text-sm font-semibold text-gray-700">琳琳</span>
            </button>
          </div>
        </div>
      )}

      {step === 'action' && (
        <div className="w-full max-w-sm animate-fade-in">
          <p className="text-center text-sm text-gray-500 mb-4">
            你是 <span className="text-primary font-semibold">{gender === 'male' ? '超超' : '琳琳'}</span>，接下来...
          </p>
          <div className="space-y-3">
            <button onClick={handleCreate} disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-40">
              <Users size={18} />
              {loading ? '创建中...' : '创建房间'}
            </button>
            <button onClick={() => setStep('join')}
              className="w-full py-3 rounded-full bg-white text-primary font-medium shadow-card flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
              <LogIn size={18} />
              加入房间
            </button>
          </div>
          <button onClick={() => setStep('gender')} className="text-xs text-gray-400 mt-4 block mx-auto">
            重新选择
          </button>
        </div>
      )}

      {step === 'create' && (
        <div className="w-full max-w-sm animate-fade-in text-center">
          <div className="card-base py-8">
            <p className="text-sm text-gray-500 mb-3">房间创建成功！</p>
            <p className="text-sm text-gray-500 mb-2">把房间号告诉另一半</p>
            <div className="text-4xl font-bold text-gradient tracking-[0.3em] my-4">{createdCode}</div>
            <p className="text-xs text-gray-400">对方打开APP → 选择身份 → 加入房间 → 输入上方号码</p>
          </div>
        </div>
      )}

      {step === 'join' && (
        <div className="w-full max-w-sm animate-fade-in">
          <p className="text-center text-sm text-gray-500 mb-4">输入对方的房间号</p>
          <input
            type="text"
            placeholder="输入6位房间号"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 text-center text-2xl tracking-[0.5em] font-bold outline-none focus:ring-2 focus:ring-primary/20 mb-4"
            maxLength={6}
          />
          {error && <p className="text-xs text-red-400 text-center mb-3">{error}</p>}
          <button onClick={handleJoin} disabled={loading || roomCode.length !== 6}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-40">
            <LogIn size={18} />
            {loading ? '加入中...' : '加入房间'}
          </button>
          <button onClick={() => setStep('action')} className="text-xs text-gray-400 mt-4 block mx-auto">
            返回
          </button>
        </div>
      )}
    </div>
  );
}
