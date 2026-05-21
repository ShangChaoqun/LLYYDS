import { useState } from 'react';
import { useWishStore, Wish } from '@/store/useWishStore';
import { formatDate, formatDateTime, compressImage, getTodayStr } from '@/utils/helpers';
import { genderToLabel } from '@/store/useRoomStore';
import { Check, Plus, ImagePlus, Trash2, Calendar, X, ArrowUpDown } from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import PullToRefresh from '@/components/PullToRefresh';

export default function Wishes() {
  const { wishes, completeWish, uncompleteWish, deleteWish } = useWishStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState<string | null>(null);
  const [completePhoto, setCompletePhoto] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const filtered = wishes
    .filter((w) => {
      if (filter === 'pending') return !w.completed;
      if (filter === 'done') return w.completed;
      return true;
    })
    .sort((a, b) => {
      const timeA = a.proposedAt ? new Date(a.proposedAt).getTime() : a.createdAt;
      const timeB = b.proposedAt ? new Date(b.proposedAt).getTime() : b.createdAt;
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

  const pendingCount = wishes.filter((w) => !w.completed).length;
  const doneCount = wishes.filter((w) => w.completed).length;

  const handleCompletePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      setCompletePhoto(compressed);
    }
  };

  const handleComplete = (id: string) => {
    completeWish(id, completePhoto);
    setShowCompleteModal(null);
    setCompletePhoto('');
  };

  const handleRefresh = async () => {
    await useWishStore.getState().loadFromFirebase();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-bg">
      <PageHeader
        title="愿望清单"
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
        <div className="flex items-center gap-2 mb-4">
          {[
            { key: 'all' as const, label: `全部 ${wishes.length}` },
            { key: 'pending' as const, label: `进行中 ${pendingCount}` },
            { key: 'done' as const, label: `已完成 ${doneCount}` },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === item.key
                  ? 'gradient-primary text-white shadow-soft'
                  : 'bg-white text-gray-500 shadow-card'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-500 shadow-card"
          >
            <ArrowUpDown size={12} />
            {sortOrder === 'newest' ? '最新' : '最早'}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <div className="text-5xl mb-3">🌟</div>
            <p className="text-sm">还没有愿望，快去添加吧</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((wish) => (
              <WishCard
                key={wish.id}
                wish={wish}
                onComplete={() => setShowCompleteModal(wish.id)}
                onUncomplete={() => uncompleteWish(wish.id)}
                onDelete={() => deleteWish(wish.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showAddModal && <AddWishModal onClose={() => setShowAddModal(false)} />}

      {showCompleteModal && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">标记完成 🎉</h3>
              <button onClick={() => setShowCompleteModal(null)} className="text-gray-400">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-500 mb-2">上传完成照片（可选）</label>
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-primary-100 rounded-xl bg-primary-50/30 cursor-pointer">
                {completePhoto ? (
                  <img src={completePhoto} alt="完成照片" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="flex flex-col items-center text-primary">
                    <ImagePlus size={28} />
                    <span className="text-xs mt-1">点击上传</span>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleCompletePhoto} />
              </label>
            </div>
            <button
              onClick={() => handleComplete(showCompleteModal)}
              className="btn-primary w-full text-center"
            >
              完成愿望 ✨
            </button>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}

function WishCard({
  wish,
  onComplete,
  onUncomplete,
  onDelete,
}: {
  wish: Wish;
  onComplete: () => void;
  onUncomplete: () => void;
  onDelete: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div className={`card-base animate-fade-in ${wish.completed ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={wish.completed ? onUncomplete : onComplete}
          className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            wish.completed
              ? 'gradient-primary border-transparent'
              : 'border-gray-300 hover:border-primary'
          }`}
        >
          {wish.completed && <Check size={14} className="text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-medium ${wish.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {wish.title}
          </h3>
          {wish.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{wish.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {wish.createdBy && (
              <span className="inline-flex items-center gap-0.5 text-xs text-primary font-medium">
                {wish.createdBy === 'male' ? '🧑' : '👩'} {genderToLabel(wish.createdBy)}
              </span>
            )}
            {wish.proposedAt && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar size={12} />
                提出: {formatDate(wish.proposedAt)}
              </span>
            )}
            {wish.dueDate && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                🎯 截止: {formatDate(wish.dueDate)}
              </span>
            )}
            {wish.completed && wish.completedAt && (
              <span className="text-xs text-primary">已完成 {formatDateTime(wish.completedAt)}</span>
            )}
          </div>
          {(wish.photo || wish.completedPhoto) && (
            <div className="flex gap-2 mt-2">
              {wish.photo && !wish.completed && (
                <img src={wish.photo} alt="" className="w-16 h-16 rounded-lg object-cover" />
              )}
              {wish.completedPhoto && wish.completed && (
                <img src={wish.completedPhoto} alt="" className="w-16 h-16 rounded-lg object-cover" />
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowDelete(!showDelete)}
          className="text-gray-300 hover:text-red-400 transition-colors p-1"
        >
          <Trash2 size={16} />
        </button>
      </div>
      {showDelete && (
        <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => { onDelete(); setShowDelete(false); }}
            className="text-xs text-red-500 font-medium"
          >
            确认删除
          </button>
        </div>
      )}
    </div>
  );
}

function AddWishModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [proposedAt, setProposedAt] = useState(getTodayStr());
  const [photo, setPhoto] = useState('');
  const addWish = useWishStore((s) => s.addWish);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      setPhoto(compressed);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    addWish({ title: title.trim(), description: description.trim(), photo, dueDate, proposedAt });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">添加愿望 ✨</h3>
          <button onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="愿望名称"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <textarea
            placeholder="描述一下这个愿望（可选）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Calendar size={14} />
              提出时间
            </label>
            <input
              type="date"
              value={proposedAt}
              onChange={(e) => setProposedAt(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Calendar size={14} />
              完成时间（可选）
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">添加照片（可选）</label>
            <label className="flex items-center justify-center w-full h-28 border-2 border-dashed border-primary-100 rounded-xl bg-primary-50/30 cursor-pointer">
              {photo ? (
                <img src={photo} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="flex flex-col items-center text-primary">
                  <ImagePlus size={28} />
                  <span className="text-xs mt-1">点击上传</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handlePhoto} />
            </label>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="btn-primary w-full text-center mt-4 disabled:opacity-40"
        >
          添加愿望
        </button>
      </div>
    </div>
  );
}
