'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { wsClient } from '@/lib/api';
import { useAuth } from './useAuth';

export interface WebSocketHookOptions {
  autoConnect?: boolean;
  reconnectOnAuthChange?: boolean;
}

export const useWebSocket = (options: WebSocketHookOptions = {}) => {
  const { autoConnect = true, reconnectOnAuthChange = true } = options;
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(async () => {
    if (isConnected) return;
    
    try {
      setConnectionError(null);
      await wsClient.connect();
      setIsConnected(true);
      reconnectAttempts.current = 0;
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setIsConnected(false);
      
      // Auto-reconnect with exponential backoff
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        setTimeout(() => {
          connect();
        }, delay);
      }
    }
  }, [isConnected]);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
    setIsConnected(false);
    setConnectionError(null);
    reconnectAttempts.current = 0;
  }, []);

  // Auto-connect when component mounts or authentication changes
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    if (autoConnect && isAuthenticated) {
      connect();
    } else if (!isAuthenticated && reconnectOnAuthChange) {
      disconnect();
    }

    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [autoConnect, isAuthenticated, reconnectOnAuthChange, connect, disconnect, isConnected]);

  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    wsClient.subscribe(eventType, callback);
    return () => wsClient.unsubscribe(eventType, callback);
  }, []);

  const send = useCallback((message: any) => {
    wsClient.send(message);
  }, []);

  const subscribeToEventUpdates = useCallback((eventId: string) => {
    wsClient.subscribeToEventUpdates(eventId);
  }, []);

  const unsubscribeFromEventUpdates = useCallback((eventId: string) => {
    wsClient.unsubscribeFromEventUpdates(eventId);
  }, []);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    subscribe,
    send,
    subscribeToEventUpdates,
    unsubscribeFromEventUpdates,
  };
};