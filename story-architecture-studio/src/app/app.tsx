import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAppStore } from './providers/store';
import { AppShell } from './shell/AppShell';
import { DashboardPage } from '@/features/projects/DashboardPage';
import { ExplorerPage } from '@/features/explorer/ExplorerPage';
import { ImportExportPage } from '@/features/projects/ImportExportPage';
import { GraphPage } from '@/features/graph/GraphPage';
import { MermaidPage } from '@/features/graph/MermaidPage';
import { TreePage } from '@/features/trees/TreePage';
import { IssueBoardPage } from '@/features/issues/IssueBoardPage';
import { IssuePlannerPage } from '@/features/issues/IssuePlannerPage';
import { PagePlannerPage } from '@/features/pages/PagePlannerPage';
import { ValidationPage } from '@/features/validation/ValidationPage';
import { TimelinePage } from '@/features/timeline/TimelinePage';
import { ReaderKnowledgePage } from '@/features/readerTree/ReaderKnowledgePage';
import { SnapshotsPage } from '@/features/backup/SnapshotsPage';
import { ReportsPage } from '@/features/validation/ReportsPage';

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
          <Route path="trees/:kind" element={<TreePage />} />
          <Route path="graph" element={<GraphPage />} />
          <Route path="issues" element={<IssueBoardPage />} />
          <Route path="issues/:issueId/plan" element={<IssuePlannerPage />} />
          <Route path="issues/:issueId/pages/:pageId" element={<PagePlannerPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="mermaid" element={<MermaidPage />} />
          <Route path="reader-knowledge" element={<ReaderKnowledgePage />} />
          <Route path="validation" element={<ValidationPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="snapshots" element={<SnapshotsPage />} />
          <Route path="import-export" element={<ImportExportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
