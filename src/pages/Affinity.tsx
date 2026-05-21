import { useState } from 'react';
import { useAffinityStore, AffinityEvent, Person } from '@/store/useAffinityStore';
import { formatDateTime } from '@/utils/helpers';
import { genderToLabel } from '@/store/useRoomStore';
import { Plus, X, Trash2, Heart, TrendingUp, TrendingDown } from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import PullToRefresh from '@/components/PullToRefresh';

const PERSON_CONFIG: Record<Person, { name: string; emoji: string; color: string; bgColor: string }> = {
  chaochao: { name: '对超超', emoji: '🧑', color: '#6EC6FF', bgColor: 'bg-blue-50' },
  linlin: { name: '对琳琳', emoji: '👩', color: '#FF6B8A', bgColor: 'bg-pink-50' },
};

export default function Affinity() {
  const { scores, events, addEvent, deleteEvent } = useAffinityStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [activePerson, setActivePerson] = useState<Person>('chaochao');

  const handleRefresh = async () => {
    await useAffinityStore.getState().loadFromFirebase();
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '甜蜜蜜';
    if (score >= 60) return '甜甜蜜蜜';
    if (score >= 40) return '还需努力';
    return '危险警告';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#FF6B8A';
    if (score >= 60) return '#B088F9';
    if (score >= 40) return '#FBBF24';
    return '#F87171';
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-bg">
      <PageHeader
        title="好感度"
        rightAction={
          <button
            onClick={() => setShowAddModal(true)}
            className="w-9 h-9 gradient-primary rounded-full flex items-center justify-center shadow-soft active:scale-90 transition-transform"
          >
            <Plus size={18} className="text-white" />
          </button>
        }
      />

      <div className="page-container">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {(Object.keys(PERSON_CONFIG) as Person[]).map((person) => {
            const config = PERSON_CONFIG[person];
            const score = scores[person];
            const scoreColor = getScoreColor(score);
            const isActive = activePerson === person;
            return (
              <button
                key={person}
                onClick={() => setActivePerson(person)}
                className={`card-base text-center transition-all ${isActive ? 'ring-2 ring-primary/30 shadow-soft' : ''}`}
              >
                <div className="text-2xl mb-1">{config.emoji}</div>
                <p className="text-xs text-gray-500 mb-2">{config.name}</p>
                <div className="relative w-20 h-20 mx-auto mb-1">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#F0E8ED" strokeWidth="8" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke={scoreColor} strokeWidth="8"
                      strokeDasharray={`${(score / 100) * 326.73} 326.73`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold" style={{ color: scoreColor }}>{score}</span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400">{getScoreLabel(score)}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Heart size={14} className="text-primary" />
          <h3 className="text-sm font-semibold text-gray-600">
            {PERSON_CONFIG[activePerson].name} 事件记录
          </h3>
        </div>

        {events.filter((e) => e.person === activePerson).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-300">
            <Heart size={36} className="mb-2" />
            <p className="text-xs">还没有事件记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events
              .filter((e) => e.person === activePerson)
              .map((event) => (
                <EventCard key={event.id} event={event} onDelete={() => deleteEvent(event.id)} />
              ))}
          </div>
        )}
      </div>

      {showAddModal && <AddEventModal onClose={() => setShowAddModal(false)} />}
    </div>
    </PullToRefresh>
  );
}

function EventCard({ event, onDelete }: { event: AffinityEvent; onDelete: () => void }) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div className="card-base animate-fade-in" onClick={() => setShowDelete(!showDelete)}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          event.change > 0 ? 'bg-green-50' : 'bg-red-50'
        }`}>
          {event.change > 0 ? <TrendingUp size={15} className="text-green-500" /> : <TrendingDown size={15} className="text-red-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-gray-700">{event.description}</p>
            {event.createdBy && (
              <span className="text-[10px] text-primary font-medium flex-shrink-0">
                {event.createdBy === 'male' ? '🧑' : '👩'}{genderToLabel(event.createdBy)}
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400">{formatDateTime(new Date(event.createdAt).toISOString())}</span>
        </div>
        <span className={`text-sm font-semibold ${event.change > 0 ? 'text-green-500' : 'text-red-400'}`}>
          {event.change > 0 ? '+' : ''}{event.change}
        </span>
      </div>
      {showDelete && (
        <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex items-center gap-1 text-xs text-red-500 font-medium">
            <Trash2 size={12} />删除
          </button>
        </div>
      )}
    </div>
  );
}

function AddEventModal({ onClose }: { onClose: () => void }) {
  const [person, setPerson] = useState<Person>('chaochao');
  const [description, setDescription] = useState('');
  const [change, setChange] = useState(5);
  const [type, setType] = useState<'up' | 'down'>('up');
  const addEvent = useAffinityStore((s) => s.addEvent);

  const handleSubmit = () => {
    if (!description.trim()) return;
    addEvent(person, description.trim(), type === 'up' ? Math.abs(change) : -Math.abs(change));
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">记录事件 💕</h3>
          <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-500 mb-2">选择对象</label>
            <div className="flex gap-2">
              {(Object.keys(PERSON_CONFIG) as Person[]).map((p) => {
                const config = PERSON_CONFIG[p];
                return (
                  <button key={p} onClick={() => setPerson(p)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1 ${
                      person === p ? `${config.bgColor} border-2 shadow-sm` : 'bg-gray-50 text-gray-400 border-2 border-transparent'
                    }`}
                    style={person === p ? { borderColor: config.color } : {}}>
                    <span>{config.emoji}</span>
                    <span style={person === p ? { color: config.color } : {}}>{config.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <input type="text" placeholder="发生了什么？" value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          <div>
            <label className="block text-sm text-gray-500 mb-2">类型</label>
            <div className="flex gap-2">
              <button onClick={() => setType('up')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1 ${
                  type === 'up' ? 'bg-green-50 text-green-600 border-2 border-green-200' : 'bg-gray-50 text-gray-400 border-2 border-transparent'
                }`}>
                <TrendingUp size={16} />好感增加
              </button>
              <button onClick={() => setType('down')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1 ${
                  type === 'down' ? 'bg-red-50 text-red-400 border-2 border-red-200' : 'bg-gray-50 text-gray-400 border-2 border-transparent'
                }`}>
                <TrendingDown size={16} />好感减少
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">变化值: {type === 'up' ? '+' : '-'}{change}</label>
            <input type="range" min="1" max="20" value={change} onChange={(e) => setChange(Number(e.target.value))}
              className="w-full accent-primary" />
            <div className="flex justify-between text-[10px] text-gray-400"><span>1</span><span>20</span></div>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={!description.trim()}
          className="btn-primary w-full text-center mt-4 disabled:opacity-40">记录</button>
      </div>
    </div>
  );
}
