import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeyMomentStore, KeyMoment } from '@/store/useKeyMomentStore';
import { useRoomStore, genderToLabel, getRoomId } from '@/store/useRoomStore';
import { supabaseGet, supabaseSet, supabaseOn } from '@/lib/supabaseSync';
import { Plus, X, Pencil, Trash2, Calendar, Heart } from 'lucide-react';
import { compressImage } from '@/utils/helpers';

const TOGETHER_SINCE = new Date('2021-05-28');

function getDaysTogether(): number {
  const now = new Date();
  const diff = now.getTime() - TOGETHER_SINCE.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getCountdown(targetDate: string): { days: number; label: string } {
  const target = new Date(targetDate);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return { days, label: days > 0 ? `还有 ${days} 天` : days === 0 ? '就是今天！' : `已过 ${Math.abs(days)} 天` };
}

function getNextAnnualDate(month: number, day: number): string {
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), month - 1, day);
  if (thisYear.getTime() < now.getTime()) {
    return `${now.getFullYear() + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return `${now.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const FIXED_MOMENTS = [
  { name: '💍 结婚纪念日', date: getNextAnnualDate(5, 28), emoji: '💍', fixed: true as const },
  { name: '🎂 老婆生日', date: getNextAnnualDate(10, 27), emoji: '🎂', fixed: true as const },
];

const quickEntries = [
  { path: '/menu', emoji: '🍳', label: '菜单' },
  { path: '/cooking', emoji: '👨‍🍳', label: '做饭' },
  { path: '/bills', emoji: '💰', label: '记账' },
];

export default function Home() {
  const navigate = useNavigate();
  const { moments, addMoment, updateMoment, deleteMoment } = useKeyMomentStore();
  const { gender } = useRoomStore();
  const roomId = getRoomId();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMoment, setEditMoment] = useState<KeyMoment | null>(null);
  const daysTogether = getDaysTogether();

  const [avatarChaochao, setAvatarChaochao] = useState('');
  const [avatarLinlin, setAvatarLinlin] = useState('');

  useEffect(() => {
    if (!roomId) return;
    const loadAvatars = async () => {
      const data = await supabaseGet<{ chaochao?: string; linlin?: string }>(roomId, 'avatars');
      if (data) {
        setAvatarChaochao(data.chaochao || '');
        setAvatarLinlin(data.linlin || '');
      }
    };
    loadAvatars();
    const unsub = supabaseOn(roomId, 'avatars', (data) => {
      if (data) {
        setAvatarChaochao(data.chaochao || '');
        setAvatarLinlin(data.linlin || '');
      }
    });
    return unsub;
  }, [roomId]);

  const handleAvatar = async (person: 'chaochao' | 'linlin', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomId) return;
    const compressed = await compressImage(file, 200, 0.8);
    if (person === 'chaochao') {
      setAvatarChaochao(compressed);
    } else {
      setAvatarLinlin(compressed);
    }
    const currentData = await supabaseGet<{ chaochao?: string; linlin?: string }>(roomId, 'avatars');
    await supabaseSet(roomId, 'avatars', { ...currentData, [person]: compressed });
  };

  const leftPerson = gender === 'female' ? 'linlin' : 'chaochao';
  const rightPerson = gender === 'female' ? 'chaochao' : 'linlin';
  const leftAvatar = leftPerson === 'chaochao' ? avatarChaochao : avatarLinlin;
  const rightAvatar = rightPerson === 'chaochao' ? avatarChaochao : avatarLinlin;
  const leftEmoji = leftPerson === 'chaochao' ? '🧑' : '👩';
  const rightEmoji = rightPerson === 'chaochao' ? '🧑' : '👩';
  const leftLabel = genderToLabel(leftPerson === 'chaochao' ? 'male' : 'female');
  const rightLabel = genderToLabel(rightPerson === 'chaochao' ? 'male' : 'female');

  return (
    <div className="min-h-screen bg-bg pb-4">
      <div className="gradient-primary rounded-b-[2.5rem] px-6 pb-8 relative overflow-hidden safe-top" style={{ paddingTop: 'max(env(safe-area-inset-top, 14px), 14px)' }}>
        <div className="absolute top-6 right-8 text-white/15 text-4xl animate-float">✦</div>
        <div className="absolute bottom-10 right-6 text-white/10 text-2xl animate-float" style={{ animationDelay: '1.2s' }}>✧</div>

        <div className="flex items-center justify-center gap-4 mb-5">
          <label className="relative cursor-pointer group">
            <div className="w-[72px] h-[72px] rounded-full border-[3px] border-white/50 overflow-hidden bg-white/20 flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
              {leftAvatar ? (
                <img src={leftAvatar} alt={leftLabel} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{leftEmoji}</span>
              )}
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white/30 backdrop-blur-sm rounded-full px-2 py-0.5">
              <span className="text-[10px] text-white font-medium">{leftLabel}</span>
            </div>
            <input type="file" accept="image/*" onChange={(e) => handleAvatar(leftPerson, e)} className="hidden" />
          </label>

          <div className="flex flex-col items-center">
            <Heart size={28} className="text-white animate-pulse" fill="white" />
          </div>

          <label className="relative cursor-pointer group">
            <div className="w-[72px] h-[72px] rounded-full border-[3px] border-white/50 overflow-hidden bg-white/20 flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
              {rightAvatar ? (
                <img src={rightAvatar} alt={rightLabel} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{rightEmoji}</span>
              )}
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white/30 backdrop-blur-sm rounded-full px-2 py-0.5">
              <span className="text-[10px] text-white font-medium">{rightLabel}</span>
            </div>
            <input type="file" accept="image/*" onChange={(e) => handleAvatar(rightPerson, e)} className="hidden" />
          </label>
        </div>

        <div className="text-center">
          <h1 className="text-white text-xl font-bold tracking-wider mb-1">LLYYDS</h1>
          <div className="flex items-center justify-center gap-1.5">
            <Heart size={13} className="text-white/80" fill="white" />
            <span className="text-white/95 text-lg font-semibold">我们在一起 {daysTogether} 天</span>
          </div>
          <p className="text-white/50 text-xs mt-0.5">
            2021.05.28 — 至今
          </p>
        </div>
      </div>

      <div className="px-4 -mt-5">
        <div className="bg-white rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-primary" />
              <h3 className="text-sm font-semibold text-gray-700">关键时刻</h3>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-7 h-7 gradient-primary rounded-full flex items-center justify-center shadow-soft active:scale-90 transition-transform"
            >
              <Plus size={14} className="text-white" />
            </button>
          </div>

          <div className="space-y-1.5">
              {FIXED_MOMENTS.map((moment) => {
                const countdown = getCountdown(moment.date);
                const isToday = countdown.days === 0;
                return (
                  <div
                    key={moment.name}
                    className={`flex items-center justify-between p-2.5 rounded-xl ${
                      isToday ? 'bg-primary-50 border border-primary-100' : 'bg-gradient-to-r from-primary-50/40 to-secondary-50/40'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-gray-700 truncate">{moment.name}</h4>
                      <span className="text-[10px] text-gray-400">{moment.date}</span>
                    </div>
                    <span className={`text-[11px] font-semibold ${isToday ? 'text-primary' : 'text-primary'}`}>
                      {countdown.label}
                    </span>
                  </div>
                );
              })}
              {moments.map((moment) => {
                const countdown = getCountdown(moment.date);
                const isToday = countdown.days === 0;
                const isPast = countdown.days < 0;
                return (
                  <div
                    key={moment.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl ${
                      isToday ? 'bg-primary-50 border border-primary-100' : isPast ? 'bg-gray-50/80' : 'bg-gradient-to-r from-primary-50/40 to-secondary-50/40'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-medium text-gray-700 truncate">{moment.name}</h4>
                        {moment.createdBy && (
                          <span className="text-[9px] text-primary font-medium flex-shrink-0">
                            {moment.createdBy === 'male' ? '🧑' : '👩'}{genderToLabel(moment.createdBy)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">{moment.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-semibold ${isToday ? 'text-primary' : isPast ? 'text-gray-400' : 'text-primary'}`}>
                        {countdown.label}
                      </span>
                      <button onClick={() => setEditMoment(moment)} className="text-gray-300 hover:text-blue-400">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => deleteMoment(moment.id)} className="text-gray-300 hover:text-red-400">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
      </div>

      <div className="px-4 mt-3">
        <div className="bg-white rounded-2xl p-4 shadow-card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">快速入口</h3>
          <div className="grid grid-cols-3 gap-2">
            {quickEntries.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-1 py-2 rounded-xl active:bg-gray-50 transition-colors"
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="text-[10px] text-gray-500">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 mt-3">
        <div className="gradient-primary-light rounded-2xl p-4">
          <p className="text-xs text-gray-500 leading-relaxed text-center">
            已经一起走过 {daysTogether} 天啦，每一天都值得被纪念 🌟
          </p>
        </div>
      </div>

      {showAddModal && <AddMomentModal onClose={() => setShowAddModal(false)} />}
      {editMoment && <EditMomentModal moment={editMoment} onClose={() => setEditMoment(null)} />}
    </div>
  );
}

function AddMomentModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const addMoment = useKeyMomentStore((s) => s.addMoment);

  const handleSubmit = () => {
    if (!name.trim() || !date) return;
    addMoment({ name: name.trim(), date });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">添加关键时刻 🎯</h3>
          <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <input type="text" placeholder="时刻名称" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Calendar size={14} />目标日期</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        <button onClick={handleSubmit} disabled={!name.trim() || !date}
          className="btn-primary w-full text-center mt-4 disabled:opacity-40">添加</button>
      </div>
    </div>
  );
}

function EditMomentModal({ moment, onClose }: { moment: KeyMoment; onClose: () => void }) {
  const [name, setName] = useState(moment.name);
  const [date, setDate] = useState(moment.date);
  const updateMoment = useKeyMomentStore((s) => s.updateMoment);

  const handleSubmit = () => {
    if (!name.trim() || !date) return;
    updateMoment(moment.id, { name: name.trim(), date });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">编辑关键时刻 ✏️</h3>
          <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <input type="text" placeholder="时刻名称" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Calendar size={14} />目标日期</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        <button onClick={handleSubmit} className="btn-primary w-full text-center mt-4">保存修改</button>
      </div>
    </div>
  );
}
