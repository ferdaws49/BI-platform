'use client'
import { useState, useEffect, useCallback } from 'react';
import { studentFinanceApi } from '@/lib/apprenant-paiement.api';
import {
  PaymentsResponse,
  PaymentSummary,
  PaymentFilters,
  FilterOptionsResponse,
} from '../types/studentFinance';

export function useStudentFinance() {
  const [payments, setPayments] = useState<PaymentsResponse | null>(null);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<PaymentFilters>({
    page: 1,
    limit: 10,
  });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentFinanceApi.getPayments(filters);
      setPayments(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Erreur lors du chargement des paiements',
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await studentFinanceApi.getSummary();
      setSummary(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Erreur lors du chargement du résumé',
      );
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const data = await studentFinanceApi.getFilterOptions();
      setFilterOptions(data);
    } catch (err: any) {
      // Silencieux ou warning selon ton choix
      console.warn('Impossible de charger les filtres');
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const refresh = useCallback(() => {
    fetchPayments();
    fetchSummary();
  }, [fetchPayments, fetchSummary]);

  const goToPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const applyFilters = (newFilters: Partial<PaymentFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };
  const resetFilters = () => {
    setFilters({ page: 1, limit: 10 });
  };

  return {
    payments,
    summary,
    filterOptions,
    loading,
    error,
    filters,
    refresh,
    goToPage,
    applyFilters,
    resetFilters,
  };
}