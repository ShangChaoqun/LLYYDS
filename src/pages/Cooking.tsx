import { useState } from 'react';
import { useCookingStore, CookingRecord } from '@/store/useCookingStore';
import { compressImage, formatDate } from '@/utils/helpers';
import { genderToLabel } from '@/store/useRoomStore';
import { Plus, ImagePlus, X, Trash2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import PullToRefresh from '@/components/PullToRefresh';

export default function Cooking() {
  const { records, deleteRecord } = useCookingStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewPhotos, setViewPhotos] = useState<{ photos: string[]; index: number } | null>(null);

  const handleRefresh = async () => {
    await useCookingStore.getState().loadFromFirebase();
  };

  const sortedRecords = [...records].sort((a, b) => {
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    return b.createdAt - a.createdAt;
  });

  const groupedRecords: Record<string, CookingRecord[]> = {};
  sortedRecords.forEach((r) => {
    const key = r.date || formatDate(new Date(r.createdAt).toISOString());
    if (!groupedRecords[key]) groupedRecords[key] = [];
    groupedRecords[key].push(r);
  });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-bg">
      <PageHeader
        title="做饭列表"
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
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <div className="text-5xl mb-3">👨‍🍳</div>
            <p className="text-sm">还没有做饭记录，快去添加吧</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedRecords).map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={14} className="text-primary" />
                  <span className="text-sm font-semibold text-gray-600">{date}</span>
                  <span className="text-xs text-gray-400">{items.length}道</span>
                </div>
                <div className="space-y-2 ml-3 border-l-2 border-primary-100 pl-4">
                  {items.map((record) => (
                    <CookingCard
                      key={record.id}
                      record={record}
                      onDelete={() => deleteRecord(record.id)}
                      onViewPhoto={(photos, index) => setViewPhotos({ photos, index })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && <AddCookingModal onClose={() => setShowAddModal(false)} />}

      {viewPhotos && (
        <PhotoViewer
          photos={viewPhotos.photos}
          initialIndex={viewPhotos.index}
          onClose={() => setViewPhotos(null)}
        />
      )}
    </div>
    </PullToRefresh>
  );
}

function CookingCard({
  record,
  onDelete,
  onViewPhoto,
}: {
  record: CookingRecord;
  onDelete: () => void;
  onViewPhoto: (photos: string[], index: number) => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div className="card-base animate-fade-in" onClick={() => setShowDelete(!showDelete)}>
      <div className="flex gap-3">
        {record.photos.length > 0 && (
          <div className="flex gap-1.5 flex-shrink-0">
            {record.photos.slice(0, 3).map((photo, i) => (
              <img
                key={i}
                src={photo}
                alt=""
                className="w-16 h-16 rounded-lg object-cover"
                onClick={(e) => { e.stopPropagation(); onViewPhoto(record.photos, i); }}
              />
            ))}
            {record.photos.length > 3 && (
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                +{record.photos.length - 3}
              </div>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {record.note && (
            <p className="text-sm text-gray-700 line-clamp-3">{record.note}</p>
          )}
          {!record.note && (
            <p className="text-sm text-gray-400">今日下厨</p>
          )}
          {record.createdBy && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-primary font-medium mt-1">
              {record.createdBy === 'male' ? '🧑' : '👩'} {genderToLabel(record.createdBy)}
            </span>
          )}
        </div>
      </div>
      {showDelete && (
        <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex items-center gap-1 text-xs text-red-500 font-medium"
          >
            <Trash2 size={12} />
            删除记录
          </button>
        </div>
      )}
    </div>
  );
}

function PhotoViewer({
  photos,
  initialIndex,
  onClose,
}: {
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goPrev = () => setCurrentIndex(Math.max(0, currentIndex - 1));
  const goNext = () => setCurrentIndex(Math.min(photos.length - 1, currentIndex + 1));

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src={photos[currentIndex]}
          alt=""
          className="max-w-full max-h-[80vh] object-contain cursor-pointer"
          onClick={onClose}
        />
        <div className="absolute top-4 right-4 flex items-center gap-3">
          <span className="text-white/80 text-sm">{currentIndex + 1} / {photos.length}</span>
        </div>
        {currentIndex > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
          >
            <ChevronLeft size={24} className="text-white" />
          </button>
        )}
        {currentIndex < photos.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
          >
            <ChevronRight size={24} className="text-white" />
          </button>
        )}
      </div>
    </div>
  );
}

function AddCookingModal({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const addRecord = useCookingStore((s) => s.addRecord);

  const handlePhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 10 - photos.length;
    if (remaining <= 0) return;
    const filesToAdd = Array.from(files).slice(0, remaining);
    const compressed: string[] = [];
    for (const file of filesToAdd) {
      const result = await compressImage(file);
      compressed.push(result);
    }
    setPhotos((prev) => [...prev, ...compressed].slice(0, 10));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    addRecord({ date, photos, note: note.trim() });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">记录做饭 👨‍🍳</h3>
          <button onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Clock size={14} />
              日期
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              上传照片（最多10张，已{photos.length}张）
            </label>
            <div className="flex flex-wrap gap-2">
              {photos.map((photo, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img src={photo} alt="" className="w-full h-full rounded-lg object-cover" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 10 && (
                <label className="w-20 h-20 border-2 border-dashed border-primary-100 rounded-lg bg-primary-50/30 flex flex-col items-center justify-center cursor-pointer">
                  <ImagePlus size={20} className="text-primary" />
                  <span className="text-[10px] text-primary mt-0.5">添加</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotos} />
                </label>
              )}
            </div>
          </div>
          <textarea
            placeholder="记录一下今天的美食（可选）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          className="btn-primary w-full text-center mt-4"
        >
          保存记录
        </button>
      </div>
    </div>
  );
}
