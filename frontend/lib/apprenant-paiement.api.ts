import { PaymentsResponse, PaymentSummary, PaymentFilters, FilterOptionsResponse } from '@/app/apprenant/paiement/types/studentFinance';

const API_BASE_URL =  'http://localhost:5000';



class FetchClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL.replace(/\/$/, '');
  }

  private async request<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<{ data: T }> {
    const token = localStorage.getItem('access_token');

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${url}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
      const err: any = new Error('Unauthorized');
      err.response = { status: 401, data: { message: 'Session expirée' } };
      throw err;
    }

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: `Erreur ${response.status}` }));
      const err: any = new Error(
        errorData.message || `Request failed with ${response.status}`,
      );
      err.response = { data: errorData, status: response.status };
      throw err;
    }

    if (response.status === 204) {
      return { data: undefined as T };
    }

    const data = (await response.json()) as T;
    return { data };
  }

  get<T>(url: string) {
    return this.request<T>(url, { method: 'GET' });
  }
}

const api = new FetchClient(API_BASE_URL);

export const studentFinanceApi = {
  getPayments: async (filters: PaymentFilters): Promise<PaymentsResponse> => {
    const params = new URLSearchParams();

    if (filters.sessionId) params.append('sessionId', filters.sessionId);
    if (filters.formationId)
      params.append('formationId', String(filters.formationId));
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    params.append('page', String(filters.page));
    params.append('limit', String(filters.limit));

    const { data } = await api.get<PaymentsResponse>(
      `/student-finance/payments?${params.toString()}`,
    );
    return data;
  },

  getSummary: async (): Promise<PaymentSummary> => {
    const { data } = await api.get<PaymentSummary>('/student-finance/summary');
    return data;
  },

  getFilterOptions:async (): Promise<FilterOptionsResponse> => {

    const { data } = await api.get<FilterOptionsResponse>(
      '/student-finance/filters',
    );
    return data;
  }
};

