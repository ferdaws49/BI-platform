// src/ai/alerts/alerts.service.ts — v5 TYPE-SAFE

import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const PYTHON_ML_URL = process.env.PYTHON_ML_URL ?? 'http://localhost:8000';
const PYTHON_RETRIES = Number(process.env.PYTHON_ML_RETRIES ?? '2');
const PYTHON_TIMEOUT = Number(process.env.PYTHON_ML_TIMEOUT_MS ?? '5000');

// ─── Training distribution means ─────────────────────────────────────────────
const TRAINING_MEANS = {
  taux_presence: 0.75,
  absences_consecutives: 0.61,
  moyenne_notes: 10.32,
  tendance_notes: 0.056,
  moyenne_satisfaction: 3.99,
  jours_retard_paiement: 29.11,
} as const;

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ApprenantRaw {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  formation: string;
  formateur: string;
}

// ─── DB Result Types (strict) ───────────────────────────────────────────────

interface PresenceRow {
  apprenant_id: number;
  total_sessions: number;
  sessions_presentes: number;
  absences_consecutives: number;
}

interface NoteRow {
  apprenant_id: number;
  moyenne_notes: number | null;
  tendance_notes: number | null;
}

interface SatisfactionRow {
  apprenant_id: number;
  moyenne_satisfaction: number | null;
}

interface PaiementRow {
  apprenant_id: number;
  jours_retard: number;
}

// ─── ML Types ─────────────────────────────────────────────────────────────────

interface MLFeatures {
  apprenant_id: number;
  taux_presence: number;
  absences_consecutives: number;
  moyenne_notes: number | null;
  tendance_notes: number | null;
  moyenne_satisfaction: number | null;
  jours_retard_paiement: number;
}

interface MLResult {
  apprenant_id: number;
  risk_score: number;
  risk_level: string;
  risk_probability: number;
  factors: Record<string, string>;
  model_used: string;
}

// ─── Helper: build lookup Map O(1) ────────────────────────────────────────────

