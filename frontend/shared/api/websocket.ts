import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { WebSocketMessage, RealTimeUpdate } from '../types';

// WebSocket configuration - Support multiple environments
const getEnvVar = (name: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[name];
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }
  return undefined;
};

const WS_BASE_URL = getEnvVar('VITE_WS_URL') || 
                   getEnvVar('NEXT_PUBLIC_WS_URL') || 
                   getEnvVar('REACT_APP_WS_URL') || 
                   'ws://localhost:8085';
const RECONNECTION_DELAY = 1000;
const MAX_RECONNECTION_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectionAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private isConnecting = false;

  constructor() {
    this.setupAuthStateListener();
  }

  // Setup listener for authentication state changes
  private setupAuthStateListener() {
    useAuthStore.subscribe((state) => {
      if (state.isAuthenticated && state.user && !this.socket?.connected) {
        this.connect();
      } else if (!state.isAuthenticated && this.socket?.connected) {
        this.disconnect();
      }
    });
  }

  // Connect to WebSocket server
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || this.socket?.connected) {
        resolve();
        return;
      }

      this.isConnecting = true;
      const { tokens, user } = useAuthStore.getState();

      if (!tokens?.accessToken || !user) {
        this.isConnecting = false;
        reject(new Error('Not authenticated'));
        return;
      }

      try {
        this.socket = io(WS_BASE_URL, {
          auth: {
            token: tokens.accessToken,
            userId: user.id,
          },
          transports: ['websocket'],
          timeout: 20000,
          reconnection: true,
          reconnectionDelay: RECONNECTION_DELAY,
          reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
        });

        this.setupEventListeners();
        
        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectionAttempts = 0;
          this.startHeartbeat();
          
          // Join user-specific room
          this.joinRoom(`user:${user.id}`);
          
          useAppStore.getState().addNotification({
            type: 'success',
            title: 'Connected',
            message: 'Real-time updates are now active.',
          });
          
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.isConnecting = false;
          this.reconnectionAttempts++;
          
          if (this.reconnectionAttempts >= MAX_RECONNECTION_ATTEMPTS) {
            useAppStore.getState().addNotification({
              type: 'error',
              title: 'Connection Failed',
              message: 'Unable to establish real-time connection.',
            });
            reject(error);
          }
        });

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  // Disconnect from WebSocket server
  public disconnect(): void {
    if (this.socket) {
      this.stopHeartbeat();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectionAttempts = 0;
  }

  // Setup event listeners
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Handle disconnection
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.stopHeartbeat();
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.connect();
      }
    });

    // Handle authentication errors
    this.socket.on('auth_error', (error) => {
      console.error('WebSocket auth error:', error);
      useAuthStore.getState().logout();
    });

    // Handle generic messages
    this.socket.on('message', (message: WebSocketMessage) => {
      this.handleMessage(message);
    });

    // Handle real-time updates
    this.socket.on('real_time_update', (update: RealTimeUpdate) => {
      this.handleRealTimeUpdate(update);
    });

    // Handle event-specific updates
    this.socket.on('event_created', (data) => {
      this.emit('event_created', data);
    });

    this.socket.on('event_updated', (data) => {
      this.emit('event_updated', data);
    });

    this.socket.on('event_registration', (data) => {
      this.emit('event_registration', data);
    });

    this.socket.on('user_activity', (data) => {
      this.emit('user_activity', data);
    });

    this.socket.on('notification', (data) => {
      useAppStore.getState().addNotification({
        type: data.type || 'info',
        title: data.title || 'Notification',
        message: data.message,
      });
    });
  }

  // Handle generic WebSocket messages
  private handleMessage(message: WebSocketMessage): void {
    console.log('WebSocket message received:', message);
    this.emit('message', message);
  }

  // Handle real-time updates
  private handleRealTimeUpdate(update: RealTimeUpdate): void {
    console.log('Real-time update received:', update);
    
    // Invalidate relevant queries in React Query
    const { invalidateQueries } = useAppStore.getState();
    
    switch (update.type) {
      case 'event_created':
      case 'event_updated':
        // Invalidate events queries
        break;
      case 'registration_update':
        // Invalidate registration queries
        break;
      case 'user_activity':
        // Handle user activity updates
        break;
    }
    
    this.emit(update.type, update.data);
  }

  // Join a room for targeted updates
  public joinRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join_room', room);
      console.log(`Joined room: ${room}`);
    }
  }

  // Leave a room
  public leaveRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_room', room);
      console.log(`Left room: ${room}`);
    }
  }

  // Send a message through WebSocket
  public send(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, unable to send message');
    }
  }

  // Add event listener
  public on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  // Remove event listener
  public off(event: string, handler: (data: any) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Emit event to all registered handlers
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  // Start heartbeat to keep connection alive
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat', { timestamp: Date.now() });
      }
    }, HEARTBEAT_INTERVAL);
  }

  // Stop heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Get connection status
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get socket ID
  public getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Create singleton instance
export const wsClient = new WebSocketClient();

// React hook for using WebSocket
export const useWebSocket = () => {
  return {
    client: wsClient,
    isConnected: wsClient.isConnected(),
    socketId: wsClient.getSocketId(),
    connect: () => wsClient.connect(),
    disconnect: () => wsClient.disconnect(),
    send: (event: string, data: any) => wsClient.send(event, data),
    joinRoom: (room: string) => wsClient.joinRoom(room),
    leaveRoom: (room: string) => wsClient.leaveRoom(room),
  };
};