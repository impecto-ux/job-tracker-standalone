import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import StudioLayout from './pages/Studio/StudioLayout';
import Dashboard from './pages/Studio/Dashboard';
import VideoEditor from './pages/Studio/VideoEditor';
import './index.css';

// Protected Route Wrapper (Optional: simple check for now, can be expanded)
const ProtectedRoute = ({ children }) => {
  // In a real app we check auth status here. 
  // For this MVP we just allow access but ideally check user.
  // const { user } = useAuth();
  // if (!user) return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />

          {/* CMS Routes */}
          <Route path="/studio" element={
            <ProtectedRoute>
              <StudioLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="create" element={<VideoEditor />} />
            <Route path="edit/:id" element={<VideoEditor />} />
            {/* Fallback for sub-routes */}
            <Route path="*" element={<Navigate to="/studio" replace />} />
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
