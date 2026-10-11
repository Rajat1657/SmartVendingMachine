import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { usePWA } from '../../context/PWAContext';
import { LayoutDashboard, Package, Boxes, TrendingUp, History, Cpu, LogOut, Monitor, AlertTriangle, X, Download, Wifi, WifiOff } from 'lucide-react';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { isOnline, isInstallable, promptInstall, offlineToast, setOfflineToast, lastDataFetchTime } = usePWA();
  const [toastAlert, setToastAlert] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleLowStock = (data) => {
      setToastAlert(data);
    };

    socket.on('low_stock_notification', handleLowStock);

    return () => {
      socket.off('low_stock_notification', handleLowStock);
    };
  }, [socket]);

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/products', label: 'Products', icon: Package },
    { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
    { to: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
    { to: '/admin/transactions', label: 'Sales Log', icon: History },
    { to: '/admin/machine', label: 'Hardware', icon: Cpu }
  ];

  return (
    <div className="min-h-screen bg-[#e0e5ec] text-slate-800 flex flex-col pb-24 max-w-md mx-auto sm:max-w-xl md:max-w-4xl shadow-2xl border-x border-slate-300">

      {/* Top Mobile Bar - Soft Raised Header */}
      <header className="sticky top-0 z-40 bg-[#e0e5ec] p-4 flex items-center justify-between border-b border-slate-300 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 neu-btn rounded-2xl flex items-center justify-center font-black text-xl text-blue-600">
            🌾
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-800 leading-tight">Nourish Portal</h1>
              {/* Network Status Badge */}
              <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md flex items-center gap-1 neu-badge ${
                isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700 animate-pulse'
              }`}>
                {isOnline ? <Wifi className="w-3 h-3 text-emerald-600" /> : <WifiOff className="w-3 h-3 text-red-600" />}
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-bold block">
              {user?.name || 'Shopkeeper'} • <span className="text-slate-400">Updated {lastDataFetchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          <button
            onClick={promptInstall}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition"
            title="Install Nourish App on Android / PC"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Install App</span>
          </button>

          {/* Kiosk Mode Shortcut */}
          <button
            onClick={() => navigate('/customer')}
            className="px-3 py-2 neu-btn text-slate-700 font-extrabold text-xs rounded-xl flex items-center gap-1.5 hover:text-blue-600 transition"
            title="Switch to Customer Kiosk View"
          >
            <Monitor className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Kiosk UI</span>
          </button>

          <button
            onClick={logout}
            className="p-2 neu-btn text-slate-600 hover:text-red-600 transition rounded-xl"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Offline Warning Banner */}
      {!isOnline && (
        <div className="bg-red-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>⚡ Offline Mode: Showing cached app shell. Financial & inventory edits disabled.</span>
          </div>
        </div>
      )}

      {/* Real-time Network Reconnected Toast Notification */}
      {offlineToast && (
        <div className="m-4 neu-card p-3 bg-blue-500/10 border-2 border-blue-400 text-blue-900 rounded-2xl flex items-center justify-between text-xs font-bold animate-fadeIn">
          <span>{offlineToast.message}</span>
          <button onClick={() => setOfflineToast(null)} className="text-blue-700 hover:text-blue-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real-time Push Alert Toast Notification Banner */}
      {toastAlert && (
        <div className="m-4 neu-card p-4 bg-amber-500/10 border-2 border-amber-400 text-amber-900 rounded-2xl flex items-start justify-between gap-3 animate-bounce">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-xs text-amber-800 uppercase tracking-wider">
                ⚠️ REAL-TIME LOW STOCK ALERT!
              </h4>
              <p className="text-xs font-bold text-amber-900 mt-0.5">
                {toastAlert.message}
              </p>
            </div>
          </div>
          <button
            onClick={() => setToastAlert(null)}
            className="p-1 text-amber-700 hover:text-amber-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main App Content Viewport */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <Outlet />
      </main>

      {/* Neumorphic Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#e0e5ec] border-t border-slate-300 max-w-md mx-auto sm:max-w-xl md:max-w-4xl px-3 py-2 flex items-center justify-around shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition text-[11px] font-extrabold ${
                  isActive
                    ? 'neu-btn-pressed text-blue-600 bg-blue-50/50 scale-105'
                    : 'neu-btn text-slate-600 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

    </div>
  );
};
