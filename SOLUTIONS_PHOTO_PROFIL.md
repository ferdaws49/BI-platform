# 🔧 SOLUTIONS - Ajouter Photo Profil à Admin & Resped Pédagogique

## 🎯 Objectif

Permettre à **Admin** et **Responsable Pédagogique** d'ajouter une photo de profil, comme l'**Apprenant** et le **Directeur**.

---

## 📋 OPTION 1 : Ajouter le code directement à Admin

### Étape 1 : Ajouter les imports

**File:** `app/admin/settings/page.tsx` (ligne 1-10)

```typescript
import { useState, useEffect, useRef } from "react";
import { Save, Lock, Bell, User, Palette, Camera, Trash2 } from "lucide-react"; // ← ADD Camera, Trash2
import { useAdminContext } from "../AdminContext";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"; // ← ADD
```

### Étape 2 : Ajouter les états

**After line 72 (après `const [prefSaved, setPrefSaved] = useState(false);`)**

```typescript
// ── Image state ──
const [profileImage, setProfileImage] = useState<string | null>(null);
const [imgUploading, setImgUploading] = useState(false);
const [imgError, setImgError] = useState<string | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);
```

### Étape 3 : Charger l'image au montage

**After line 90 (après le useEffect du localStorage)**

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

### Étape 4 : Ajouter les handlers

**After line 170 (après `handleSavePrefs`)**

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

### Étape 5 : Ajouter l'UI dans le tab Profile

**Inside `{activeTab === "profile" && (` section, after `<h2>` and before the input fields**

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

## 📋 OPTION 2 : Ajouter du code identique à Resped Pédagogique

**Copier exactement les mêmes étapes ci-dessus pour:**

- `app/respedagogique/settings/page.tsx`

**Changements mineurs:**

- Remplacer `useAdminContext` par `useRespedContext` (déjà dans le fichier)
- Remplacer les clés localStorage `dataRefresh-admin` par `dataRefresh-resped`
- Tout le reste reste identique

---

## 🎨 OPTION 3 (RECOMMANDÉE) : Composant Réutilisable

### Créer un nouveau composant

**File:** `components/ProfilePhotoUpload.tsx`

```typescript
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Trash2, User } from 'lucide-react';

interface ProfilePhotoUploadProps {
  profileImage: string | null;
  firstName: string;
  onSuccess?: () => void;
  apiBase?: string;
}

export default function ProfilePhotoUpload({
  profileImage: initialImage,
  firstName,
  onSuccess,
  apiBase = 'http://localhost:5000'
}: ProfilePhotoUploadProps) {
  const [profileImage, setProfileImage] = useState<string | null>(initialImage);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync image from props
  useEffect(() => {
    setProfileImage(initialImage);
  }, [initialImage]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImgUploading(true);
    setImgError(null);

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('user-image', file);

      const res = await fetch(`${apiBase}/profile/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Erreur upload');

      const data = await res.json();
      setProfileImage(data?.profileImage ?? null);
      onSuccess?.();
    } catch (err: any) {
      setImgError('Erreur lors de l\'envoi de la photo');
    } finally {
      setImgUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer votre photo de profil ?')) return;

    setImgUploading(true);
    setImgError(null);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/profile/images/remove-profile-image`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Erreur suppression');
      setProfileImage(null);
      onSuccess?.();
    } catch (err: any) {
      setImgError('Erreur lors de la suppression de la photo');
    } finally {
      setImgUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center mb-8">
      <div className="relative group">
        {profileImage ? (
          <img
            src={`${apiBase}/profile/images/${profileImage}?t=${Date.now()}`}
            alt="Photo de profil"
            className="w-24 h-24 rounded-full object-cover border-4 border-emerald-100 shadow-md"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-emerald-600 text-white flex items-center justify-center text-3xl font-bold border-4 border-emerald-100 shadow-md">
            {firstName?.charAt(0)?.toUpperCase() ?? <User className="h-10 w-10" />}
          </div>
        )}

        {/* Upload button */}
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

        {/* Delete button */}
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

      <p className="text-xs text-gray-500 mt-3">
        Cliquez sur l'icône appareil photo pour changer votre photo
      </p>
      {imgError && <p className="text-xs text-red-500 mt-1">{imgError}</p>}
    </div>
  );
}
```

### Utiliser dans Admin

**File:** `app/admin/settings/page.tsx`

```typescript
import ProfilePhotoUpload from '@/components/ProfilePhotoUpload';

export default function AdminSettingsPage() {
  const { t: fullT } = useAdminContext();
  // ... other code ...

  return (
    <div>
      {/* ... */}
      {activeTab === "profile" && (
        <div>
          {/* Insérer le composant au lieu du code inline */}
          <ProfilePhotoUpload
            profileImage={profileImage}
            firstName={profile?.firstName ?? ''}
            onSuccess={() => {
              // Optional: refresh profile after success
            }}
            apiBase={BACKEND}
          />

          {/* Rest of profile form */}
        </div>
      )}
    </div>
  );
}
```

---

## 📊 Comparaison des Solutions

| Aspect              | Option 1       | Option 2       | Option 3      |
| ------------------- | -------------- | -------------- | ------------- |
| **Temps**           | ⚡ 10 min      | ⚡ 10 min      | ⏱️ 20 min     |
| **Maintenance**     | ❌ Duplication | ❌ Duplication | ✅ Centralisé |
| **Réutilisabilité** | ❌ Non         | ❌ Non         | ✅ Oui        |
| **Cohérence**       | ✅ Oui         | ✅ Oui         | ✅ Oui        |
| **Coût**            | ✅ Bas         | ✅ Bas         | ⚠️ Moyen      |

---

## 🚀 PROCHAINES ÉTAPES

1. **Choisir une option** (recommandé : Option 3)
2. **Tester** sur Admin et Resped Pédagogique
3. **Vérifier** les uploads fonctionnent
4. **Documenter** les permissions par rôle
5. **Ajouter des tests unitaires** si nécessaire

---

## 🐛 Checklist Avant Déploiement

- [ ] Les uploads fonctionnent pour Admin
- [ ] Les uploads fonctionnent pour Resped Pédagogique
- [ ] Les images s'affichent correctement
- [ ] La suppression d'image fonctionne
- [ ] Les erreurs s'affichent bien
- [ ] Les initiales s'affichent si pas d'image
- [ ] Pas d'erreurs console
- [ ] Mobile-friendly
- [ ] Taille max d'image respectée (1 MB)
