#pip install psycopg2-binary
#python generate_seed.py dans \backend\seed
"""
Script de génération de données de test réalistes pour une plateforme BI de centre de formation tunisien.
- 3+ ans de données
- 300+ sessions, 20 formations, 10+ formateurs, 100+ apprenants, 5000+ entrées finance
- Données cohérentes avec hiérarchie stricte
- Bruit intégré pour le bon fonctionnement du module ML
"""

import random
import uuid
import json
import hashlib
from datetime import datetime, timedelta, date, time
from decimal import Decimal

random.seed(42)

# ─────────────────────────────────────────────
# DONNÉES TUNISIENNES RÉALISTES
# ─────────────────────────────────────────────

NOMS_TUNISIENS = [
    "Ben Ali", "Trabelsi", "Chaabane", "Mansouri", "Hamdi", "Jebali", "Marzougui",
    "Saidi", "Ferchichi", "Belhaj", "Agrebi", "Boughattas", "Zouari", "Khlifi",
    "Chtourou", "Guesmi", "Mejri", "Abidi", "Tlili", "Dridi", "Jouini", "Hammami",
    "Nasr", "Riahi", "Gharbi", "Ayari", "Hasnaoui", "Selmi", "Karray", "Baraket",
    "Oueslati", "Cherif", "Ammar", "Baccar", "Boujemaa", "Dhouib", "Elloumi",
    "Fehri", "Ghorbel", "Haddad", "Jabeur", "Kaabar", "Laabidi", "Marzouki",
    "Nefzi", "Omrani", "Rekik", "Sfar", "Touati", "Weslati"
]

PRENOMS_MASCULINS = [
    "Mohamed", "Ahmed", "Ali", "Omar", "Youssef", "Karim", "Mehdi", "Amine",
    "Bilel", "Chokri", "Dali", "Fares", "Ghassen", "Hamza", "Islem", "Jawher",
    "Khalil", "Lotfi", "Maher", "Nizar", "Oussama", "Rami", "Seifeddine", "Tarek",
    "Walid", "Zied", "Adel", "Bassem", "Chiheb", "Dhia", "Elyes", "Fethi",
    "Hatem", "Imed", "Jaber", "Khaled", "Lazhar", "Mondher", "Naoufel", "Rafik",
    "Sami", "Taoufik", "Wissem", "Yassine", "Sofien", "Hichem", "Moez"
]

PRENOMS_FEMININS = [
    "Amira", "Boutheina", "Chaima", "Dorra", "Emna", "Fatma", "Ghada", "Hajer",
    "Ines", "Jihen", "Khouloud", "Lamia", "Mariem", "Nadia", "Olfa", "Rania",
    "Sana", "Takoua", "Wafa", "Yasmine", "Zeineb", "Amel", "Besma", "Cyrine",
    "Dalila", "Eya", "Faten", "Hela", "Ibtissem", "Kawther", "Leila", "Manel",
    "Najla", "Rim", "Sarra", "Thouraya", "Wided", "Yosra", "Sirine", "Hanène"
]

PRENOMS_TUNISIENS = PRENOMS_MASCULINS + PRENOMS_FEMININS

VILLES_TUNISIENNES = ["Tunis", "Sfax", "Sousse", "Monastir", "Bizerte", "Nabeul", "Kairouan", "Gabès", "Ariana", "Ben Arous", "La Marsa", "Hammamet"]

