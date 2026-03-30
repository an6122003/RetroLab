import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import ArticleEditor from './pages/ArticleEditor';
import PipelinePage from './pages/PipelinePage';
import ComposerPage from './pages/ComposerPage';
import WorkerManagementPage from './pages/WorkerManagementPage';
import FinOpsPage from './pages/FinOpsPage';
import BackupPage from './pages/BackupPage';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import ConfigPage from './pages/ConfigPage';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-[#2563eb] flex items-center justify-center relative animate-pulse">
          <div className="w-2 h-2 bg-[#facc15] rounded-full absolute top-1 right-1" />
        </div>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  const { user, isAdmin, isLoading } = useAuth();

  // While checking auth state
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Not logged in → show login page
  if (!user) {
    return <LoginPage />;
  }

  // Logged in but not admin → access denied
  if (!isAdmin) {
    return <UnauthorizedPage />;
  }

  // Authenticated admin → full app
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/article/:id" element={<ArticleEditor />} />
      <Route path="/pipeline" element={<PipelinePage />} />
      <Route path="/composer" element={<ComposerPage />} />
      <Route path="/workers" element={<WorkerManagementPage />} />
      <Route path="/finops" element={<FinOpsPage />} />
      <Route path="/backup" element={<BackupPage />} />
      <Route path="/config" element={<ConfigPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
