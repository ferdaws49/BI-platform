# ⚡ GUIDE RAPIDE - Implémenter la Photo Profil en 10 min

## 🎯 Objectif

Permettre à **Admin** et **Resped Pédagogique** d'uploader une photo comme le Directeur.

---

## 📝 Étape 1 : Admin - Ajouter les imports

**File:** `app/admin/settings/page.tsx` (ligne 1-5)

**AVANT:**

```typescript
import { useState, useEffect } from "react";
import { Save, Lock, Bell, User, Palette } from "lucide-react";
import { useAdminContext } from "../AdminContext";
```

**APRÈS:**

```typescript
import { useState, useEffect, useRef } from "react"; // ← Ajouter useRef
import { Save, Lock, Bell, User, Palette, Camera, Trash2 } from "lucide-react"; // ← Ajouter Camera, Trash2
import { useAdminContext } from "../AdminContext";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"; // ← Ajouter cette ligne
```

---

## 📝 Étape 2 : Admin - Ajouter les états

**Trouvez cette ligne (vers ligne 72):**

```typescript
const [prefSaved, setPrefSaved] = useState(false);
```

**Ajoutez après:**

```typescript
// ── Image state ──
const [profileImage, setProfileImage] = useState<string | null>(null);
const [imgUploading, setImgUploading] = useState(false);
const [imgError, setImgError] = useState<string | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);
```

---

## 📝 Étape 3 : Admin - Charger l'image au montage

**Trouvez le premier `useEffect` (vers ligne 80):**

```typescript
useEffect(() => {
  const userStr = localStorage.getItem("user");
  // ...
}, []);
```

**Ajoutez UN NOUVEL useEffect après ce premier:**

```typescript
// ── Load profile image from /profile/me ──
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
```

---

## 📝 Étape 4 : Admin - Ajouter les handlers

**Trouvez cette fonction (vers ligne 170):**

```typescript
const handleSavePrefs = () => {
  localStorage.setItem("dataRefresh-admin", dataRefresh);
  // ...
};
```

**Ajoutez après:**