FORMATIONS_DATA = [
    {"titre": "Développement Web Full Stack", "categorie": "Informatique", "dureeHeures": 120, "prix": 1800.00},
    {"titre": "Data Science et Machine Learning", "categorie": "Informatique", "dureeHeures": 160, "prix": 2200.00},
    {"titre": "Cybersécurité Fondamentaux", "categorie": "Informatique", "dureeHeures": 80, "prix": 1400.00},
    {"titre": "Comptabilité et Fiscalité Tunisienne", "categorie": "Finance", "dureeHeures": 60, "prix": 900.00},
    {"titre": "Marketing Digital", "categorie": "Marketing", "dureeHeures": 48, "prix": 750.00},
    {"titre": "Gestion de Projet (PMP)", "categorie": "Management", "dureeHeures": 70, "prix": 1100.00},
    {"titre": "Anglais des Affaires", "categorie": "Langues", "dureeHeures": 90, "prix": 600.00},
    {"titre": "Excel Avancé & Power BI", "categorie": "Bureautique", "dureeHeures": 40, "prix": 550.00},
    {"titre": "Ressources Humaines et Droit du Travail", "categorie": "Management", "dureeHeures": 55, "prix": 850.00},
    {"titre": "Développement Mobile (Flutter)", "categorie": "Informatique", "dureeHeures": 100, "prix": 1600.00},
    {"titre": "Cloud Computing AWS", "categorie": "Informatique", "dureeHeures": 90, "prix": 1700.00},
    {"titre": "Commerce International et Export", "categorie": "Commerce", "dureeHeures": 50, "prix": 780.00},
    {"titre": "Photoshop & Illustrator", "categorie": "Design", "dureeHeures": 45, "prix": 480.00},
    {"titre": "Intelligence Artificielle Appliquée", "categorie": "Informatique", "dureeHeures": 80, "prix": 1900.00},
    {"titre": "Leadership et Management d'Équipe", "categorie": "Management", "dureeHeures": 35, "prix": 650.00},
    {"titre": "Logistique et Supply Chain", "categorie": "Commerce", "dureeHeures": 60, "prix": 820.00},
    {"titre": "Python pour la Finance", "categorie": "Finance", "dureeHeures": 55, "prix": 950.00},
    {"titre": "Communication Professionnelle", "categorie": "Développement Personnel", "dureeHeures": 30, "prix": 380.00},
    {"titre": "AutoCAD 2D/3D", "categorie": "Design", "dureeHeures": 70, "prix": 720.00},
    {"titre": "Entrepreneuriat et Création d'Entreprise", "categorie": "Management", "dureeHeures": 40, "prix": 500.00},
]

FORMATEURS_DATA = [
    {"nom": "Ben Salah", "prenom": "Karim",      "email": "k.bensalah@formateur.tn",   "specialite": "Informatique",          "telephone": "+21625314872"},
    {"nom": "Mahjoub",   "prenom": "Sonia",      "email": "s.mahjoub@formateur.tn",    "specialite": "Finance",               "telephone": "+21652871034"},
    {"nom": "Gharbi",    "prenom": "Mohamed",    "email": "m.gharbi@formateur.tn",     "specialite": "Marketing",             "telephone": "+21698231456"},
    {"nom": "Trabelsi",  "prenom": "Hichem",     "email": "h.trabelsi@formateur.tn",   "specialite": "Management",            "telephone": "+21620984531"},
    {"nom": "Khlifi",    "prenom": "Amina",      "email": "a.khlifi@formateur.tn",     "specialite": "Langues",               "telephone": "+21655123789"},
    {"nom": "Ferchichi", "prenom": "Nabil",      "email": "n.ferchichi@formateur.tn",  "specialite": "Informatique",          "telephone": None},
    {"nom": "Zouari",    "prenom": "Lilia",      "email": "l.zouari@formateur.tn",     "specialite": "Design",                "telephone": "+21694567012"},
    {"nom": "Chaabane",  "prenom": "Riadh",      "email": "r.chaabane@formateur.tn",   "specialite": "Commerce",              "telephone": "+21621876543"},
    {"nom": "Mejri",     "prenom": "Tarek",      "email": "t.mejri@formateur.tn",      "specialite": "Informatique",          "telephone": "+21650432198"},
    {"nom": "Belhaj",    "prenom": "Sirine",     "email": "s.belhaj@formateur.tn",     "specialite": "Management",            "telephone": "+21693012345"},
    {"nom": "Oueslati",  "prenom": "Fathi",      "email": "f.oueslati@formateur.tn",   "specialite": "Finance",               "telephone": None},
    {"nom": "Agrebi",    "prenom": "Wafa",       "email": "w.agrebi@formateur.tn",     "specialite": "Développement Personnel","telephone": "+21627654321"},
]

LIEUX = ["Salle A - Tunis Centre", "Salle B - Lac 2", "Salle C - Montplaisir", "Salle D - Sfax", "Salle E - Sousse", "En ligne (Teams)", "En ligne (Zoom)", "Salle Polyvalente - Ariana"]

COMMENTAIRES_SATISFACTION = [
    "Formation très enrichissante, j'ai beaucoup appris.",
    "Le formateur était excellent, explications claires.",
    "Contenu bien structuré, je recommande vivement.",
    "Formation correcte mais pourrait être plus pratique.",
    "Très bonne expérience, merci pour la qualité.",
    "Le rythme était un peu rapide mais globalement bien.",
    "Excellente formation, les cas pratiques étaient très utiles.",
    "Formation moyenne, le support de cours manquait de détails.",
    "Formateur compétent et pédagogue, très satisfait.",
    "Bonne formation, j'aurais aimé plus d'exercices pratiques.",
    "Très satisfait, cette formation a boosté mes compétences.",
    "Le contenu était pertinent mais la salle n'était pas très confortable.",
    "Formation utile pour ma carrière, je la conseille.",
    "Qualité correcte, pas exceptionnelle.",
    "Superbe formation ! J'ai pu directement appliquer les acquis.",
]

