// seed.ts — Faker + noms tunisiens — 2000 apprenants / 200 sessions / 5 ans
// npm install @faker-js/faker bcryptjs
// npx ts-node -r tsconfig-paths/register run-seed.ts

import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

import { Inscription, InscriptionStatut } from './src/inscriptions/entities/inscriptions.entity';
import { User, UserRole, UserStatus } from './src/users/users.entity';
import { Apprenant } from './src/apprenants/entities/apprenant.entity';
import { Formation, FormationStatus } from './src/formations/entities/formation.entity';
import { Formateur } from './src/formateurs/entities/formateur.entity';
import { Session, SessionType, SessionStatut } from './src/sessions/entities/session.entity';
import { Presence } from './src/sessions/entities/presence.entity';
import { Finance, FinanceType } from './src/finances/entities/finance.entity';
import { Satisfaction } from './src/satisfaction/entities/satisfaction.entity';
import { Performance } from './src/performances/entities/performance.entity';

// ═══════════════════════════════════════════════
// CONFIGURATION — change ces chiffres librement
// ═══════════════════════════════════════════════
const CFG = {
  NB_ACCEPTED:    2000,
  NB_REJECTED:    350,
  NB_PENDING:     180,
  NB_NOT_VERIF:   70,
  NB_SESSIONS:    200,
  DATE_START:     new Date('2020-01-01'),
  DATE_END:       new Date('2024-12-31'),
  BATCH_SIZE:     100,   // insertions par lot
};

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
const hash       = (pwd: string) => bcrypt.hashSync(pwd, 10);
const pick       = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt    = (min: number, max: number) => faker.number.int({ min, max });
const randFloat  = (min: number, max: number, dec = 2) =>
  parseFloat(faker.number.float({ min, max, fractionDigits: dec }).toFixed(dec));
const shuffle    = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
const toDateStr  = (d: Date) => d.toISOString().split('T')[0];

async function saveBatch<T>(repo: any, items: Partial<T>[], batchSize = CFG.BATCH_SIZE): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = await repo.save(items.slice(i, i + batchSize));
    results.push(...batch);
    process.stdout.write(`\r   → ${Math.min(i + batchSize, items.length)} / ${items.length}`);
  }
  console.log('');
  return results;
}

// ═══════════════════════════════════════════════
// RÉFÉRENTIELS TUNISIENS
// ═══════════════════════════════════════════════
const NOMS_TN = [
  'Ben Ali','Trabelsi','Chaabane','Hamdi','Gharbi','Mnejja','Dridi','Saidani',
  'Ferchichi','Jedidi','Boukthir','Labidi','Zouari','Mansouri','Haddad',
  'Khalfallah','Besbes','Tlili','Oueslati','Riahi','Jebali','Kraiem','Marzouki',
  'Dhouib','Belhaj','Touati','Mrabit','Sassi','Amri','Brahem','Chaker',
  'Ghannouchi','Nasr','Bouzid','Hammami','Kasdallah','Baccouche','Mejri',
  'Cherif','Turki','Rekik','Ayari','Sellami','Jaziri','Monastiri','Haboubi',
  'Khelil','Ben Salah','Hajji','Ferjani','Chiha','Zitoun','Agrebi','Mnif',
  'Boughanmi','Zaanoun','Nefzi','Maalej','Brika','Ghorbel','Amara','Karray',
  'Fehri','Bahri','Siala','Marrakchi','Chedly','Laabidi','Fourati','Koubaa',
];

const PRENOMS_H_TN = [
  'Mohamed','Ahmed','Youssef','Seif','Anis','Bilel','Riadh','Nizar','Haythem',
  'Mehdi','Aymen','Sami','Amine','Karim','Walid','Tarek','Ramzi','Slim','Fethi',
  'Hichem','Maher','Lotfi','Khaled','Zied','Brahim','Adel','Fares','Oussama',
  'Chaker','Wassim','Montassar','Alaeddine','Hamza','Ghassen','Saifeddine',
  'Moez','Sofiene','Imed','Nabil','Ridha','Habib','Mondher','Jamel','Aziz',
  'Makrem','Houssem','Sabri','Iheb','Skander','Rayen',
];

