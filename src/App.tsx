import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import HomePage from './pages/Home';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import ReportPage from './pages/Report';
import DashboardPage from './pages/Dashboard';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        {/* Redirect legacy auth route to login */}
        <Route path="auth" element={<Navigate to="/login" replace />} />
        
        <Route 
          path="report" 
          element={
            <ProtectedRoute>
              <ReportPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="dashboard" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
      </Route>
    </Routes>
  );
}
