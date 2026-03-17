import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Services from './pages/Services';
import Equipment from './pages/Equipment';
import Schedule from './pages/Schedule';
import Finance from './pages/Finance';
import Diagnostics from './pages/Diagnostics';
import Login from './pages/Login';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/services" element={<Services />} />
                    <Route path="/equipment" element={<Equipment />} />
                    <Route path="/schedule" element={<Schedule />} />
                    <Route path="/finance" element={<Finance />} />
                    <Route path="/diagnostics" element={<Diagnostics />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