# ─────────────────────────────────────────────
# UTILITAIRES
# ─────────────────────────────────────────────

def hash_password(pwd):
    return hashlib.sha256(pwd.encode()).hexdigest()

def random_email(prenom, nom, used_emails):
    prenom_clean = prenom.lower().replace(" ", "").replace("'", "")
    nom_clean = nom.lower().replace(" ", "").replace("'", "")
    domains = ["gmail.com", "yahoo.fr", "hotmail.com", "outlook.com", "topnet.tn", "gnet.tn"]
    base = f"{prenom_clean}.{nom_clean}"
    email = f"{base}@{random.choice(domains)}"
    counter = 1
    while email in used_emails:
        email = f"{base}{counter}@{random.choice(domains)}"
        counter += 1
    used_emails.add(email)
    return email

def random_phone():
    prefixes = ["20", "21", "22", "23", "24", "25", "26", "27", "50", "52", "53", "54", "55", "56", "57", "58", "90", "92", "93", "94", "95", "96", "97", "98", "99"]
    return f"+216{random.choice(prefixes)}{random.randint(100000, 999999)}"

def random_datetime_in_range(start: datetime, end: datetime) -> datetime:
    delta = end - start
    secs = int(delta.total_seconds())
    return start + timedelta(seconds=random.randint(0, secs))

def random_time_pair():
    """Génère heureDebut/heureFin réaliste"""
    starts = [8, 9, 14, 15]
    start_h = random.choice(starts)
    duration_h = random.choice([2, 3, 4])
    end_h = start_h + duration_h
    start = time(start_h, random.choice([0, 30]))
    end = time(min(end_h, 20), random.choice([0, 30]))
    return start.strftime("%H:%M:%S"), end.strftime("%H:%M:%S")

START_DATE = datetime(2022, 1, 1)
END_DATE = datetime(2025, 3, 31)

# ─────────────────────────────────────────────
# GÉNÉRATION
# ─────────────────────────────────────────────

all_emails = set()

# ── 1. INSCRIPTIONS ──────────────────────────
print("Génération des inscriptions...")

N_INSCRIPTIONS = 200  # 150 accepted → ~100+ apprenants after some rejection
inscriptions = []
inscription_emails = {}  # email -> id

statut_distribution = (
    ["accepted"] * 120 +
    ["pending"] * 30 +
    ["not_verified"] * 30 +
    ["rejected"] * 20
)
random.shuffle(statut_distribution)

for i in range(1, N_INSCRIPTIONS + 1):
    prenom = random.choice(PRENOMS_TUNISIENS)
    nom = random.choice(NOMS_TUNISIENS)
    email = random_email(prenom, nom, all_emails)
    statut = statut_distribution[i - 1]
    is_verified = statut in ("accepted", "pending", "rejected")
    created = random_datetime_in_range(START_DATE, END_DATE - timedelta(days=60))

    programmes = [f["titre"] for f in FORMATIONS_DATA]
    inscription = {
        "id": i,
        "nom": nom,
        "prenom": prenom,
        "email": email,
        "telephone": random_phone() if random.random() > 0.1 else None,
        "programme": random.choice(programmes) if random.random() > 0.15 else None,
        "password": hash_password("Password123!"),
        "statut": statut,
        "isAccountVerified": is_verified,
        "verifyToken": str(uuid.uuid4()) if not is_verified else None,
        "createdAt": created.isoformat(),
    }
    inscriptions.append(inscription)
    inscription_emails[email] = inscription

# ── 2. USERS & APPRENANTS ─────────────────────
print("Génération des users et apprenants...")

users = []
apprenants = []
user_id_counter = 1

# Staff fixes
STAFF = [
    ("directeur", "Ben Amor", "Ridha", "ridha.benamor@centre-formation.tn"),
    ("admin", "Khelifi", "Azza", "azza.khelifi@centre-formation.tn"),
    ("admin", "Saidi", "Mourad", "mourad.saidi@centre-formation.tn"),
    ("resp_pedagogique", "Jebali", "Emna", "emna.jebali@centre-formation.tn"),
    ("resp_financier", "Boughattas", "Khaled", "khaled.boughattas@centre-formation.tn"),
]

