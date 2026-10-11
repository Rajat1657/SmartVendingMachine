import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, BarChart2, PieChart as PieIcon } from 'lucide-react';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const AdminAnalytics = () => {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/analytics/sales?range=${range}`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching sales analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center font-bold text-slate-500 animate-pulse">
        Generating Soft UI Sales Analytics...
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const dailyTrend = data?.charts?.dailyTrend || [];
  const topProducts = data?.charts?.topProducts || [];
  const categoryShare = data?.charts?.categoryShare || [];

  return (
    <div className="space-y-6">

      {/* Header & Range Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800">Sales Analytics</h2>
          <p className="text-xs text-slate-500 font-semibold">Revenue, cost & profit performance trends</p>
        </div>

        <div className="flex items-center gap-1 neu-input p-1 rounded-xl text-xs font-extrabold">
          {['7d', '30d', '90d', '1y'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg transition ${
                range === r
                  ? 'neu-btn text-blue-600 bg-white shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Financial Metrics Summary - Soft Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="neu-card p-4">
          <span className="text-[11px] font-extrabold text-slate-500 uppercase">Gross Revenue</span>
          <div className="text-xl font-black text-slate-800 font-mono mt-1">₹{(kpis.periodRevenue || 0).toLocaleString()}</div>
        </div>

        <div className="neu-card p-4">
          <span className="text-[11px] font-extrabold text-slate-500 uppercase">Gross Cost</span>
          <div className="text-xl font-black text-slate-500 font-mono mt-1">₹{(kpis.periodCost || 0).toLocaleString()}</div>
        </div>

        <div className="neu-card p-4">
          <span className="text-[11px] font-extrabold text-emerald-600 uppercase">Net Profit</span>
          <div className="text-xl font-black text-emerald-600 font-mono mt-1">₹{(kpis.periodProfit || 0).toLocaleString()}</div>
        </div>

        <div className="neu-card p-4">
          <span className="text-[11px] font-extrabold text-purple-600 uppercase">Profit Margin</span>
          <div className="text-xl font-black text-purple-600 font-mono mt-1">{kpis.profitMargin || 0}%</div>
        </div>
      </div>

      {/* Daily Revenue & Profit Chart */}
      <div className="neu-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Revenue & Profit Over Time</span>
          </h3>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrend}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue (₹)" />
              <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" name="Profit (₹)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products Bar Chart */}
      <div className="neu-card p-5 space-y-3">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-indigo-600" />
          <span>Top Revenue Products</span>
        </h3>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis dataKey="product_name" type="category" stroke="#64748b" tick={{ fontSize: 10 }} width={110} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '12px' }}
              />
              <Bar dataKey="totalRevenue" fill="#6366f1" radius={[0, 8, 8, 0]} name="Revenue (₹)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown Pie Chart */}
      <div className="neu-card p-5 space-y-3">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <PieIcon className="w-4 h-4 text-purple-600" />
          <span>Category Share</span>
        </h3>

        <div className="h-56 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryShare}
                dataKey="revenue"
                nameKey="categoryName"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ categoryName, percent }) => `${categoryName} ${(percent * 100).toFixed(0)}%`}
              >
                {categoryShare.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
