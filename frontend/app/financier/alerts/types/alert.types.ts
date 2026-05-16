export type AlertType = 'finance' | 'session' | 'payment';
export type AlertPriority = 'critical' | 'warning' | 'info';

export interface AlertItem {
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  action: string;
  value: number;
  createdAt: string;
}

export interface AlertResponse {
  total: number;
  critique: number;
  warning: number;
  info: number;
  alerts: AlertItem[];
}