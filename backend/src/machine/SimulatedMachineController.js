import { EventEmitter } from 'events';
import { MachineControllerInterface } from './MachineControllerInterface.js';

export class SimulatedMachineController extends MachineControllerInterface {
  constructor(machineId = 'mach-001') {
    super();
    this.machineId = machineId;
    this.status = 'ONLINE';
    this.currentOperation = 'IDLE';
    this.activeDispensing = null;
    this.emitter = new EventEmitter();
    this.heartbeatTimer = null;
    this.dispenseInterval = null;
    this.simulationMode = 'NORMAL'; // 'NORMAL', 'PARTIAL', 'MOTOR_JAM', 'HOPPER_EMPTY'
    this.io = null;
  }

  setSocketIo(io) {
    this.io = io;
  }

  async connect() {
    this.status = 'ONLINE';
    this.startHeartbeat();
    console.log(`[Machine ${this.machineId}] Connected and heartbeat started.`);
    return true;
  }

  async disconnect() {
    this.status = 'OFFLINE';
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    console.log(`[Machine ${this.machineId}] Disconnected.`);
    return true;
  }

  async getStatus() {
    return {
      machineId: this.machineId,
      status: this.status,
      currentOperation: this.currentOperation,
      activeDispensing: this.activeDispensing,
      lastSeen: new Date().toISOString()
    };
  }

  setSimulationMode(mode) {
    this.simulationMode = mode;
    console.log(`[Machine ${this.machineId}] Simulation mode set to ${mode}`);
  }

  startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      const payload = {
        machineId: this.machineId,
        status: this.status,
        currentOperation: this.currentOperation,
        timestamp: new Date().toISOString()
      };
      if (this.io) {
        this.io.emit('machine_heartbeat', payload);
      }
      this.emitter.emit('heartbeat', payload);
    }, 5000);
  }

  async dispense(transactionId, product, targetQuantity, mainStickerCode, bagsList = []) {
    if (this.status === 'OFFLINE') {
      throw new Error('Machine is currently offline');
    }
    if (this.status === 'DISPENSING' || this.currentOperation === 'DISPENSING') {
      throw new Error('Machine is currently busy dispensing another order');
    }

    this.status = 'DISPENSING';
    this.currentOperation = `Dispensing ${product.name}`;

    const totalBagsCount = bagsList.length || 1;

    this.activeDispensing = {
      transactionId,
      productId: product.id,
      productName: product.name,
      productType: product.type,
      unit: product.unit,
      targetQuantity,
      currentDispensed: 0,
      percentage: 0,
      startTime: Date.now(),
      stickerCode: mainStickerCode,
      totalBags: totalBagsCount,
      currentBagIndex: 1,
      bagsList
    };

    const startPayload = {
      machineId: this.machineId,
      ...this.activeDispensing,
      status: 'DISPENSING'
    };

    if (this.io) this.io.emit('dispense_start', startPayload);
    this.emitter.emit('dispense_start', startPayload);

    // Multi-bag step execution loop
    let totalDispensedSoFar = 0;

    for (let bagIdx = 0; bagIdx < totalBagsCount; bagIdx++) {
      const currentBagObj = bagsList[bagIdx] || { capacity: targetQuantity };
      const bagTargetWeight = currentBagObj.capacity;

      const stepIncrement = product.type === 'LIQUID' ? 0.10 : 0.12;
      const stepsInThisBag = Math.max(4, Math.ceil(bagTargetWeight / stepIncrement));

      this.activeDispensing.currentBagIndex = bagIdx + 1;

      // Broadcast Bag Change Notification if multi-bag
      if (bagIdx > 0) {
        const bagSwitchPayload = {
          machineId: this.machineId,
          transactionId,
          bagIndex: bagIdx + 1,
          totalBags: totalBagsCount,
          currentBagTarget: bagTargetWeight,
          unit: product.unit,
          message: `Bag ${bagIdx} complete! Please place Bag ${bagIdx + 1} under nozzle.`
        };
        if (this.io) this.io.emit('bag_change_prompt', bagSwitchPayload);
        this.emitter.emit('bag_change_prompt', bagSwitchPayload);

        // Pause 3 seconds for bag switch simulation
        await new Promise(r => setTimeout(r, 2500));
      }

      let bagDispensed = 0;

      await new Promise((resolve, reject) => {
        let stepCount = 0;
        this.dispenseInterval = setInterval(() => {
          stepCount++;

          if (this.simulationMode === 'MOTOR_JAM' && stepCount === 3 && bagIdx === 0) {
            clearInterval(this.dispenseInterval);
            this.status = 'ERROR';
            this.currentOperation = 'ERROR: Motor Jammed';
            const failPayload = {
              machineId: this.machineId,
              transactionId,
              reason: 'Hardware motor jamming error detected on dispensing valve',
              targetQuantity,
              actualDispensedQuantity: parseFloat(totalDispensedSoFar.toFixed(2))
            };
            this.activeDispensing = null;
            if (this.io) this.io.emit('dispense_failed', failPayload);
            this.emitter.emit('dispense_failed', failPayload);
            reject(failPayload);
            return;
          }

          let isLastBagStep = stepCount >= stepsInThisBag;
          let stepValue = Math.min(bagTargetWeight, parseFloat((stepCount * stepIncrement).toFixed(2)));

          if (this.simulationMode === 'PARTIAL' && isLastBagStep && bagIdx === totalBagsCount - 1) {
            stepValue = parseFloat((bagTargetWeight * 0.8).toFixed(2));
          }

          bagDispensed = stepValue;
          const currentTotalDispensed = parseFloat((totalDispensedSoFar + bagDispensed).toFixed(2));
          const overallPercentage = Math.min(100, Math.round((currentTotalDispensed / targetQuantity) * 100));

          this.activeDispensing.currentDispensed = currentTotalDispensed;
          this.activeDispensing.percentage = overallPercentage;

          const progressPayload = {
            machineId: this.machineId,
            transactionId,
            productName: product.name,
            unit: product.unit,
            targetQuantity,
            currentDispensed: currentTotalDispensed,
            percentage: overallPercentage,
            currentBagIndex: bagIdx + 1,
            totalBags: totalBagsCount,
            currentBagDispensed: bagDispensed,
            currentBagTarget: bagTargetWeight,
            flowRate: product.type === 'LIQUID' ? '0.25 L/s' : '0.30 kg/s'
          };

          if (this.io) this.io.emit('dispense_progress', progressPayload);
          this.emitter.emit('dispense_progress', progressPayload);

          if (isLastBagStep) {
            clearInterval(this.dispenseInterval);
            totalDispensedSoFar += bagDispensed;
            resolve();
          }
        }, 300);
      }).catch(err => {
        return err; // Handled rejection
      });

      if (this.status === 'ERROR') {
        return {
          success: false,
          actualDispensedQuantity: totalDispensedSoFar,
          shortfall: targetQuantity - totalDispensedSoFar,
          reason: 'Hardware motor jamming error'
        };
      }
    }

    // All bags dispensed successfully
    this.status = 'ONLINE';
    this.currentOperation = 'IDLE';

    const finalActual = parseFloat(totalDispensedSoFar.toFixed(2));
    const shortfall = parseFloat(Math.max(0, targetQuantity - finalActual).toFixed(2));
    const isPartial = shortfall > 0.001;

    const completePayload = {
      success: true,
      machineId: this.machineId,
      transactionId,
      productName: product.name,
      targetQuantity,
      actualDispensedQuantity: finalActual,
      shortfall,
      isPartial,
      totalBags: totalBagsCount,
      bagsList,
      stickerCode: mainStickerCode,
      status: isPartial ? 'PARTIALLY_DISPENSED' : 'COMPLETED'
    };

    this.activeDispensing = null;
    if (this.io) this.io.emit('dispense_complete', completePayload);
    this.emitter.emit('dispense_complete', completePayload);
    return completePayload;
  }

  async stop() {
    if (this.dispenseInterval) {
      clearInterval(this.dispenseInterval);
      this.dispenseInterval = null;
    }
    this.status = 'ONLINE';
    this.currentOperation = 'IDLE';
    this.activeDispensing = null;
    return true;
  }

  async emergencyStop() {
    if (this.dispenseInterval) {
      clearInterval(this.dispenseInterval);
      this.dispenseInterval = null;
    }
    this.status = 'ERROR';
    this.currentOperation = 'EMERGENCY_STOP';

    const lastState = this.activeDispensing;
    this.activeDispensing = null;

    const stopPayload = {
      machineId: this.machineId,
      reason: 'EMERGENCY STOP TRIGGERED BY USER OR REMOTE ADMIN',
      lastState,
      timestamp: new Date().toISOString()
    };

    if (this.io) this.io.emit('emergency_stop', stopPayload);
    this.emitter.emit('emergency_stop', stopPayload);
    return stopPayload;
  }
}

export const simulatedMachine = new SimulatedMachineController();
