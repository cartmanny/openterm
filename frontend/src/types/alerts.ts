/**
 * Alert System Types
 * Bloomberg-style price, volume, and news alerts
 */

export type AlertType = 'price' | 'volume' | 'news' | 'earnings';

export type AlertCondition =
  | 'above'           // Price goes above threshold
  | 'below'           // Price goes below threshold
  | 'crosses_above'   // Price crosses above threshold
  | 'crosses_below'   // Price crosses below threshold
  | 'percent_change'  // Price changes by X%
  | 'volume_spike'    // Volume exceeds X times average
  | 'any_news'        // Any news for ticker
  | 'earnings_soon';  // Earnings within X days

export type AlertStatus = 'active' | 'triggered' | 'expired' | 'paused';

export interface Alert {
  id: string;
  ticker: string;
  instrumentId?: string;
  type: AlertType;
  condition: AlertCondition;
  value: number;          // Threshold value
  currentValue?: number;  // Last checked value
  createdAt: number;
  triggeredAt?: number;
  expiresAt?: number;
  status: AlertStatus;
  note?: string;

  // For repeat alerts
  repeating: boolean;
  triggerCount: number;
}

export interface AlertNotification {
  id: string;
  alertId: string;
  ticker: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface AlertsState {
  alerts: Alert[];
  notifications: AlertNotification[];
  lastCheck: number;
}

// Alert condition display labels
export const CONDITION_LABELS: Record<AlertCondition, string> = {
  above: 'Price Above',
  below: 'Price Below',
  crosses_above: 'Price Crosses Above',
  crosses_below: 'Price Crosses Below',
  percent_change: 'Price Changes By',
  volume_spike: 'Volume Spike',
  any_news: 'Any News',
  earnings_soon: 'Earnings Within',
};

// Alert condition units
export const CONDITION_UNITS: Record<AlertCondition, string> = {
  above: '$',
  below: '$',
  crosses_above: '$',
  crosses_below: '$',
  percent_change: '%',
  volume_spike: 'x avg',
  any_news: '',
  earnings_soon: 'days',
};

// Default alert values
export const DEFAULT_ALERT: Partial<Alert> = {
  type: 'price',
  condition: 'above',
  status: 'active',
  repeating: false,
  triggerCount: 0,
};

// Generate alert ID
export function generateAlertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate alert message
export function generateAlertMessage(alert: Alert): string {
  const { ticker, condition, value, currentValue } = alert;

  switch (condition) {
    case 'above':
    case 'crosses_above':
      return `${ticker} is now above $${value.toFixed(2)} (current: $${currentValue?.toFixed(2)})`;
    case 'below':
    case 'crosses_below':
      return `${ticker} is now below $${value.toFixed(2)} (current: $${currentValue?.toFixed(2)})`;
    case 'percent_change':
      return `${ticker} has moved ${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    case 'volume_spike':
      return `${ticker} volume is ${value}x above average`;
    case 'any_news':
      return `New news for ${ticker}`;
    case 'earnings_soon':
      return `${ticker} earnings in ${value} days`;
    default:
      return `Alert triggered for ${ticker}`;
  }
}
