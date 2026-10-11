export class MachineControllerInterface {
  async connect() {
    throw new Error('Method connect() must be implemented');
  }

  async disconnect() {
    throw new Error('Method disconnect() must be implemented');
  }

  async getStatus() {
    throw new Error('Method getStatus() must be implemented');
  }

  async dispense(transactionId, product, targetQuantity) {
    throw new Error('Method dispense() must be implemented');
  }

  async stop() {
    throw new Error('Method stop() must be implemented');
  }

  async emergencyStop() {
    throw new Error('Method emergencyStop() must be implemented');
  }
}
