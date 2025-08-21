import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../lib/logger';

interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  lastConnected: number | null;
  reconnectAttempts: number;
  error: string | null;
}

interface RealtimeMessage {
  type: string;
  data: any;
  timestamp: number;
}

type MessageHandler = (message: RealtimeMessage) => void;

export function useRealtimeConnection(url: string, screenId?: string) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isReconnecting: false,
    lastConnected: null,
    reconnectAttempts: 0,
    error: null
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const messageHandlersRef = useRef<Map<string, MessageHandler[]>>(new Map());
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionState(prev => ({ ...prev, isReconnecting: true, error: null }));
      
      const wsUrl = screenId ? `${url}?screenId=${screenId}` : url;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        logger.info('WebSocket connected');
        setConnectionState(prev => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
          lastConnected: Date.now(),
          reconnectAttempts: 0,
          error: null
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: RealtimeMessage = JSON.parse(event.data);
          const handlers = messageHandlersRef.current.get(message.type) || [];
          handlers.forEach(handler => handler(message));
        } catch (error) {
          logger.error('Error parsing WebSocket message', error);
        }
      };

      wsRef.current.onclose = (event) => {
        logger.warn('WebSocket disconnected', { code: event.code, reason: event.reason });
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          isReconnecting: false
        }));

        // Auto-reconnect
        if (event.code !== 1000) { // Not a normal closure
          scheduleReconnect();
        }
      };

      wsRef.current.onerror = (error) => {
        logger.error('WebSocket error', error);
        setConnectionState(prev => ({
          ...prev,
          error: 'Error de conexión WebSocket',
          isReconnecting: false
        }));
      };
    } catch (error) {
      logger.error('Error creating WebSocket connection', error);
      setConnectionState(prev => ({
        ...prev,
        error: 'Error al crear conexión WebSocket',
        isReconnecting: false
      }));
    }
  }, [url, screenId]);

  const scheduleReconnect = useCallback(() => {
    setConnectionState(prev => {
      if (prev.reconnectAttempts >= maxReconnectAttempts) {
        return {
          ...prev,
          error: 'Máximo número de intentos de reconexión alcanzado',
          isReconnecting: false
        };
      }

      const newAttempts = prev.reconnectAttempts + 1;
      logger.info(`Scheduling reconnect attempt ${newAttempts}/${maxReconnectAttempts}`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectDelay * newAttempts);

      return {
        ...prev,
        reconnectAttempts: newAttempts,
        isReconnecting: true
      };
    });
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setConnectionState({
      isConnected: false,
      isReconnecting: false,
      lastConnected: null,
      reconnectAttempts: 0,
      error: null
    });
  }, []);

  const sendMessage = useCallback((type: string, data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: RealtimeMessage = {
        type,
        data,
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(message));
      logger.debug(`Sent WebSocket message: ${type}`);
    } else {
      logger.warn('Cannot send message: WebSocket not connected');
    }
  }, []);

  const subscribe = useCallback((messageType: string, handler: MessageHandler) => {
    const handlers = messageHandlersRef.current.get(messageType) || [];
    handlers.push(handler);
    messageHandlersRef.current.set(messageType, handlers);

    // Return unsubscribe function
    return () => {
      const currentHandlers = messageHandlersRef.current.get(messageType) || [];
      const filteredHandlers = currentHandlers.filter(h => h !== handler);
      if (filteredHandlers.length === 0) {
        messageHandlersRef.current.delete(messageType);
      } else {
        messageHandlersRef.current.set(messageType, filteredHandlers);
      }
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    connectionState,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    isConnected: connectionState.isConnected,
    isReconnecting: connectionState.isReconnecting,
    error: connectionState.error
  };
}