```typescript
// ── Image upload handler ──
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
  } catch (err: any) {
    setImgError("Erreur lors de l'envoi de la photo");
  } finally {
    setImgUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
};

// ── Image delete handler ──
const handleDeleteImage = async () => {
  if (!window.confirm("Voulez-vous vraiment supprimer votre photo de profil ?"))
    return;
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

---

## 📝 Étape 5 : Admin - Ajouter l'UI

**Trouvez le section profile (dans `{activeTab === "profile" &&`):**

**CHERCHEZ cette ligne:**

```typescript
            <h2 className={`text-lg font-semibold mb-6 ${textPrimary}`}>
              {t.profile.title}
            </h2>
```

**AJOUTEZ juste après:**

```typescript
            {/* ── Photo de profil ── */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                {profileImage ? (
                  <img
                    src={`${BACKEND}/profile/images/${profileImage}?t=${Date.now()}`}
                    alt="Photo de profil"
                    className="w-24 h-24 rounded-full object-cover border-4 border-emerald-100 shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-emerald-600 text-white flex items-center justify-center text-3xl font-bold border-4 border-emerald-100 shadow-md">
                    {profile?.firstName?.charAt(0)?.toUpperCase() ?? <User className="h-10 w-10" />}
                  </div>
                )}
                {/* Bouton upload */}
                <label className="absolute bottom-0 right-0 p-1.5 bg-white border border-gray-200 rounded-full shadow cursor-pointer hover:bg-gray-50 transition-colors">
                  {imgUploading ? (
                    <div className="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 text-gray-600" />
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={imgUploading}
                  />
                </label>
                {/* Bouton suppression */}
                {profileImage && (
                  <button
                    onClick={handleDeleteImage}
                    disabled={imgUploading}
                    className="absolute bottom-0 left-0 p-1.5 bg-white border border-gray-200 rounded-full shadow cursor-pointer hover:bg-red-50 text-red-500 transition-colors"
                    title="Supprimer la photo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3">Cliquez sur l'icône appareil photo pour changer votre photo</p>
              {imgError && <p className="text-xs text-red-500 mt-1">{imgError}</p>}
            </div>
```

---

## 🔄 Répéter pour Resped Pédagogique

**Faites **EXACTEMENT** les mêmes 5 étapes pour:**
`app/respedagogique/settings/page.tsx`

**SAUF** à l'étape 1, remplacez:

```typescript
import { useAdminContext } from "../AdminContext";
// PAR
import { useRespedContext } from "../RespedContext";

// Et changez les références du context
const { t: fullT } = useRespedContext(); // Au lieu de useAdminContext
```

---

## ✅ Vérifier que ça marche

1. **Allez sur** `http://localhost:3000/admin/settings`
2. **Cliquez sur** l'icône caméra
3. **Choisissez une image** (JPG, PNG, etc.)
4. **Vérifiez que** l'image s'affiche
5. **Testez la suppression**

Répétez pour Resped Pédagogique sur `http://localhost:3000/respedagogique/settings`

---

## 🐛 Troubleshooting

### ❌ "Erreur lors de l'envoi de la photo"

**Vérifiez:**

- [ ] Le backend est lancé (`http://localhost:5000`)
- [ ] Vous êtes authentifié (vérifiez le localStorage.access_token)
- [ ] L'image fait < 1 MB
- [ ] L'image est au bon format (JPG, PNG, GIF, WebP)

### ❌ L'image ne s'affiche pas

**Vérifiez:**

- [ ] Le dossier `./images/users/` existe dans le backend
- [ ] Vérifiez les erreurs dans la console navigateur (F12)
- [ ] Vérifiez les erreurs backend (`npm run start` dans `backend/`)

### ❌ Les erreurs ne s'affichent pas

**Vérifiez:**

- [ ] Vous avez bien ajouté `{imgError && <p>...`

---

## 📝 Checklist d'Implémentation

- [ ] Admin : Imports ajoutés
- [ ] Admin : États ajoutés
- [ ] Admin : useEffect ajouté
- [ ] Admin : Handlers ajoutés
- [ ] Admin : UI ajoutée
- [ ] Admin : Testé et fonctionne
- [ ] Resped : Imports ajoutés
- [ ] Resped : États ajoutés
- [ ] Resped : useEffect ajouté
- [ ] Resped : Handlers ajoutés
- [ ] Resped : UI ajoutée
- [ ] Resped : Testé et fonctionne
- [ ] Pas d'erreurs console
- [ ] Images s'affichent correctement

---

## ⏱️ Temps Estimé

- **Admin** : 10 minutes
- **Resped** : 5 minutes (copie-colle)
- **Total** : **15 minutes**

---

## 🎉 Résultat Final

Après ces 5 étapes, voici ce que vous aurez:

### Admin - Avant vs Après

**AVANT:**

```
Paramètres - Profil
├─ First Name: [...]
├─ Last Name: [...]
├─ Email: [...]
└─ Phone: [...]
❌ Pas de section photo
```

**APRÈS:**

```
Paramètres - Profil
├─ [📷 PHOTO]         ← NOUVEAU
│  🎥 ❌
├─ First Name: [...]
├─ Last Name: [...]
├─ Email: [...]
└─ Phone: [...]
✅ Photo fonctionnelle
```

---

## 💾 Alternative - Copier depuis le Directeur

Si vous préférez, vous pouvez simplement **copier-coller** tout le code du fichier du Directeur:

**Source:** `app/directeur/settings/page.tsx`
**Destination:** `app/admin/settings/page.tsx`

**SAUF:**

- Gardez les imports spécifiques à Admin (`useAdminContext`)
- Gardez les états spécifiques du profil Admin

Puis refaire pour Resped.

---

## 🚀 Prochain Pas Recommandé

Une fois que ça fonctionne:

1. **Refactoriser** le code dupliqué
2. **Créer un composant** `<ProfilePhotoUpload />`
3. **L'utiliser partout**

Voir: [SOLUTIONS_PHOTO_PROFIL.md](SOLUTIONS_PHOTO_PROFIL.md) pour les détails.
