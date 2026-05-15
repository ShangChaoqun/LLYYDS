import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Heart, BookOpen, HeartHandshake, Sparkles } from 'lucide-react';

const tabs = [
  { path: '/', icon: Home, label: '首页' },
  { path: '/wishes', icon: Heart, label: '愿望' },
  { path: '/diary', icon: BookOpen, label: '日记' },
  { path: '/affinity', icon: HeartHandshake, label: '好感' },
  { path: '/lottery', icon: Sparkles, label: '抽奖' },
];

export default function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-primary-50 z-40">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-xs ${isActive ? 'font-semibold' : 'font-normal'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 gradient-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      <div className="safe-bottom" />
    </nav>
  );
}