const PRENOMS_F_TN = [
  'Amira','Sana','Ines','Rania','Wafa','Nour','Mariem','Yasmine','Houda',
  'Fatma','Dorra','Olfa','Rim','Emna','Sarra','Manel','Asma','Hela','Lobna',
  'Sirine','Chaima','Nesrine','Dhouha','Sameh','Leila','Najoua','Abir',
  'Radhia','Souha','Hanen','Maroua','Salma','Ghofrane','Amal','Intissar',
  'Aicha','Zeineb','Hajer','Rahma','Jihen','Sawssen','Ahlem','Besma','Khawla',
  'Meriem','Nadia','Sabrine','Azza','Faten','Roua',
];

const PRENOMS_TN = [...PRENOMS_H_TN, ...PRENOMS_F_TN];

const VILLES_TN = [
  'Tunis','Sfax','Sousse','Monastir','Nabeul','Gabes','Bizerte','Kairouan',
  'Ariana','Ben Arous','Mahdia','Gafsa','Jendouba','Kef','Sidi Bouzid',
  'Tozeur','Medenine','Tataouine','Siliana','Zaghouan',
];

const PROGRAMMES = [
  'Développement Web Full Stack','Data Science & Intelligence Artificielle',
  'Cybersécurité','Marketing Digital','Comptabilité & Finance',
  'Gestion de Projet Agile','Infographie & Design',
  'Réseaux & Télécommunications','Développement Mobile',
  'Cloud Computing','DevOps','Business Intelligence',
];

const HEURES_DEBUT = ['08:30','09:00','09:30','14:00','14:30'];

const COMMENTAIRES_TN = [
  'Formation très bien organisée, formateur compétent.',
  'Contenu riche, mais le rythme était un peu rapide.',
  'Très satisfait, j\'ai appris beaucoup de choses pratiques.',
  'Bonne ambiance, exercices pratiques pertinents.',
  'Le formateur explique très bien, merci !',
  'J\'aurais aimé plus d\'exemples concrets du marché tunisien.',
  'Formation de qualité, je recommande vivement.',
  'Quelques problèmes techniques au début mais ça s\'est rattrapé.',
  'Excellent rapport qualité/prix pour une formation en Tunisie.',
  'Les supports de cours sont très complets.',
  'Très bonne expérience, je reviendrai pour d\'autres formations.',
  'Le formateur maîtrise parfaitement son sujet.',
  'Bonne formation, mais les locaux pourraient être mieux équipés.',
  'J\'ai atteint mes objectifs d\'apprentissage, merci.',
  'Formation pratique et directement applicable en entreprise.',
  'Très bonne interaction avec le groupe, ambiance agréable.',
  'Le contenu correspond bien à ce qui était annoncé.',
  'Quelques notions auraient mérité plus d\'approfondissement.',
  'Formateur très pédagogue et disponible pour les questions.',
  'Je recommande cette formation à tous mes collègues.',
  'Très bonne organisation logistique, salle bien équipée.',
  'Le programme est bien structuré et progressif.',
  'Formation dense mais très enrichissante.',
  'Les exercices pratiques m\'ont beaucoup aidé à comprendre.',
  'Bonne formation, j\'aurais aimé plus de temps pour pratiquer.',
];

function genTelTN(): string {
  const prefixes = ['20','21','22','23','24','25','26','27','28','29',
                    '50','52','53','54','55','56','58',
                    '90','92','93','94','95','96','97','98','99'];
  const p = pick(prefixes);
  const n = String(randInt(100000, 999999));
  return `+216 ${p} ${n.slice(0,3)} ${n.slice(3)}`;
}

function uniqueEmail(prenom: string, nom: string, usedEmails: Set<string>): string {
  const base = `${prenom}.${nom}`.toLowerCase()
    .replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const domains = ['gmail.com','yahoo.fr','hotmail.com','outlook.com','topnet.tn','gnet.tn'];
  let email = `${base}@${pick(domains)}`;
  let tries = 0;
  while (usedEmails.has(email)) {
    email = `${base}${faker.number.int({ min: 1, max: 9999 })}@${pick(domains)}`;
    if (++tries > 20) email = `${base}_${faker.string.alphanumeric(6)}@gmail.com`;
  }
  usedEmails.add(email);
  return email;
}