for role, nom, prenom, email in STAFF:
    all_emails.add(email)
    users.append({
        "id": user_id_counter,
        "nom": nom,
        "prenom": prenom,
        "email": email,
        "password": hash_password("Admin@2024!"),
        "role": role,
        "status": "accepted",
        "isActive": True,
        "phone": random_phone(),
        "resetToken": None,
        "resetTokenExpiry": None,
        "createdAt": START_DATE.isoformat(),
        "updatedAt": START_DATE.isoformat(),
        "profileImage": None,
    })
    user_id_counter += 1

# Apprenants depuis inscriptions acceptées
apprenant_id_counter = 1
accepted_inscriptions = [ins for ins in inscriptions if ins["statut"] == "accepted"]

for ins in accepted_inscriptions:
    # Bruit resetToken : ~15% ont un token actif (reset en cours)
    has_reset = random.random() < 0.15
    reset_token = str(uuid.uuid4()) if has_reset else None
    reset_expiry = None
    if has_reset:
        reset_expiry = (datetime.fromisoformat(ins["createdAt"]) + timedelta(hours=random.randint(1, 48))).isoformat()

    # Bruit profileImage : ~30% ont une photo de profil
    profile_img = f"profiles/apprenant_{apprenant_id_counter}.jpg" if random.random() < 0.30 else None

    user = {
        "id": user_id_counter,
        "nom": ins["nom"],
        "prenom": ins["prenom"],
        "email": ins["email"],
        "password": ins["password"],
        "role": "apprenant",
        "status": "accepted",
        "isActive": random.random() > 0.05,  # bruit : 5% inactif
        "phone": ins["telephone"],
        "resetToken": reset_token,
        "resetTokenExpiry": reset_expiry,
        "createdAt": ins["createdAt"],
        "updatedAt": ins["createdAt"],
        "profileImage": profile_img,
    }
    users.append(user)

    date_accepted = datetime.fromisoformat(ins["createdAt"]) + timedelta(days=random.randint(1, 14))
    apprenant = {
        "id": apprenant_id_counter,
        "userId": user_id_counter,
        "dateAccepted": date_accepted.isoformat(),
    }
    apprenants.append(apprenant)
    ins["_userId"] = user_id_counter
    ins["_apprenantId"] = apprenant_id_counter

    user_id_counter += 1
    apprenant_id_counter += 1

apprenant_ids = [a["id"] for a in apprenants]
apprenant_date_map = {a["id"]: datetime.fromisoformat(a["dateAccepted"]) for a in apprenants}

print(f"  → {len(users)} users, {len(apprenants)} apprenants")

# ── 3. FORMATIONS ─────────────────────────────
print("Génération des formations...")

formations = []
for i, f in enumerate(FORMATIONS_DATA, 1):
    created = random_datetime_in_range(START_DATE, START_DATE + timedelta(days=90))
    # Bruit : quelques formations complétées, la majorité active
    statut = "completed" if random.random() < 0.2 else "active"
    formations.append({
        "id": i,
        "titre": f["titre"],
        "description": f"Formation professionnelle en {f['categorie']} dispensée par notre centre agréé.",
        "categorie": f["categorie"],
        "dureeHeures": f["dureeHeures"],
        "prix": f["prix"],
        "statut": statut,
        "createdAt": created.isoformat(),
        "updatedAt": (created + timedelta(days=random.randint(10, 200))).isoformat(),
    })

# ── 4. FORMATEURS ─────────────────────────────
print("Génération des formateurs...")

formateurs = []
for i, f in enumerate(FORMATEURS_DATA, 1):
    formateurs.append({
        "id": i,
        "nom": f["nom"],
        "prenom": f["prenom"],
        "email": f["email"],
        "specialite": f["specialite"],
        "telephone": f["telephone"],
    })

# ── 5. SESSIONS ────────────────────────────────
print("Génération des sessions (300+)...")

sessions = []
session_count = 0
TARGET_SESSIONS = 330

# Répartition par formation pondérée (formations populaires ont plus de sessions)
formation_weights = [random.randint(8, 25) for _ in formations]

