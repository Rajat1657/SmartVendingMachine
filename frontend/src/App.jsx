import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PWAProvider } from './context/PWAContext';
import { registerServiceWorker } from './registerServiceWorker';

import { CustomerHome } from './pages/customer/CustomerHome';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminInventory } from './pages/admin/AdminInventory';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminTransactions } from './pages/admin/AdminTransactions';
import { AdminMachines } from './pages/admin/AdminMachines';

// Register Service Worker
registerServiceWorker();

const ProtectedAdminRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e0e5ec] flex items-center justify-center text-slate-600 font-bold">
        Authenticating session...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default function App() {
  return (
    <PWAProvider>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <Routes>
              {/* Customer Touchscreen Kiosk Default Route */}
              <Route path="/" element={<CustomerHome />} />
              <Route path="/customer" element={<CustomerHome />} />

              {/* Admin Login Route */}
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Protected Mobile Admin App Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout />
                  </ProtectedAdminRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="inventory" element={<AdminInventory />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="transactions" element={<AdminTransactions />} />
                <Route path="machine" element={<AdminMachines />} />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </PWAProvider>
  );
}
