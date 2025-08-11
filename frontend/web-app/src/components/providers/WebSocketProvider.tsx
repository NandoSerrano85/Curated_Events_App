'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { WebSocketClient } from '../../shared/api/websocket';
import { useAuthStore } from '../../shared/store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { eventKeys } from '../../shared/hooks/useEvents';

interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  sendMessage: (message: any) => void;
  lastMessage: any;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);
  
  const wsClient = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize WebSocket client
      wsClient.current = new WebSocketClient();
      
      // Set up event handlers
      wsClient.current.on('connect', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
      });

      wsClient.current.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setConnectionStatus('disconnected');
      });

      wsClient.current.on('error', (error: any) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      });

      // Handle real-time event updates
      wsClient.current.on('event_updated', (data: any) => {
        console.log('Event updated:', data);
        setLastMessage({ type: 'event_updated', data });
        
        // Invalidate and refetch event details
        if (data.eventId) {
          queryClient.invalidateQueries({ queryKey: eventKeys.detail(data.eventId) });
        }
        
        // Invalidate events lists to ensure consistency
        queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      });

      // Handle new registrations
      wsClient.current.on('event_registration', (data: any) => {
        console.log('New registration:', data);
        setLastMessage({ type: 'event_registration', data });
        
        if (data.eventId) {
          queryClient.invalidateQueries({ queryKey: eventKeys.detail(data.eventId) });
        }
      });

      // Handle event cancellations
      wsClient.current.on('event_cancelled', (data: any) => {
        console.log('Event cancelled:', data);
        setLastMessage({ type: 'event_cancelled', data });
        
        if (data.eventId) {
          queryClient.invalidateQueries({ queryKey: eventKeys.detail(data.eventId) });
          queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
        }
      });

      // Handle new events
      wsClient.current.on('event_created', (data: any) => {
        console.log('New event created:', data);
        setLastMessage({ type: 'event_created', data });
        
        // Invalidate events lists to show new event
        queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      });

      // Handle user notifications
      wsClient.current.on('user_notification', (data: any) => {
        console.log('User notification:', data);
        setLastMessage({ type: 'user_notification', data });
        
        // Show notification to user (this would trigger a toast/notification component)
        if (data.message) {
          // Add to notifications state or show toast
          console.log('Notification:', data.message);
        }
      });

      // Handle live event updates (like comments, reactions)
      wsClient.current.on('live_update', (data: any) => {
        console.log('Live update:', data);
        setLastMessage({ type: 'live_update', data });
      });

      // Connect to WebSocket
      setConnectionStatus('connecting');
      wsClient.current.connect().catch((error) => {
        console.error('Failed to connect to WebSocket:', error);
        setConnectionStatus('error');
      });

      // Join user-specific room for personalized updates
      if (user.id) {
        wsClient.current.emit('join_user_room', { userId: user.id });
      }

    } else {
      // Cleanup WebSocket when user is not authenticated
      if (wsClient.current) {
        wsClient.current.disconnect();
        wsClient.current = null;
        setIsConnected(false);
        setConnectionStatus('disconnected');
      }
    }

    // Cleanup function
    return () => {
      if (wsClient.current) {
        wsClient.current.disconnect();
        wsClient.current = null;
      }
    };
  }, [isAuthenticated, user, queryClient]);

  const sendMessage = (message: any) => {
    if (wsClient.current && isConnected) {
      wsClient.current.emit(message.type, message.data);
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  };

  const value: WebSocketContextType = {
    isConnected,
    connectionStatus,
    sendMessage,
    lastMessage,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};