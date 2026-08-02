import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAppStore } from './providers/store';
import { AppShell } from './shell/AppShell';
import { DashboardPage } from '@/features/projects/DashboardPage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { MixerPage } from '@/features/mixer/MixerPage';
import { CueBoardPage } from '@/features/cues/CueBoardPage';
import { ExportPage } from '@/features/export/ExportPage';

export function App() {
  const initialize = useAppStore((s) => s.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="mixer" element={<MixerPage />} />
          <Route path="cues" element={<CueBoardPage />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
