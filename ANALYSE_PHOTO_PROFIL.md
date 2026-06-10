# 📊 ANALYSE : Gestion des Photos de Profil par Rôle

## 🎯 Résumé Exécutif

Le système **incohérent** : seul l'**Apprenant** et le **Directeur** peuvent ajouter une photo de profil. L'**Admin** et le **Responsable Pédagogique** n'ont PAS cette fonctionnalité, bien que le backend la supporte.

---

## 🔍 COMPARAISON DES PAGES SETTINGS

### ✅ APPRENANT - `app/apprenant/profile/page.tsx`

**Code d'upload existant:**
```tsx
// ← Import de la lib
import { uploadProfileImage, deleteProfileImage, getProfile } from '@/lib/profile.api';

// États
const [imageVersion, setImageVersion] = useState(Date.now());

// Upload handler
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    setLoading(true);
    try {
      await uploadProfileImage(e.target.files[0]);  // ← Utilise la lib
      setImageVersion(Date.now());
      await loadProfile();
    } catch (err) {
      alert("Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  }
};

// Delete handler
const handleDeleteImage = async () => {
  const confirmed = window.confirm("Voulez-vous vraiment supprimer votre photo de profil ?");
  if (!confirmed) return;
  setLoading(true);
  try {
    await deleteProfileImage();
    await loadProfile();
    alert("Photo de profil supprimée !");
  } catch (err: any) {
    alert(err.message || "Erreur lors de la suppression");
  } finally {
    setLoading(false);
  }
};
```

**UI Rendue:**
```tsx
<div className="relative group mb-6">
  {user.profileImage ? (
    <img  
      key={`${user.profileImage}-${imageVersion}`}
      src={`http://localhost:5000/profile/images/${user.profileImage}?t=${imageVersion}`}
      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl"
    />
  ) : (
    <div className="w-32 h-32 bg-brand-dark text-white rounded-full flex items-center justify-center text-4xl font-bold">
      {(user.nom?.[0] || '') + (user.prenom?.[0] || '')}
    </div>
  )}
  
  {/* Bouton caméra */}
  <label className="absolute bottom-0 right-0 p-2 bg-white border rounded-full cursor-pointer">
    <Camera size={18} />
    <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
  </label>
  
  {/* Bouton suppression */}
  {user.profileImage && (
    <button onClick={handleDeleteImage} className="absolute bottom-0 left-0 p-2">
      <TrashIcon />
    </button>
  )}
</div>
```

**Observations:**
- ✅ Utilise la **lib centralisée** (`profile.api.ts`)
- ✅ Bouton de **suppression** si image existe
- ✅ Cache-busting avec `imageVersion` pour affichage immédiat

---

### ✅ DIRECTEUR - `app/directeur/settings/page.tsx`

**Code d'upload existant:**
```tsx
// États
const [profileImage, setProfileImage] = useState<string | null>(null);
const [imgUploading, setImgUploading] = useState(false);
const [imgError, setImgError] = useState<string | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);

