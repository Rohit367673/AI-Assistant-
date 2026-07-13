import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AssistantEmbed from './pages/AssistantEmbed';
import AssistantPortal from './pages/AssistantPortal';

// Simple route guard to ensure token exists
function PrivateRoute({ children }) {
  const token = localStorage.getItem('clinicToken');
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        <Route path="/assistant-embed" element={<AssistantEmbed />} />
        <Route path="/assistant" element={<AssistantPortal />} />
        <Route path="/portal" element={<Navigate to="/assistant" replace />} />
        
        {/* Wildcard Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