function toMap<T extends { apprenant_id: number }>(rows: T[]): Map<number, T> {
  return new Map(rows.map((r) => [r.apprenant_id, r]));
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // ── Entry point ────────────────────────────────────────────────────────────

  async getAlerts() {
    const apprenants = await this.getApprenantsActifs();
    if (!apprenants.length) return [];

    const ids = apprenants.map((a) => a.id);

    // Fetch all stats in parallel
    const [presences, notes, satisfactions, paiements] = await Promise.all([
      this.getPresenceStats(ids),
      this.getNoteStats(ids),
      this.getSatisfactionStats(ids),
      this.getPaiementStats(ids),
    ]);

    // O(1) lookups
    const presenceMap = toMap<PresenceRow>(presences);
    const noteMap = toMap<NoteRow>(notes);
    const satisfactionMap = toMap<SatisfactionRow>(satisfactions);
    const paiementMap = toMap<PaiementRow>(paiements);

    // Build feature vector per apprenant
    const features: MLFeatures[] = apprenants.map((a) => {
      const p = presenceMap.get(a.id);
      const n = noteMap.get(a.id);
      const s = satisfactionMap.get(a.id);
      const f = paiementMap.get(a.id);

      const totalSessions = p?.total_sessions ?? 0;
      const presentSessions = p?.sessions_presentes ?? 0;
      const tauxPresence =
        totalSessions === 0
          ? TRAINING_MEANS.taux_presence
          : Math.min(1, presentSessions / totalSessions);

      return {
        apprenant_id: a.id,
        taux_presence: tauxPresence,
        absences_consecutives: p?.absences_consecutives ?? 0,
        moyenne_notes: n?.moyenne_notes ?? null,
        tendance_notes: n?.tendance_notes ?? null,
        moyenne_satisfaction: s?.moyenne_satisfaction ?? null,
        jours_retard_paiement: f?.jours_retard ?? 0,
      };
    });

    // Call Python ML microservice (with retry)
    const mlResults = await this.callPythonMLWithRetry(
      features,
      PYTHON_RETRIES,
    );

    // If Python is down -> use NestJS fallback scoring
    const results = mlResults ?? this.fallbackScoring(features);

    // Merge ML results with apprenant info
    return results
      .map((ml: MLResult, index: number) => {
        let a: ApprenantRaw | undefined = apprenants[index];
        if (!a || a.id !== ml.apprenant_id) {
          a = apprenants.find((x) => x.id === ml.apprenant_id);
        }
        if (!a) return null;

        const feat = features.find(x => x.apprenant_id === a.id);
        const presenceValue = feat ? Math.round(feat.taux_presence * 100) : 100;
        const notesValue = feat && feat.moyenne_notes !== null ? Math.round(Math.max(0, Math.min(100, (feat.moyenne_notes / 20) * 100))) : 50;
        const satisfactionValue = feat && feat.moyenne_satisfaction !== null ? Math.round(Math.max(0, Math.min(100, (feat.moyenne_satisfaction / 5) * 100))) : 80;
        const paiementsValue = feat ? Math.max(0, 100 - Math.min(100, feat.jours_retard_paiement * 1.5)) : 100;

        const mappedFactors = [
          {
            label: "Présence",
            value: presenceValue,
            weight: 40,
            detail: ml.factors?.presence || `${presenceValue}% de présence`
          },
          {
            label: "Notes",
            value: notesValue,
            weight: 35,
            detail: ml.factors?.notes || `Moyenne: ${feat?.moyenne_notes?.toFixed(1) || 'N/A'}/20`
          },
          {
            label: "Satisfaction",
            value: satisfactionValue,
            weight: 15,
            detail: ml.factors?.satisfaction || `Satisfaction: ${feat?.moyenne_satisfaction?.toFixed(1) || 'N/A'}/5`
          },
          {
            label: "Paiements",
            value: paiementsValue,
            weight: 10,
            detail: ml.factors?.paiements || (feat && feat.jours_retard_paiement > 0 ? `${feat.jours_retard_paiement}j de retard` : "À jour")
          }
        ];

        return {
          id: `${a.id}_${a.formation.replace(/\s+/g, '_')}`,
          nom: a.nom,
          prenom: a.prenom,
          email: a.email,
          phone: a.telephone,
          formation: a.formation,
          formateur: a.formateur,
          promotion: "Promo 2026",
          lastSeen: "Actif récemment",
          riskScore: ml.risk_score,
          riskLevel: ml.risk_level,
          riskProbability: ml.risk_probability,
          factors: mappedFactors,
          modelUsed: ml.model_used,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.riskScore - a.riskScore);
  }

  // ── DB Queries ─────────────────────────────────────────────────────────────

  private async getApprenantsActifs(): Promise<ApprenantRaw[]> {
    return this.dataSource.query(`
      SELECT DISTINCT
        a.id,
        u.nom,
        u.prenom,
        u.email,
        u.phone        AS telephone,
        f.titre        AS formation,
        CONCAT(fo.nom, ' ', fo.prenom) AS formateur
      FROM apprenants a
      INNER JOIN users u                ON u.id  = a."userId"
      INNER JOIN sessions_apprenants sa ON sa."apprenantId" = a.id
      INNER JOIN sessions s             ON s.id  = sa."sessionId"
      INNER JOIN formations f           ON f.id  = s."formationId"
      LEFT  JOIN formateur fo           ON fo.id = s."formateurId"
      WHERE s.statut = 'Active'
      ORDER BY u.nom
    `);
  }

  private async getPresenceStats(ids: number[]): Promise<PresenceRow[]> {
    if (!ids.length) return [];
    const rows = await this.dataSource.query(
      `
      SELECT
        p."apprenantId" AS apprenant_id,
        COUNT(*)::int   AS total_sessions,
        COUNT(*) FILTER (WHERE p."estPresent" = true)::int AS sessions_presentes,
        (
          SELECT COUNT(*)::int
          FROM presences p2
          WHERE p2."apprenantId" = p."apprenantId"
            AND p2."estPresent"  = false
            AND p2."dateMarquage" > COALESCE(
              (SELECT MAX(p3."dateMarquage")
               FROM presences p3
               WHERE p3."apprenantId" = p."apprenantId"
                 AND p3."estPresent"  = true),
              '2000-01-01'
            )
        ) AS absences_consecutives
      FROM presences p
      WHERE p."apprenantId" = ANY($1::int[])
      GROUP BY p."apprenantId"
    `,
      [ids],
    );

    return rows.map((r: any) => ({
      apprenant_id: +r.apprenant_id,
      total_sessions: +r.total_sessions,
      sessions_presentes: +r.sessions_presentes,
      absences_consecutives: +r.absences_consecutives,
    }));
  }

  private async getNoteStats(ids: number[]): Promise<NoteRow[]> {
    if (!ids.length) return [];
    const rows = await this.dataSource.query(
      `
      SELECT
        p."apprenantId" AS apprenant_id,
        AVG(p.note)     AS moyenne_notes,
        (
          SELECT note FROM performance
          WHERE "apprenantId" = p."apprenantId"
          ORDER BY date DESC LIMIT 1
        ) - (
          SELECT note FROM performance
          WHERE "apprenantId" = p."apprenantId"
          ORDER BY date ASC LIMIT 1
        ) AS tendance_notes
      FROM performance p
      WHERE p."apprenantId" = ANY($1::int[])
      GROUP BY p."apprenantId"
    `,
      [ids],
    );

    return rows.map((r: any) => ({
      apprenant_id: +r.apprenant_id,
      moyenne_notes: r.moyenne_notes ? parseFloat(r.moyenne_notes) : null,
      tendance_notes: r.tendance_notes ? parseFloat(r.tendance_notes) : null,
    }));
  }

  private async getSatisfactionStats(
    ids: number[],
  ): Promise<SatisfactionRow[]> {
    if (!ids.length) return [];
    const rows = await this.dataSource.query(
      `
      SELECT
        "apprenantId" AS apprenant_id,
        AVG(note)     AS moyenne_satisfaction
      FROM satisfaction
      WHERE "apprenantId" = ANY($1::int[])
      GROUP BY "apprenantId"
    `,
      [ids],
    );

    return rows.map((r: any) => ({
      apprenant_id: +r.apprenant_id,
      moyenne_satisfaction: r.moyenne_satisfaction
        ? parseFloat(r.moyenne_satisfaction)
        : null,
    }));
  }

  private async getPaiementStats(ids: number[]): Promise<PaiementRow[]> {
    if (!ids.length) return [];
    const rows = await this.dataSource.query(
      `
      SELECT
        "apprenantId" AS apprenant_id,
        GREATEST(0, EXTRACT(DAY FROM NOW() - MAX(date)))::int AS jours_retard
      FROM finances
      WHERE "apprenantId" = ANY($1::int[])
        AND type = 'paiement'
      GROUP BY "apprenantId"
    `,
      [ids],
    );

    return rows.map((r: any) => ({
      apprenant_id: +r.apprenant_id,
      jours_retard: +r.jours_retard,
    }));
  }

  // ── Python ML call WITH RETRY ──────────────────────────────────────────────

  private async callPythonMLWithRetry(
    features: MLFeatures[],
    retries: number,
  ): Promise<MLResult[] | null> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${PYTHON_ML_URL}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apprenants: features }),
          signal: AbortSignal.timeout(PYTHON_TIMEOUT),
        });
        if (!res.ok) {
          this.logger.warn(
            `Python ML attempt ${attempt}/${retries} -> HTTP ${res.status}`,
          );
          if (attempt === retries) return null;
          await this.delay(500 * attempt);
          continue;
        }
        const data = await res.json();
        return data.results;
      } catch (err) {
        this.logger.warn(
          `Python ML attempt ${attempt}/${retries} failed -> ${err}`,
        );
        if (attempt === retries) break;
        await this.delay(500 * attempt);
      }
    }
    this.logger.warn('Python ML indisponible apres retries -> fallback NestJS');
    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ── Fallback scoring ────────────────────────────────────────────────────────

  private fallbackScoring(features: MLFeatures[]): MLResult[] {
    return features.map((f) => {
      const moyenneNotes = f.moyenne_notes ?? TRAINING_MEANS.moyenne_notes;
      const tendanceNotes = f.tendance_notes ?? TRAINING_MEANS.tendance_notes;
      const moyenneSatisfaction =
        f.moyenne_satisfaction ?? TRAINING_MEANS.moyenne_satisfaction;
      const joursRetard =
        f.jours_retard_paiement ?? TRAINING_MEANS.jours_retard_paiement;
      const absencesConsec =
        f.absences_consecutives ?? TRAINING_MEANS.absences_consecutives;

      const presenceRisk = (1 - f.taux_presence) * 100;
      const noteRisk = Math.max(
        0,
        ((10 - moyenneNotes) / 10) * 100 +
          Math.abs(Math.min(0, tendanceNotes)) * 5,
      );
      const satisfRisk = Math.max(0, ((3 - moyenneSatisfaction) / 3) * 100);
      const paiementRisk = Math.min(100, joursRetard * 1.5);

      const score = Math.min(
        100,
        Math.max(
          0,
          Math.round(
            presenceRisk * 0.4 +
              noteRisk * 0.35 +
              satisfRisk * 0.15 +
              paiementRisk * 0.1,
          ),
        ),
      );

      const level =
        score >= 75
          ? 'critique'
          : score >= 55
            ? 'eleve'
            : score >= 35
              ? 'modere'
              : 'faible';

      const factors: Record<string, string> = {
        presence: `${Math.round(f.taux_presence * 100)}% de presence`,
        notes: `Moyenne: ${moyenneNotes.toFixed(1)}/20`,
        satisfaction: `${moyenneSatisfaction.toFixed(1)}/5`,
        paiements: joursRetard > 0 ? `${joursRetard}j de retard` : 'A jour',
      };

      if (f.taux_presence < 0.5) {
        factors.presence_alert = 'Presence critique (< 50%)';
      }
      if (moyenneNotes < 8) {
        factors.notes_alert = 'Notes tres faibles';
      }
      if (tendanceNotes < -2) {
        factors.tendance_alert = 'Baisse continue des notes';
      }
      if (joursRetard > 30) {
        factors.paiement_alert = 'Retard paiement significatif';
      }

      return {
        apprenant_id: f.apprenant_id,
        risk_score: score,
        risk_level: level,
        risk_probability: score / 100,
        factors,
        model_used: 'NestJS-Fallback',
      };
    });
  }
}
