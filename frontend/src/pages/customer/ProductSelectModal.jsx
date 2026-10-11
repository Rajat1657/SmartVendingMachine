import React, { useState } from 'react';
import { X, Plus, Minus, ArrowRight, IndianRupee, Layers } from 'lucide-react';

export const ProductSelectModal = ({ product, onClose, onConfirm }) => {
  const isSolid = product.type === 'SOLID';
  const baseUnit = product.unit; // 'kg' or 'L'
  const maxStock = product.stock;
  const maxAllowedAmount = maxStock * product.selling_price;

  // Standard preset values up to 10kg/10L (only show presets <= maxStock)
  const standardPresets = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 7.5, 10.0]
    .filter(p => p <= maxStock);

  const [mode, setMode] = useState('WEIGHT'); // 'WEIGHT' or 'AMOUNT'
  const [quantity, setQuantity] = useState(Math.min(0.5, maxStock)); // Default 500g or maxStock
  const [currencyAmount, setCurrencyAmount] = useState('');

  // Format weight / volume display (e.g. 0.25 kg -> 250 g, 0.75 kg -> 750 g, 1.5 kg -> 1.5 kg)
  const formatQuantityDisplay = (qty) => {
    if (baseUnit === 'kg') {
      if (qty < 1) return `${Math.round(qty * 1000)} g`;
      return `${qty} kg`;
    }
    if (baseUnit === 'L') {
      if (qty < 1) return `${Math.round(qty * 1000)} ml`;
      return `${qty} L`;
    }
    return `${qty} ${baseUnit}`;
  };

  // Align any weight to nearest 250g / 250ml step, strictly clamped [0.25, maxStock]
  const alignToStep = (val) => {
    const step = 0.25;
    const rounded = Math.round(val / step) * step;
    const clamped = Math.min(maxStock, Math.max(0.25, parseFloat(rounded.toFixed(2))));
    return clamped;
  };

  const calculateTotalPrice = () => {
    return (quantity * product.selling_price).toFixed(2);
  };

  const handleStep = (delta) => {
    const step = 0.25;
    const newQty = Math.min(maxStock, Math.max(0.25, parseFloat((quantity + delta * step).toFixed(2))));
    setQuantity(newQty);
  };

  const handlePresetSelect = (presetVal) => {
    if (presetVal <= maxStock) {
      setQuantity(presetVal);
    }
  };

  const handleCurrencyNumpad = (digit) => {
    if (digit === 'CLEAR') {
      setCurrencyAmount('');
      setQuantity(Math.min(0.5, maxStock));
      return;
    }

    if (digit === 'BACK') {
      const newAmtStr = currencyAmount.slice(0, -1);
      setCurrencyAmount(newAmtStr);
      if (newAmtStr && !isNaN(parseFloat(newAmtStr))) {
        const rawQty = parseFloat(newAmtStr) / product.selling_price;
        const clampedQty = alignToStep(rawQty);
        setQuantity(clampedQty);
      } else {
        setQuantity(Math.min(0.5, maxStock));
      }
      return;
    }

    // Append digit
    const newAmtStr = currencyAmount + digit;
    const numericAmt = parseFloat(newAmtStr);

    if (!isNaN(numericAmt)) {
      if (numericAmt > maxAllowedAmount) {
        const cappedAmt = Math.floor(maxAllowedAmount);
        setCurrencyAmount(cappedAmt.toString());
        setQuantity(maxStock);
      } else {
        setCurrencyAmount(newAmtStr);
        const rawQty = numericAmt / product.selling_price;
        const clampedQty = alignToStep(rawQty);
        setQuantity(clampedQty);
      }
    }
  };

  // Multi-bag calculation info
  const MAX_BAG_CAPACITY = 5.0;
  const isMultiBag = quantity > MAX_BAG_CAPACITY;
  const bagCount = Math.ceil(quantity / MAX_BAG_CAPACITY);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl neu-card bg-[#e0e5ec] p-6 md:p-8 relative flex flex-col max-h-[94vh] overflow-y-auto border border-white/80 shadow-2xl rounded-3xl">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-12 h-12 neu-btn bg-[#e0e5ec] rounded-2xl flex items-center justify-center text-slate-700 hover:text-slate-900 transition z-20 shadow-md"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Product Details Header */}
        <div className="flex items-center gap-5 mb-4">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-white p-1 border-2 border-white shadow-md shrink-0">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover rounded-xl"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500';
              }}
            />
          </div>
          <div>
            <span className={`inline-block px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider mb-1 neu-badge ${
              isSolid ? 'bg-amber-100 text-amber-800' : 'bg-cyan-100 text-cyan-800'
            }`}>
              {product.type} • {product.category_name || 'Staple'}
            </span>
            <h2 className="text-2xl font-black text-slate-800">{product.name}</h2>
            <div className="text-lg font-bold text-blue-600">
              ₹{product.selling_price} <span className="text-sm font-normal text-slate-500">/ {product.unit}</span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Available Stock: <span className="text-slate-800 font-bold">{product.stock} {product.unit}</span>
            </p>
          </div>
        </div>

        {/* Selection Mode Tabs: By Quantity vs By Currency Amount (₹) */}
        <div className="grid grid-cols-2 gap-3 mb-4 neu-input bg-[#e0e5ec] p-1.5 rounded-2xl">
          <button
            onClick={() => setMode('WEIGHT')}
            className={`py-3 rounded-xl font-extrabold text-sm transition flex items-center justify-center gap-2 ${
              mode === 'WEIGHT'
                ? 'neu-btn font-black text-blue-600 bg-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Select Quantity ({product.unit})</span>
          </button>

          <button
            onClick={() => {
              setMode('AMOUNT');
              if (!currencyAmount) {
                const initialAmt = Math.round(quantity * product.selling_price);
                setCurrencyAmount(initialAmt.toString());
              }
            }}
            className={`py-3 rounded-xl font-extrabold text-sm transition flex items-center justify-center gap-2 ${
              mode === 'AMOUNT'
                ? 'neu-btn font-black text-emerald-600 bg-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <IndianRupee className="w-4 h-4" />
            <span>Select by Amount (₹)</span>
          </button>
        </div>

        {/* FIXED HEIGHT RESERVED SLOT FOR MULTI-BAG ALERT */}
        <div className="h-12 mb-3 flex items-center justify-center">
          {isMultiBag ? (
            <div className="w-full h-full bg-blue-50 text-blue-800 border border-blue-200 px-4 py-2 rounded-xl flex items-center gap-2.5 text-xs font-bold animate-fadeIn">
              <Layers className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Multi-Bag Required ({bagCount} Bags):</strong> Machine will dispense in {bagCount} sequential 5kg bags.
              </span>
            </div>
          ) : (
            <div className="text-[11px] font-semibold text-slate-500">
              Maximum single bag capacity: 5.0 {product.unit}
            </div>
          )}
        </div>

        {/* MODE 1: Preset Options */}
        {mode === 'WEIGHT' && (
          <>
            <div className="mb-4">
              <label className="block text-xs font-extrabold text-slate-500 mb-2 uppercase tracking-wide">
                Choose Preset Weight / Volume
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {standardPresets.map((presetVal) => {
                  const isDisabled = presetVal > maxStock;
                  const isSelected = quantity === presetVal;
                  return (
                    <button
                      key={presetVal}
                      disabled={isDisabled}
                      onClick={() => handlePresetSelect(presetVal)}
                      className={`py-3 px-1 rounded-xl text-center font-black transition text-xs flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-lg scale-105'
                          : isDisabled
                          ? 'opacity-40 cursor-not-allowed neu-input bg-[#e0e5ec] text-slate-400'
                          : 'neu-btn bg-[#e0e5ec] text-slate-700 hover:text-blue-600'
                      }`}
                    >
                      <span>{formatQuantityDisplay(presetVal)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stepper Increment/Decrement (+/- in 250g steps) */}
            <div className="mb-4 neu-input bg-[#e0e5ec] p-4 rounded-2xl flex items-center justify-between">
              <button
                onClick={() => handleStep(-1)}
                className="w-14 h-14 neu-btn bg-[#e0e5ec] rounded-xl flex items-center justify-center text-slate-700 active:scale-95 text-xl font-bold"
              >
                <Minus className="w-6 h-6" />
              </button>

              <div className="text-center">
                <div className="text-4xl font-black text-slate-800 tracking-tight">
                  {formatQuantityDisplay(quantity)}
                </div>
                <div className="text-xs font-bold text-slate-500 mt-1">
                  (Steps in 250 {isSolid ? 'g' : 'ml'} increments)
                </div>
              </div>

              <button
                onClick={() => handleStep(1)}
                className="w-14 h-14 neu-btn bg-[#e0e5ec] rounded-xl flex items-center justify-center text-slate-700 active:scale-95 text-xl font-bold"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </>
        )}

        {/* MODE 2: Select By Amount (₹) */}
        {mode === 'AMOUNT' && (
          <div className="mb-4 space-y-3">
            <div className="neu-input bg-[#e0e5ec] p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-2xl font-black text-emerald-600 font-mono">
                <span>₹</span>
                <span>{currencyAmount || '0'}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-bold block uppercase">Calculated Weight</span>
                <span className="text-2xl font-black text-slate-800">
                  {formatQuantityDisplay(quantity)}
                </span>
              </div>
            </div>

            {/* FIXED NUMPAD GRID ANCHOR */}
            <div className="grid grid-cols-3 gap-2">
              {['100', '200', '500', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => {
                    if (['100', '200', '500'].includes(btn)) {
                      const targetAmt = parseFloat(btn);
                      if (targetAmt > maxAllowedAmount) {
                        const cappedAmt = Math.floor(maxAllowedAmount);
                        setCurrencyAmount(cappedAmt.toString());
                        setQuantity(maxStock);
                      } else {
                        setCurrencyAmount(btn);
                        const rawQty = targetAmt / product.selling_price;
                        setQuantity(alignToStep(rawQty));
                      }
                    } else {
                      handleCurrencyNumpad(btn);
                    }
                  }}
                  className={`py-3 neu-btn bg-[#e0e5ec] rounded-xl font-extrabold text-sm active:scale-95 ${
                    ['100', '200', '500'].includes(btn)
                      ? 'bg-emerald-50 text-emerald-700 font-black'
                      : 'text-slate-700'
                  }`}
                >
                  {btn === 'BACK' ? '⌫' : btn === 'CLEAR' ? 'Clear' : ['100', '200', '500'].includes(btn) ? `₹${btn}` : btn}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Total Price & Confirm Action */}
        <div className="mt-auto pt-4 border-t border-slate-300 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-slate-500 block uppercase">Total Amount</span>
            <div className="text-3xl font-black text-emerald-600 font-mono">
              ₹{calculateTotalPrice()}
            </div>
          </div>

          <button
            onClick={() => onConfirm(product, quantity, parseFloat(calculateTotalPrice()))}
            className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold rounded-2xl text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transform active:scale-98 transition"
          >
            <span>Review Order ({formatQuantityDisplay(quantity)})</span>
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

      </div>
    </div>
  );
};
