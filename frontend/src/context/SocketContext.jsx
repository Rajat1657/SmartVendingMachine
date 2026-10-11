import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [machineStatus, setMachineStatus] = useState({ status: 'ONLINE', currentOperation: 'IDLE' });

  useEffect(() => {
    const socketInstance = io(window.location.origin, {
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socketInstance.on('connect', () => {
      console.log('[WS] Connected to backend telemetry server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('[WS] Disconnected from backend telemetry server');
      setIsConnected(false);
    });

    socketInstance.on('machine_status_update', (data) => {
      setMachineStatus(data);
    });

    socketInstance.on('machine_heartbeat', (data) => {
      setMachineStatus(prev => ({ ...prev, ...data }));
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, machineStatus }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
