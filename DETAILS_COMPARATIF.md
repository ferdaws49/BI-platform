# 🔍 VISUALISATION - Différences Détaillées

## 📱 Interface Utilisateur

### ✅ APPRENANT - profile/page.tsx

```
╔══════════════════════════════════════╗
║          MON PROFIL                  ║
╠══════════════════════════════════════╣
║                                      ║
║           [📷 PHOTO]                 ║
║            ╭─────╮                   ║
║            │ NOM │                   ║
║            │  P  │  ← Initiales      ║
║            ╰─────╯                   ║
║         🎥   ❌                       ║
║      Camera Delete                   ║
║                                      ║
║  Nom: [Ahmed ________]               ║
║  Prénom: [Saleh ________]            ║
║  Tél: [+212... ________]             ║
║  Mot de passe: [••••••]              ║
║                                      ║
║              [💾 ENREGISTRER]         ║
╚══════════════════════════════════════╝

FONCTIONNALITÉ:
✅ Peut télécharger une photo
✅ Peut supprimer la photo
✅ Affiche les initiales si pas de photo
✅ Affiche la photo avec cache-busting
```

---

### ✅ DIRECTEUR - settings/page.tsx (Tab Profile)

```
╔══════════════════════════════════════╗
║         PARAMÈTRES - PROFIL          ║
╠══════════════════════════════════════╣
║                                      ║
║           [📷 PHOTO]                 ║
║            ╭─────╮                   ║
║            │  A  │  ← Première lettre║
║            │  S  │  ← Du firstName   ║
║            ╰─────╯                   ║
║         🎥   ❌                       ║
║      Camera Delete                   ║
║  "Cliquez sur icône pour changer"   ║
║                                      ║
║  First Name: [Ahmed ________]        ║
║  Last Name: [Saleh ________]         ║
║  Email: [user@... ________]          ║
║  Phone: [+212... ________]           ║
║                                      ║
║              [💾 SAUVEGARDER]         ║
╚══════════════════════════════════════╝

FONCTIONNALITÉ:
✅ Peut télécharger une photo
✅ Peut supprimer la photo
✅ Affiche les initiales si pas de photo
✅ Affiche aide utilisateur ("Cliquez sur...")
```

---

### ❌ ADMIN - settings/page.tsx (Tab Profile)

```
╔══════════════════════════════════════╗
║         PARAMÈTRES - PROFIL          ║
╠══════════════════════════════════════╣
║                                      ║
║  ❌ PAS DE SECTION PHOTO             ║
║                                      ║
║  First Name: [Admin ________]        ║
║  Last Name: [User ________]          ║
║  Email: [admin@... ________]         ║
║  Phone: [+212... ________]           ║
║                                      ║
║              [💾 SAUVEGARDER]         ║
║                                      ║
║  ⚠️ MANQUE L'UI DE PHOTO             ║
╚══════════════════════════════════════╝

PROBLÈME:
❌ Pas de section photo
❌ Pas de bouton upload
❌ Pas de bouton suppression
❌ Pas de possibilité d'ajouter une photo
```

---

### ❌ RESPED PÉDAGOGIQUE - settings/page.tsx (Tab Profile)

```
╔══════════════════════════════════════╗
║         PARAMÈTRES - PROFIL          ║
╠══════════════════════════════════════╣
║                                      ║
║  ❌ PAS DE SECTION PHOTO             ║
║                                      ║
║  First Name: [Jean ________]         ║
║  Last Name: [Dupont ________]        ║
║  Email: [ped@... ________]           ║
║  Phone: [+212... ________]           ║
║                                      ║
║              [💾 SAUVEGARDER]         ║
║                                      ║
║  ⚠️ MANQUE L'UI DE PHOTO             ║
╚══════════════════════════════════════╝

PROBLÈME:
❌ Pas de section photo
❌ Pas de bouton upload
❌ Pas de bouton suppression
❌ Pas de possibilité d'ajouter une photo
```

---

## 💾 État (State) Comparison

### Apprenant

