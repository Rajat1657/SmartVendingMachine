import { getDb } from '../db/database.js';
import { simulatedMachine } from '../machine/SimulatedMachineController.js';

export async function getMachines(req, res) {
  try {
    const db = await getDb();
    const machines = await db.all('SELECT * FROM machines');
    const liveStatus = await simulatedMachine.getStatus();

    const result = machines.map(m => ({
      ...m,
      status: m.id === liveStatus.machineId ? liveStatus.status : m.status,
      current_operation: m.id === liveStatus.machineId ? liveStatus.currentOperation : m.current_operation,
      last_seen: m.id === liveStatus.machineId ? liveStatus.lastSeen : m.last_seen
    }));

    return res.json({ success: true, machines: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getMachineById(req, res) {
  try {
    const db = await getDb();
    const { id } = req.params;
    const machine = await db.get('SELECT * FROM machines WHERE id = ?', [id]);
    if (!machine) {
      return res.status(404).json({ success: false, error: 'Machine not found' });
    }
    const liveStatus = await simulatedMachine.getStatus();
    return res.json({
      success: true,
      machine: {
        ...machine,
        live: liveStatus
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function heartbeat(req, res) {
  try {
    const db = await getDb();
    const { id } = req.params;
    await db.run('UPDATE machines SET last_seen = CURRENT_TIMESTAMP, status = "ONLINE" WHERE id = ?', [id]);
    return res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function emergencyStop(req, res) {
  try {
    const db = await getDb();
    const result = await simulatedMachine.emergencyStop();

    await db.run(
      'UPDATE machines SET status = "ERROR", current_operation = "EMERGENCY_STOP", last_seen = CURRENT_TIMESTAMP WHERE id = "mach-001"'
    );

    const altId = `alt_${Date.now().toString(36)}`;
    await db.run(
      `INSERT INTO alerts (id, machine_id, type, message) VALUES (?, 'mach-001', 'HARDWARE_ERROR', 'EMERGENCY STOP manually triggered by user/admin')`,
      [altId]
    );

    if (req.io) {
      req.io.emit('emergency_stop_triggered', result);
    }

    return res.json({ success: true, message: 'Emergency stop executed immediately', result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function setSimulationMode(req, res) {
  try {
    const { mode } = req.body; // 'NORMAL', 'PARTIAL', 'MOTOR_JAM', 'HOPPER_EMPTY'
    if (!['NORMAL', 'PARTIAL', 'MOTOR_JAM', 'HOPPER_EMPTY'].includes(mode)) {
      return res.status(400).json({ success: false, error: 'Invalid simulation mode' });
    }
    simulatedMachine.setSimulationMode(mode);
    return res.json({ success: true, mode });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getAlerts(req, res) {
  try {
    const db = await getDb();
    const alerts = await db.all('SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50');
    return res.json({ success: true, alerts });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
