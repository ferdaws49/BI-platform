import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';

import { Finance } from '../finances/entities/finance.entity';
import { Session } from '../sessions/entities/session.entity';
import { Formation } from '../formations/entities/formation.entity';
import { Formateur } from '../formateurs/entities/formateur.entity';
import { Apprenant } from 'src/apprenants/entities/apprenant.entity';

@Injectable()
export class EtlService {
  constructor(
    @InjectRepository(Finance) private financeRepo: Repository<Finance>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRepository(Formation) private formationRepo: Repository<Formation>,
    @InjectRepository(Formateur) private formateurRepo: Repository<Formateur>,
    @InjectRepository(Apprenant) private apprenantRepo: Repository<Apprenant>,
    private dataSource: DataSource,
  ) {}

  // =====================================================
  // 🧰 HELPER : Bulk Insert avec ON CONFLICT
  //Bulk insert = “نحطّو برشا data مرة وحدة بدل واحد واحد” bech ETL maywalich rzin
  // =====================================================
  private async bulkInsert(
    manager: EntityManager,
    sql: string,          // "INSERT INTO table (col1,col2) VALUES"
    rows: any[][],
    conflict: string = '', // FIX 1 : "ON CONFLICT (col) DO NOTHING" ou DO UPDATE
    chunkSize = 500,
  ) {
    if (rows.length === 0) return;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const colCount = chunk[0].length;

      const placeholders = chunk.map((_, rowIndex) =>
        `(${Array.from({ length: colCount }, (_, colIndex) =>
          `$${rowIndex * colCount + colIndex + 1}`
        ).join(',')})`
      ).join(',');

      const flatValues = chunk.flat();

      //  FIX 1 : on ajoute le conflict à la fin de chaque chunk
      await manager.query(`${sql} ${placeholders} ${conflict}`, flatValues);
    }
  }

  // =====================================================
  // 🚀 MAIN PIPELINE
  // =====================================================
  async runETL() {
    await this.dataSource.transaction(async (manager) => {
      await this.loadDimFormation(manager);
      await this.loadDimSession(manager);
      await this.loadDimFormateur(manager);
      await this.loadDimApprenant(manager);
      await this.loadDimTypeFinance(manager);
      await this.loadDimTemps(manager);
      await this.loadFactFinance(manager);
    });

    return { message: 'ETL terminé' };
  }

  // =====================================================
  // 🟦 DIMENSIONS
  // =====================================================
  async loadDimTemps(manager: EntityManager) {
    const now = new Date();
    const rows: any[][] = [];

    for (let y = now.getFullYear() - 2; y <= now.getFullYear(); y++) {
      for (let m = 1; m <= 12; m++) {
        const daysInMonth = new Date(y, m, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(y, m - 1, d);
          const dateKey = date.toISOString().split('T')[0];
          rows.push([dateKey, d, m, y, Math.ceil(m / 3), dateKey]);
        }
      }
    }

    await this.bulkInsert(
      manager,
      `INSERT INTO dw.dim_temps
       (date_key, jour, mois, annee, trimestre, date_complete) VALUES`,
      rows,
      `ON CONFLICT (date_key) DO NOTHING`, // ✅ FIX 1
    );
  }

  async loadDimFormation(manager: EntityManager) {
    const formations = await this.formationRepo.find();
    const rows = formations.map(f => [f.id, f.titre, f.categorie, f.statut]);

    await this.bulkInsert(
      manager,
      `INSERT INTO dw.dim_formation (formation_id, titre, categorie, statut) VALUES`,
      rows,
      `ON CONFLICT (formation_id) DO NOTHING`, // ✅ FIX 1
    );
  }

  async loadDimSession(manager: EntityManager) {
    const sessions = await this.sessionRepo.find();
    const rows = sessions.map(s => [s.id, s.type, s.capacite]);

    await this.bulkInsert(
      manager,
      `INSERT INTO dw.dim_session (session_id, type_session, capacite) VALUES`,
      rows,
      `ON CONFLICT (session_id) DO NOTHING`, // ✅ FIX 1
    );
  }

  async loadDimFormateur(manager: EntityManager) {
    const formateurs = await this.formateurRepo.find();
    const rows = formateurs.map(f => [f.id, f.nom]);

    await this.bulkInsert(
      manager,
      `INSERT INTO dw.dim_formateur (formateur_id, nom) VALUES`,
      rows,
      `ON CONFLICT (formateur_id) DO NOTHING`, // ✅ FIX 1
    );
  }

  async loadDimApprenant(manager: EntityManager) {
    const apprenants = await this.apprenantRepo.find({ relations: ['user'] });
    const rows = apprenants.map(a => [
      a.id,
      `${a.user?.prenom ?? ''} ${a.user?.nom ?? ''}`.trim(),
    ]);

    await this.bulkInsert(
      manager,
      `INSERT INTO dw.dim_apprenant (apprenant_id, nom) VALUES`,
      rows,
      `ON CONFLICT (apprenant_id) DO NOTHING`, // ✅ FIX 1
    );
  }

  async loadDimTypeFinance(manager: EntityManager) {
    const types = ['paiement', 'depense', 'impaye', 'remboursement'];
    const rows = types.map(t => [t]);

    await this.bulkInsert(
      manager,
      `INSERT INTO dw.dim_type_finance (type) VALUES`,
      rows,
      `ON CONFLICT (type) DO NOTHING`, // ✅ FIX 1
    );
  }

  // =====================================================
  // 🟨 FACT TABLE
  // =====================================================
  async loadFactFinance(manager: EntityManager) {

    const toDateString = (date: any): string | null => {
      if (!date) return null;
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().split('T')[0];
    };

    const finances = await this.financeRepo.find({
      relations: ['session', 'session.formation', 'session.formateur', 'apprenant'],
    });

    const allSessions = await this.sessionRepo.find({
      relations: ['formation', 'formateur', 'apprenants'],
    });

    const [tempsRows, sessionRows, formationRows, formateurRows, apprenantRows, typeRows] =
      await Promise.all([
        manager.query(`SELECT sk_temps, date_complete FROM dw.dim_temps`),
        manager.query(`SELECT sk_session, session_id FROM dw.dim_session`),
        manager.query(`SELECT sk_formation, formation_id FROM dw.dim_formation`),
        manager.query(`SELECT sk_formateur, formateur_id FROM dw.dim_formateur`),
        manager.query(`SELECT sk_apprenant, apprenant_id FROM dw.dim_apprenant`),
        manager.query(`SELECT sk_type_finance, type FROM dw.dim_type_finance`),
      ]);

    const tempsMap    = new Map(tempsRows.map(r    => [toDateString(r.date_complete), r.sk_temps]));
    const sessionMap  = new Map(sessionRows.map(r  => [r.session_id,   r.sk_session]));
    const formationMap= new Map(formationRows.map(r=> [r.formation_id, r.sk_formation]));
    const formateurMap= new Map(formateurRows.map(r=> [r.formateur_id, r.sk_formateur]));
    const apprenantMap= new Map(apprenantRows.map(r=> [r.apprenant_id, r.sk_apprenant]));
    const typeMap     = new Map(typeRows.map(r     => [r.type,         r.sk_type_finance]));

    // ✅ FIX 2 : même structure 15 colonnes pour les 2 étapes (sk_apprenant inclus)
    const FACT_COLUMNS = `
      INSERT INTO dw.fact_finance (
        sk_temps, sk_session, sk_formation, sk_formateur,
        sk_apprenant,         
        sk_type_finance, finance_id_source, montant,
        cout_formateur, cout_logistique, nb_inscrits,
        est_paiement, est_depense, est_impaye, est_remboursement
      ) VALUES`;

    const FACT_CONFLICT = `
      ON CONFLICT (finance_id_source) DO UPDATE SET
        sk_temps        = EXCLUDED.sk_temps,
        montant         = EXCLUDED.montant,
        cout_formateur  = EXCLUDED.cout_formateur,
        cout_logistique = EXCLUDED.cout_logistique,
        nb_inscrits     = EXCLUDED.nb_inscrits,
        est_paiement    = EXCLUDED.est_paiement,
        est_depense     = EXCLUDED.est_depense,
        est_impaye      = EXCLUDED.est_impaye,
        est_remboursement = EXCLUDED.est_remboursement`;

    // -----------------------------------------------------------
    // ÉTAPE 1 : TRANSACTIONS (15 colonnes)
    // -----------------------------------------------------------
    const factRows1: any[][] = finances.map(f => [
      tempsMap.get(toDateString(f.date))         ?? null,  // $1  sk_temps
      sessionMap.get(f.session?.id)              ?? null,  // $2  sk_session
      formationMap.get(f.session?.formation?.id) ?? null,  // $3  sk_formation
      formateurMap.get(f.session?.formateur?.id) ?? null,  // $4  sk_formateur
      apprenantMap.get(f.apprenant?.id)          ?? null,  // $5  sk_apprenant ✅ FIX 2
      typeMap.get(f.type)                        ?? null,  // $6  sk_type_finance
      String(f.id),                                        // $7  finance_id_source
      Number(f.montant ?? 0),                              // $8  montant
      null,                                                // $9  cout_formateur  → N/A
      null,                                                // $10 cout_logistique → N/A
      null,                                                // $11 nb_inscrits     → N/A
      f.type === 'paiement',                               // $12
      f.type === 'depense',                                // $13
      f.type === 'impaye',                                 // $14
      f.type === 'remboursement',                          // $15
    ]);

    await this.bulkInsert(manager, FACT_COLUMNS, factRows1, FACT_CONFLICT);

    // -----------------------------------------------------------
    // ÉTAPE 2 : SESSION ANALYTICS (15 colonnes — même structure) ✅ FIX 2
    // -----------------------------------------------------------
    const factRows2: any[][] = allSessions.map(s => {
      const pSession    = Number(s.prix            ?? 0);
      const pFormation  = Number(s.formation?.prix ?? 0);
      const prixUnitaire = pSession > 0 ? pSession : pFormation;
      const caTheorique  = (s.apprenants?.length ?? 0) * prixUnitaire;

      return [
        tempsMap.get(toDateString(s.date))  ?? null,  // $1  sk_temps
        sessionMap.get(s.id)                ?? null,  // $2  sk_session
        formationMap.get(s.formation?.id)   ?? null,  // $3  sk_formation
        formateurMap.get(s.formateur?.id)   ?? null,  // $4  sk_formateur
        null,                                         // $5  sk_apprenant → null ✅ FIX 2
        typeMap.get('depense')              ?? null,  // $6  sk_type_finance
        `SESSION_INIT_${s.id}`,                       // $7  finance_id_source
        caTheorique,                                  // $8  montant (CA théorique)
        Number(s.cout_formateur  ?? 0),               // $9  cout_formateur
        Number(s.cout_logistique ?? 0),               // $10 cout_logistique
        s.apprenants?.length ?? 0,                    // $11 nb_inscrits
        false,                                        // $12 est_paiement
        true,                                         // $13 est_depense
        false,                                        // $14 est_impaye
        false,                                        // $15 est_remboursement
      ];
    });

    await this.bulkInsert(manager, FACT_COLUMNS, factRows2, FACT_CONFLICT);
  }
}