while session_count < TARGET_SESSIONS:
    formation = random.choices(formations, weights=formation_weights, k=1)[0]
    form_id = formation["id"]
    form_created = datetime.fromisoformat(formation["createdAt"])
    form_price = float(formation["prix"])

    # Session date après la création de la formation
    sess_date_start = form_created + timedelta(days=random.randint(14, 60))
    if sess_date_start > END_DATE:
        sess_date_start = START_DATE + timedelta(days=random.randint(30, 120))
    sess_date = random_datetime_in_range(sess_date_start, END_DATE)

    heure_debut, heure_fin = random_time_pair()
    sess_type = random.choice(["présentiel", "en_ligne"])
    lieu = random.choice(LIEUX) if sess_type == "présentiel" else None

    # Statut cohérent avec la date
    if sess_date.date() < date(2025, 1, 1):
        statut = random.choices(["Completed", "Cancelled"], weights=[85, 15])[0]
    elif sess_date.date() < date.today():
        statut = random.choices(["Active", "Completed", "Cancelled"], weights=[20, 65, 15])[0]
    else:
        statut = "Active"

    # Prix session légèrement différent du prix formation (bruit)
    noise_factor = random.uniform(0.85, 1.10)
    sess_prix = round(form_price * noise_factor / len([s for s in sessions if s["formationId"] == form_id] or [1]), 2)
    # Simplification : prix par session = prix formation / nb sessions attendues par formation
    sess_prix = round(form_price * random.uniform(0.9, 1.1), 2)

    formateur_id = random.choice(formateurs)["id"] if random.random() > 0.1 else None
    capacite = random.choice([15, 20, 25, 30])

    sessions.append({
        "id": str(uuid.uuid4()),
        "title": f"{formation['titre']} - Session {session_count + 1}",
        "date": sess_date.date().isoformat(),
        "heureDebut": heure_debut,
        "heureFin": heure_fin,
        "lieu": lieu,
        "type": sess_type,
        "statut": statut,
        "prix": sess_prix,
        "capacite": capacite,
        "formationId": form_id,
        "formateurId": formateur_id,
    })
    session_count += 1

print(f"  → {len(sessions)} sessions générées")

# ── 6. SESSIONS_APPRENANTS ─────────────────────
print("Génération des inscriptions aux sessions...")

sessions_apprenants = []
sa_set = set()  # (sessionId, apprenantId) unique

# Pour chaque session, inscrire entre 3 et min(capacite, N_apprenants) apprenants
for sess in sessions:
    if sess["statut"] == "Cancelled":
        # Sessions annulées ont peu ou pas d'apprenants (bruit)
        n = random.randint(0, 3)
    else:
        capacite = sess["capacite"]
        # Bruit : certaines sessions sous-remplies, certaines pleines
        fill_rate = random.betavariate(3, 2)  # majorité bien remplie
        n = max(1, int(fill_rate * min(capacite, len(apprenant_ids))))

    sess_date = datetime.fromisoformat(sess["date"])

    # Apprenants éligibles : acceptés avant la date de la session
    eligible = [
        aid for aid in apprenant_ids
        if apprenant_date_map[aid] <= sess_date
    ]

    if not eligible:
        continue

    # CRITIQUE : plafonner strictement à la capacité de la session
    capacite_max = sess["capacite"]
    n_capped = min(n, capacite_max, len(eligible))
    chosen = random.sample(eligible, n_capped)
    for aid in chosen:
        key = (sess["id"], aid)
        if key not in sa_set:
            sa_set.add(key)
            sessions_apprenants.append({
                "sessionId": sess["id"],
                "apprenantId": aid,
            })

print(f"  → {len(sessions_apprenants)} inscriptions aux sessions")

# Index rapide
session_apprenant_map = {}  # sessionId -> [apprenantId]
for sa in sessions_apprenants:
    session_apprenant_map.setdefault(sa["sessionId"], []).append(sa["apprenantId"])

apprenant_session_map = {}  # apprenantId -> [sessionId]
for sa in sessions_apprenants:
    apprenant_session_map.setdefault(sa["apprenantId"], []).append(sa["sessionId"])

# ── 7. PRESENCES ───────────────────────────────
print("Génération des présences...")

presences = []
presence_set = set()

for sess in sessions:
    sess_id = sess["id"]
    if sess_id not in session_apprenant_map:
        continue
    sess_datetime = datetime.fromisoformat(sess["date"])

    # Seules sessions passées ont des présences marquées
    if sess_datetime.date() > date(2025, 3, 31):
        continue

    for aid in session_apprenant_map[sess_id]:
        key = (sess_id, aid)
        if key in presence_set:
            continue
        presence_set.add(key)

        # Bruit : taux de présence ~75% en moyenne
        est_present = random.random() < random.gauss(0.75, 0.15)
        date_marquage = sess_datetime + timedelta(minutes=random.randint(-10, 30))

        presences.append({
            "id": str(uuid.uuid4()),
            "sessionId": sess_id,
            "apprenantId": aid,
            "estPresent": bool(est_present),
            "dateMarquage": date_marquage.isoformat(),
        })

print(f"  → {len(presences)} présences")

# ── 8. FINANCES ────────────────────────────────
print("Génération des finances (5000+)...")

finances = []
finance_id = 1
session_id_map = {s["id"]: s for s in sessions}