// ═══════════════════════════════════════════════
// SEED PRINCIPALE
// ═══════════════════════════════════════════════
export async function seed(dataSource: DataSource) {

  // ── Nettoyage ──────────────────────────────────────────────────
  console.log('🧹 Nettoyage des tables...');
  const tables = [
    'performance','satisfaction','finances','presences',
    'sessions_apprenants','sessions','apprenants',
    "users WHERE role = 'apprenant'",
    'inscriptions','formations','formateur',
  ];
  for (const t of tables) await dataSource.query(`DELETE FROM ${t}`);
  console.log('✅ Tables vidées\n');

  // ═══════════════════════════════════════════════
  // ÉTAPE 1 — INSCRIPTIONS
  // ═══════════════════════════════════════════════
  console.log(`📝 Création de ${CFG.NB_ACCEPTED + CFG.NB_REJECTED + CFG.NB_PENDING + CFG.NB_NOT_VERIF} inscriptions...`);
  const inscriptionRepo = dataSource.getRepository(Inscription);
  const usedEmails = new Set<string>();

  const buildInscriptions = (statut: InscriptionStatut, count: number): Partial<Inscription>[] =>
    Array.from({ length: count }, () => {
      const prenom = pick(PRENOMS_TN);
      const nom    = pick(NOMS_TN);
      return {
        nom, prenom,
        email:     uniqueEmail(prenom, nom, usedEmails),
        telephone: genTelTN(),
        programme: pick(PROGRAMMES),
        password:  hash('Apprenant@123'),
        statut,
        isAccountVerified: statut !== InscriptionStatut.NOT_VERIFIED,
        verifyToken: null,
      };
    });

  const allInscriptions = [
    ...buildInscriptions(InscriptionStatut.ACCEPTED,    CFG.NB_ACCEPTED),
    ...buildInscriptions(InscriptionStatut.REJECTED,    CFG.NB_REJECTED),
    ...buildInscriptions(InscriptionStatut.PENDING,     CFG.NB_PENDING),
    ...buildInscriptions(InscriptionStatut.NOT_VERIFIED,CFG.NB_NOT_VERIF),
  ];

  const savedInscriptions = await saveBatch<Inscription>(inscriptionRepo, allInscriptions);
  console.log(`✅ ${savedInscriptions.length} inscriptions créées\n`);

  // ═══════════════════════════════════════════════
  // ÉTAPE 2 — USERS + APPRENANTS
  // ═══════════════════════════════════════════════
  console.log(`👤 Création de ${CFG.NB_ACCEPTED} users + apprenants...`);
  const userRepo      = dataSource.getRepository(User);
  const apprenantRepo = dataSource.getRepository(Apprenant);

  const acceptedInscriptions = savedInscriptions.filter(i => i.statut === InscriptionStatut.ACCEPTED);

  const usersToCreate: Partial<User>[] = acceptedInscriptions.map(ins => ({
    nom: ins.nom, prenom: ins.prenom, email: ins.email,
    password: ins.password,
    role: UserRole.APPRENANT,
    status: UserStatus.ACCEPTED,
    isActive: Math.random() > 0.04,
    phone: ins.telephone ?? undefined,
    resetToken: null, resetTokenExpiry: null, profileImage: null,
  }));

  const savedUsers = await saveBatch<User>(userRepo, usersToCreate);
  console.log(`   ✅ ${savedUsers.length} users créés`);

  const apprenantToCreate: Partial<Apprenant>[] = savedUsers.map(u => ({ userId: u.id }));
  const createdApprenants = await saveBatch<Apprenant>(apprenantRepo, apprenantToCreate);
  console.log(`   ✅ ${createdApprenants.length} apprenants créés\n`);

  // ═══════════════════════════════════════════════
  // ÉTAPE 3a — FORMATEURS (20)
  // ═══════════════════════════════════════════════
  console.log('👨‍🏫 Création des formateurs...');
  const formateurRepo = dataSource.getRepository(Formateur);

  const SPECIALITES = [
    'Développement Web','Data Science & IA','Cybersécurité','Marketing Digital',
    'Gestion de Projet','Comptabilité & Finance','Développement Mobile',
    'Cloud Computing','DevOps','Business Intelligence','Réseaux & Télécoms',
    'Infographie & Design','UX/UI Design','Big Data','Blockchain',
    'Intelligence Artificielle','Automatisation','ERP & SAP','Linux & Administration','Virtualisation',
  ];

  const formateursData: Partial<Formateur>[] = SPECIALITES.map((specialite, i) => {
    const prenom = i % 2 === 0 ? pick(PRENOMS_H_TN) : pick(PRENOMS_F_TN);
    const nom    = pick(NOMS_TN);
    return {
      nom, prenom, specialite,
      email:     `${prenom.toLowerCase()}.${nom.toLowerCase().replace(/\s/g,'')}.f@formateur.tn`,
      telephone: genTelTN(),
    };
  });

  const savedFormateurs = await formateurRepo.save(formateursData);
  console.log(`✅ ${savedFormateurs.length} formateurs créés\n`);

  // ═══════════════════════════════════════════════
  // ÉTAPE 3b — FORMATIONS (15)
  // ═══════════════════════════════════════════════
  console.log('📚 Création des formations...');
  const formationRepo = dataSource.getRepository(Formation);

  const formationsConfig = [
    { titre:'Développement Web Full Stack',              categorie:'Informatique', dureeHeures:120, prix:1800, statut:FormationStatus.ACTIVE    },
    { titre:'Data Science & Intelligence Artificielle', categorie:'Informatique', dureeHeures:100, prix:2200, statut:FormationStatus.ACTIVE    },
    { titre:'Cybersécurité & Ethical Hacking',           categorie:'Informatique', dureeHeures:80,  prix:1950, statut:FormationStatus.ACTIVE    },
    { titre:'Marketing Digital & Réseaux Sociaux',       categorie:'Marketing',    dureeHeures:60,  prix:1200, statut:FormationStatus.ACTIVE    },
    { titre:'Gestion de Projet Agile',                   categorie:'Management',   dureeHeures:40,  prix:900,  statut:FormationStatus.COMPLETED },
    { titre:'Comptabilité & Fiscalité Tunisienne',        categorie:'Finance',      dureeHeures:70,  prix:1400, statut:FormationStatus.ACTIVE    },
    { titre:'Développement Mobile React Native',         categorie:'Informatique', dureeHeures:90,  prix:1700, statut:FormationStatus.ACTIVE    },
    { titre:'Cloud Computing & AWS',                     categorie:'Informatique', dureeHeures:80,  prix:2000, statut:FormationStatus.ACTIVE    },
    { titre:'DevOps & CI/CD',                            categorie:'Informatique', dureeHeures:75,  prix:1850, statut:FormationStatus.ACTIVE    },
    { titre:'Business Intelligence & Power BI',          categorie:'Data',         dureeHeures:50,  prix:1300, statut:FormationStatus.ACTIVE    },
    { titre:'Réseaux & Télécommunications',               categorie:'Informatique', dureeHeures:65,  prix:1100, statut:FormationStatus.COMPLETED },
    { titre:'Infographie & Design Graphique',             categorie:'Design',       dureeHeures:55,  prix:1050, statut:FormationStatus.ACTIVE    },
    { titre:'UX/UI Design',                              categorie:'Design',       dureeHeures:45,  prix:980,  statut:FormationStatus.ACTIVE    },
    { titre:'Big Data & Hadoop',                         categorie:'Data',         dureeHeures:85,  prix:2100, statut:FormationStatus.ACTIVE    },
    { titre:'Automatisation & RPA',                      categorie:'Informatique', dureeHeures:50,  prix:1600, statut:FormationStatus.ACTIVE    },
  ];

  const savedFormations = await formationRepo.save(
    formationsConfig.map(f => formationRepo.create({
      titre: f.titre,
      description: faker.lorem.paragraphs(2),
      categorie: f.categorie,
      dureeHeures: f.dureeHeures,
      prix: f.prix,
      statut: f.statut,
    }))
  );
  console.log(`✅ ${savedFormations.length} formations créées\n`);

  // ═══════════════════════════════════════════════
  // ÉTAPE 3c — SESSIONS (200)
  // ═══════════════════════════════════════════════
  console.log(`🗓  Création de ${CFG.NB_SESSIONS} sessions...`);
  const sessionRepo = dataSource.getRepository(Session);
  const savedSessions: Session[] = [];
  const GROUPES = ['Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta','Iota','Kappa','Lambda','Mu'];

  for (let s = 0; s < CFG.NB_SESSIONS; s++) {
    const formation  = savedFormations[s % savedFormations.length];
    const formateur  = pick(savedFormateurs);
    const sessionDate = faker.date.between({ from: CFG.DATE_START, to: CFG.DATE_END });
    const isOld = sessionDate < new Date('2024-01-01');

    const statut = isOld
      ? pick([SessionStatut.TERMINE, SessionStatut.TERMINE, SessionStatut.TERMINE, SessionStatut.ANNULE])
      : pick([SessionStatut.ACTIF, SessionStatut.ACTIF, SessionStatut.TERMINE]);

    const type     = Math.random() > 0.28 ? SessionType.PRESENTIEL : SessionType.EN_LIGNE;
    const hD       = pick(HEURES_DEBUT);
    const hF       = `${String(parseInt(hD) + 8).padStart(2,'0')}:${hD.split(':')[1]}`;
    const prix     = parseFloat((formation.prix * randFloat(0.88, 1.12)).toFixed(2));
    const coutF    = parseFloat((formation.prix * randFloat(0.22, 0.38)).toFixed(2));
    const coutL    = type === SessionType.EN_LIGNE ? 0 : randFloat(60, 350, 2);
    const capacite = randInt(8, 30);
    const ville    = type === SessionType.EN_LIGNE ? 'En ligne' : pick(VILLES_TN);

    const session = sessionRepo.create({
      title: `Groupe ${pick(GROUPES)} — ${formation.titre.split(' ').slice(0, 3).join(' ')} ${sessionDate.getFullYear()}`,
      formation, formationId: formation.id,
      formateur, formateurId: formateur.id,
      statut, date: toDateStr(sessionDate),
      heureDebut: hD, heureFin: hF,
      lieu: ville, type, prix, capacite,
      cout_formateur: coutF,
      cout_logistique: coutL,
      apprenants: [],
    });

    const saved = await sessionRepo.save(session);
    savedSessions.push(saved);
    process.stdout.write(`\r   → ${s + 1} / ${CFG.NB_SESSIONS}`);
  }
  console.log(`\n✅ ${savedSessions.length} sessions créées\n`);

  // ═══════════════════════════════════════════════
  // ÉTAPE 4 — SESSIONS_APPRENANTS
  // ═══════════════════════════════════════════════
  console.log('🔗 Attribution des apprenants aux sessions...');
  let totalAssigned = 0;
  const assignments: { session: Session; apprenants: Apprenant[] }[] = [];

  for (let i = 0; i < savedSessions.length; i++) {
    const session  = savedSessions[i];
    const maxCap   = session.capacite ?? 20;
    const count    = randInt(Math.floor(maxCap * 0.5), maxCap);
    const pool     = shuffle(createdApprenants).slice(0, count);

    session.apprenants = pool;
    await sessionRepo.save(session);
    assignments.push({ session, apprenants: pool });
    totalAssigned += pool.length;
    process.stdout.write(`\r   → session ${i + 1} / ${savedSessions.length} (${totalAssigned} apprenants assignés)`);
  }
  console.log(`\n✅ ${totalAssigned} lignes sessions_apprenants créées\n`);

  // ═══════════════════════════════════════════════
  // ÉTAPE 5a — PRESENCES
  // ═══════════════════════════════════════════════
  console.log('✔  Création des présences...');
  const presenceRepo = dataSource.getRepository(Presence);
  let presenceCount  = 0;

  for (const { session, apprenants } of assignments) {
    const presences: Partial<Presence>[] = apprenants.map(apprenant => ({
      session, sessionId: session.id,
      apprenant, apprenantId: apprenant.id,
      estPresent: Math.random() > 0.15,   // 85% présents
      dateMarquage: new Date(session.date),
    }));
    await saveBatch<Presence>(presenceRepo, presences, 200);
    presenceCount += presences.length;
  }
  console.log(`✅ ${presenceCount} présences créées\n`);

  // ═══════════════════════════════════════════════
  // ÉTAPE 5b — FINANCES
  // ═══════════════════════════════════════════════
  console.log('💰 Création des finances...');
  const financeRepo  = dataSource.getRepository(Finance);
  let financeCount   = 0;

  for (const { session, apprenants } of assignments) {
    const prixS = Number(session.prix) || Number(session.formation?.prix) || 1500;
    const finances: Partial<Finance>[] = [];

    for (const apprenant of apprenants) {
      const r = Math.random();

      if (r < 0.55) {
        // Paiement intégral
        finances.push({
          montant: prixS, type: FinanceType.PAIEMENT,
          session, sessionId: session.id,
          apprenant, apprenantId: apprenant.id,
          description: `Paiement intégral — ${session.title}`,
        });
      } else if (r < 0.70) {
        // 2 versements
        const v1 = parseFloat((prixS * randFloat(0.4, 0.6)).toFixed(2));
        finances.push(
          { montant: v1,       type: FinanceType.PAIEMENT, session, sessionId: session.id, apprenant, apprenantId: apprenant.id, description: `1er versement — ${session.title}` },
          { montant: prixS-v1, type: FinanceType.PAIEMENT, session, sessionId: session.id, apprenant, apprenantId: apprenant.id, description: `2ème versement — ${session.title}` },
        );
      } else if (r < 0.82) {
        // Acompte + impayé
        const acompte = parseFloat((prixS * randFloat(0.3, 0.55)).toFixed(2));
        finances.push(
          { montant: acompte,       type: FinanceType.PAIEMENT, session, sessionId: session.id, apprenant, apprenantId: apprenant.id, description: `Acompte — ${session.title}` },
          { montant: prixS-acompte, type: FinanceType.IMPAYE,   session, sessionId: session.id, apprenant, apprenantId: apprenant.id, description: `Solde impayé — ${session.title}` },
        );
      } else if (r < 0.91) {
        // Impayé total
        finances.push({
          montant: prixS, type: FinanceType.IMPAYE,
          session, sessionId: session.id,
          apprenant, apprenantId: apprenant.id,
          description: `Impayé total — ${session.title}`,
        });
      } else {
        // Remboursement
        finances.push(
          { montant: prixS, type: FinanceType.PAIEMENT,      session, sessionId: session.id, apprenant, apprenantId: apprenant.id, description: `Paiement initial — ${session.title}` },
          { montant: prixS, type: FinanceType.REMBOURSEMENT, session, sessionId: session.id, apprenant, apprenantId: apprenant.id, description: `Remboursement annulation — ${session.title}` },
        );
      }
    }

    // Dépenses fixes par session
    finances.push({
      montant: Number(session.cout_formateur),
      type: FinanceType.DEPENSE_FORMATEUR,
      session, sessionId: session.id,
      apprenant: null, apprenantId: null,
      description: `Honoraires formateur — ${session.title}`,
    });

    if (Number(session.cout_logistique) > 0) {
      finances.push({
        montant: Number(session.cout_logistique),
        type: FinanceType.DEPENSE_LOGISTIQUE,
        session, sessionId: session.id,
        apprenant: null, apprenantId: null,
        description: `Logistique salle — ${session.title}`,
      });
    }

    await saveBatch<Finance>(financeRepo, finances, 200);
    financeCount += finances.length;
  }
  console.log(`✅ ${financeCount} entrées finances créées\n`);

  // ═══════════════════════════════════════════════
  // ÉTAPE 5c — SATISFACTION
  // ═══════════════════════════════════════════════
  console.log('⭐ Création des satisfactions...');
  const satisfactionRepo = dataSource.getRepository(Satisfaction);
  let satisfactionCount  = 0;

  for (const { session, apprenants } of assignments) {
    if (session.statut !== SessionStatut.TERMINE) continue;

    const satisfactions: Partial<Satisfaction>[] = apprenants
      .filter(() => Math.random() > 0.20) // 80% donnent un avis
      .map(apprenant => ({
        apprenant,
        formation: session.formation,
        note: randFloat(2.0, 5.0, 1),
        commentaire: Math.random() > 0.30 ? pick(COMMENTAIRES_TN) : undefined,
      }));

    if (satisfactions.length > 0) {
      await saveBatch<Satisfaction>(satisfactionRepo, satisfactions, 200);
      satisfactionCount += satisfactions.length;
    }
  }
  console.log(`✅ ${satisfactionCount} satisfactions créées\n`);

  // ═══════════════════════════════════════════════
  // ÉTAPE 5d — PERFORMANCES
  // ═══════════════════════════════════════════════
  console.log('📊 Création des performances...');
  const performanceRepo = dataSource.getRepository(Performance);
  let performanceCount  = 0;

  for (const { session, apprenants } of assignments) {
    if (session.statut !== SessionStatut.TERMINE) continue;

    const performances: Partial<Performance>[] = apprenants.map(apprenant => {
      const note = randFloat(4, 20, 1);
      return { apprenant, session, formation: session.formation, note, estReussi: note >= 10 };
    });

    await saveBatch<Performance>(performanceRepo, performances, 200);
    performanceCount += performances.length;
  }
  console.log(`✅ ${performanceCount} performances créées\n`);

  // ═══════════════════════════════════════════════
  // RÉSUMÉ FINAL
  // ═══════════════════════════════════════════════
  const nbTerminees = savedSessions.filter(s => s.statut === SessionStatut.TERMINE).length;
  const nbActives   = savedSessions.filter(s => s.statut === SessionStatut.ACTIF).length;
  const nbAnnulees  = savedSessions.filter(s => s.statut === SessionStatut.ANNULE).length;

  console.log('══════════════════════════════════════════════════════════');
  console.log('  ✅  SEED TERMINÉ AVEC SUCCÈS');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  📝 Inscriptions            : ${savedInscriptions.length}`);
  console.log(`      ✅ Acceptées           : ${CFG.NB_ACCEPTED}`);
  console.log(`      ❌ Rejetées            : ${CFG.NB_REJECTED}`);
  console.log(`      ⏳ En attente          : ${CFG.NB_PENDING}`);
  console.log(`      📧 Non vérifiées       : ${CFG.NB_NOT_VERIF}`);
  console.log(`  👤 Users + Apprenants      : ${createdApprenants.length}`);
  console.log(`  👨‍🏫 Formateurs              : ${savedFormateurs.length}`);
  console.log(`  📚 Formations              : ${savedFormations.length}`);
  console.log(`  🗓  Sessions               : ${savedSessions.length}`);
  console.log(`      ✅ Terminées           : ${nbTerminees}`);
  console.log(`      🔵 Actives             : ${nbActives}`);
  console.log(`      ❌ Annulées            : ${nbAnnulees}`);
  console.log(`  🔗 sessions_apprenants     : ${totalAssigned}`);
  console.log(`  ✔  Présences               : ${presenceCount}`);
  console.log(`  💰 Finances                : ${financeCount}`);
  console.log(`  ⭐ Satisfactions           : ${satisfactionCount}`);
  console.log(`  📊 Performances            : ${performanceCount}`);
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  📦 TOTAL LIGNES DB         : ~${
    savedInscriptions.length + createdApprenants.length + savedUsers.length +
    savedFormateurs.length + savedFormations.length + savedSessions.length +
    totalAssigned + presenceCount + financeCount + satisfactionCount + performanceCount
  }`);
  console.log('══════════════════════════════════════════════════════════\n');
}