import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Finance } from '../finances/entities/finance.entity';
import { Session } from '../sessions/entities/session.entity';
import { Formation } from '../formations/entities/formation.entity';
import { Formateur } from '../formateurs/entities/formateur.entity';
import { Apprenant } from 'src/apprenants/entities/apprenant.entity';

@Injectable()
export class EtlService {
  constructor(
    @InjectRepository(Finance)
    private financeRepo: Repository<Finance>,

    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,

    @InjectRepository(Formation)
    private formationRepo: Repository<Formation>,

    @InjectRepository(Formateur)
    private formateurRepo: Repository<Formateur>,

    @InjectRepository(Apprenant)
    private apprenantRepo: Repository<Apprenant>,

    private dataSource: DataSource,
  ) {}

  // =====================================================
  // 🚀 MAIN PIPELINE
  // =====================================================
  async runETL() {
    await this.loadDimensions();
    await this.loadFactFinance();

    return { message: 'ETL terminé' };
  }

  // =====================================================
  // 🟦 DIMENSIONS (LOAD ONLY)
  // =====================================================
  async loadDimensions() {
    await this.loadDimFormation();
    await this.loadDimSession();
    await this.loadDimFormateur();
    await this.loadDimApprenant();
    await this.loadDimTypeFinance();
  }

  async loadDimFormation() {
    const formations = await this.formationRepo.find();

    for (const f of formations) {
      await this.dataSource.query(`
        INSERT INTO dw.dim_formation
        (formation_id, titre, categorie, statut)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [f.id, f.titre, f.categorie, f.statut]);
    }
  }

  async loadDimSession() {
    const sessions = await this.sessionRepo.find();

    for (const s of sessions) {
      await this.dataSource.query(`
        INSERT INTO dw.dim_session
        (session_id, type_session, capacite)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [s.id, s.type, s.capacite]);
    }
  }

  async loadDimFormateur() {
    const formateurs = await this.formateurRepo.find();

    for (const f of formateurs) {
      await this.dataSource.query(`
        INSERT INTO dw.dim_formateur
        (formateur_id, nom)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [f.id, f.nom]);
    }
  }

  async loadDimApprenant() {
    const apprenants = await this.apprenantRepo.find({
      relations: ['user'],
    });

    for (const a of apprenants) {
      await this.dataSource.query(`
        INSERT INTO dw.dim_apprenant
        (apprenant_id, nom)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [
        a.id,
        `${a.user?.prenom ?? ''} ${a.user?.nom ?? ''}`,
      ]);
    }
  }

  async loadDimTypeFinance() {
    const types = ['paiement', 'depense', 'impaye', 'remboursement'];

    for (const type of types) {
      await this.dataSource.query(`
        INSERT INTO dw.dim_type_finance (type)
        VALUES ($1)
        ON CONFLICT DO NOTHING
      `, [type]);
    }
  }


