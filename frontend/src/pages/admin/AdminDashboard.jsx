import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { usePWA } from '../../context/PWAContext';
import { IndianRupee, ShoppingBag, TrendingUp, AlertTriangle, Cpu, ArrowUpRight, Clock, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { machineStatus, isConnected } = useSocket();
  const { isOnline, updateFetchTimestamp, lastDataFetchTime, promptInstall } = usePWA();
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, alertsRes] = await Promise.all([
        axios.get('/api/analytics/sales?range=30d'),
        axios.get('/api/machines/alerts/all')
      ]);

      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data);
      }
      if (alertsRes.data.success) {
        setAlerts(alertsRes.data.alerts);
      }
      updateFetchTimestamp();
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center font-bold text-slate-500 animate-pulse">
        Loading Nourish Mobile Dashboard...
      </div>
    );
  }

  const kpis = analytics?.kpis || {};

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Owner Overview</h2>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Refreshed: {lastDataFetchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {!isOnline && <span className="text-red-600 font-extrabold">(Stale Data)</span>}
          </div>
        </div>

        {/* Live Hardware Status Pill */}
        <div className="neu-input px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-extrabold">
          <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
          <span className="text-slate-700 uppercase">{machineStatus.status || 'ONLINE'}</span>
        </div>
      </div>

      {/* Android PWA Install Banner */}
      <div className="neu-card p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-between shadow-lg">
        <div>
          <h3 className="font-extrabold text-sm">Install Nourish App on Android</h3>
          <p className="text-xs text-blue-100 mt-0.5">
            Get instant home screen launch, full-screen portal & push alerts.
          </p>
        </div>
        <button
          onClick={promptInstall}
          className="px-4 py-2.5 bg-white text-blue-700 font-extrabold text-xs rounded-xl shadow hover:bg-blue-50 active:scale-95 transition shrink-0 ml-3 flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          <span>Install</span>
        </button>
      </div>

      {/* Urgent Low Stock Alerts */}
      {alerts.length > 0 && alerts.some(a => !a.is_read) && (
        <div className="neu-card p-4 bg-amber-500/10 border-2 border-amber-300 text-amber-900 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-800">Inventory Alert</h4>
            <p className="text-xs font-bold text-amber-900 mt-0.5">{alerts[0].message}</p>
          </div>
          <button
            onClick={() => navigate('/admin/inventory')}
            className="text-xs font-black text-amber-700 underline shrink-0 neu-btn px-3 py-1.5 rounded-xl"
          >
            Restock
          </button>
        </div>
      )}

      {/* Main KPI Cards Grid - Soft Raised Neumorphism */}
      <div className="grid grid-cols-2 gap-4">

        {/* Today's Sales */}
        <div className="neu-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider">Today's Sales</span>
            <div className="w-10 h-10 neu-btn rounded-xl flex items-center justify-center text-blue-600 font-black">
              ₹
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 font-mono">
              ₹{(kpis.todayRevenue || 0).toLocaleString()}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">
              Yesterday: ₹{(kpis.yesterdayRevenue || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Today's Orders */}
        <div className="neu-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider">Today's Orders</span>
            <div className="w-10 h-10 neu-btn rounded-xl flex items-center justify-center text-indigo-600 font-black">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 font-mono">
              {kpis.todayTransactions || 0}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">
              Orders Dispensed Today
            </p>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="neu-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider">Total Sales</span>
            <div className="w-10 h-10 neu-btn rounded-xl flex items-center justify-center text-emerald-600 font-black">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 font-mono">
              ₹{(kpis.periodRevenue || 0).toLocaleString()}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">
              Last 30 Days Revenue
            </p>
          </div>
        </div>

        {/* Estimated Net Profit */}
        <div className="neu-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider">Net Profit</span>
            <div className="w-10 h-10 neu-btn rounded-xl flex items-center justify-center text-purple-600 font-black">
              ₹
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 font-mono">
              ₹{(kpis.periodProfit || 0).toLocaleString()}
            </div>
            <p className="text-[11px] font-bold text-purple-700 mt-1">
              {kpis.profitMargin || 0}% Profit Margin
            </p>
          </div>
        </div>

      </div>

      {/* Hardware Telemetry Neumorphic Control Panel Card */}
      <div className="neu-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-300 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 neu-btn rounded-2xl flex items-center justify-center text-cyan-600 font-black">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Dispenser Kiosk #01</h3>
              <span className="text-xs text-slate-500 font-mono">Hardware Code: VM-001</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/admin/machine')}
            className="neu-btn px-3 py-2 rounded-xl text-xs font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Control Panel</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-700 pt-1">
          <div className="neu-input p-3 rounded-xl">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Machine State</span>
            <span className="text-slate-800 font-black text-sm mt-0.5 block">
              {machineStatus.currentOperation || 'IDLE'}
            </span>
          </div>

          <div className="neu-input p-3 rounded-xl">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Low Stock Warning</span>
            <span className="text-amber-600 font-black text-sm mt-0.5 block">
              {kpis.lowStockItems || 0} Products Low
            </span>
          </div>
        </div>
      </div>

      {/* Top Selling Products Preview */}
      <div className="neu-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-slate-800">Top Performing Products</h3>
          <button
            onClick={() => navigate('/admin/analytics')}
            className="text-xs font-extrabold text-blue-600 hover:underline"
          >
            Full Analytics
          </button>
        </div>

        <div className="space-y-3">
          {(analytics?.charts?.topProducts || []).slice(0, 4).map((p, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs neu-input p-3.5 rounded-xl">
              <div>
                <div className="font-bold text-slate-800 text-sm">{p.product_name}</div>
                <div className="text-slate-500 font-medium">{p.totalQuantity} {p.unit} sold</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-black text-slate-800 text-sm">₹{p.totalRevenue}</div>
                <div className="text-emerald-600 font-extrabold text-[11px]">+₹{p.totalProfit} profit</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
