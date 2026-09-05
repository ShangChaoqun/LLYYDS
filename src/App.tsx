import { useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import TabBar from '@/components/Layout/TabBar';
import Home from '@/pages/Home';
import Wishes from '@/pages/Wishes';
import Menu from '@/pages/Menu';
import Cooking from '@/pages/Cooking';
import Lottery from '@/pages/Lottery';
import Diary from '@/pages/Diary';
import Affinity from '@/pages/Affinity';
import Bills from '@/pages/Bills';
import Welcome from '@/pages/Welcome';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useRoomStore } from '@/store/useRoomStore';
import { useWishStore } from '@/store/useWishStore';
import { useMenuStore } from '@/store/useMenuStore';
import { useCookingStore } from '@/store/useCookingStore';
import { useDiaryStore } from '@/store/useDiaryStore';
import { useAffinityStore } from '@/store/useAffinityStore';
import { useLotteryStore } from '@/store/useLotteryStore';
import { useBillStore } from '@/store/useBillStore';
import { useKeyMomentStore } from '@/store/useKeyMomentStore';
import { AlertTriangle } from 'lucide-react';

function SupabaseConfigPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      <div className="gradient-primary rounded-full w-20 h-20 flex items-center justify-center mb-6 shadow-soft">
        <AlertTriangle size={36} className="text-white" />
      </div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">需要配置 Supabase</h1>
      <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
        应用需要 Supabase 才能正常运行。<br />
        请在项目根目录创建 <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">.env</code> 文件并填入 Supabase 配置。
      </p>
      <div className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-card">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">📋 配置步骤</h3>
        <ol className="text-xs text-gray-500 space-y-2 list-decimal list-inside">
          <li>前往 <a href="https://supabase.com/" target="_blank" rel="noreferrer" className="text-primary underline">supabase.com</a> 注册并创建项目（选择 Singapore 区域）</li>
          <li>在 SQL Editor 中执行建表语句（见下方）</li>
          <li>在「设置」→「API」中获取 Project URL 和 anon public key</li>
          <li>复制 <code className="bg-gray-100 px-1 py-0.5 rounded">.env.example</code> 为 <code className="bg-gray-100 px-1 py-0.5 rounded">.env</code>，填入配置</li>
          <li>重启开发服务器</li>
        </ol>
      </div>
      <div className="w-full max-w-sm bg-gray-50 rounded-2xl p-4 mt-3">
        <p className="text-[10px] text-gray-400 mb-1">.env 文件示例：</p>
        <pre className="text-[10px] text-gray-600 overflow-x-auto whitespace-pre">VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...</pre>
      </div>
      <div className="w-full max-w-sm bg-gray-50 rounded-2xl p-4 mt-3">
        <p className="text-[10px] text-gray-400 mb-1">SQL 建表语句：</p>
        <pre className="text-[10px] text-gray-600 overflow-x-auto whitespace-pre">{`CREATE TABLE room_data (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL,
  collection TEXT NOT NULL,
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, collection)
);

ALTER TABLE room_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public room_data"
  ON room_data FOR ALL
  USING (true) WITH CHECK (true);

-- 创建图片存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true);

-- 允许公开上传和读取图片
CREATE POLICY "Public images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'images')
  WITH CHECK (bucket_id = 'images');`}</pre>
      </div>
    </div>
  );
}

const LAST_ROUTE_KEY = 'llyyds_last_route';

function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    // 使用 sessionStorage：刷新时保留路由，关闭重开则回到首页
    if (location.pathname !== '/') {
      sessionStorage.setItem(LAST_ROUTE_KEY, location.pathname);
    }
  }, [location.pathname]);
  return null;
}

function RouteRestore() {
  const location = useLocation();
  const navigate = useNavigate();
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!restoredRef.current && location.pathname === '/') {
      const saved = sessionStorage.getItem(LAST_ROUTE_KEY);
      if (saved && saved !== '/') {
        restoredRef.current = true;
        navigate(saved, { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  return null;
}

function AppContent() {
  const { gender } = useRoomStore();
  const unsubRef = useRef<(() => void)[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (gender && isSupabaseConfigured() && !loadedRef.current) {
      loadedRef.current = true;
      const stores = [
        useWishStore, useMenuStore, useCookingStore,
        useDiaryStore, useAffinityStore, useLotteryStore,
        useBillStore, useKeyMomentStore,
      ];
      stores.forEach((store) => {
        store.getState().loadFromFirebase();
        const unsub = store.getState().subscribeToFirebase();
        unsubRef.current.push(unsub);
      });
    }
    return () => {
      unsubRef.current.forEach((fn) => fn());
      unsubRef.current = [];
      loadedRef.current = false;
    };
  }, [gender]);

  if (!isSupabaseConfigured()) {
    return <SupabaseConfigPage />;
  }

  if (!gender) {
    return <Welcome />;
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen relative">
      <RouteTracker />
      <RouteRestore />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/wishes" element={<Wishes />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cooking" element={<Cooking />} />
        <Route path="/lottery" element={<Lottery />} />
        <Route path="/diary" element={<Diary />} />
        <Route path="/affinity" element={<Affinity />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <TabBar />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