  // =====================================================
  // 🟨 FACT TABLE
  // =====================================================
  async loadFactFinance() {
  // 1. DÉCLARER LA FONCTION DE FORMATAGE EN PREMIER
  const toDateString = (date: any) => {
    if (!date) return null;
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // 2. Chargement des données sources
  const finances = await this.financeRepo.find({
    relations: ['session', 'session.formation', 'session.formateur', 'session.apprenants', 'apprenant'],
  });
  const allSessions = await this.sessionRepo.find({
    relations: ['formation', 'formateur', 'apprenants']
  });

  // 3. Chargement des Maps (Lookup)
  const [tempsRows, sessionRows, formationRows, formateurRows, apprenantRows, typeRows] = await Promise.all([
    this.dataSource.query(`SELECT sk_temps, date_complete FROM dw.dim_temps`),
    this.dataSource.query(`SELECT sk_session, session_id FROM dw.dim_session`),
    this.dataSource.query(`SELECT sk_formation, formation_id FROM dw.dim_formation`),
    this.dataSource.query(`SELECT sk_formateur, formateur_id FROM dw.dim_formateur`),
    this.dataSource.query(`SELECT sk_apprenant, apprenant_id FROM dw.dim_apprenant`),
    this.dataSource.query(`SELECT sk_type_finance, type FROM dw.dim_type_finance`),
  ]);

  const tempsMap = new Map(tempsRows.map(r => [toDateString(r.date_complete), r.sk_temps]));
  const sessionMap = new Map(sessionRows.map(r => [r.session_id, r.sk_session]));
  const formationMap = new Map(formationRows.map(r => [r.formation_id, r.sk_formation]));
  const formateurMap = new Map(formateurRows.map(r => [r.formateur_id, r.sk_formateur]));
  const apprenantMap = new Map(apprenantRows.map(r => [r.apprenant_id, r.sk_apprenant]));
  const typeMap = new Map(typeRows.map(r => [r.type, r.sk_type_finance]));

  // -----------------------------------------------------------
  // ÉTAPE 1 : LES TRANSACTIONS (Paiements, Impayés, etc.)
  // -----------------------------------------------------------
  for (const f of finances) {
    const dateStr = toDateString(f.date);
    const skTemps = tempsMap.get(dateStr);

    await this.dataSource.query(`
      INSERT INTO dw.fact_finance (
        sk_temps, sk_session, sk_formation, sk_formateur, sk_apprenant, sk_type_finance,
        finance_id_source, montant, cout_formateur, cout_logistique, nb_inscrits,
        est_paiement, est_depense, est_impaye, est_remboursement
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (finance_id_source) DO UPDATE SET 
        sk_temps = EXCLUDED.sk_temps,
        montant = EXCLUDED.montant,
        est_paiement = EXCLUDED.est_paiement,
        est_impaye = EXCLUDED.est_impaye
    `, [
      skTemps ?? null,
      sessionMap.get(f.session?.id) ?? null,
      formationMap.get(f.session?.formation?.id) ?? null,
      formateurMap.get(f.session?.formateur?.id) ?? null,
      apprenantMap.get(f.apprenant?.id) ?? null,
      typeMap.get(f.type) ?? null,
      String(f.id),
      f.montant,
      0, 0, 0,
      f.type === 'paiement',
      f.type === 'depense',
      f.type === 'impaye',
      f.type === 'remboursement'
    ]);
  }

  // -----------------------------------------------------------
  // ÉTAPE 2 : INITIALISATION DES COUTS (14 COLONNES - PAS D'APPRENANT)
  // -----------------------------------------------------------
  for (const s of allSessions) {
    const skSession = sessionMap.get(s.id);
    const dateStr = toDateString(s.date);
    const skTemps = tempsMap.get(dateStr);
    // CALCUL DU CA ATTENDU
  const pSession = s.prix ? Number(s.prix) : 0;
const pFormation = s.formation?.prix ? Number(s.formation.prix) : 0;

// Logique COALESCE : si prix session existe et > 0, on le prend, sinon on prend formation
const prixUnitaire = pSession > 0 ? pSession : pFormation;

const caTheorique = (s.apprenants?.length ?? 0) * prixUnitaire;

    await this.dataSource.query(`
      INSERT INTO dw.fact_finance (
        sk_temps, sk_session, sk_formation, sk_formateur, sk_type_finance,
        finance_id_source, montant, cout_formateur, cout_logistique, nb_inscrits,
        est_paiement, est_depense, est_impaye, est_remboursement
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (finance_id_source) DO UPDATE SET
      montant = EXCLUDED.montant,
        cout_formateur = EXCLUDED.cout_formateur,
        cout_logistique = EXCLUDED.cout_logistique,
        nb_inscrits = EXCLUDED.nb_inscrits,
        sk_temps = EXCLUDED.sk_temps
    `, [
      skTemps ?? null,
      skSession,
      formationMap.get(s.formation?.id) ?? null,
      formateurMap.get(s.formateur?.id) ?? null,
      typeMap.get('depense') ?? null,
      `SESSION_INIT_${s.id}`,
      caTheorique, 
      Number(s.cout_formateur ?? 0),
      Number(s.cout_logistique ?? 0),
      s.apprenants?.length ?? 0,
      false, true, false, false
    ]);
  }

}
}