# ── Règle métier :
#    Dès qu'un apprenant s'inscrit à une session → enregistrement IMPAYÉ automatique
#    Ensuite ~75% des impayés sont résolus par un PAIEMENT ultérieur (bruit : 25% restent impayés)

for sa in sessions_apprenants:
    sess = session_id_map[sa["sessionId"]]
    sess_date = datetime.fromisoformat(sess["date"])
    prix_session = float(sess["prix"]) if sess["prix"] else 0

    if prix_session <= 0:
        continue

    # 1) Enregistrement IMPAYÉ automatique à la date d'inscription (quelques jours avant la session)
    inscription_date = sess_date - timedelta(days=random.randint(3, 30))
    if inscription_date < START_DATE:
        inscription_date = sess_date

    finances.append({
        "id": finance_id,
        "montant": prix_session,
        "type": "impaye",
        "sessionId": sa["sessionId"],
        "apprenantId": sa["apprenantId"],
        "description": f"Inscription session - {sess['title']}",
        "date": inscription_date.isoformat(),
    })
    finance_id += 1

    # 2) ~75% des apprenants paient ensuite → enregistrement PAIEMENT
    if random.random() < 0.75:
        pay_date = inscription_date + timedelta(days=random.randint(1, 15))
        if pay_date > END_DATE:
            pay_date = inscription_date

        # Bruit : parfois paiement partiel (~15%)
        montant_paye = round(prix_session * random.uniform(0.7, 1.0), 2) if random.random() < 0.15 else prix_session

        finances.append({
            "id": finance_id,
            "montant": montant_paye,
            "type": "paiement",
            "sessionId": sa["sessionId"],
            "apprenantId": sa["apprenantId"],
            "description": f"Paiement session - {sess['title']}",
            "date": pay_date.isoformat(),
        })
        finance_id += 1

# ── Dépenses formateur et logistique par session (sans apprenantId)
DEPENSES_FORMATEUR = [
    ("depense_formateur", "Honoraires formateur", 300, 1200),
    ("depense_formateur", "Transport formateur",   30,  120),
    ("depense_formateur", "Hébergement formateur", 80,  250),
]
DEPENSES_LOGISTIQUE = [
    ("depense_logistique", "Loyer salle",            200,  800),
    ("depense_logistique", "Matériel pédagogique",   50,   300),
    ("depense_logistique", "Eau et électricité",     30,   120),
    ("depense_logistique", "Nettoyage locaux",       20,    80),
    ("depense_logistique", "Équipement informatique",100,  500),
    ("depense_logistique", "Impression supports",    20,   100),
]

for sess in sessions:
    sess_date = datetime.fromisoformat(sess["date"])

    # Dépense formateur si la session a un formateur
    if sess["formateurId"] is not None:
        dep_type, desc, mn, mx = random.choice(DEPENSES_FORMATEUR)
        finances.append({
            "id": finance_id,
            "montant": round(random.uniform(mn, mx), 2),
            "type": dep_type,
            "sessionId": sess["id"],
            "apprenantId": None,
            "description": desc,
            "date": sess_date.isoformat(),
        })
        finance_id += 1

    # Dépense logistique uniquement pour sessions en présentiel
    if sess["type"] == "présentiel":
        nb_dep = random.randint(1, 3)
        for _ in range(nb_dep):
            dep_type, desc, mn, mx = random.choice(DEPENSES_LOGISTIQUE)
            finances.append({
                "id": finance_id,
                "montant": round(random.uniform(mn, mx), 2),
                "type": dep_type,
                "sessionId": sess["id"],
                "apprenantId": None,
                "description": desc,
                "date": sess_date.isoformat(),
            })
            finance_id += 1

print(f"  → {len(finances)} entrées finances")

# ── 9. PERFORMANCE ─────────────────────────────
print("Génération des performances...")

performances = []
perf_id = 1
session_formation_map = {s["id"]: s["formationId"] for s in sessions}

for sa in sessions_apprenants:
    sess = session_id_map[sa["sessionId"]]
    sess_date = datetime.fromisoformat(sess["date"])

    # Performance seulement pour sessions passées
    if sess_date.date() > date(2025, 3, 31):
        continue

    # Bruit : toujours une note mais parfois absente (~15%)
    if random.random() < 0.15:
        continue

    # Distribution réaliste des notes
    base_note = random.gauss(12, 3.5)  # noté sur 20, moyenne ~12
    base_note = max(2, min(20, base_note))
    note = round(base_note, 2)
    est_reussi = note >= 10

    perf_date = sess_date + timedelta(days=random.randint(1, 14))

    performances.append({
        "id": perf_id,
        "apprenantId": sa["apprenantId"],
        "sessionId": sa["sessionId"],
        "formationId": session_formation_map[sa["sessionId"]],
        "note": note,
        "estReussi": est_reussi,
        "date": perf_date.isoformat(),
    })
    perf_id += 1

