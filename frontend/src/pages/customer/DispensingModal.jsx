import React, { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { AlertTriangle, CheckCircle, OctagonAlert, Printer, RefreshCw, Layers, ArrowRight } from 'lucide-react';
import axios from 'axios';

export const DispensingModal = ({ transaction, onClose }) => {
  const { socket } = useSocket();
  const [progress, setProgress] = useState(0);
  const [currentDispensed, setCurrentDispensed] = useState(0);
  const [status, setStatus] = useState('DISPENSING'); // 'DISPENSING', 'BAG_SWITCH', 'COMPLETED', 'FAILED', 'PARTIAL'
  const [errorMsg, setErrorMsg] = useState('');
  const [stickerCode, setStickerCode] = useState(transaction.stickerCode);
  const [actualQty, setActualQty] = useState(transaction.targetQuantity);
  const [autoCloseTimer, setAutoCloseTimer] = useState(20);

  // Multi-Bag States
  const totalBags = transaction.totalBags || Math.ceil(transaction.targetQuantity / 5.0);
  const [currentBagIndex, setCurrentBagIndex] = useState(1);
  const [bagSwitchMsg, setBagSwitchMsg] = useState('');
  const [completedBags, setCompletedBags] = useState(transaction.bagsList || []);

  useEffect(() => {
    if (!socket) return;

    const handleProgress = (data) => {
      if (data.transactionId === transaction.transactionId) {
        setProgress(data.percentage);
        setCurrentDispensed(data.currentDispensed);
        if (data.currentBagIndex) setCurrentBagIndex(data.currentBagIndex);
      }
    };

    const handleBagChangePrompt = (data) => {
      if (data.transactionId === transaction.transactionId) {
        setStatus('BAG_SWITCH');
        setBagSwitchMsg(data.message || `Bag ${data.bagIndex - 1} Complete! Please place Bag ${data.bagIndex} under nozzle.`);
        setCurrentBagIndex(data.bagIndex);
      }
    };

    const handleComplete = (data) => {
      if (data.transactionId === transaction.transactionId) {
        setProgress(100);
        setActualQty(data.actualDispensedQuantity);
        if (data.bagsList) setCompletedBags(data.bagsList);
        if (data.isPartial) {
          setStatus('PARTIAL');
        } else {
          setStatus('COMPLETED');
        }
        if (data.stickerCode) setStickerCode(data.stickerCode);
      }
    };

    const handleFailed = (data) => {
      if (data.transactionId === transaction.transactionId) {
        setStatus('FAILED');
        setErrorMsg(data.reason || 'Hardware error during dispensing');
      }
    };

    const handleEmergency = (data) => {
      setStatus('FAILED');
      setErrorMsg('EMERGENCY STOP TRIGGERED!');
    };

    socket.on('dispense_progress', handleProgress);
    socket.on('bag_change_prompt', handleBagChangePrompt);
    socket.on('dispense_complete', handleComplete);
    socket.on('dispense_failed', handleFailed);
    socket.on('emergency_stop', handleEmergency);

    return () => {
      socket.off('dispense_progress', handleProgress);
      socket.off('bag_change_prompt', handleBagChangePrompt);
      socket.off('dispense_complete', handleComplete);
      socket.off('dispense_failed', handleFailed);
      socket.off('emergency_stop', handleEmergency);
    };
  }, [socket, transaction]);

  // Auto close timer upon completion
  useEffect(() => {
    if (status === 'COMPLETED' || status === 'PARTIAL' || status === 'FAILED') {
      const interval = setInterval(() => {
        setAutoCloseTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [status, onClose]);

  const handleEmergencyStop = async () => {
    try {
      await axios.post('/api/machines/emergency-stop');
    } catch (err) {
      console.error('Emergency stop error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl neu-card bg-[#e0e5ec] p-6 md:p-8 flex flex-col items-center text-center relative overflow-hidden max-h-[95vh] overflow-y-auto border border-white/80 shadow-2xl rounded-3xl">

        {/* Emergency Stop Button top right */}
        {status === 'DISPENSING' && (
          <button
            onClick={handleEmergencyStop}
            className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition transform active:scale-95 text-xs"
          >
            <OctagonAlert className="w-4 h-4 animate-pulse" />
            <span>EMERGENCY STOP</span>
          </button>
        )}

        {status === 'DISPENSING' && (
          <>
            <div className="w-20 h-20 rounded-full neu-btn flex items-center justify-center mb-4 text-blue-600 animate-spin">
              <RefreshCw className="w-10 h-10" />
            </div>

            <h2 className="text-3xl font-extrabold text-slate-800 mb-1">
              Dispensing {transaction.productName}
            </h2>

            {/* Multi-Bag Step Header */}
            {totalBags > 1 && (
              <div className="px-4 py-1.5 bg-blue-100 text-blue-800 font-extrabold text-xs rounded-xl neu-badge mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>DISPENSING BAG {currentBagIndex} OF {totalBags} (5kg Max / Bag)</span>
              </div>
            )}

            {/* Circular Progress / Live Weight Display */}
            <div className="w-full max-w-md neu-input p-6 mb-6 flex flex-col items-center justify-center">
              <div className="text-5xl font-black text-blue-600 tracking-tight font-mono mb-2">
                {currentDispensed.toFixed(2)} <span className="text-2xl text-slate-600 font-sans">{transaction.unit}</span>
              </div>
              <div className="text-xs font-semibold text-slate-500 mb-4">
                Total Target: {transaction.targetQuantity} {transaction.unit}
              </div>

              {/* Progress bar */}
              <div className="w-full h-4 bg-slate-300 rounded-full overflow-hidden p-0.5 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-right w-full text-xs font-bold text-slate-600 mt-2">
                {progress}% Complete
              </div>
            </div>

            <p className="text-xs text-slate-500 italic animate-pulse">
              Please hold your bag under the dispensing nozzle...
            </p>
          </>
        )}

        {/* Multi-Bag Switch Prompt */}
        {status === 'BAG_SWITCH' && (
          <div className="py-6 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 neu-badge flex items-center justify-center mb-4 animate-bounce">
              <Layers className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">
              Bag {currentBagIndex - 1} Filled!
            </h2>
            <p className="text-base font-bold text-amber-800 bg-amber-50 p-4 rounded-2xl border border-amber-200 mb-6 max-w-md">
              {bagSwitchMsg || `Please remove Bag ${currentBagIndex - 1} and place Bag ${currentBagIndex} under the nozzle.`}
            </p>
            <div className="text-xs text-slate-500 font-semibold animate-pulse">
              Machine will automatically resume dispensing Bag {currentBagIndex} of {totalBags}...
            </div>
          </div>
        )}

        {(status === 'COMPLETED' || status === 'PARTIAL') && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-100 neu-badge flex items-center justify-center mb-4 text-emerald-600">
              <CheckCircle className="w-12 h-12" />
            </div>

            <h2 className="text-3xl font-black text-slate-800 mb-1">
              {status === 'PARTIAL' ? 'Partially Dispensed' : 'Dispensing Complete!'}
            </h2>
            <p className="text-slate-600 font-medium mb-4 text-sm">
              Please collect your filled bag(s) and proceed to the shop counter for payment.
            </p>

            {/* Generated Counter Bag Stickers List */}
            <div className="w-full max-w-md space-y-3 mb-6">
              {completedBags.length > 0 ? (
                completedBags.map((bag, bIdx) => (
                  <div key={bIdx} className="bg-white border-2 border-dashed border-slate-400 rounded-2xl p-4 text-left font-mono shadow-inner">
                    <div className="flex items-center justify-between border-b pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Printer className="w-4 h-4 text-slate-700" />
                        <span className="font-bold text-slate-800 text-xs">
                          STICKER TAG ({bIdx + 1}/{completedBags.length})
                        </span>
                      </div>
                      <span className="text-[10px] bg-slate-100 font-semibold px-2 py-0.5 rounded text-slate-600">
                        Bag Weight: {bag.capacity} {transaction.unit}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs text-slate-800 mb-2 font-sans">
                      <span>Item: <strong>{transaction.productName}</strong></span>
                      <span className="font-black text-emerald-600 font-mono">
                        ₹{(bag.capacity * (transaction.totalRevenue / transaction.targetQuantity)).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
                      <span className="text-xs font-bold tracking-widest text-slate-700">
                        *{bag.stickerCode}*
                      </span>
                      <span className="text-[10px] text-slate-400">Scan at Checkout</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white border-2 border-dashed border-slate-400 rounded-2xl p-4 text-left font-mono">
                  <div className="flex justify-between text-xs mb-2">
                    <span>STICKER CODE:</span>
                    <span className="font-bold">{stickerCode}</span>
                  </div>
                  <div className="text-lg font-black text-emerald-600">
                    Amount Payable: ₹{transaction.totalRevenue}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 neu-btn rounded-2xl text-blue-600 font-extrabold text-lg flex items-center justify-center gap-2 hover:bg-blue-50 transition"
            >
              <span>Done & Return to Main Screen</span>
              <span className="text-xs font-normal text-slate-400">({autoCloseTimer}s)</span>
            </button>
          </>
        )}

        {status === 'FAILED' && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 neu-badge flex items-center justify-center mb-4 text-red-600">
              <AlertTriangle className="w-12 h-12" />
            </div>

            <h2 className="text-3xl font-black text-slate-800 mb-2">Dispensing Could Not Be Completed</h2>
            <p className="text-slate-600 mb-4 max-w-md text-sm">
              {errorMsg || 'A hardware issue occurred. Please alert the shop owner.'}
            </p>

            <div className="w-full bg-red-50 text-red-700 p-4 rounded-xl text-xs font-semibold mb-6 border border-red-200">
              No payment is required. Please check with counter staff.
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 neu-btn rounded-2xl text-slate-800 font-extrabold text-lg hover:bg-slate-200 transition"
            >
              Return to Home Screen ({autoCloseTimer}s)
            </button>
          </>
        )}

      </div>
    </div>
  );
};
