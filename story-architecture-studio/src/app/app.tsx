import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAppStore } from './providers/store';
import { AppShell } from './shell/AppShell';
import { DashboardPage } from '@/features/projects/DashboardPage';
import { ExplorerPage } from '@/features/explorer/ExplorerPage';
import { ImportExportPage } from '@/features/projects/ImportExportPage';
import { MermaidPage } from '@/features/graph/MermaidPage';

export function App() {
  const initialize = useAppStore((s) => s.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="explorer" element={<ExplorerPage />} />
          <Route path="mermaid" element={<MermaidPage />} />
          <Route path="import-export" element={<ImportExportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
