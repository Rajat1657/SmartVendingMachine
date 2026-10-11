import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';

export const AdminTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      const res = await axios.get(`/api/transactions?${params.toString()}`);
      if (res.data.success) {
        setTransactions(res.data.transactions);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t =>
    t.code.toLowerCase().includes(search.toLowerCase()) ||
    t.sticker_code?.toLowerCase().includes(search.toLowerCase()) ||
    t.product_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-800">Counter Audit & Sales Log</h2>
        <p className="text-xs text-slate-500 font-semibold">Search counter stickers, verify dispensed quantities</p>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Scan sticker code (e.g. STK-123456) or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 neu-input text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-3 neu-input text-xs font-extrabold text-slate-700 focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="PARTIALLY_DISPENSED">PARTIALLY DISPENSED</option>
          <option value="FAILED">FAILED</option>
          <option value="DISPENSING">DISPENSING</option>
        </select>
      </div>

      {/* Transaction List - Soft UI */}
      {loading ? (
        <div className="py-12 text-center text-xs font-bold text-slate-500 animate-pulse">
          Fetching transaction history...
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="neu-card p-8 text-center text-xs text-slate-500 font-semibold">
          No matching transactions found.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => {
            const isCompleted = tx.status === 'COMPLETED';
            const isPartial = tx.status === 'PARTIALLY_DISPENSED';
            const isFailed = tx.status === 'FAILED';

            return (
              <div key={tx.id} className="neu-card p-4 space-y-3">
                
                <div className="flex items-center justify-between border-b border-slate-300 pb-2 text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-slate-800">{tx.code}</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-blue-600 font-black">Sticker: {tx.sticker_code || 'N/A'}</span>
                  </div>

                  <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wider neu-badge ${
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-800'
                      : isPartial
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {tx.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">{tx.product_name}</h4>
                    <p className="text-slate-500 font-mono font-semibold mt-0.5">
                      Target: {tx.target_quantity} {tx.unit} • Dispensed: {tx.actual_dispensed_quantity} {tx.unit}
                      {tx.shortfall > 0 && <span className="text-amber-700 font-bold ml-2">(Shortfall: {tx.shortfall} {tx.unit})</span>}
                    </p>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-base font-black text-emerald-600">
                      ₹{tx.total_revenue}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500">
                      Profit: +₹{tx.profit}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-semibold text-slate-500 flex justify-between pt-1 border-t border-slate-300">
                  <span>Timestamp: {new Date(tx.created_at).toLocaleString()}</span>
                  <span>Machine: {tx.machine_id}</span>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
