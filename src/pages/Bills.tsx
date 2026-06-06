import { useState } from 'react';
import { useBillStore, CATEGORIES } from '@/store/useBillStore';
import { formatDate } from '@/utils/helpers';
import { genderToLabel } from '@/store/useRoomStore';
import { Plus, X, BarChart3, Receipt } from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import PullToRefresh from '@/components/PullToRefresh';

export default function Bills() {
  const { records } = useBillStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const handleRefresh = async () => {
    await useBillStore.getState().loadFromFirebase();
  };

  const filteredRecords = records.filter((r) => r.date.startsWith(filterMonth));
  const totalExpense = filteredRecords.reduce((sum, r) => sum + r.amount, 0);

  const categoryStats = CATEGORIES.map((cat) => {
    const amount = filteredRecords.filter((r) => r.category === cat.key).reduce((sum, r) => sum + r.amount, 0);
    return { ...cat, amount };
  }).filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);

  const groupedRecords: Record<string, typeof filteredRecords> = {};
  filteredRecords.forEach((r) => {
    if (!groupedRecords[r.date]) groupedRecords[r.date] = [];
    groupedRecords[r.date].push(r);
  });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-bg">
      <PageHeader
        title="记账本"
        rightAction={
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowStats(!showStats)}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${showStats ? 'bg-primary-50 text-primary' : 'text-gray-400'}`}
            >
              <BarChart3 size={18} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center shadow-soft active:scale-90 transition-transform"
            >
              <Plus size={16} className="text-white" />
            </button>
          </div>
        }
      />

      <div className="page-container">
        <div className="card-base mb-3">
          <div className="flex items-center justify-between mb-2">
            <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
              className="text-sm font-semibold text-gray-700 bg-transparent outline-none" />
            <span className="text-xs text-gray-400">{filteredRecords.length}笔</span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-primary">¥{totalExpense.toFixed(2)}</span>
            <span className="text-xs text-gray-400 mb-1">本月支出</span>
          </div>
        </div>

        {showStats && (
          <div className="card-base mb-3 animate-fade-in">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <BarChart3 size={14} className="text-primary" />分类统计
            </h3>
            {categoryStats.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">暂无数据</p>
            ) : (
              <div className="space-y-2">
                {categoryStats.map((cat) => {
                  const percent = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
                  return (
                    <div key={cat.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{cat.emoji} {cat.label}</span>
                        <span className="text-xs font-medium text-gray-700">¥{cat.amount.toFixed(2)}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <Receipt size={40} className="mb-2" />
            <p className="text-xs">本月暂无记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedRecords).sort(([a], [b]) => b.localeCompare(a)).map(([date, items]) => {
              const dayTotal = items.reduce((sum, r) => sum + r.amount, 0);
              return (
                <div key={date}>
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <span className="text-xs font-medium text-gray-500">{formatDate(date)}</span>
                    <span className="text-xs text-gray-400">¥{dayTotal.toFixed(2)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((record) => {
                      const cat = CATEGORIES.find((c) => c.key === record.category);
                      return (
                        <div key={record.id} className="card-base !p-3 animate-fade-in">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-base flex-shrink-0">
                              {cat?.emoji || '📝'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm text-gray-700">{cat?.label || '其他'}</span>
                                  {record.createdBy && (
                                    <span className="text-[10px] text-primary font-medium">
                                      {record.createdBy === 'male' ? '🧑' : '👩'}{genderToLabel(record.createdBy)}
                                    </span>
                                  )}
                                </div>
                                <span className="text-sm font-semibold text-primary">-¥{record.amount.toFixed(2)}</span>
                              </div>
                              {record.note && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{record.note}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && <AddBillModal onClose={() => setShowAddModal(false)} />}
    </div>
    </PullToRefresh>
  );
}

function AddBillModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const addRecord = useBillStore((s) => s.addRecord);

  const handleSubmit = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;
    addRecord({ amount: num, category, note: note.trim(), date });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">记一笔 💰</h3>
          <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-500 mb-1">金额</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
              <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20" step="0.01" min="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">分类</label>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.map((cat) => (
                <button key={cat.key} onClick={() => setCategory(cat.key)}
                  className={`py-2 rounded-xl text-xs font-medium flex flex-col items-center gap-0.5 ${
                    category === cat.key ? 'bg-primary-50 text-primary border border-primary-100' : 'bg-gray-50 text-gray-500'
                  }`}>
                  <span className="text-base">{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
          <input type="text" placeholder="备注（可选）" value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <button onClick={handleSubmit} disabled={!amount || parseFloat(amount) <= 0}
          className="btn-primary w-full text-center mt-4 disabled:opacity-40">保存</button>
      </div>
    </div>
  );
}
