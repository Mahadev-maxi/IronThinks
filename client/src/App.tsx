import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { AgentGallery } from './pages/AgentGallery';
import { AuthPage } from './pages/AuthPage';
import { LiveAgentStudio } from './pages/LiveAgentStudio';
import { AnalyticsView } from './pages/AnalyticsView';
import { HistoryView } from './pages/HistoryView';
import { SettingsView } from './pages/SettingsView';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<AgentGallery />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/session/:personaId" element={<LiveAgentStudio />} />
            <Route path="/analytics/:sessionId" element={<AnalyticsView />} />
            <Route path="/history" element={<HistoryView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
