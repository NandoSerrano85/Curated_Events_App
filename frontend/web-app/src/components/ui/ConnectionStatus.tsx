'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';

export const ConnectionStatus: React.FC = () => {
  const { isConnected, connectionError } = useWebSocket({ autoConnect: false });

  if (!isConnected && !connectionError) {
    // Not connected but no error (probably not attempting to connect)
    return null;
  }

  const getStatusInfo = () => {
    if (isConnected) {
      return {
        icon: <Wifi className="h-3 w-3" />,
        text: 'Live',
        variant: 'default' as const,
        tooltip: 'Connected to live updates',
        className: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
      };
    } else if (connectionError) {
      return {
        icon: <AlertCircle className="h-3 w-3" />,
        text: 'Reconnecting...',
        variant: 'secondary' as const,
        tooltip: `Connection error: ${connectionError}`,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      };
    } else {
      return {
        icon: <WifiOff className="h-3 w-3" />,
        text: 'Offline',
        variant: 'outline' as const,
        tooltip: 'Not connected to live updates',
        className: 'bg-gray-100 text-gray-600 border-gray-300',
      };
    }
  };

  const status = getStatusInfo();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant={status.variant} 
          className={`text-xs gap-1 ${status.className}`}
        >
          {status.icon}
          {status.text}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{status.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
};