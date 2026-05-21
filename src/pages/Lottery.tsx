import { useState, useRef, useCallback, useEffect } from 'react';
import { useLotteryStore } from '@/store/useLotteryStore';
import { useAffinityStore, Person } from '@/store/useAffinityStore';
import { Plus, X, RotateCw, Heart } from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import PullToRefresh from '@/components/PullToRefresh';

const WHEEL_COLORS = [
  '#FF6B8A', '#B088F9', '#6EC6FF', '#FFD93D',
  '#6BCB77', '#FF8E53', '#A78BFA', '#F472B6',
  '#34D399', '#FBBF24', '#60A5FA', '#F87171',
];

const LOTTERY_COST = 20;

const PERSON_CONFIG: Record<Person, { name: string; emoji: string; color: string }> = {
  chaochao: { name: '超超抽奖', emoji: '🧑', color: '#6EC6FF' },
  linlin: { name: '琳琳抽奖', emoji: '👩', color: '#FF6B8A' },
};

export default function Lottery() {
  const { itemsMap, addItem, removeItem } = useLotteryStore();
  const { scores, addEvent } = useAffinityStore();
  const [newItemName, setNewItemName] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showManager, setShowManager] = useState(false);
  const [activePerson, setActivePerson] = useState<Person>('linlin');
  const [showCostConfirm, setShowCostConfirm] = useState(false);

  const handleRefresh = async () => {
    await useLotteryStore.getState().loadFromFirebase();
  };

  const items = itemsMap[activePerson];

  const costPerson: Person = activePerson === 'linlin' ? 'chaochao' : 'linlin';
  const costScore = scores[costPerson];
  const costPersonName = PERSON_CONFIG[costPerson].name.replace('抽奖', '好感度');

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 8;
    const itemCount = items.length;
    ctx.clearRect(0, 0, size, size);
    if (itemCount === 0) {
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#F8F8FC';
      ctx.fill();
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('添加选项开始抽奖', center, center);
      return;
    }
    const sliceAngle = (Math.PI * 2) / itemCount;
    items.forEach((item, i) => {
      const startAngle = i * sliceAngle - Math.PI / 2;
      const endAngle = startAngle + sliceAngle;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = item.color || WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${itemCount > 8 ? 11 : 14}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textRadius = radius * 0.65;
      const text = item.name.length > 6 ? item.name.slice(0, 6) + '..' : item.name;
      ctx.fillText(text, textRadius, 0);
      ctx.restore();
    });
    ctx.beginPath();
    ctx.arc(center, center, 28, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.arc(center, center, 22, 0, Math.PI * 2);
    const gradient = ctx.createLinearGradient(center - 22, center - 22, center + 22, center + 22);
    gradient.addColorStop(0, '#FF6B8A');
    gradient.addColorStop(1, '#B088F9');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GO', center, center);
  }, [items]);

  useEffect(() => { drawWheel(); }, [drawWheel, rotation]);

  const spin = () => {
    if (spinning || items.length === 0 || costScore < LOTTERY_COST) return;
    setShowCostConfirm(false);
    setSpinning(true);
    setResult(null);
    addEvent(costPerson, `抽奖消耗好感度`, -LOTTERY_COST);
    const itemCount = items.length;
    const sliceAngle = 360 / itemCount;
    const randomIndex = Math.floor(Math.random() * itemCount);
    const targetAngle = 360 - (randomIndex * sliceAngle + sliceAngle / 2);
    const totalRotation = rotation + 360 * 5 + targetAngle;
    setRotation(totalRotation);
    setTimeout(() => { setSpinning(false); setResult(items[randomIndex].name); }, 4000);
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    addItem(activePerson, newItemName.trim());
    setNewItemName('');
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-bg">
      <PageHeader
        title="幸运抽奖"
        rightAction={
          <button onClick={() => setShowManager(!showManager)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              showManager ? 'bg-gray-200 text-gray-600' : 'gradient-primary text-white shadow-soft'
            }`}>
            {showManager ? '完成' : '管理'}
          </button>
        }
      />

      <div className="page-container">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {(Object.keys(PERSON_CONFIG) as Person[]).map((person) => {
            const config = PERSON_CONFIG[person];
            const isActive = activePerson === person;
            const count = itemsMap[person].length;
            return (
              <button key={person} onClick={() => { setActivePerson(person); setRotation(0); }}
                className={`py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all ${
                  isActive ? 'text-white shadow-soft' : 'bg-white text-gray-400 shadow-card'
                }`}
                style={isActive ? { background: `linear-gradient(135deg, ${config.color}, #B088F9)` } : {}}>
                <span>{config.emoji}</span>
                {config.name}
                <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-gray-300'}`}>({count})</span>
              </button>
            );
          })}
        </div>

        <div className="card-base mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart size={14} className="text-primary" fill="#FF6B8A" />
            <span className="text-xs text-gray-500">消耗{costPersonName}</span>
          </div>
          <span className="text-sm font-bold text-primary">{costScore}</span>
        </div>

        <div className="text-center mb-2">
          <span className="text-[10px] text-gray-400">每次抽奖消耗 {LOTTERY_COST} 好感度</span>
        </div>

        {showManager && (
          <div className="card-base mb-3 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">{PERSON_CONFIG[activePerson].emoji}</span>
              <span className="text-xs font-medium text-gray-600">{PERSON_CONFIG[activePerson].name}选项</span>
            </div>
            <div className="flex gap-2 mb-3">
              <input type="text" placeholder="输入选项名称" value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              <button onClick={handleAddItem} disabled={!newItemName.trim()}
                className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-soft disabled:opacity-40">
                <Plus size={18} className="text-white" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <span key={item.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: item.color }}>
                  {item.name}
                  <button onClick={() => removeItem(activePerson, item.id)} className="ml-0.5 hover:opacity-70"><X size={12} /></button>
                </span>
              ))}
            </div>
            {items.length === 0 && <p className="text-xs text-gray-400 text-center py-2">添加至少2个选项才能抽奖哦</p>}
          </div>
        )}

        <div className="flex flex-col items-center">
          <div className="relative mb-3">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
              <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-gray-700 drop-shadow-md" />
            </div>
            <canvas ref={canvasRef} width={280} height={280} className="max-w-[280px]"
              style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }} />
          </div>

          {costScore < LOTTERY_COST && !spinning ? (
            <div className="text-center">
              <button disabled className="btn-primary opacity-40 flex items-center gap-2">
                <RotateCw size={18} />好感度不足
              </button>
              <p className="text-[10px] text-gray-400 mt-1.5">{costPersonName}不足 {LOTTERY_COST}</p>
            </div>
          ) : (
            <button onClick={() => { if (!spinning && items.length >= 2) setShowCostConfirm(true); }}
              disabled={spinning || items.length < 2}
              className="btn-primary flex items-center gap-2 disabled:opacity-40">
              <RotateCw size={18} className={spinning ? 'animate-spin' : ''} />
              {spinning ? '抽奖中...' : '开始抽奖'}
            </button>
          )}
          {items.length < 2 && !spinning && <p className="text-[10px] text-gray-400 mt-1.5">至少需要2个选项才能抽奖</p>}
        </div>

        {showCostConfirm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCostConfirm(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="text-3xl mb-3">🎰</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">确认抽奖</h3>
              <p className="text-sm text-gray-500 mb-1">
                将消耗 <span className="text-primary font-semibold">{LOTTERY_COST}</span> {costPersonName}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                当前: {costScore} → {costScore - LOTTERY_COST}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowCostConfirm(false)}
                  className="flex-1 py-2.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600">取消</button>
                <button onClick={spin} className="flex-1 btn-primary text-sm">确认抽奖</button>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setResult(null)}>
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">恭喜！</h3>
              <p className="text-lg font-semibold text-gradient">{result}</p>
              <button onClick={() => setResult(null)} className="btn-primary w-full text-center mt-6">太棒了！</button>
            </div>
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}