```typescript
const [user, setUser] = useState<any>(null);
const [formData, setFormData] = useState({
  nom: "",
  prenom: "",
  phone: "",
  password: "",
});
const [imageVersion, setImageVersion] = useState(Date.now()); // ← Cache-busting
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [deleting, setDeleting] = useState(false); // ← Pour suppression
```

✅ **Complet** : tous les états nécessaires

---

### Directeur

```typescript
const [profile, setProfile] = useState<ProfileData | null>(null);
const [profileImage, setProfileImage] = useState<string | null>(null); // ← Image
const [imgUploading, setImgUploading] = useState(false); // ← Upload status
const [imgError, setImgError] = useState<string | null>(null); // ← Erreur
const fileInputRef = useRef<HTMLInputElement>(null); // ← Ref du input
```

✅ **Complet** : tous les états pour l'image

---

### Admin

```typescript
const [profile, setProfile] = useState<ProfileData | null>(null);
const [profileLoading, setProfileLoading] = useState(true);
const [profileError, setProfileError] = useState<string | null>(null);

// ❌ AUCUN ÉTAT POUR L'IMAGE
// const [profileImage, setProfileImage] = useState<string | null>(null);
// const [imgUploading, setImgUploading] = useState(false);
// const [imgError, setImgError] = useState<string | null>(null);
// const fileInputRef = useRef<HTMLInputElement>(null);
```

❌ **Incomplet** : manquent les états pour l'image

---

### Resped Pédagogique

```typescript
const [profile, setProfile] = useState<ProfileData | null>(null);
const [profileLoading, setProfileLoading] = useState(true);
const [profileError, setProfileError] = useState<string | null>(null);

// ❌ AUCUN ÉTAT POUR L'IMAGE
// const [profileImage, setProfileImage] = useState<string | null>(null);
// const [imgUploading, setImgUploading] = useState(false);
// const [imgError, setImgError] = useState<string | null>(null);
// const fileInputRef = useRef<HTMLInputElement>(null);
```

❌ **Incomplet** : manquent les états pour l'image

---

## 🔧 Handlers Comparison

### Upload Handler - Apprenant

```typescript
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    setLoading(true);
    try {
      await uploadProfileImage(e.target.files[0]);  // ← Utilise LIB
      setImageVersion(Date.now());                  // ← Cache-busting
      await loadProfile();
    } catch (err) {
      alert("Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  }
};

✅ Utilise lib centralisée
✅ Cache-busting pour refresh immédiat
✅ Recharge le profil après
```

---

### Upload Handler - Directeur

```typescript
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setImgUploading(true);
  setImgError(null);
  try {
    const token = localStorage.getItem("access_token");
    const fd = new FormData();
    fd.append("user-image", file);
    const res = await fetch(`${BACKEND}/profile/upload-image`, {  // ← Direct fetch
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) throw new Error("Erreur upload");
    const data = await res.json();
    setProfileImage(data?.profileImage ?? null);
    // Double fetch pour refresh
    const token2 = localStorage.getItem("access_token");
    const me = await fetch(`${BACKEND}/profile/me`, {
      headers: { Authorization: `Bearer ${token2}` }
    }).then(r => r.json());
    setProfileImage(me?.profileImage ?? null);
  } catch (err: any) {
    setImgError("Erreur lors de l'envoi de la photo");
  } finally {
    setImgUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
};

❌ Duplique le code (pas de lib)
⚠️ Double fetch /profile/me (inefficace)
✅ Gestion d'erreur meilleure
```

---

### Upload Handler - Admin & Resped

```
// ❌ AUCUN HANDLER
// const handleImageUpload = async (...) => { ... }
```

---

## 🌐 API Calls Comparison

### Apprenant - Via la lib

```typescript
// lib/profile.api.ts
export async function uploadProfileImage(file: File) {
  const formData = new FormData();
  formData.append('user-image', file);

  const res = await fetch(`${API_URL}/upload-image`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Erreur upload image');
  }

  return res.json();
}

✅ Centralisé
✅ Headers gérés
✅ Gestion d'erreur
```

