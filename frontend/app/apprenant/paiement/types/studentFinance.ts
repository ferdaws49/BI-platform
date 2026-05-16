export interface Payment {
  id: number;
  amount: number;
  date: string;
  sessionId: string | null;
  sessionTitle: string | null;
  formationTitle: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaymentsResponse {
  data: Payment[];
  meta: PaginationMeta;
}

export interface PaymentSummary {
  totalPaid: number;
  resteAPayer: number;
  totalCost: number;
  paymentsCount: number;
  sessionsCount: number;
}

export interface PaymentFilters {
  sessionId?: string;
  formationId?: number;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
}

export interface FilterOption {
  id: number | string;
  title: string;
  formationId?: number; // pour lier session à sa formation
}

export interface FilterOptionsResponse {
  formations: FilterOption[];
  sessions: FilterOption[];
}