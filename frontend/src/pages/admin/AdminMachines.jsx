import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { usePWA } from '../../context/PWAContext';
import { Cpu, OctagonAlert, Sliders, CheckCircle2 } from 'lucide-react';

export const AdminMachines = () => {
  const { machineStatus, isConnected } = useSocket();
  const { guardOnlineAction, updateFetchTimestamp } = usePWA();
  const [machineDetails, setMachineDetails] = useState(null);
  const [simMode, setSimMode] = useState('NORMAL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMachineDetails();
  }, []);

  const fetchMachineDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/machines/mach-001');
      if (res.data.success) {
        setMachineDetails(res.data.machine);
      }
      updateFetchTimestamp();
    } catch (err) {
      console.error('Error fetching machine details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyStop = async () => {
    if (!window.confirm('Are you sure you want to trigger REMOTE EMERGENCY STOP on Machine #001?')) return;
    
    guardOnlineAction(async () => {
      try {
        await axios.post('/api/machines/emergency-stop');
        alert('Remote Emergency Stop Sent!');
        fetchMachineDetails();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to trigger emergency stop');
      }
    }, 'Emergency Stop Cutoff');
  };

  const handleSetSimMode = async (mode) => {
    guardOnlineAction(async () => {
      try {
        await axios.post('/api/machines/simulation-mode', { mode });
        setSimMode(mode);
      } catch (err) {
        console.error('Error setting simulation mode:', err);
      }
    }, 'Hardware Simulation Mode switch');
  };

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-800">Machine Telemetry & Hardware Control</h2>
        <p className="text-xs text-slate-500 font-semibold">Remote emergency stop, heartbeat & fault injection</p>
      </div>

      {/* Main Status Banner - Soft Card */}
      <div className="neu-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 neu-btn rounded-2xl flex items-center justify-center text-blue-600 font-black">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Smart Dispenser #001</h3>
              <span className="text-xs font-mono text-slate-500 font-bold">ID: mach-001 • Code: VM-001</span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className={`px-3 py-1 text-xs font-extrabold rounded-xl neu-badge uppercase tracking-wider ${
              isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
            }`}>
              {isConnected ? machineStatus.status || 'ONLINE' : 'OFFLINE'}
            </span>
            <span className="text-[10px] text-slate-500 font-bold mt-1">
              Heartbeat: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
          <div className="neu-input p-3 rounded-xl">
            <span className="text-slate-500 block text-[10px] uppercase font-extrabold">Current Operation</span>
            <span className="text-slate-800 font-black text-sm mt-0.5 block">
              {machineStatus.currentOperation || 'IDLE'}
            </span>
          </div>

          <div className="neu-input p-3 rounded-xl">
            <span className="text-slate-500 block text-[10px] uppercase font-extrabold">Total Machine Sales</span>
            <span className="text-emerald-600 font-mono font-black text-sm mt-0.5 block">
              ₹{(machineDetails?.total_revenue || 18450).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Emergency Stop Action Button */}
      <div className="neu-card p-5 bg-red-500/10 border-2 border-red-300 text-red-900 rounded-2xl flex items-center justify-between">
        <div>
          <h4 className="font-black text-red-700 text-sm flex items-center gap-2">
            <OctagonAlert className="w-5 h-5 text-red-600 animate-pulse" />
            <span>Remote Emergency Cutoff</span>
          </h4>
          <p className="text-xs font-bold text-red-800 mt-1">
            Immediately cuts motor power and halts any active dispensing operation.
          </p>
        </div>

        <button
          onClick={handleEmergencyStop}
          className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs shadow-lg active:scale-95 transition shrink-0 ml-3"
        >
          STOP NOW
        </button>
      </div>

      {/* Hardware Simulation Mode Testing */}
      <div className="neu-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-black text-slate-800">
          <Sliders className="w-4 h-4 text-blue-600" />
          <span>Hardware Fault Simulation Mode</span>
        </div>
        <p className="text-xs font-semibold text-slate-500">
          Inject hardware fault scenarios into the simulated machine controller to test app resiliency:
        </p>

        <div className="grid grid-cols-2 gap-2.5 pt-2">
          {[
            { id: 'NORMAL', label: 'Normal Operation', desc: 'Flawless 100% dispense' },
            { id: 'PARTIAL', label: 'Partial Dispense', desc: 'Simulate 80% weight cutoff' },
            { id: 'MOTOR_JAM', label: 'Motor Jam Fault', desc: 'Simulate motor stall error' },
            { id: 'HOPPER_EMPTY', label: 'Empty Hopper Sensor', desc: 'Simulate low material sensor' }
          ].map((m) => {
            const isSelected = simMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSetSimMode(m.id)}
                className={`p-3 rounded-xl text-left transition text-xs font-bold ${
                  isSelected
                    ? 'neu-btn-pressed text-blue-600 bg-blue-50/60 scale-105'
                    : 'neu-btn text-slate-700 hover:text-blue-600'
                }`}
              >
                <div className="font-extrabold flex items-center justify-between">
                  <span>{m.label}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-semibold">{m.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
