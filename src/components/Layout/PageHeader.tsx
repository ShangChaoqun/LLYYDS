import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export default function PageHeader({ title, showBack = false, rightAction }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg">
      <div className="max-w-lg mx-auto flex items-center justify-between h-12 px-4">
        <div className="w-10">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center w-10 h-10 -ml-2 text-gray-600 active:scale-90 transition-transform"
            >
              <ChevronLeft size={24} />
            </button>
          )}
        </div>
        <h1 className="text-base font-semibold text-gray-800">{title}</h1>
        <div className="w-10 flex justify-end">{rightAction}</div>
      </div>
    </header>
  );
}
