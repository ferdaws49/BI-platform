import random
import uuid
import os
import sys
from datetime import datetime, timedelta, time

# --- CONFIGURATION SUPABASE ---
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.eupoualsvpooxtadhiam:ZbRT6jz1aGqgnAZB@aws-1-eu-west-3.pooler.supabase.com:5432/postgres"
)

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    os.system(f"{sys.executable} -m pip install psycopg2-binary")
    import psycopg2
    from psycopg2.extras import execute_values

# --- CONFIGURATION PÉRIODE ---
START_DATE = datetime(2025, 5, 27)
END_DATE   = datetime(2026, 5, 27)
PLAN_DATE = datetime(2026, 12, 31)

# --- RÉFÉRENTIELS ---
TUN_NOMS    = ["Trabelsi","Ghorbel","Ben Amor","Chaari","Masmoudi","Karray","Haddad",
               "Zouari","Abid","Jallouli","Sfar","Elloumi","Baccar","Bouaziz","Gargouri",
               "Mejri","Ben Salem","Khemiri","Jlassi","Dridi","Bennour","Selmi","Hamdi",
               "Gharbi","Zidi","Amari","Cherif","Said","Nasr","Mhenni"]
TUN_PRENOMS = ["Anis","Sonia","Yassine","Meriem","Skander","Olfa","Hamza","Ines","Mehdi",
               "Leila","Walid","Sarra","Khaled","Amira","Zied","Faten","Hichem","Moez",
               "Rania","Bilel","Amel","Tarek","Nadia","Sami","Hela","Fedi","Eya","Omar","Salma","Ali"]

TITRES_FORMATIONS = {
    "IT": ["Développement Fullstack JS","Expertise Cloud AWS","Mobile Flutter & Dart",
           "Data Engineering","Cybersécurité Offensive","Intelligence Artificielle",
           "DevOps & Docker","Architecture Microservices","React & Next.js","Java Spring Boot",
           "Node.js Backend","SQL & NoSQL Expert","Test & QA Automatisé","Réseaux Cisco Pro","Blockchain Web3"],
    "Business": ["Marketing Digital & SEO","Audit Financier","Management d'Équipe",
                 "Négociation B2B","RH Tunisienne","E-commerce Growth","Comptabilité Analytique",
                 "Finance d'Entreprise","Supply Chain Pro","Stratégie de Marque",
                 "Vente & Relation Client","Export & Douane","Leadership Exécutif",
                 "Gestion de Projet PMP","Entreprenariat"],
    "Design": ["UI/UX Design Mobile","Branding & Identité","Motion Design After Effects",
               "Adobe Suite Masterclass","Design de Comm","Illustration Digitale","Design d'Espace",
               "Typographie & Print","Product Design","Figma Design System",
               "Montage Vidéo Pro","3D Blender Master","Photographie Pro","Design Durable","Portfolio Créatif"]
}

TITRES_SESSIONS = ["Cohorte Intensive","Bootcamp Pro","Session Executive","Atelier Pratique",
                   "Workshop Spécialisé","Promo Automne","Cycle de Printemps","Formation de Soir"]

# Saisonnalité tunisienne
SEASON_MAP = {1:1.3, 2:1.3, 3:1.1, 4:0.8, 5:1.0, 6:1.0, 7:0.5, 8:0.4, 9:1.4, 10:1.5, 11:0.9, 12:0.8}
SALLES = ["Salle A", "Salle B", "Salle C", "Salle D", "Salle E"]
LIEN_MEET = "https://meet.google.com/abc-defg-hij"

# AVANT (fixe ~6.4 inscrits/session)
num_stud = random.choices([2, 4, 6, 8, 10, 12], [0.10, 0.20, 0.30, 0.25, 0.10, 0.05])[0]

