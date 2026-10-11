import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { usePWA } from '../../context/PWAContext';
import { History, Plus, XCircle } from 'lucide-react';

export const AdminInventory = () => {
  const { guardOnlineAction, updateFetchTimestamp } = usePWA();
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Restocking supplier delivery');
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/inventory');
      if (res.data.success) {
        setInventory(res.data.inventory);
        setSummary(res.data.summary);
      }
      updateFetchTimestamp();
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get('/api/inventory/history');
      if (res.data.success) {
        setHistory(res.data.history);
        setShowHistoryModal(true);
      }
    } catch (err) {
      console.error('Error fetching adjustment history:', err);
    }
  };

  const handleOpenRestock = (product) => {
    setSelectedProduct(product);
    setAdjustQty('10');
    setAdjustReason('Restocking supplier delivery');
    setModalOpen(true);
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !adjustQty) return;

    guardOnlineAction(async () => {
      try {
        await axios.post('/api/inventory/adjust', {
          productId: selectedProduct.id,
          quantityChange: parseFloat(adjustQty),
          reason: adjustReason
        });

        setModalOpen(false);
        fetchInventoryData();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to adjust stock');
      }
    }, 'Stock adjustment');
  };

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Inventory Control</h2>
          <p className="text-xs text-slate-500 font-semibold">Live stock monitoring & restock audit</p>
        </div>

        <button
          onClick={fetchHistory}
          className="px-3.5 py-2 neu-btn text-blue-600 font-extrabold rounded-xl text-xs flex items-center gap-1.5"
        >
          <History className="w-4 h-4 text-blue-600" />
          <span>Audit Log</span>
        </button>
      </div>

      {/* Summary KPI Cards - Soft UI */}
      <div className="grid grid-cols-3 gap-3">
        <div className="neu-card p-3.5">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Total Items</span>
          <div className="text-lg font-black text-slate-800 font-mono mt-0.5">{summary.totalProducts || 0}</div>
        </div>

        <div className="neu-card p-3.5">
          <span className="text-[10px] font-extrabold text-amber-600 uppercase block">Low Stock</span>
          <div className="text-lg font-black text-amber-600 font-mono mt-0.5">{summary.lowStockCount || 0}</div>
        </div>

        <div className="neu-card p-3.5">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Stock Value</span>
          <div className="text-lg font-black text-emerald-600 font-mono mt-0.5">₹{(summary.totalStockValueCost || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Inventory Items List */}
      {loading ? (
        <div className="py-12 text-center text-xs font-bold text-slate-500 animate-pulse">
          Calculating live stock levels...
        </div>
      ) : (
        <div className="space-y-3">
          {inventory.map((item) => {
            const isLow = item.status === 'LOW_STOCK';
            const isOut = item.status === 'OUT_OF_STOCK';

            return (
              <div key={item.id} className="neu-card p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover neu-input p-0.5 bg-white"
                  />
                  <div>
                    <div className="font-black text-sm text-slate-800">{item.name}</div>
                    <div className="text-xs font-semibold text-slate-500">
                      Category: {item.category_name}
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-700 mt-0.5">
                      Stock: <span className={isOut ? 'text-red-600 font-extrabold' : isLow ? 'text-amber-600 font-extrabold' : 'text-emerald-600'}>
                        {item.stock} {item.unit}
                      </span> <span className="text-slate-400">(Min: {item.minimum_stock})</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {isOut ? (
                    <span className="px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-extrabold rounded-lg neu-badge uppercase tracking-wider">
                      OUT OF STOCK
                    </span>
                  ) : isLow ? (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-lg neu-badge uppercase tracking-wider animate-pulse">
                      LOW STOCK
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-lg neu-badge uppercase tracking-wider">
                      IN STOCK
                    </span>
                  )}

                  <button
                    onClick={() => handleOpenRestock(item)}
                    className="px-3 py-1.5 neu-btn text-blue-600 font-extrabold text-xs rounded-xl flex items-center gap-1 active:scale-95 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Restock</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Restock Adjustment Modal */}
      {modalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md neu-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-800">
                Adjust Stock: {selectedProduct.name}
              </h3>
              <button onClick={() => setModalOpen(false)} className="w-9 h-9 neu-btn rounded-xl flex items-center justify-center text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block text-slate-600 mb-1">
                  Quantity Change (+ for restock, - for reduction)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-full p-3 neu-input text-slate-800 font-mono focus:outline-none"
                    placeholder="e.g. +20 or -2"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                    {selectedProduct.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Adjustment Reason</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-3 neu-input text-slate-800 focus:outline-none"
                >
                  <option value="Restocking supplier delivery">Restocking supplier delivery</option>
                  <option value="Manual inventory audit correction">Manual inventory audit correction</option>
                  <option value="Damaged or spilt product removal">Damaged or spilt product removal</option>
                  <option value="Sample testing or calibration">Sample testing or calibration</option>
                </select>
              </div>

              <div className="neu-input p-3.5 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Stock:</span>
                  <span className="font-black text-slate-800">{selectedProduct.stock} {selectedProduct.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">New Calculated Stock:</span>
                  <span className="font-black text-emerald-600">
                    {Math.max(0, parseFloat((selectedProduct.stock + (parseFloat(adjustQty) || 0)).toFixed(2)))} {selectedProduct.unit}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 neu-btn text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white font-extrabold rounded-xl shadow-lg"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Audit History Log Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg neu-card p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-300 pb-3">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <span>Inventory Audit Trail</span>
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="w-9 h-9 neu-btn rounded-xl flex items-center justify-center text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {history.map((log) => (
                <div key={log.id} className="neu-input p-3.5 rounded-xl text-xs font-semibold">
                  <div className="flex justify-between font-black text-slate-800 mb-1">
                    <span>{log.product_name}</span>
                    <span className={log.quantity_change > 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change} {log.unit}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>{log.reason}</span>
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
