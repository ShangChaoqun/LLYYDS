import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TabBar from '@/components/Layout/TabBar';
import Home from '@/pages/Home';
import Wishes from '@/pages/Wishes';
import Menu from '@/pages/Menu';
import Cooking from '@/pages/Cooking';
import Lottery from '@/pages/Lottery';
import Diary from '@/pages/Diary';
import Affinity from '@/pages/Affinity';
import Bills from '@/pages/Bills';

export default function App() {
  return (
    <Router>
      <div className="max-w-lg mx-auto min-h-screen relative">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/wishes" element={<Wishes />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/cooking" element={<Cooking />} />
          <Route path="/lottery" element={<Lottery />} />
          <Route path="/diary" element={<Diary />} />
          <Route path="/affinity" element={<Affinity />} />
          <Route path="/bills" element={<Bills />} />
        </Routes>
        <TabBar />
      </div>
    </Router>
  );
}
