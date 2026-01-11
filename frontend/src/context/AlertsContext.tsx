'use client';

import { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import {
  Alert,
  AlertNotification,
  AlertsState,
  AlertStatus,
  generateAlertId,
  generateAlertMessage,
} from '@/types/alerts';
import { api } from '@/lib/api';

// Storage key
const ALERTS_STORAGE_KEY = 'openterm_alerts';

// Actions
type AlertsAction =
  | { type: 'LOAD_ALERTS'; payload: AlertsState }
  | { type: 'ADD_ALERT'; payload: Alert }
  | { type: 'UPDATE_ALERT'; payload: { id: string; updates: Partial<Alert> } }
  | { type: 'DELETE_ALERT'; payload: string }
  | { type: 'TRIGGER_ALERT'; payload: { alertId: string; currentValue: number } }
  | { type: 'ADD_NOTIFICATION'; payload: AlertNotification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'SET_LAST_CHECK'; payload: number };

// Initial state
const initialState: AlertsState = {
  alerts: [],
  notifications: [],
  lastCheck: 0,
};

// Reducer
function alertsReducer(state: AlertsState, action: AlertsAction): AlertsState {
  switch (action.type) {
    case 'LOAD_ALERTS':
      return action.payload;

    case 'ADD_ALERT':
      return {
        ...state,
        alerts: [...state.alerts, action.payload],
      };

    case 'UPDATE_ALERT':
      return {
        ...state,
        alerts: state.alerts.map((alert) =>
          alert.id === action.payload.id
            ? { ...alert, ...action.payload.updates }
            : alert
        ),
      };

    case 'DELETE_ALERT':
      return {
        ...state,
        alerts: state.alerts.filter((alert) => alert.id !== action.payload),
      };

    case 'TRIGGER_ALERT': {
      const alert = state.alerts.find((a) => a.id === action.payload.alertId);
      if (!alert) return state;

      const triggeredAlert: Alert = {
        ...alert,
        status: alert.repeating ? 'active' : 'triggered',
        triggeredAt: Date.now(),
        currentValue: action.payload.currentValue,
        triggerCount: alert.triggerCount + 1,
      };

      const notification: AlertNotification = {
        id: `notif-${Date.now()}`,
        alertId: alert.id,
        ticker: alert.ticker,
        message: generateAlertMessage(triggeredAlert),
        timestamp: Date.now(),
        read: false,
      };

      return {
        ...state,
        alerts: state.alerts.map((a) =>
          a.id === action.payload.alertId ? triggeredAlert : a
        ),
        notifications: [notification, ...state.notifications].slice(0, 50), // Keep last 50
      };
    }

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 50),
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };

    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };

    case 'SET_LAST_CHECK':
      return {
        ...state,
        lastCheck: action.payload,
      };

    default:
      return state;
  }
}

// Context type
interface AlertsContextType {
  state: AlertsState;
  addAlert: (alert: Omit<Alert, 'id' | 'createdAt' | 'status' | 'triggerCount'>) => string;
  updateAlert: (id: string, updates: Partial<Alert>) => void;
  deleteAlert: (id: string) => void;
  pauseAlert: (id: string) => void;
  resumeAlert: (id: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  checkAlerts: () => Promise<void>;
  unreadCount: number;
  activeAlertCount: number;
}

const AlertsContext = createContext<AlertsContextType | null>(null);

// Provider
export function AlertsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(alertsReducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AlertsState;
        dispatch({ type: 'LOAD_ALERTS', payload: parsed });
      }
    } catch (error) {
      console.error('Failed to load alerts from storage:', error);
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save alerts to storage:', error);
    }
  }, [state]);

  // Add alert
  const addAlert = useCallback(
    (alertData: Omit<Alert, 'id' | 'createdAt' | 'status' | 'triggerCount'>): string => {
      const alert: Alert = {
        ...alertData,
        id: generateAlertId(),
        createdAt: Date.now(),
        status: 'active',
        triggerCount: 0,
      };
      dispatch({ type: 'ADD_ALERT', payload: alert });
      return alert.id;
    },
    []
  );

  // Update alert
  const updateAlert = useCallback((id: string, updates: Partial<Alert>) => {
    dispatch({ type: 'UPDATE_ALERT', payload: { id, updates } });
  }, []);

  // Delete alert
  const deleteAlert = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ALERT', payload: id });
  }, []);

  // Pause alert
  const pauseAlert = useCallback((id: string) => {
    dispatch({ type: 'UPDATE_ALERT', payload: { id, updates: { status: 'paused' } } });
  }, []);

  // Resume alert
  const resumeAlert = useCallback((id: string) => {
    dispatch({ type: 'UPDATE_ALERT', payload: { id, updates: { status: 'active' } } });
  }, []);

  // Mark notification as read
  const markNotificationRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  }, []);

  // Check alerts against current prices
  const checkAlerts = useCallback(async () => {
    const activeAlerts = state.alerts.filter((a) => a.status === 'active');
    if (activeAlerts.length === 0) return;

    // Group alerts by ticker
    const alertsByTicker = activeAlerts.reduce((acc, alert) => {
      if (!acc[alert.ticker]) acc[alert.ticker] = [];
      acc[alert.ticker].push(alert);
      return acc;
    }, {} as Record<string, Alert[]>);

    // Check each ticker
    for (const [ticker, alerts] of Object.entries(alertsByTicker)) {
      try {
        // Try to get quote data
        const instrument = await api.getInstrumentByTicker(ticker);
        const response = await api.getDailyBars(instrument.id, '1M');
        const bars = response.data.bars;

        if (bars.length === 0) continue;

        const latestBar = bars[bars.length - 1];
        const currentPrice = latestBar.close;

        // Check each alert for this ticker
        for (const alert of alerts) {
          let triggered = false;

          switch (alert.condition) {
            case 'above':
            case 'crosses_above':
              triggered = currentPrice > alert.value;
              break;
            case 'below':
            case 'crosses_below':
              triggered = currentPrice < alert.value;
              break;
            case 'percent_change': {
              const priceChange = bars.length > 1
                ? ((currentPrice - bars[0].close) / bars[0].close) * 100
                : 0;
              triggered = Math.abs(priceChange) >= Math.abs(alert.value);
              break;
            }
          }

          if (triggered) {
            dispatch({
              type: 'TRIGGER_ALERT',
              payload: { alertId: alert.id, currentValue: currentPrice },
            });
          }
        }
      } catch (error) {
        console.error(`Failed to check alerts for ${ticker}:`, error);
      }
    }

    dispatch({ type: 'SET_LAST_CHECK', payload: Date.now() });
  }, [state.alerts]);

  // Auto-check alerts every minute
  useEffect(() => {
    const interval = setInterval(() => {
      checkAlerts();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkAlerts]);

  // Calculate counts
  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const activeAlertCount = state.alerts.filter((a) => a.status === 'active').length;

  return (
    <AlertsContext.Provider
      value={{
        state,
        addAlert,
        updateAlert,
        deleteAlert,
        pauseAlert,
        resumeAlert,
        markNotificationRead,
        clearNotifications,
        checkAlerts,
        unreadCount,
        activeAlertCount,
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
}

// Hook
export function useAlerts() {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertsProvider');
  }
  return context;
}
