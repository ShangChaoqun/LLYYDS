import { useState } from 'react';
import { useMenuStore, MenuItem } from '@/store/useMenuStore';
import { compressImage } from '@/utils/helpers';
import { genderToLabel } from '@/store/useRoomStore';
import { Plus, ImagePlus, X, Trash2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';

export default function Menu() {
  const { menuItems, deleteMenuItem, updateMenuItem } = useMenuStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader
        title="厨房菜单"
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
        {menuItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <div className="text-5xl mb-3">🍳</div>
            <p className="text-sm">还没有菜单，快去添加吧</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {menuItems.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl shadow-card overflow-hidden animate-fade-in">
                {item.photo ? (
                  <div className="relative aspect-[4/3]">
                    <img
                      src={item.photo}
                      alt={item.name}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setViewPhoto(item.photo)}
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={() => setEditItem(item)}
                        className="w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center"
                      >
                        <Pencil size={14} className="text-blue-500" />
                      </button>
                      <button
                        onClick={() => deleteMenuItem(item.id)}
                        className="w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
                    <span className="text-3xl">🍽️</span>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={() => setEditItem(item)}
                        className="w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center"
                      >
                        <Pencil size={14} className="text-blue-500" />
                      </button>
                      <button
                        onClick={() => deleteMenuItem(item.id)}
                        className="w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-gray-800 truncate">{item.name}</h3>
                    {item.createdBy && (
                      <span className="text-[10px] text-primary font-medium flex-shrink-0">
                        {item.createdBy === 'male' ? '🧑' : '👩'}{genderToLabel(item.createdBy)}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && <AddMenuModal onClose={() => setShowAddModal(false)} />}
      {editItem && <EditMenuModal item={editItem} onClose={() => setEditItem(null)} />}

      {viewPhoto && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setViewPhoto(null)}>
          <img src={viewPhoto} alt="" className="max-w-full max-h-[85vh] object-contain" onClick={() => setViewPhoto(null)} />
        </div>
      )}
    </div>
  );
}

function AddMenuModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState('');
  const addMenuItem = useMenuStore((s) => s.addMenuItem);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      setPhoto(compressed);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    addMenuItem({ name: name.trim(), description: description.trim(), photo });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">添加菜单 🍳</h3>
          <button onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="菜单名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <textarea
            placeholder="描述一下这道菜（可选）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <div>
            <label className="block text-sm text-gray-500 mb-1">添加照片</label>
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
          disabled={!name.trim()}
          className="btn-primary w-full text-center mt-4 disabled:opacity-40"
        >
          添加菜单
        </button>
      </div>
    </div>
  );
}

function EditMenuModal({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const [description, setDescription] = useState(item.description);
  const [photo, setPhoto] = useState(item.photo);
  const updateMenuItem = useMenuStore((s) => s.updateMenuItem);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      setPhoto(compressed);
    }
  };

  const handleSubmit = () => {
    updateMenuItem(item.id, { description: description.trim(), photo });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">编辑菜单 ✏️</h3>
          <button onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>
        <div className="mb-2">
          <p className="text-sm font-medium text-gray-700">{item.name}</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-500 mb-1">修改照片</label>
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
          <textarea
            placeholder="描述一下这道菜（可选）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
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
