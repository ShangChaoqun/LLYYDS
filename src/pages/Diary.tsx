import { useState } from 'react';
import { useDiaryStore, DiaryEntry } from '@/store/useDiaryStore';
import { compressImage, formatDateTime } from '@/utils/helpers';
import { genderToLabel } from '@/store/useRoomStore';
import { Plus, ImagePlus, X, Trash2, Pencil, BookOpen } from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';

export default function Diary() {
  const { entries, deleteEntry } = useDiaryStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editEntry, setEditEntry] = useState<DiaryEntry | null>(null);

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader
        title="恋爱日记"
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
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <BookOpen size={48} className="mb-3" />
            <p className="text-sm">还没有日记，开始记录吧</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="card-base animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {entry.createdBy && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-primary font-medium">
                        {entry.createdBy === 'male' ? '🧑' : '👩'} {genderToLabel(entry.createdBy)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {formatDateTime(new Date(entry.updatedAt).toISOString())}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditEntry(entry)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-500"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {entry.content && (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                )}
                {entry.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {entry.photos.map((photo, i) => (
                      <img
                        key={i}
                        src={photo}
                        alt=""
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && <AddDiaryModal onClose={() => setShowAddModal(false)} />}
      {editEntry && <EditDiaryModal entry={editEntry} onClose={() => setEditEntry(null)} />}
    </div>
  );
}

function AddDiaryModal({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const addEntry = useDiaryStore((s) => s.addEntry);

  const handlePhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const compressed = await compressImage(file);
      setPhotos((prev) => [...prev, compressed]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    addEntry({ content: content.trim(), photos });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">写日记 📖</h3>
          <button onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <textarea
            placeholder="今天有什么想记录的..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <div>
            <label className="block text-sm text-gray-500 mb-1">添加照片</label>
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
              <label className="w-20 h-20 border-2 border-dashed border-primary-100 rounded-lg bg-primary-50/30 flex flex-col items-center justify-center cursor-pointer">
                <ImagePlus size={20} className="text-primary" />
                <span className="text-[10px] text-primary mt-0.5">添加</span>
                <input type="file" accept="image/*" multiple onChange={handlePhotos} />
              </label>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!content.trim() && photos.length === 0}
          className="btn-primary w-full text-center mt-4 disabled:opacity-40"
        >
          保存日记
        </button>
      </div>
    </div>
  );
}

function EditDiaryModal({ entry, onClose }: { entry: DiaryEntry; onClose: () => void }) {
  const [content, setContent] = useState(entry.content);
  const [photos, setPhotos] = useState<string[]>(entry.photos);
  const updateEntry = useDiaryStore((s) => s.updateEntry);

  const handlePhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const compressed = await compressImage(file);
      setPhotos((prev) => [...prev, compressed]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    updateEntry(entry.id, { content: content.trim(), photos });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">编辑日记 ✏️</h3>
          <button onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <textarea
            placeholder="今天有什么想记录的..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <div>
            <label className="block text-sm text-gray-500 mb-1">照片</label>
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
              <label className="w-20 h-20 border-2 border-dashed border-primary-100 rounded-lg bg-primary-50/30 flex flex-col items-center justify-center cursor-pointer">
                <ImagePlus size={20} className="text-primary" />
                <span className="text-[10px] text-primary mt-0.5">添加</span>
                <input type="file" accept="image/*" multiple onChange={handlePhotos} />
              </label>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="btn-primary w-full text-center mt-4"
        >
          保存修改
        </button>
      </div>
    </div>
  );
}
