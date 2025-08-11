'use client';

import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../providers/WebSocketProvider';

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  action?: {
    label: string;
    href: string;
  };
}

export const NotificationSystem: React.FC = () => {
  const { lastMessage, isConnected } = useWebSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (lastMessage) {
      let notification: Notification | null = null;

      switch (lastMessage.type) {
        case 'event_registration':
          notification = {
            id: `reg-${Date.now()}`,
            type: 'success',
            title: 'Registration Confirmed',
            message: `Someone registered for "${lastMessage.data.eventTitle}"`,
            timestamp: new Date(),
            action: {
              label: 'View Event',
              href: `/events/${lastMessage.data.eventId}`
            }
          };
          break;

        case 'event_updated':
          notification = {
            id: `upd-${Date.now()}`,
            type: 'info',
            title: 'Event Updated',
            message: `"${lastMessage.data.eventTitle}" has been updated`,
            timestamp: new Date(),
            action: {
              label: 'View Changes',
              href: `/events/${lastMessage.data.eventId}`
            }
          };
          break;

        case 'event_cancelled':
          notification = {
            id: `canc-${Date.now()}`,
            type: 'warning',
            title: 'Event Cancelled',
            message: `"${lastMessage.data.eventTitle}" has been cancelled`,
            timestamp: new Date(),
            action: {
              label: 'View Details',
              href: `/events/${lastMessage.data.eventId}`
            }
          };
          break;

        case 'event_created':
          notification = {
            id: `new-${Date.now()}`,
            type: 'info',
            title: 'New Event Available',
            message: `"${lastMessage.data.eventTitle}" is now available`,
            timestamp: new Date(),
            action: {
              label: 'View Event',
              href: `/events/${lastMessage.data.eventId}`
            }
          };
          break;

        case 'user_notification':
          notification = {
            id: `notif-${Date.now()}`,
            type: lastMessage.data.type || 'info',
            title: lastMessage.data.title || 'Notification',
            message: lastMessage.data.message,
            timestamp: new Date(),
            action: lastMessage.data.action
          };
          break;

        case 'live_update':
          // Handle live updates (comments, reactions, etc.)
          notification = {
            id: `live-${Date.now()}`,
            type: 'info',
            title: 'Live Update',
            message: lastMessage.data.message || 'New activity on an event you\'re following',
            timestamp: new Date(),
          };
          break;
      }

      if (notification) {
        setNotifications(prev => [notification!, ...prev.slice(0, 4)]); // Keep only 5 most recent

        // Auto-remove notification after 5 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notification!.id));
        }, 5000);
      }
    }
  }, [lastMessage]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getNotificationColors = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-neutral-50 border-neutral-200 text-neutral-800';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-24 right-4 z-50 space-y-2 max-w-sm">
      {/* Connection Status Indicator */}
      <div className={`mb-2 px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-2 ${
        isConnected 
          ? 'bg-green-100 text-green-700' 
          : 'bg-red-100 text-red-700'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <span>{isConnected ? 'Live updates active' : 'Live updates disconnected'}</span>
      </div>

      {/* Notifications */}
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`glass rounded-2xl border p-4 shadow-lg animate-slide-up ${getNotificationColors(notification.type)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <span className="text-lg">{getNotificationIcon(notification.type)}</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold mb-1">{notification.title}</h4>
                <p className="text-sm opacity-90 leading-relaxed">{notification.message}</p>
                <p className="text-xs opacity-70 mt-2">
                  {notification.timestamp.toLocaleTimeString()}
                </p>
                {notification.action && (
                  <a
                    href={notification.action.href}
                    className="inline-block mt-2 text-xs font-medium underline hover:no-underline"
                  >
                    {notification.action.label}
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-sm opacity-60 hover:opacity-100 transition-opacity duration-200 ml-2"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};