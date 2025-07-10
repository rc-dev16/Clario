import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './components/LandingPage2';
import AuthModal from './components/AuthModal'; // This is now a full-page AuthPage
import Analyzer from './components/Analyzer';
import Dashboard from './components/Dashboard';
import AnalysisResultPage from './components/results/ResultPage';


function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/analyzer" element={<Analyzer />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/results/:id" element={<AnalysisResultPage />} />
          <Route path="/auth" element={<AuthModal />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;