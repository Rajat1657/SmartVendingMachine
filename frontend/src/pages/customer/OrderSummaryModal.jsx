import React from 'react';
import { ArrowLeft, Play, Info } from 'lucide-react';

export const OrderSummaryModal = ({ order, onBack, onCancel, onConfirmDispense }) => {
  const { product, quantity, totalPrice } = order;

  const formatQuantityDisplay = (qty, unit) => {
    if (unit === 'kg' && qty < 1) return `${Math.round(qty * 1000)} g`;
    if (unit === 'L' && qty < 1) return `${Math.round(qty * 1000)} ml`;
    return `${qty} ${unit}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl neu-card bg-[#e0e5ec] p-6 md:p-8 relative border border-white/80 shadow-2xl rounded-3xl">

        <h2 className="text-2xl font-black text-slate-800 mb-6 text-center">
          Confirm Dispense Order
        </h2>

        {/* Order Details Card */}
        <div className="neu-input bg-[#e0e5ec] p-6 rounded-2xl mb-6 space-y-4">
          <div className="flex items-center gap-4 border-b border-slate-300 pb-4">
            <img
              src={product.image}
              alt={product.name}
              className="w-20 h-20 rounded-2xl object-cover shadow-inner bg-white border border-white shrink-0"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500';
              }}
            />
            <div>
              <h3 className="text-xl font-bold text-slate-800">{product.name}</h3>
              <p className="text-sm font-semibold text-slate-500">{product.category_name || 'Staple'}</p>
              <div className="text-sm font-bold text-blue-600 mt-1">
                Rate: ₹{product.selling_price} / {product.unit}
              </div>
            </div>
          </div>

          <div className="space-y-2 text-slate-700 font-medium text-base">
            <div className="flex justify-between">
              <span className="text-slate-500">Dispense Quantity:</span>
              <span className="font-bold text-slate-900 text-lg">
                {formatQuantityDisplay(quantity, product.unit)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Unit Price:</span>
              <span className="font-bold">₹{product.selling_price}</span>
            </div>

            <div className="flex justify-between border-t border-slate-300 pt-3 text-xl font-black text-slate-900">
              <span>Total Price:</span>
              <span className="text-emerald-600 font-mono">₹{totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Counter Payment Note */}
        <div className="flex items-start gap-3 bg-amber-50 text-amber-800 p-4 rounded-xl text-sm font-semibold mb-8 border border-amber-200">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Note:</strong> Payment is not required now. A printed sticker tag will be generated after dispensing to scan at the counter checkout.
          </span>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onBack}
            className="py-4 neu-btn bg-[#e0e5ec] rounded-2xl text-slate-700 font-extrabold flex items-center justify-center gap-2 hover:bg-slate-200 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>BACK</span>
          </button>

          <button
            onClick={onConfirmDispense}
            className="py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold rounded-2xl text-lg shadow-xl hover:shadow-2xl flex items-center justify-center gap-2 transform active:scale-95 transition"
          >
            <Play className="w-6 h-6 fill-white" />
            <span>DISPENSE NOW</span>
          </button>
        </div>

      </div>
    </div>
  );
};