print(f"  → {len(performances)} performances")

# ── 10. SATISFACTION ───────────────────────────
print("Génération des satisfactions...")

satisfactions = []
sat_id = 1
sat_set = set()  # (apprenantId, formationId) unique

# Apprenants qui ont au moins une session completed
for sa in sessions_apprenants:
    sess = session_id_map[sa["sessionId"]]
    if sess["statut"] != "Completed":
        continue
    aid = sa["apprenantId"]
    fid = session_formation_map[sa["sessionId"]]
    key = (aid, fid)
    if key in sat_set:
        continue

    # Bruit : seulement ~60% des apprenants laissent un avis
    if random.random() > 0.60:
        continue

    sat_set.add(key)
    # Distribution de notes légèrement positive (biais satisfaction client)
    note = round(max(1, min(5, random.gauss(3.8, 0.9))), 1)
    has_comment = random.random() > 0.35
    sess_date = datetime.fromisoformat(sess["date"])
    created = sess_date + timedelta(days=random.randint(1, 30))

    satisfactions.append({
        "id": sat_id,
        "apprenantId": aid,
        "formationId": fid,
        "note": note,
        "commentaire": random.choice(COMMENTAIRES_SATISFACTION) if has_comment else None,
        "createdAt": created.isoformat(),
    })
    sat_id += 1

print(f"  → {len(satisfactions)} avis de satisfaction")

# ─────────────────────────────────────────────
# CONFIGURATION SUPABASE
# ─────────────────────────────────────────────
# Remplis ces valeurs depuis : Supabase → Settings → Database → Connection string
# Utilise le mode "Session" (port 5432) ou "Transaction" (port 6543)

SUPABASE_HOST     = DB_HOST   # ← remplace
SUPABASE_PORT     = DB_PORT   # ← remplace
SUPABASE_DB       = DB_NAME   # ← remplace
SUPABASE_USER     = DB_USERNAME   # ← remplace
SUPABASE_PASSWORD = DB_PASSWORD                # ← remplace

# ─────────────────────────────────────────────
# EXPORT SQL PostgreSQL
# ─────────────────────────────────────────────
print("\nGénération du fichier SQL (PostgreSQL)...")

def escape_pg(v):
    """Échappement compatible PostgreSQL."""
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    # Chaîne : guillemets simples, apostrophes doublées
    return "'" + str(v).replace("'", "''") + "'"

def bulk_insert_pg(table, rows, f):
    """INSERT en blocs de 200 lignes, syntaxe PostgreSQL (guillemets doubles)."""
    if not rows:
        return
    keys = [k for k in rows[0].keys() if not k.startswith("_")]
    cols = ", ".join(f'"{k}"' for k in keys)
    f.write(f'\n-- {table} ({len(rows)} lignes)\n')
    chunks = [rows[i:i+200] for i in range(0, len(rows), 200)]
    for chunk in chunks:
        f.write(f'INSERT INTO "{table}" ({cols}) VALUES\n')
        vals = []
        for row in chunk:
            vals.append("  (" + ", ".join(escape_pg(row[k]) for k in keys) + ")")
        f.write(",\n".join(vals) + "\nON CONFLICT DO NOTHING;\n")

output_path = "/mnt/user-data/outputs/seed_data.sql"

