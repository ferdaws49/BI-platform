export enum AlertType {
  FINANCE = 'finance',
  SESSION = 'session',
  PAYMENT = 'payment',
}

export enum AlertPriority {
  CRITICAL = 'critical',
  WARNING = 'warning',
  INFO = 'info',
}

export interface AlertItem {
  id: string; // stable hash (type-subtype-date)
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  action: string;
  value: number;
  createdAt: string;
  viewed: boolean; // ← NEW
  treated: boolean; // ← NEW
}

export interface AlertResponseDto {
  total: number;
  critique: number;
  warning: number;
  info: number;
  alerts: AlertItem[];
}
