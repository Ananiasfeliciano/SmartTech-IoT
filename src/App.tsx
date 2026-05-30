import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { modules } from './data/osData';
import Login from './pages/Login';
import OperationalPage from './pages/OperationalPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-screen place-items-center bg-[#020812] text-white">Carregando SMARTTECH IoT OS...</div>;
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
                    {modules.map((module) => (
                      <Route key={module.id} path={module.path} element={<OperationalPage module={module} />} />
                    ))}
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
