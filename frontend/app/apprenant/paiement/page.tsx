
'use client'
import React, { useMemo, useState } from 'react';
import { useStudentFinance } from './hooks/useStudentFinance';

export default function StudentPaymentsPage () {
  const {
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
  } = useStudentFinance();

  const [selectedFormationId, setSelectedFormationId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  // Quand on change de formation, on reset la session si elle n'appartient pas à cette formation
  const availableSessions = useMemo(() => {
    if (!filterOptions) return [];
    if (!selectedFormationId) return filterOptions.sessions;
    return filterOptions.sessions.filter(
      (s) => s.formationId === Number(selectedFormationId),
    );
  }, [filterOptions, selectedFormationId]);

  const [localFilters, setLocalFilters] = useState({
    sessionId: '',
    formationId: '',
    dateFrom: '',
    dateTo: '',
  });

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({
      formationId: selectedFormationId ? Number(selectedFormationId) : undefined,
      sessionId: selectedSessionId || undefined,
    });
  };



  const handleReset = () => {
    setSelectedFormationId('');
    setSelectedSessionId('');
    resetFilters();
  };

  const handleFormationChange = (value: string) => {
    setSelectedFormationId(value);
    setSelectedSessionId('');
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Mes Paiements</h1>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Chargement...' : '🔄 Rafraîchir'}
        </button>
      </div>

      {/* Filtres — AU-DESSUS des KPIs */}
      <form
        onSubmit={handleApplyFilters}
        className="bg-gray-50 p-4 rounded-lg mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Formation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Formation
            </label>
            <select
              value={selectedFormationId}
              onChange={(e) => handleFormationChange(e.target.value)}
              className="w-full border p-2 rounded bg-white"
            >
              <option value="">Toutes les formations</option>
              {filterOptions?.formations.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>

          {/* Session */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              disabled={!selectedFormationId && availableSessions.length === 0}
              className="w-full border p-2 rounded bg-white disabled:bg-gray-100"
            >
              <option value="">Toutes les sessions</option>
              {availableSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Boutons */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
            >
              Filtrer
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Reset
            </button>
          </div>
        </div>
      </form>

      {/* KPIs / Résumé */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            title="Total Payé"
            value={`${summary.totalPaid.toFixed(2)} DT`}
            color="green"
          />
          <SummaryCard
            title="Reste à Payer"
            value={`${summary.resteAPayer.toFixed(2)} DT`}
            color={summary.resteAPayer > 0 ? 'red' : 'gray'}
          />
          <SummaryCard
            title="Sessions"
            value={String(summary.sessionsCount)}
            color="blue"
          />
          <SummaryCard
            title="Paiements"
            value={String(summary.paymentsCount)}
            color="purple"
          />
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Formation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Session
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Montant
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payments?.data.map((payment) => (
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
            {payments?.data.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Aucun paiement trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {payments && payments.meta.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => goToPage(filters.page - 1)}
            disabled={filters.page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
          >
            Précédent
          </button>
          <span className="text-sm text-gray-600">
            Page {filters.page} / {payments.meta.totalPages} (
            {payments.meta.total} résultats)
          </span>
          <button
            onClick={() => goToPage(filters.page + 1)}
            disabled={filters.page === payments.meta.totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
};

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