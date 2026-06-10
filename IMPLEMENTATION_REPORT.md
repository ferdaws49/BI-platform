# ✅ تنفيذ المشروع - تفعيل ميزة الصورة الشخصية

## 🎯 الملخص

تم نسخ ميزة تحميل الصورة الشخصية من **Apprenant** وتطبيقها على:

- ✅ **Admin**
- ✅ **Responsable Pédagogique**
- ✅ **Directeur** (تحسين الكود القديم)

---

## 📋 التغييرات المُنفذة

### 1. ✅ Admin (`app/admin/settings/page.tsx`)

**الإضافات:**

```typescript
// 1. Import الـ library والـ icons
import { Camera, Trash2 } from "lucide-react";
import { uploadProfileImage, deleteProfileImage } from "@/lib/profile.api";

// 2. States جديدة
const [profileImage, setProfileImage] = useState<string | null>(null);
const [imageVersion, setImageVersion] = useState(Date.now());
const [imgLoading, setImgLoading] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);

// 3. Load الصورة من API
useEffect(() => {
  apiFetch("/profile/me")
    .then((data) => setProfileImage(data?.profileImage ?? null))
    .catch(() => {});
}, []);

// 4. Upload Handler
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    setImgLoading(true);
    try {
      await uploadProfileImage(e.target.files[0]);
      setImageVersion(Date.now());
      const data = await apiFetch("/profile/me");
      setProfileImage(data?.profileImage ?? null);
    } catch (err) {
      alert("Erreur lors de l'upload de la photo");
    } finally {
      setImgLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }
};

// 5. Delete Handler
const handleDeleteImage = async () => {
  const confirmed = window.confirm("Voulez-vous vraiment supprimer votre photo de profil ?");
  if (!confirmed) return;
  setImgLoading(true);
  try {
    await deleteProfileImage();
    setProfileImage(null);
    alert("Photo supprimée !");
  } catch (err) {
    alert("Erreur lors de la suppression");
  } finally {
    setImgLoading(false);
  }
};

// 6. UI Component
<div className="flex flex-col items-center mb-8">
  <div className="relative group">
    {profileImage ? (
      <img
        key={`${profileImage}-${imageVersion}`}
        src={`${API_BASE}/profile/images/${profileImage}?t=${imageVersion}`}
        alt="Photo de profil"
        className="w-32 h-32 rounded-full object-cover border-4 border-emerald-100 shadow-md"
      />
    ) : (
      <div className="w-32 h-32 rounded-full bg-emerald-600 text-white flex items-center justify-center text-4xl font-bold">
        {profile?.firstName?.charAt(0)?.toUpperCase() ?? <User className="h-10 w-10" />}
      </div>
    )}
    {/* Upload Button */}
    <label className="absolute bottom-0 right-0 p-2 bg-white border rounded-full shadow cursor-pointer">
      {imgLoading ? <Spinner /> : <Camera className="h-5 w-5" />}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
    </label>
    {/* Delete Button */}
    {profileImage && (
      <button onClick={handleDeleteImage} className="absolute bottom-0 left-0 p-2 text-red-500">
        <Trash2 className="h-5 w-5" />
      </button>
    )}
  </div>
  <p className="text-xs text-gray-500 mt-3">Cliquez sur l'icône caméra pour changer votre photo</p>
</div>
```

---

### 2. ✅ Responsable Pédagogique (`app/respedagogique/settings/page.tsx`)

**تم تطبيق نفس التعديلات:**

- ✅ Import `uploadProfileImage`, `deleteProfileImage`
- ✅ Import `Camera`, `Trash2`
- ✅ States: `profileImage`, `imageVersion`, `imgLoading`, `fileInputRef`
- ✅ useEffect لتحميل الصورة من `/profile/me`
- ✅ `handleImageUpload` handler
- ✅ `handleDeleteImage` handler
- ✅ نفس الـ UI component

---

### 3. ✅ Directeur (`app/directeur/settings/page.tsx`) - تحسين

**قبل (كود مدكرر):**

```typescript
// كود طويل للـ fetch، إعادة محاولة مزدوجة، إدارة خطأ معقدة
const handleImageUpload = async (e) => {
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
    // ... كود مزدوج
  } // ...
};
```

**بعد (باستخدام الـ library):**

```typescript
import { uploadProfileImage, deleteProfileImage } from "@/lib/profile.api";

const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    setImgUploading(true);
    try {
      await uploadProfileImage(e.target.files[0]);
      setImageVersion(Date.now());
      const data = await apiFetch("/profile/me");
      setProfileImage(data?.profileImage ?? null);
    } catch (err) {
      alert("Erreur lors de l'upload de la photo");
    } finally {
      setImgUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }
};
```

**الفوائد:**

- ✅ أقل كود (من 30 سطر إلى 15 سطر)
- ✅ أسهل للصيانة
- ✅ إعادة استخدام الـ library
- ✅ سهولة تحديث في مكان واحد

---

## 📊 ملخص التغييرات

| الملف                                  | الحالة   | التغييرات                                      |
| -------------------------------------- | -------- | ---------------------------------------------- |
| `app/admin/settings/page.tsx`          | ✅ مكتمل | +4 states, +1 useEffect, +2 handlers, +1 UI    |
| `app/respedagogique/settings/page.tsx` | ✅ مكتمل | +4 states, +1 useEffect, +2 handlers, +1 UI    |
| `app/directeur/settings/page.tsx`      | ✅ محسّن | -15 سطر كود, استخدام library, imageVersion fix |

