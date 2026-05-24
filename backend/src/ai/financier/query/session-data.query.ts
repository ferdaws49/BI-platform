import { PredictFilterDto } from '../dtos/predict-filter.dto';
//kont najem nhottha fi service ama ywalli famma barcha ktiba, donc amalt separation , le bute juste pour la lisibilité
/**
 * Builds the main DW query to extract session-level aggregated financial data.
 * Joins fact_finance with all relevant dimension tables.
 * Applies optional filters: month, year, formationId, formateurId, sessionType.
 */
export function buildSessionDataQuery(filters: PredictFilterDto): {
  query: string;
  params: (string | number)[];
} {
  const params: (string | number)[] = [];
  let paramIndex = 1;

  const whereClauses: string[] = ['s.session_id IS NOT NULL'];

  if (filters.dateFrom) {
    whereClauses.push(`s.date >= $${paramIndex++}`);
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    whereClauses.push(`s.date <= $${paramIndex++}`);
    params.push(filters.dateTo);
  }

  if (filters.formationId) {
    whereClauses.push(`fo.formation_id = $${paramIndex++}`);
    params.push(filters.formationId);
  }

  if (filters.formateurId) {
    whereClauses.push(`fr.formateur_id = $${paramIndex++}`);
    params.push(filters.formateurId);
  }

  if (filters.sessionType) {
    whereClauses.push(`s.type_session = $${paramIndex++}`);
    params.push(filters.sessionType);
  }

  const whereSQL = whereClauses.join(' AND ');

  /**
   * Revenue = SUM of payments (type_finance = 'paiement')
   * cout_formateur = SUM where type_finance = 'cout_formateur'
   * cout_logistique = SUM where type_finance = 'cout_logistique'
   * impayes = SUM where type_finance = 'impaye'
   * nb_inscrits = COUNT DISTINCT apprenants linked to the session
   */
  const query = `
    SELECT
      s.session_id::text                                       AS session_id,
      fo.formation_id                                          AS formation_id,
      fr.formateur_id                                          AS formateur_id,
      s.type_session,
      s.capacite,
      s.date                                                   AS session_date,
      COUNT(DISTINCT f.sk_apprenant) FILTER (
        WHERE f.sk_apprenant IS NOT NULL
      )                                                        AS nb_inscrits,
      COALESCE(SUM(f.montant) FILTER (
        WHERE tf.type = 'paiement'
      ), 0)                                                    AS revenu,
      COALESCE(SUM(f.montant) FILTER (
        WHERE tf.type = 'depense_formateur'
      ), 0)                                                    AS cout_formateur,
      COALESCE(SUM(f.montant) FILTER (
        WHERE tf.type = 'depense_logistique'
      ), 0)                                                    AS cout_logistique,
      COALESCE(SUM(f.montant) FILTER (
        WHERE tf.type = 'impaye'
      ), 0)                                                    AS impayes
    FROM dw.fact_finance f
    INNER JOIN dw.dim_session     s   ON f.sk_session   = s.sk_session
    INNER JOIN dw.dim_formation   fo  ON f.sk_formation = fo.sk_formation
    INNER JOIN dw.dim_formateur   fr  ON f.sk_formateur = fr.sk_formateur
    INNER JOIN dw.dim_temps       t   ON f.sk_temps     = t.sk_temps
    INNER JOIN dw.dim_type_finance tf ON f.sk_type_finance = tf.sk_type_finance
    WHERE ${whereSQL}
    GROUP BY
      s.session_id,
      fo.formation_id,
      fr.formateur_id,
      s.type_session,
      s.capacite,
      s.date
    HAVING s.capacite > 0
    ORDER BY s.date DESC
  `;

  return { query, params };
}
