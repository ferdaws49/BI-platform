'use client'
import React, { useState, useMemo } from 'react';
import { useStudentFinance } from './hooks/useStudentFinance';

const ITEMS_PER_PAGE = 10; // ← Nombre de lignes par page

export default function StudentPaymentsPage() {
  const {
    payments,
    summary,
    loading,
    error,
    refresh,
  } = useStudentFinance();

  const [currentPage, setCurrentPage] = useState(1);

  // Calcul de la pagination côté client
  const allPayments = payments?.data || [];
  const totalItems = allPayments.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return allPayments.slice(start, start + ITEMS_PER_PAGE);
  }, [allPayments, currentPage]);

  // Reset à la page 1 si les données changent
  React.useEffect(() => {
    setCurrentPage(1);
  }, [payments]);

  if (loading) return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Mes Paiements</h1>
        
      </div>

      {/* KPIs */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard title="Total Payé" value={`${summary.totalPaid.toFixed(2)} DT`} color="green" />
          <SummaryCard title="Reste à Payer" value={`${summary.resteAPayer.toFixed(2)} DT`} color={summary.resteAPayer > 0 ? 'red' : 'gray'} />
          <SummaryCard title="Sessions" value={String(summary.sessionsCount)} color="blue" />
          <SummaryCard title="Paiements" value={String(summary.paymentsCount)} color="purple" />
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Formation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(payment.date).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {payment.formationTitle || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {payment.sessionTitle || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                  {payment.amount.toFixed(2)} DT
                </td>
              </tr>
            ))}
            {paginatedPayments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Aucun paiement trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination côté client */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
          >
            Précédent
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} / {totalPages} ({totalItems} résultats)
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}

const SummaryCard: React.FC<{
  title: string;
  value: string;
  color: string;
}> = ({ title, value, color }) => {
  const colors: Record<string, string> = {
    green: 'bg-green-50 border-green-200 text-green-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[color] || colors.gray}`}>
      <div className="text-sm font-medium opacity-80">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
};