---

## 🔍 ما تم فعله

### في Admin:

```diff
+ import { uploadProfileImage, deleteProfileImage } from "@/lib/profile.api";
+ const [profileImage, setProfileImage] = useState<string | null>(null);
+ const [imageVersion, setImageVersion] = useState(Date.now());
+ const [imgLoading, setImgLoading] = useState(false);
+ const fileInputRef = useRef<HTMLInputElement>(null);
+ useEffect(() => { apiFetch("/profile/me").then((data) => setProfileImage(...)) }, []);
+ const handleImageUpload = async (e) => { ... }
+ const handleDeleteImage = async () => { ... }
+ <div className="flex flex-col items-center mb-8"> { ... UI ... } </div>
```

### في Responsable Pédagogique:

```diff
+ import { uploadProfileImage, deleteProfileImage } from "@/lib/profile.api";
+ (نفس التعديلات كما في Admin)
```

### في Directeur:

```diff
+ import { uploadProfileImage, deleteProfileImage } from "@/lib/profile.api";
- // كود fetch طويل
+ // استخدام handleImageUpload المحسّن
- // كود delete طويل
+ // استخدام handleDeleteImage المحسّن
- src={`${BACKEND}/profile/images/${profileImage}?t=${Date.now()}`}
+ src={`${BACKEND}/profile/images/${profileImage}?t=${imageVersion}`}
+ key={`${profileImage}-${imageVersion}`}
```

---

## ✅ الاختبار

### تم التحقق من:

- ✅ لا توجد أخطاء في `admin/settings/page.tsx`
- ✅ لا توجد أخطاء في `respedagogique/settings/page.tsx`
- ✅ لا توجد أخطاء في `directeur/settings/page.tsx`

### قبل البدء في الاختبار اليدوي:

```bash
# 1. تأكد من تشغيل الـ backend
cd backend
npm run start

# 2. تأكد من تشغيل الـ frontend
cd frontend
npm run dev

# 3. انتقل إلى المتصفح
# http://localhost:3000/admin/settings
# http://localhost:3000/respedagogique/settings
# http://localhost:3000/directeur/settings
```

---

## 🎯 النتائج

| الميزة               | Apprenant | Admin | Resped | Directeur |
| -------------------- | --------- | ----- | ------ | --------- |
| **تحميل الصورة**     | ✅        | ✅    | ✅     | ✅        |
| **حذف الصورة**       | ✅        | ✅    | ✅     | ✅        |
| **عرض الصورة**       | ✅        | ✅    | ✅     | ✅        |
| **الاستخدام الموحد** | ✅        | ✅    | ✅     | ✅        |
| **جودة الكود**       | ✅        | ✅    | ✅     | ✅        |

---

## 📝 الملفات المُعدّلة

1. `c:\projects\Projet-Pfe\frontend\app\admin\settings\page.tsx`
   - تمت إضافة ميزة تحميل الصورة كاملة

2. `c:\projects\Projet-Pfe\frontend\app\respedagogique\settings\page.tsx`
   - تمت إضافة ميزة تحميل الصورة كاملة

3. `c:\projects\Projet-Pfe\frontend\app\directeur\settings\page.tsx`
   - تم تحسين الكود الموجود ليستخدم الـ library
   - تم إضافة `imageVersion` للـ cache-busting
   - تم تقليل عدد الأسطر البرمجية

---

## 🚀 الخطوة التالية

### اختبار المميزات:

#### في Admin:

1. انتقل إلى `/admin/settings`
2. ستجد section "Photo de profil" مع:
   - صورة دائرية (أو الأحرف الأولى)
   - زر كاميرا لتحميل الصورة
   - زر حذف (إذا كانت هناك صورة)
3. اختبر:
   - اختر صورة → يجب أن تظهر فوراً
   - اضغط حذف → يجب أن تختفي

#### في Responsable Pédagogique:

- نفس الخطوات في `/respedagogique/settings`

#### في Directeur:

- نفس الخطوات في `/directeur/settings`
- تحقق من أن الصورة تظهر بسلاسة (cache-busting يعمل)

---

## 📖 الملاحظات

### استخدام Library المركزية:

```typescript
// بدلاً من:
const token = localStorage.getItem("access_token");
const fd = new FormData();
fd.append("user-image", file);
const res = await fetch(`${API_BASE}/profile/upload-image`, { ... });

// استخدام:
import { uploadProfileImage } from "@/lib/profile.api";
await uploadProfileImage(file);
```

### Cache-Busting:

```typescript
// بدلاً من:
src={`${BACKEND}/profile/images/${profileImage}?t=${Date.now()}`}
// (يتغير كل مرة يُعاد تصيير الـ component)

// استخدام:
const [imageVersion, setImageVersion] = useState(Date.now());
// وتحديثها فقط عند النجاح:
setImageVersion(Date.now());
src={`${BACKEND}/profile/images/${profileImage}?t=${imageVersion}`}
```

---

## ✨ النتيجة النهائية

جميع الأدوار الآن لديهم:

- ✅ نفس ميزة تحميل الصورة الشخصية
- ✅ نفس الـ UI الموحد
- ✅ نفس السلوك المتوقع
- ✅ كود نظيف وقابل للصيانة

---

**تاريخ التنفيذ:** 7 يونيو 2026
**الحالة:** ✅ مكتمل وجاهز للاختبار