with open(output_path, "w", encoding="utf-8") as f:
    f.write("-- ============================================================\n")
    f.write("-- SEED DATA - Plateforme BI Centre de Formation Tunisien\n")
    f.write(f"-- Généré le {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    f.write("-- Compatible PostgreSQL / Supabase\n")
    f.write("-- ============================================================\n\n")

    # Désactiver les FK le temps des inserts, puis réactiver
    f.write("SET session_replication_role = 'replica';\n\n")

    # Vider les tables dans l'ordre inverse des FK
    for tbl in ["satisfaction", "performance", "finances", "presences",
                "sessions_apprenants", "sessions", "formateurs", "formations",
                "apprenants", "users", "inscriptions"]:
        f.write(f'TRUNCATE TABLE "{tbl}" CASCADE;\n')

    f.write("\n")

    # Inserts dans l'ordre des dépendances
    bulk_insert_pg("inscriptions",       inscriptions,       f)
    bulk_insert_pg("users",              users,              f)
    bulk_insert_pg("apprenants",         apprenants,         f)
    bulk_insert_pg("formations",         formations,         f)
    bulk_insert_pg("formateurs",         formateurs,         f)
    bulk_insert_pg("sessions",           sessions,           f)
    bulk_insert_pg("sessions_apprenants",sessions_apprenants,f)
    bulk_insert_pg("presences",          presences,          f)
    bulk_insert_pg("finances",           finances,           f)
    bulk_insert_pg("performance",        performances,       f)
    bulk_insert_pg("satisfaction",       satisfactions,      f)

    # Réactiver les FK
    f.write("\nSET session_replication_role = 'origin';\n")
    f.write("\n-- FIN DU SCRIPT\n")

print(f"✅ Fichier SQL généré : {output_path}")

# ─────────────────────────────────────────────
# INSERTION DIRECTE DANS SUPABASE (optionnel)
# ─────────────────────────────────────────────
# Si tu veux insérer directement sans passer par le SQL Editor,
# décommente le bloc ci-dessous et installe psycopg2 :
#   pip install psycopg2-binary

def insert_direct_to_supabase():
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("\n❌ psycopg2 non installé. Lance : pip install psycopg2-binary")
        return

    print("\n🔌 Connexion à Supabase...")
    try:
        conn = psycopg2.connect(
            host=SUPABASE_HOST,
            port=SUPABASE_PORT,
            dbname=SUPABASE_DB,
            user=SUPABASE_USER,
            password=SUPABASE_PASSWORD,
            sslmode="require"
        )
        conn.autocommit = False
        cur = conn.cursor()

        def pg_insert(table, rows):
            if not rows:
                return
            keys = [k for k in rows[0].keys() if not k.startswith("_")]
            cols = ", ".join(f'"{k}"' for k in keys)
            placeholders = ", ".join(["%s"] * len(keys))
            query = f'INSERT INTO "{table}" ({cols}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'
            data = [tuple(row[k] for k in keys) for row in rows]
            psycopg2.extras.execute_batch(cur, query, data, page_size=200)
            print(f"  ✅ {table} : {len(rows)} lignes insérées")

        print("🗑️  Nettoyage des tables...")
        cur.execute("SET session_replication_role = 'replica';")
        for tbl in ["satisfaction", "performance", "finances", "presences",
                    "sessions_apprenants", "sessions", "formateurs", "formations",
                    "apprenants", "users", "inscriptions"]:
            cur.execute(f'TRUNCATE TABLE "{tbl}" CASCADE;')

        print("📥 Insertion des données...")
        pg_insert("inscriptions",        inscriptions)
        pg_insert("users",               users)
        pg_insert("apprenants",          apprenants)
        pg_insert("formations",          formations)
        pg_insert("formateurs",          formateurs)
        pg_insert("sessions",            sessions)
        pg_insert("sessions_apprenants", sessions_apprenants)
        pg_insert("presences",           presences)
        pg_insert("finances",            finances)
        pg_insert("performance",         performances)
        pg_insert("satisfaction",        satisfactions)

        cur.execute("SET session_replication_role = 'origin';")
        conn.commit()
        print("\n🎉 Insertion directe terminée avec succès !")

    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        print(f"\n❌ Erreur : {e}")
    finally:
        if 'conn' in locals():
            conn.close()

# ── Décommente la ligne suivante pour insérer directement dans Supabase ──
insert_direct_to_supabase()

# ─────────────────────────────────────────────
# RÉSUMÉ
# ─────────────────────────────────────────────
print("\n" + "="*55)
print("RÉSUMÉ DES DONNÉES GÉNÉRÉES")
print("="*55)
print(f"  inscriptions       : {len(inscriptions)}")
print(f"  users              : {len(users)} (dont {len(STAFF)} staff)")
print(f"  apprenants         : {len(apprenants)}")
print(f"  formations         : {len(formations)}")
print(f"  formateurs         : {len(formateurs)}")
print(f"  sessions           : {len(sessions)}")
print(f"  sessions_apprenants: {len(sessions_apprenants)}")
print(f"  presences          : {len(presences)}")
print(f"  finances           : {len(finances)}")
print(f"  performances       : {len(performances)}")
print(f"  satisfactions      : {len(satisfactions)}")
print("="*55)
print("\n📌 COMMENT UTILISER :")
print("  Option A — SQL Editor Supabase :")
print(f"    1. Ouvre {output_path}")
print("    2. Colle dans Supabase → SQL Editor → Run")
print("  Option B — Insertion directe Python :")
print("    1. Remplis SUPABASE_HOST et SUPABASE_PASSWORD en haut du script")
print("    2. pip install psycopg2-binary")
print("    3. Décommente la ligne insert_direct_to_supabase()")
print("    4. Relance : python generate_seed.py")