// Load image
useEffect(() => {
  const token = localStorage.getItem("access_token");
  if (!token) return;
  fetch(`${BACKEND}/profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json())
    .then((data) => setProfileImage(data?.profileImage ?? null))
    .catch(() => {});
}, []);

// Upload handler
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setImgUploading(true);
  setImgError(null);
  try {
    const token = localStorage.getItem("access_token");
    const fd = new FormData();
    fd.append("user-image", file);
    const res = await fetch(`${BACKEND}/profile/upload-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) throw new Error("Erreur upload");
    const data = await res.json();
    setProfileImage(data?.profileImage ?? null);
    // Refresh
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

// Delete handler
const handleDeleteImage = async () => {
  if (!window.confirm("Voulez-vous vraiment supprimer votre photo de profil ?")) return;
  setImgUploading(true);
  setImgError(null);
  try {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${BACKEND}/profile/images/remove-profile-image`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Erreur suppression");
    setProfileImage(null);
  } catch (err: any) {
    setImgError("Erreur lors de la suppression de la photo");
  } finally {
    setImgUploading(false);
  }
};
```

**UI Rendue:**
```tsx
<div className="flex flex-col items-center mb-8">
  <div className="relative group">
    {profileImage ? (
      <img
        src={`${BACKEND}/profile/images/${profileImage}?t=${Date.now()}`}
        alt="Photo de profil"
        className="w-24 h-24 rounded-full object-cover border-4 border-emerald-100"
      />
    ) : (
      <div className="w-24 h-24 rounded-full bg-emerald-600 text-white flex items-center justify-center">
        {profile?.firstName?.charAt(0)?.toUpperCase()}
      </div>
    )}
    {/* Bouton upload */}
    <label className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full">
      {imgUploading ? <Spinner /> : <Camera className="h-4 w-4" />}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </label>
    {/* Bouton suppression */}
    {profileImage && (
      <button
        onClick={handleDeleteImage}
        className="absolute bottom-0 left-0 p-1.5 text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    )}
  </div>
  <p className="text-xs text-gray-500 mt-3">Cliquez sur l'icône appareil photo</p>
  {imgError && <p className="text-xs text-red-500">{imgError}</p>}
</div>
```

**Observations:**
- ❌ N'utilise PAS la lib centralisée (code **dupliqué**)
- ✅ Bouton de **suppression** si image existe
- ⚠️ Appel double à `/profile/me` pour refresh (inefficace)

---

### ❌ ADMIN - `app/admin/settings/page.tsx`

**Code d'upload:**
```
// 🚨 AUCUN CODE D'UPLOAD D'IMAGE
// Seulement les champs texte du profil (firstName, lastName, email, phone)

// Aucun état : profileImage, imgUploading, imgError, fileInputRef

// Aucun handler : handleImageUpload, handleDeleteImage

// Aucune UI pour bouton caméra
```

**Observations:**
- ❌ **Pas de code** pour upload
- ❌ **Pas d'UI** pour le bouton caméra
- ⚠️ Incohérence avec autres rôles

---

### ❌ RESPONSABLE PÉDAGOGIQUE - `app/respedagogique/settings/page.tsx`

**Code d'upload:**
```
// 🚨 AUCUN CODE D'UPLOAD D'IMAGE
// Seulement les champs texte du profil (firstName, lastName, email, phone)

// Aucun état : profileImage, imgUploading, imgError, fileInputRef

// Aucun handler : handleImageUpload, handleDeleteImage

// Aucune UI pour bouton caméra
```

**Observations:**
- ❌ **Pas de code** pour upload
- ❌ **Pas d'UI** pour le bouton caméra
- ⚠️ Incohérence avec autres rôles

---

### ❌ RESPONSABLE FINANCIER

**Statut:** Pas de page settings personnalisée détectée.

---

## 🛢️ BACKEND - Database & Entity

### `users.entity.ts`
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column({ nullable: true })
  nom: string;
  
  @Column({ nullable: true })
  prenom: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;  // ← directeur, admin, resp_pedagogique, resp_financier, apprenant

  @Column({ type: 'enum', enum: UserStatus })
  status: UserStatus;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  profileImage: string | null;  // ← SUPPORTE POUR TOUS LES RÔLES ✅
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Observations:**
- ✅ `profileImage` existe dans le schéma pour **TOUS les rôles**
- ✅ Type `varchar | null`
- ✅ Nullable → pas de photo = pas de problème

---

## 🔌 BACKEND - API Endpoints

### `src/profile/profile.controller.ts`

**1️⃣ POST `/profile/upload-image`**
```typescript
@Post('upload-image')
@UseInterceptors(FileInterceptor('user-image',{
    storage: diskStorage({
        destination: './images/users',
        filename: (req, file, cb) =>{
            const prefix = `${Date.now()}-${Math.round(Math.random()*1000000)}`;
            const filename = `${prefix}-${file.originalname}`;
            cb(null, filename);
        }
    }),
    fileFilter: (req, file, cb) => {
        if(file.mimetype.startsWith("image")) {
            cb(null, true);
        }else{
            cb(new BadRequestException("Unsupported file format"), false)
        }
    },
    limits: { fileSize: 1024 * 1024}  // 1 MB max
}))
@UseGuards(JwtAuthGuard, RolesGuard)  // ← AUTH REQUIRED
public uploadProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() payload : any){
        if(!file) throw new BadRequestException("no image provided");
        return this.profileService.setProfileImage(payload.userId, file.filename)
    }
```

**Observations:**
- ✅ `@UseGuards(JwtAuthGuard)` - authentification requise
- ❌ **AUCUNE restriction par rôle** (`@Roles(...)`) 
- ✅ Donc **TOUS les rôles peuvent uploader**
- ✅ Validation fichier : image uniquement, max 1 MB
- ✅ Stockage : `./images/users/{timestamp}-{random}-{nomOriginal}`

**2️⃣ DELETE `/profile/images/remove-profile-image`**
```typescript
@Delete("images/remove-profile-image")
@UseGuards(JwtAuthGuard, RolesGuard)
public removeProfileImage(@CurrentUser() payload: any){
    return this.profileService.removeProfileImage(payload.userId);
}
```

**3️⃣ GET `/profile/me`**
```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
public async getFullProfile(@CurrentUser() payload: any) {
    return this.profileService.getProfile(payload.userId);
}
```

**4️⃣ GET `/profile/images/:image`**
```typescript
@Get("images/:image")
public showProfileImage(@Param('image') image: string, @Res() res: Response){
    return res.sendFile(image, {root : 'images/users'})
}
```

**Observations:**
- ✅ **Pas de restriction par rôle** sur les endpoints
- ✅ Authentification JWT seulement
- ✅ `@CurrentUser()` récupère l'ID utilisateur du token
- ✅ Donc **Tous les rôles CAN techniquement uploader**

---

## 🎨 Frontend API Library

### `lib/profile.api.ts`

```typescript
const API_URL = 'http://localhost:5000/profile';

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
});

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

export const deleteProfileImage = async () => {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_URL}/images/remove-profile-image`, {
    method: 'DELETE',
    headers: { 
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Erreur lors de la suppression");
  }

  return res.json();
};
```

---

## 📋 TABLE COMPARATIF

| Rôle | Page | Import Lib | États | Upload Code | Delete Code | UI Camera | UI Delete | Fonctionnel |
|------|------|-----------|-------|---------|---------|-----------|-----------|-----------|
| **Apprenant** | `apprenant/profile/page.tsx` | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui | ✅ OUI |
| **Directeur** | `directeur/settings/page.tsx` | ❌ Non | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui | ✅ OUI |
| **Admin** | `admin/settings/page.tsx` | ❌ Non | ❌ Non | ❌ Non | ❌ Non | ❌ Non | ❌ Non | ❌ NON |
| **Resped Pédago** | `respedagogique/settings/page.tsx` | ❌ Non | ❌ Non | ❌ Non | ❌ Non | ❌ Non | ❌ Non | ❌ NON |
| **Backend Support** | `users.entity.ts` | - | ✅ Oui | ✅ Oui | ✅ Oui | - | - | ✅ OUI |
| **Backend API** | `profile.controller.ts` | - | - | ✅ Oui | ✅ Oui | - | - | ✅ OUI |

---

## 🔴 PROBLÈMES IDENTIFIÉS

### 1. **Incohérence Frontend**
- ✅ Apprenant et Directeur peuvent uploader
- ❌ Admin et Resped Pédagogique **NESPECTENT PAS cette fonctionnalité**
- **Cause:** Manque de code et d'UI dans leurs pages settings

### 2. **Duplication de Code**
- ✅ Apprenant utilise `lib/profile.api.ts`
- ❌ Directeur **redéfinit tout le code d'upload** (pas de DRY)
- **Conséquence:** Maintenance difficile, bug fixes à faire 2 fois

### 3. **Backend sans Restriction**
- ✅ Backend accepte les uploads de **TOUS les rôles**
- ❌ **Incohérence volontaire?** Admin et Resped devraient-ils pouvoir uploader ou non?
- **Question:** Faut-il une restriction par rôle?

---

## ✅ SOLUTIONS

### Option 1 : **Permettre à TOUS de télécharger**
Ajouter le code d'upload à Admin et Resped Pédagogique (copier du Directeur)

### Option 2 : **Restreindre certains rôles**
- Modifier le backend pour ajouter `@Roles(UserRole.APPRENANT, UserRole.DIRECTEUR)`
- Laisser Admin/Resped sans photo

### Option 3 : **Centraliser dans une composant réutilisable**
- Créer un composant `<ProfilePhotoUpload />` 
- L'utiliser dans tous les settings/profile pages
- Éviter la duplication

---

## 📝 RECOMMANDATIONS

1. **Clarifier la politique:** Admin/Resped devraient-ils avoir une photo de profil?
2. **Centraliser le code:** Utiliser la lib `profile.api.ts` partout (pas de fetch direct)
3. **Créer un composant réutilisable:** Éviter la duplication entre Apprenant et Directeur
4. **Ajouter des tests:** Vérifier que chaque rôle peut/ne peut pas uploader comme prévu
5. **Documentation:** Clarifier les permissions par rôle