---

### Directeur - Direct fetch (dupliqué)

```typescript
// app/directeur/settings/page.tsx
const token = localStorage.getItem("access_token");
const fd = new FormData();
fd.append("user-image", file);
const res = await fetch(`${BACKEND}/profile/upload-image`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: fd,
});

❌ Code dupliqué (pas dans la lib)
⚠️ Gestion manuelle du token
⚠️ Headers hardcodés
```

---

## 📦 Backend Entity

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;  // ← TOUS les rôles

  @Column({ type: 'varchar', nullable: true })
  profileImage: string | null;  // ← SUPPORTE TOUS LES RÔLES

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

✅ profileImage présent pour TOUS les rôles
✅ Type : varchar | null
✅ Nullable → pas de photo = ok
```

---

## 🔌 Backend API - Pas de restriction par rôle

```typescript
@Post('upload-image')
@UseInterceptors(FileInterceptor('user-image'))
@UseGuards(JwtAuthGuard, RolesGuard)  // ← Pas de @Roles() = TOUS
public uploadProfileImage(
  @UploadedFile() file: Express.Multer.File,
  @CurrentUser() payload : any
) {
  return this.profileService.setProfileImage(payload.userId, file.filename)
}

✅ JwtAuthGuard → Authentification requise
❌ @Roles() absent → TOUS les rôles peuvent uploader
✅ @CurrentUser() → Utilisateur récupéré du token
```

---

## 🔑 KEY FINDINGS

### 1. **Backend Support**

```
✅ users.entity.ts : profileImage pour TOUS
✅ profile.controller.ts : pas de restriction par rôle
✅ Les endpoints acceptent TOUS les utilisateurs authentifiés
```

### 2. **Frontend Inconsistency**

```
✅ Apprenant : ✓ Code + ✓ UI
✅ Directeur : ✓ Code + ✓ UI
❌ Admin : ✗ Code + ✗ UI
❌ Resped : ✗ Code + ✗ UI
```

### 3. **Code Quality Issues**

```
❌ Duplication : Directeur redéfinit le code de l'upload
❌ No DRY : Pas d'utilisation de la lib centralisée
❌ Inefficency : Double fetch /profile/me chez Directeur
✅ Apprenant : Bonne utilisation de la lib
```

### 4. **Library Exists**

```typescript
// lib/profile.api.ts
export async function uploadProfileImage(file: File) { ... }
export const deleteProfileImage = async () => { ... }

✅ Les fonctions existent
✅ Admin/Resped devraient les utiliser
```

---

## 📊 Summary Table

```
┌────────────────┬─────────────────┬──────────────┬─────────┬──────────┐
│ Rôle           │ Page Settings   │ Photo Code   │ UI      │ État     │
├────────────────┼─────────────────┼──────────────┼─────────┼──────────┤
│ Apprenant      │ profile/        │ ✅ Complet   │ ✅ Oui  │ 🟢 WORKS │
│ Directeur      │ directeur/      │ ✅ Complet   │ ✅ Oui  │ 🟢 WORKS │
│ Admin          │ admin/          │ ❌ Absent    │ ❌ Non  │ 🔴 BROKEN│
│ Resped Pédago  │ respedagogique/ │ ❌ Absent    │ ❌ Non  │ 🔴 BROKEN│
└────────────────┴─────────────────┴──────────────┴─────────┴──────────┘
```

---

## 🎯 ROOT CAUSE

**Incomplétude du frontend**: Admin et Resped Pédagogique n'ont jamais reçu la fonctionnalité de photo de profil, alors qu'elle est techniquement supportée par le backend.

**Possibilité 1**: Oubli du développeur
**Possibilité 2**: Restriction intentionnelle (but non documentée)

---

## ✅ FIX REQUIRED

1. **Ajouter le code d'upload** à Admin et Resped
2. **Utiliser la lib centralisée** (pas de duplication)
3. **Ajouter l'UI** (bouton caméra + suppression)
4. **Tester** sur tous les rôles
5. **Documenter** les permissions finales