# APRÈS (variable selon le "succès" de la session)
def get_nb_inscrits(capacite, mois):
    """
    Retourne le nombre d'inscrits avec variation réaliste
    """
    # Taux de remplissage selon le "succès" de la session
    taux_remplissage = random.choices(
        [0.15, 0.35, 0.60, 0.85, 1.0],  # faible, moyen-faible, normal, bon, complet
        [0.15, 0.20, 0.35, 0.20, 0.10]  # 15% faible, 35% normal, 10% complet
    )[0]
    saison_mult = SEASON_MAP.get(mois, 1.0)
    taux_remplissage *= saison_mult
    
    # Ajustement saisonnier
    if mois in [7, 8]:  # Été
        taux_remplissage *= 0.6
    elif mois in [9, 10]:  # Rentrée
        taux_remplissage *= 1.2
    elif mois in [3, 4]:  # Ramadan
        taux_remplissage *= 0.65
    
    nb_inscrits = max(1, int(capacite * taux_remplissage))
    return nb_inscrits

def get_unique_names(n):
    names = set()
    while len(names) < n:
        names.add(f"{random.choice(TUN_PRENOMS)} {random.choice(TUN_NOMS)}")
    return list(names)

def run_seed():
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=10)
        cur  = conn.cursor()
        print("🚀 Lancement du Seed Engine ML v5.0 (Final)...")

        cur.execute("""TRUNCATE public.inscriptions, public.users, public.apprenants,
                       public.formations, public.formateur, public.sessions,
                       public.sessions_apprenants, public.presences, public.performance,
                       public.finances, public.satisfaction CASCADE;""")

        # ── 1. FORMATIONS (45) ──────────────────────────────────────────────
        form_meta    = {}
        formations_db = []
        f_idx = 1
        for cat, titres in TITRES_FORMATIONS.items():
            for t in titres:
                if cat == "IT":
                    p_base = random.randint(150, 350)
                elif cat == "Business":
                    p_base = random.randint(100, 250)
                else:
                    p_base = random.randint(80, 180)
                formations_db.append((f_idx, t, "Formation certifiante", cat,
                                       random.randint(30, 60), p_base * 4,
                                       'active', START_DATE, START_DATE))
                form_meta[f_idx] = {"cat": cat, "price": p_base}
                f_idx += 1
        execute_values(cur,
            """INSERT INTO public.formations
               (id, titre, description, categorie, "dureeHeures", prix, statut, "createdAt", "updatedAt")
               VALUES %s""", formations_db)

        # ── 2. FORMATEURS (30) ──────────────────────────────────────────────
        f_names      = get_unique_names(30)
        formateurs_db = []
        for i, name in enumerate(f_names, 1):
            p, n = name.split(' ', 1)
            formateurs_db.append((i, n, p, f"{p.lower()}.{n.lower()}@expert.tn",
                                   "Expert", f"+2169{random.randint(10,99)}000"))
        execute_values(cur,
            "INSERT INTO public.formateur (id, nom, prenom, email, specialite, telephone) VALUES %s",
            formateurs_db)

        # ── 3. APPRENANTS (700) — 600 forcés accepted ───────────────────────
        a_names     = get_unique_names(700)
        app_profiles = {}   # {apprenant_id: "GOOD"|"AVG"|"WEAK"}
        users_db, app_db, insc_db = [], [], []

        for i, name in enumerate(a_names, 1):
            p, n   = name.split(' ', 1)
            email  = f"{p.lower()}.{n.lower()}{i}@gmail.com"
            # 600 premiers → accepted, 100 derniers → autres statuts
            if i <= 600:
                status = 'accepted'
            else:
                status = random.choices(
                    ['rejected', 'pending', 'not_verified'], [0.4, 0.3, 0.3])[0]

            token = uuid.uuid4().hex if status == 'not_verified' else None
            insc_db.append((i, n, p, email, "+21622", "Programme", "pwd",
                             status, token, START_DATE, status == 'accepted'))

            if status == 'accepted':
                users_db.append((i, email, "hash", 'apprenant', 'accepted',
                                  True, START_DATE, START_DATE, n, p))
                app_db.append((i, i, START_DATE))
                app_profiles[i] = random.choices(["GOOD","AVG","WEAK"], [0.2, 0.6, 0.2])[0]

        execute_values(cur,
            """INSERT INTO public.inscriptions
               (id, nom, prenom, email, telephone, programme, password, statut,
                "verifyToken", "createdAt", "isAccountVerified") VALUES %s""", insc_db)
        execute_values(cur,
            """INSERT INTO public.users
               (id, email, password, role, status, "isActive", "createdAt", "updatedAt", nom, prenom)
               VALUES %s""", users_db)
        execute_values(cur,
            'INSERT INTO public.apprenants (id, "userId", "dateAccepted") VALUES %s', app_db)

        print(f"  ✓ {len(app_profiles)} apprenants acceptés disponibles pour les sessions")

        # ── 4. SESSIONS & FINANCES ───────────────────────────────────────────
        print("📅 Génération des Sessions et Finances...")
        sessions_db = []
        sa_links    = []
        finances_db = []
        pres_db     = []
        perf_db     = []
        sat_db      = []

        # Compteurs pour la synthèse finale
        total_billed = 0.0   # CA facturé  = paiements + impayés
        total_cash   = 0.0   # CA réalisé  = paiements uniquement
        total_exp    = 0.0   # Dépenses totales

        available_apps = list(app_profiles.keys())  # liste stable des IDs acceptés

        current_date = START_DATE
        while current_date < PLAN_DATE:
            month  = current_date.month
            m_mult = SEASON_MAP[month] * random.gauss(1, 0.1)

            # Effet Ramadan (mars-avril 2026)
            if current_date.year == 2026 and month in (3, 4):
                m_mult *= 0.65

            if current_date <END_DATE:
                # ── Charges fixes mensuelles ────────────────────────────────────
                finances_db.append((1500.0, 'depense_logistique', None,
                "Loyer Mensuel", current_date, None, current_date, None))
                finances_db.append((1250.0, 'depense_logistique', None,
                "Salaires Admin", current_date, None, current_date, None))
                total_exp += 2750.0

            # ── Sessions du mois ────────────────────────────────────────────
            num_sess = max(1, int(20 * m_mult))
            for _ in range(num_sess):
                sid   = str(uuid.uuid4())
                fid   = random.randint(1, 45)
                f_id  = random.randint(1, 30)

                # Prix unitaire par apprenant avec bruit ±8%
                prix_unitaire = round(form_meta[fid]["price"] * random.gauss(1, 0.12))
                prix_unitaire = max(50, prix_unitaire)  # plancher 50 DT
                type_session = random.choices(['présentiel', 'en_ligne'], [0.7, 0.3])[0]  # 70% présentiel, 30% en ligne
                if type_session == 'présentiel':
                    lieu = random.choice(SALLES)
                    # Capacité selon catégorie pour présentiel
                    if form_meta[fid]["cat"] == "IT":
                        capacite = random.choice([15, 20, 25])
                    elif form_meta[fid]["cat"] == "Business":
                        capacite = random.choice([20, 30, 40, 50])
                    else:  # Design
                        capacite = random.choice([10, 15, 20])
                else:
                    lieu = LIEN_MEET
                    # En ligne : capacité plus grande (pas de contrainte physique)
                    capacite = random.choice([50, 100, 200, 500])

                s_date   = current_date + timedelta(days=random.randint(0, 27))

                if current_date < END_DATE:
                    status_s = random.choices(['Completed','Cancelled'], [0.93, 0.07])[0]
                else:
                    status_s = random.choices(['Active', 'Cancelled'], [0.9, 0.1])[0]
                title    = f"{random.choice(TITRES_SESSIONS)} {form_meta[fid]['cat']}"
                nb_inscrits = get_nb_inscrits(capacite, current_date.month)
                # Sélection des apprenants
                selected_apps = random.sample(available_apps, min(nb_inscrits, len(available_apps)))
                # Log pour voir la variation
                remplissage = len(selected_apps) / capacite * 100
                print(f"  Session {title[:30]:<<30} | Capacité: {capacite:>3} | Inscrits: {len(selected_apps):>3} | {remplissage:>5.1f}%")

                sessions_db.append((sid, s_date.date(), time(9,0), time(18,0),
                                     lieu, status_s, fid, f_id,
                                     s_date, s_date, prix_unitaire, type_session, capacite, title))

                if current_date >= END_DATE:
                    continue 
                if status_s != 'Completed':
                    continue  # session annulée → pas de finances apprenants

                # ── Inscrits de cette session ───────────────────────────────
                # Distribution réaliste : sessions quasi-vides à complètes
                #--------------------# Le code prend le vrai nombre d'inscrits saisonnier calculé selon la capacité-----------------
                #-----------num_stud   = min(nb_inscrits, len(available_apps))------------------------------hedha ki nheb n9awi el prediction(R²) lezem nbadelha
                nb_choices = [2, 4, 6, 8, 10, 12]
                nb_weights = [0.10, 0.20, 0.30, 0.25, 0.10, 0.05]
                num_stud   = random.choices(nb_choices, nb_weights)[0]
                num_stud   = min(num_stud, len(available_apps))


                selected_apps = random.sample(available_apps, num_stud)

                # ── Coût formateur = 35% du revenu total de la session ──────
                # revenu_session = prix unitaire × nombre d'apprenants inscrits
                revenu_session = prix_unitaire * num_stud
                f_cost = round(revenu_session * 0.35, 2)
                finances_db.append((f_cost, 'depense_formateur', sid,
                                     "Honoraires", s_date, None, s_date, f_id))

                # ── Logistique variable ─────────────────────────────────────
                l_cost = float(random.randint(25, 50))
                finances_db.append((l_cost, 'depense_logistique', sid,
                                     "Logistique Session", s_date, None, s_date, None))

                total_exp += f_cost + l_cost

                # ── Finance par apprenant (75/15/10) ───────────────────────
                for aid in selected_apps:
                    sa_links.append((aid, sid))

                    # CE QUI EST DÛ par cet apprenant = prix unitaire
                    montant_du = prix_unitaire
                    total_billed += montant_du  # ← compté ici, UNE FOIS par apprenant

                    r = random.random()
                    if r < 0.75:
                        # Paiement total
                        finances_db.append((montant_du, 'paiement', sid,
                                             "Paiement Total", s_date, aid, s_date, None))
                        total_cash += montant_du

                    elif r < 0.90:
                        # Paiement partiel : 60% payé + 40% impayé
                        paye    = round(montant_du * 0.60, 2)
                        restant = round(montant_du - paye, 2)
                        finances_db.append((paye, 'paiement', sid,
                                             "Acompte 60%", s_date, aid, s_date, None))
                        finances_db.append((restant, 'impaye', sid,
                                             "Reliquat 40%", s_date, aid, s_date, None))
                        total_cash += paye

                    else:
                        # Impayé total
                        finances_db.append((montant_du, 'impaye', sid,
                                             "Impayé", s_date, aid, s_date, None))

                    # ── Présence ───────────────────────────────────────────
                    prof     = app_profiles[aid]
                    is_pres  = random.random() < (0.95 if prof == "GOOD" else 0.50)
                    pres_db.append((str(uuid.uuid4()), sid, aid, is_pres, s_date))

                    # ── Performance ────────────────────────────────────────
                    mu   = 15 if prof == "GOOD" else (10 if prof == "AVG" else 6)
                    note = round(max(0.0, min(20.0, random.gauss(mu, 2))), 2)
                    perf_db.append((note, note >= 10, s_date, aid, fid, sid))

                    # ── Satisfaction (90% répondent) ───────────────────────
                    if random.random() < 0.90:
                        sat_note = round(max(1.0, min(5.0, random.gauss(4.0, 0.5))), 1)
                        sat_db.append((sat_note, "Bien", s_date, aid, fid))

            # Mois suivant
            current_date = (current_date + timedelta(days=32)).replace(day=1)

        # ── 5. INSERTIONS ────────────────────────────────────────────────────
        print("💾 Insertion des données en base...")
        execute_values(cur,
            """INSERT INTO public.sessions
               (id, date, "heureDebut", "heureFin", lieu, statut, "formationId", "formateurId",
                "createdAt", "updatedAt", prix, type, capacite, title) VALUES %s""",
            sessions_db)
        execute_values(cur,
            """INSERT INTO public.finances
               (montant, type, "sessionId", description, date, "apprenantId", "updatedAt", "formateurId")
               VALUES %s""",
            finances_db)
        execute_values(cur,
            'INSERT INTO public.sessions_apprenants ("apprenantId", "sessionId") VALUES %s',
            sa_links)
        execute_values(cur,
            """INSERT INTO public.presences
               (id, "sessionId", "apprenantId", "estPresent", "dateMarquage") VALUES %s""",
            pres_db)
        execute_values(cur,
            """INSERT INTO public.performance
               (note, "estReussi", date, "apprenantId", "formationId", "sessionId") VALUES %s""",
            perf_db)
        execute_values(cur,
            """INSERT INTO public.satisfaction
               (note, commentaire, "createdAt", "apprenantId", "formationId") VALUES %s""",
            sat_db)

        conn.commit()

        # ── 6. SYNTHÈSE FINALE ───────────────────────────────────────────────
        taux_rec   = (total_cash / total_billed * 100) if total_billed > 0 else 0
        encours    = total_billed - total_cash
        marge_cash = ((total_cash - total_exp) / total_cash * 100) if total_cash > 0 else 0

        print("\n" + "="*55)
        print("  SYNTHÈSE COMPTABLE FINALE")
        print("="*55)
        print(f"  Sessions générées    : {len(sessions_db)}")
        print(f"  Inscriptions totales : {len(sa_links)}")
        print(f"  Apprenants uniques   : {len(app_profiles)}")
        print("-"*55)
        print(f"  CA Facturé           : {total_billed:>12,.2f} DT")
        print(f"  CA Réalisé (cash)    : {total_cash:>12,.2f} DT")
        print(f"  Encours client       : {encours:>12,.2f} DT")
        print(f"  Taux de recouvrement : {taux_rec:>11.1f} %")
        print("-"*55)
        print(f"  Dépenses totales     : {total_exp:>12,.2f} DT")
        print(f"  Marge nette / cash   : {marge_cash:>11.1f} %")
        print("="*55)

        # ── Assertions de cohérence ──────────────────────────────────────────
        assert total_billed > 100_000, f"CA trop bas : {total_billed:,.0f} DT"
        assert 0.75 <= taux_rec/100 <= 0.90, f"Recouvrement anormal : {taux_rec:.1f}%"
        assert total_cash > total_exp, f"TRÉSORERIE NÉGATIVE : cash={total_cash:,.0f} < dépenses={total_exp:,.0f}"
        assert encours / total_billed <= 0.30, f"Encours trop élevé : {encours/total_billed:.1%}"
        print("  ✅ Toutes les assertions passées — données cohérentes")

    except AssertionError as e:
        print(f"\n  ⚠️  ALERTE COHÉRENCE : {e}")
        if conn: conn.rollback()
    except Exception as e:
        print(f"\n  ❌ Erreur : {e}")
        import traceback; traceback.print_exc()
        if conn: conn.rollback()
    finally:
        if conn: conn.close()

if __name__ == "__main__":
    run_seed()