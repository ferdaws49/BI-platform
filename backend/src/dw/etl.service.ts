import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';

/* ---------- Entités SOURCE ---------- */
import { Finance, FinanceType } from 'src/finances/entities/finance.entity';
import { Session } from 'src/sessions/entities/session.entity';
import { Formation } from 'src/formations/entities/formation.entity';
import { Formateur } from 'src/formateurs/entities/formateur.entity';
import { Apprenant } from 'src/apprenants/entities/apprenant.entity';
import { Cron, CronExpression } from '@nestjs/schedule'; // ← Ajoute

@Injectable()
export class EtlService {
  private readonly logger = new Logger(EtlService.name);
  private readonly UNKNOWN_SESSION_UUID = '00000000-0000-0000-0000-000000000000';


  private skCache = {
    temps: new Map<string, number>(),
    typeFinance: new Map<string, number>(),
    session: new Map<string, number>(),   // string car Finance.sessionId est string
    formation: new Map<number, number>(),
    formateur: new Map<number, number>(),
    apprenant: new Map<number, number>(),
  };

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Finance) private financeRepo: Repository<Finance>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRepository(Formation) private formationRepo: Repository<Formation>,
    @InjectRepository(Formateur) private formateurRepo: Repository<Formateur>,
    @InjectRepository(Apprenant) private apprenantRepo: Repository<Apprenant>,
  ) {}

  //CronExpression.EVERY_10_MINUTES
  //CronExpression.EVERY_HOUR
  //CronExpression.EVERY_WEEK
  // Exécute tous les jours à 2h du matin
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runEtlScheduled(): Promise<void> {
    this.logger.log('⏰ ETL automatique démarré');
    await this.runEtl();
  }

  /* ================================================================
     ORCHESTRATION
     ================================================================ */
  async runEtl(): Promise<void> {
    this.logger.log('🚀 Démarrage ETL Star Schema (transaction globale)');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.loadDimTypeFinance(queryRunner);
      await this.seedUnknownMembers(queryRunner);
      await this.loadDimTempsRange(queryRunner);
      await this.loadDimFormations(queryRunner);
      await this.loadDimFormateurs(queryRunner);
      await this.loadDimApprenants(queryRunner);
      await this.loadDimSessions(queryRunner);

      await this.loadFactFinance(queryRunner);

      await queryRunner.commitTransaction();
      this.logger.log('✅ ETL terminé et commité.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`❌ ETL échoué — rollback. ${msg}`, stack);
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /* ================================================================
     HELPERS
     ================================================================ */
  private getSk<T>(cache: Map<T, number>, key: T, context: string): number {
    const sk = cache.get(key);
    if (sk === undefined) {
      throw new Error(`SK manquant pour ${context} (clé=${key}). Dimension non chargée ?`);
    }
    return sk;
  }

  private async query(sql: string, params?: any[], queryRunner?: QueryRunner): Promise<any> {
    if (queryRunner) {
      return queryRunner.query(sql, params);
    }
    return this.dataSource.query(sql, params);
  }

  private mapFinanceType(type: FinanceType): string | null {
    switch (type) {
      case FinanceType.PAIEMENT: return 'paiement';
      case FinanceType.IMPAYE: return 'impaye';
      case FinanceType.REMBOURSEMENT: return 'remboursement';
      case FinanceType.DEPENSE_FORMATEUR: return 'depense_formateur';
      case FinanceType.DEPENSE_LOGISTIQUE: return 'depense_logistique';
      default: return null;
    }
  }

  /* ================================================================
     DIMENSIONS
     ================================================================ */
  private async loadDimTypeFinance(qr?: QueryRunner): Promise<void> {
    const types = ['paiement', 'impaye', 'remboursement', 'depense_formateur', 'depense_logistique'];
    
    const placeholders = types.map((_, i) => `($${i + 1})`).join(',');
    await this.query(
      `INSERT INTO dw.dim_type_finance (type) VALUES ${placeholders}
       ON CONFLICT (type) DO NOTHING`,
      types,
      qr,
    );

    const rows = await this.query(
      `SELECT sk_type_finance, type FROM dw.dim_type_finance WHERE type = ANY($1)`,
      [types],
      qr,
    );
    for (const r of rows) {
      this.skCache.typeFinance.set(r.type, r.sk_type_finance);
    }
  }

  private async seedUnknownMembers(qr?: QueryRunner): Promise<void> {
    // 1. Apprenant Inconnu (-1)
    let r = await this.query(
      `INSERT INTO dw.dim_apprenant (apprenant_id, nom) VALUES (-1, 'Inconnu')
       ON CONFLICT (apprenant_id) DO NOTHING RETURNING sk_apprenant`,
      [],
      qr,
    );
    if (!r.length) {
      r = await this.query(`SELECT sk_apprenant FROM dw.dim_apprenant WHERE apprenant_id = -1`, [], qr);
    }
    this.skCache.apprenant.set(-1, r[0].sk_apprenant);

    // 2. Formateur Inconnu (-1)
    r = await this.query(
      `INSERT INTO dw.dim_formateur (formateur_id, nom) VALUES (-1, 'Inconnu')
       ON CONFLICT (formateur_id) DO NOTHING RETURNING sk_formateur`,
      [],
      qr,
    );
    if (!r.length) {
      r = await this.query(`SELECT sk_formateur FROM dw.dim_formateur WHERE formateur_id = -1`, [], qr);
    }
    this.skCache.formateur.set(-1, r[0].sk_formateur);

    // 3. Formation Inconnue (-1)
    r = await this.query(
      `INSERT INTO dw.dim_formation (formation_id, titre, categorie, statut) VALUES (-1, 'Non applicable', 'Inconnu', 'Inactif')
       ON CONFLICT (formation_id) DO NOTHING RETURNING sk_formation`,
      [],
      qr,
    );
    if (!r.length) {
      r = await this.query(`SELECT sk_formation FROM dw.dim_formation WHERE formation_id = -1`, [], qr);
    }
    this.skCache.formation.set(-1, r[0].sk_formation);

    // 4. Session Inconnue ('-1')
    r = await this.query(
      `INSERT INTO dw.dim_session (session_id, type_session, capacite, prix_session) VALUES ($1, 'Non applicable', 0, 0)
       ON CONFLICT (session_id) DO NOTHING RETURNING sk_session`,
      [this.UNKNOWN_SESSION_UUID],
      qr,
    );
    if (!r.length) {
      r = await this.query(`SELECT sk_session FROM dw.dim_session WHERE session_id = $1`, [this.UNKNOWN_SESSION_UUID], qr);
    }
    this.skCache.session.set(this.UNKNOWN_SESSION_UUID, r[0].sk_session);
  }

  private async loadDimTempsRange(qr?: QueryRunner): Promise<void> {
    const start = new Date('2023-01-01');
    const end = new Date('2025-12-31');
    
    const rows: any[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const jour = date.getDate();
      const mois = date.getMonth() + 1;
      const annee = date.getFullYear();
      const trimestre = Math.floor(date.getMonth() / 3) + 1; // ← CORRECTION : 1→4
      const nomMois = date.toLocaleString('fr-FR', { month: 'long' });

      rows.push([key, jour, mois, annee, trimestre, nomMois]);
    }

    if (rows.length === 0) return;

    const placeholders = rows.map(
      (_, i) => `($${i * 6 + 1},$${i * 6 + 2},$${i * 6 + 3},$${i * 6 + 4},$${i * 6 + 5},$${i * 6 + 6})`
    ).join(',');

    await this.query(
      `INSERT INTO dw.dim_temps (date_key, jour, mois, annee, trimestre, nom_mois)
       VALUES ${placeholders} ON CONFLICT (date_key) DO NOTHING`,
      rows.flat(),
      qr,
    );

    const keys = rows.map(r => r[0]);
    const skRows = await this.query(
      `SELECT sk_temps, date_key FROM dw.dim_temps WHERE date_key = ANY($1)`,
      [keys],
      qr,
    );
    for (const r of skRows) {
      this.skCache.temps.set(r.date_key, r.sk_temps);
    }
  }

  private async getOrCreateSkTemps(dateInput: Date | string, qr?: QueryRunner): Promise<number> {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
    d.setHours(0, 0, 0, 0);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    if (this.skCache.temps.has(key)) return this.skCache.temps.get(key)!;

    const jour = d.getDate();
    const mois = d.getMonth() + 1;
    const annee = d.getFullYear();
    const trimestre = Math.floor(d.getMonth() / 3) + 1; // ← CORRECTION : 1→4
    const nomMois = d.toLocaleString('fr-FR', { month: 'long' });

    let res = await this.query(
      `INSERT INTO dw.dim_temps (date_key, jour, mois, annee, trimestre, nom_mois)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (date_key) DO NOTHING RETURNING sk_temps`,
      [key, jour, mois, annee, trimestre, nomMois],
      qr,
    );

    if (!res.length) {
      res = await this.query(`SELECT sk_temps FROM dw.dim_temps WHERE date_key = $1`, [key], qr);
    }

    const sk = res[0].sk_temps;
    this.skCache.temps.set(key, sk);
    return sk;
  }

  private async loadDimFormations(qr?: QueryRunner): Promise<void> {
    const rows = await this.formationRepo.find();
    if (rows.length === 0) return;

    const placeholders = rows.map((_, i) => `($${i * 4 + 1},$${i * 4 + 2},$${i * 4 + 3},$${i * 4 + 4})`).join(',');
    await this.query(
      `INSERT INTO dw.dim_formation (formation_id, titre, categorie, statut)
       VALUES ${placeholders} ON CONFLICT (formation_id) DO NOTHING`,
      rows.flatMap(f => [f.id, f.titre, f.categorie, f.statut]),
      qr,
    );

    const ids = rows.map(f => f.id);
    const skRows = await this.query(
      `SELECT sk_formation, formation_id FROM dw.dim_formation WHERE formation_id = ANY($1)`,
      [ids],
      qr,
    );
    for (const r of skRows) {
      this.skCache.formation.set(r.formation_id, r.sk_formation);
    }
  }

  private async loadDimFormateurs(qr?: QueryRunner): Promise<void> {
    const rows = await this.formateurRepo.find();
    if (rows.length === 0) return;

    const placeholders = rows.map((_, i) => `($${i * 2 + 1},$${i * 2 + 2})`).join(',');
    const params = rows.flatMap(f => [f.id, `${f.nom} ${f.prenom}`.trim()]);

    await this.query(
      `INSERT INTO dw.dim_formateur (formateur_id, nom) VALUES ${placeholders}
       ON CONFLICT (formateur_id) DO NOTHING`,
      params,
      qr,
    );

    const ids = rows.map(f => f.id);
    const skRows = await this.query(
      `SELECT sk_formateur, formateur_id FROM dw.dim_formateur WHERE formateur_id = ANY($1)`,
      [ids],
      qr,
    );
    for (const r of skRows) {
      this.skCache.formateur.set(r.formateur_id, r.sk_formateur);
    }
  }

  private async loadDimApprenants(qr?: QueryRunner): Promise<void> {
    const rows = await this.apprenantRepo.find({ relations: ['user'] });
    if (rows.length === 0) return;

    const placeholders = rows.map((_, i) => `($${i * 2 + 1},$${i * 2 + 2})`).join(',');
    const params = rows.flatMap(a => [
      a.id,
      a.user ? `${a.user.nom} ${a.user.prenom}`.trim() : `Apprenant #${a.id}`,
    ]);

    await this.query(
      `INSERT INTO dw.dim_apprenant (apprenant_id, nom) VALUES ${placeholders}
       ON CONFLICT (apprenant_id) DO NOTHING`,
      params,
      qr,
    );

    const ids = rows.map(a => a.id);
    const skRows = await this.query(
      `SELECT sk_apprenant, apprenant_id FROM dw.dim_apprenant WHERE apprenant_id = ANY($1)`,
      [ids],
      qr,
    );
    for (const r of skRows) {
      this.skCache.apprenant.set(r.apprenant_id, r.sk_apprenant);
    }
  }

  private async loadDimSessions(qr?: QueryRunner): Promise<void> {
    const rows = await this.sessionRepo.find({ relations: ['formation'] });
    if (rows.length === 0) return;

    const placeholders = rows.map((_, i) => `($${i * 6 + 1},$${i * 6 + 2},$${i * 6 + 3},$${i * 6 + 4},$${i * 6 + 5},$${i * 6 + 6})`).join(',');
    const params = rows.flatMap(s => [
      s.id,
      s.type,
      s.capacite,
      s.prix ?? s.formation?.prix ?? 0,
      s.title,
      s.date ? new Date(s.date).toISOString().split('T')[0] : null,  // ← AJOUTER
    ]);

    await this.query(
      `INSERT INTO dw.dim_session (session_id, type_session, capacite, prix_session, titre, date)
       VALUES ${placeholders} ON CONFLICT (session_id) 
     DO UPDATE SET 
       type_session = EXCLUDED.type_session,
       capacite     = EXCLUDED.capacite,
       prix_session = EXCLUDED.prix_session,
       titre        = EXCLUDED.titre,
       date         = EXCLUDED.date`,
      params,
      qr,
    );

    const ids = rows.map(s => s.id);
    const skRows = await this.query(
      `SELECT sk_session, session_id FROM dw.dim_session WHERE session_id = ANY($1)`,
      [ids],
      qr,
    );
    for (const r of skRows) {
      // ← CORRECTION : clé string pour cohérence avec Finance.sessionId
      this.skCache.session.set(String(r.session_id), r.sk_session);
    }
  }

  /* ================================================================
     FAITS
     ================================================================ */
  private async loadFactFinance(qr?: QueryRunner): Promise<void> {
    await this.query(`TRUNCATE TABLE dw.fact_finance RESTART IDENTITY`, [], qr);
    this.logger.log('  • fact_finance vidée.');

    const batch: any[][] = [];
    const flush = async (force = false) => {
      if (batch.length >= 500 || (force && batch.length > 0)) {
        const values = batch.map((_, i) => {
          const o = i * 8;
          return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7},$${o + 8})`;
        }).join(',');
        const flat = batch.flat();
        await this.query(
          `INSERT INTO dw.fact_finance
             (sk_temps, sk_session, sk_formation, sk_formateur, sk_apprenant, sk_type_finance, montant, finance_id_source)
           VALUES ${values}`,
          flat,
          qr,
        );
        batch.length = 0;
      }
    };

    const finances = await this.financeRepo.find({
      relations: ['session', 'session.formation', 'session.formateur', 'apprenant'],
    });

    for (const fin of finances) {
      const typeLabel = this.mapFinanceType(fin.type);
      if (!typeLabel) {
        this.logger.warn(`⚠️ Finance#${fin.id} type="${fin.type}" non mappé — ignoré.`);
        continue;
      }

      const skType = this.getSk(this.skCache.typeFinance, typeLabel, `type="${typeLabel}"`);
      const skTemps = await this.getOrCreateSkTemps(fin.date, qr);
      
      // ← CORRECTION : fin.sessionId est déjà string, pas de Number()
      const skSession = fin.sessionId
        ? this.getSk(this.skCache.session, fin.sessionId, `sessionId=${fin.sessionId}`)
        : this.getSk(this.skCache.session, this.UNKNOWN_SESSION_UUID, 'session_inconnue');

      const skFormation = fin.session?.formationId
        ? this.getSk(this.skCache.formation, fin.session.formationId, `formationId=${fin.session.formationId}`)
        : this.getSk(this.skCache.formation, -1, 'formation_inconnue');

      let skFormateur: number;
      if (fin.type === FinanceType.DEPENSE_LOGISTIQUE) {
        skFormateur = this.getSk(this.skCache.formateur, -1, 'formateur_inconnu_logistique');
      } else {
        skFormateur = fin.session?.formateurId
          ? this.getSk(this.skCache.formateur, fin.session.formateurId, `formateurId=${fin.session.formateurId}`)
          : this.getSk(this.skCache.formateur, -1, 'formateur_inconnu');
      }

      const skApprenant = fin.apprenantId
        ? this.getSk(this.skCache.apprenant, fin.apprenantId, `apprenantId=${fin.apprenantId}`)
        : this.getSk(this.skCache.apprenant, -1, 'apprenant_inconnu');

      let montant = Number(fin.montant);
      if (
        fin.type === FinanceType.REMBOURSEMENT ||
        fin.type === FinanceType.DEPENSE_FORMATEUR ||
        fin.type === FinanceType.DEPENSE_LOGISTIQUE
      ) {
        montant = -Math.abs(montant);
      } else {
        montant = Math.abs(montant);
      }

      batch.push([
        skTemps,
        skSession,
        skFormation,
        skFormateur,
        skApprenant,
        skType,
        montant,
        `FINANCE-${fin.id}`,
      ]);
      await flush();
    }

    await flush(true);

    const countRes = await this.query(`SELECT COUNT(*) AS cnt FROM dw.fact_finance`, [], qr);
    this.logger.log(`  • ${countRes[0].cnt} lignes insérées dans fact_finance.`);
  }
}