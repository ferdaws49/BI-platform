'use client'
import React, { useEffect, useState } from 'react';
import { Camera, Save, Loader2, Calendar, Shield, Phone } from 'lucide-react';
import { deleteProfileImage, getProfile, updateProfile, uploadProfileImage, getProfileImageUrl } from '@/lib/profile.api';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/financier/DashboardLayout';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageVersion, setImageVersion] = useState(Date.now());
  
  const [formData, setFormData] = useState({ nom: '', prenom: '', phone: '', password: '' });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const data = await getProfile();
    setUser(data);
    setFormData({ 
      nom: data.nom || '', 
      prenom: data.prenom || '', 
      phone: data.phone || '', 
      password: '' 
    });
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { password, nom, prenom, phone } = formData;
      const payload: any = { nom, prenom, phone };
      if (password) payload.password = password;

      await updateProfile(payload);
      const updatedData = await getProfile();
      setUser(updatedData);
      setFormData({ 
        nom: updatedData.nom || '', 
        prenom: updatedData.prenom || '',
        phone: updatedData.phone, 
        password: '' 
      });
      toast.success("Profil mis à jour avec succès !");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLoading(true);
      try {
        // ✅ LE BACKEND RETOURNE LE USER MIS À JOUR — utilise-le !
        const updatedUser = await uploadProfileImage(file);
        
        // ✅ Met à jour le state directement (pas besoin de loadProfile)
        setUser(updatedUser);
        
        // ✅ Change le timestamp pour invalider le cache navigateur
        setImageVersion(Date.now());
        
        toast.success("Photo mise à jour !");
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de l'envoi");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteImage = async () => {
    const confirmed = window.confirm("Voulez-vous vraiment supprimer votre photo de profil ?");
    if (!confirmed) return;

    setLoading(true);
    try {
      await deleteProfileImage();
      await loadProfile();
      toast.success("Photo supprimée !");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const initials = (  (user?.prenom?.[0] || '') + (user?.nom?.[0] || '')).toUpperCase() || '?';

  if (loading) return (
    <div className="flex justify-center p-20">
      <Loader2 className="animate-spin text-[#1b5333]" size={32} />
    </div>
  );

  return (
    <DashboardLayout>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500">Gérez vos informations personnelles</p>
      </div>

      {/* 
        ✅ GRID RESPONSIVE :
        - Mobile : 1 colonne, bloc profil horizontal
        - Desktop : 12 colonnes, profil sticky à gauche (4/12), formulaire à droite (8/12)
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* ═══════════════════════════════════════
            BLOC PROFIL (Gauche sur Desktop, Haut sur Mobile)
           ═══════════════════════════════════════ */}
        <div className="lg:col-span-4 lg:sticky lg:top-6 bg-white rounded-[24px] border border-gray-100 shadow-sm p-5 lg:p-6">
          
          {/* 
            ✅ FLEX DIRECTION RESPONSIVE :
            - Mobile : row (avatar à gauche, texte à droite)
            - Desktop : col (avatar centré au-dessus)
          */}
          <div className="flex flex-row lg:flex-col items-center lg:items-center gap-4 lg:gap-0">
            
            {/* AVATAR */}
            {/* ✅ key sur le conteneur pour forcer le re-render complet */}
<div className="relative shrink-0" key={`avatar-${user?.profileImage}-${imageVersion}`}>
  {user.profileImage ? (
    <img
      src={getProfileImageUrl(user.profileImage, imageVersion)}
      alt="Profil"
      className="w-20 h-20 lg:w-28 lg:h-28 rounded-full object-cover border-4 border-white shadow-xl"
    />
  ) : (
    <div className="w-20 h-20 lg:w-28 lg:h-28 bg-[#1b5333] text-white rounded-full flex items-center justify-center text-2xl lg:text-3xl font-bold border-4 border-white shadow-xl select-none">
      {initials}
    </div>
  )}
  
  <label className="absolute bottom-0 right-0 p-1.5 lg:p-2 bg-white border border-gray-100 rounded-full shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
    <Camera size={14} className="lg:size-[16px] text-gray-600" />
    <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
  </label>

  {user.profileImage && (
    <button
      onClick={handleDeleteImage}
      className="absolute bottom-0 left-0 p-1.5 lg:p-2 bg-white border border-gray-100 rounded-full shadow-lg cursor-pointer hover:bg-red-50 text-red-600 transition-colors"
      title="Supprimer"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" className="lg:w-4 lg:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
      </svg>
    </button>
  )}
</div>

            {/* INFOS TEXTE */}
            <div className="flex-1 min-w-0 lg:text-center lg:mt-4">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 truncate">
                 {user.prenom} {user.nom}
              </h2>
              <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              
              {/* Badge "Membre depuis" - visible sur mobile ici, desktop en bas */}
              {user?.createdAt && (
                <div className="mt-2 lg:hidden inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                  <Calendar size={12} />
                  Depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>

          {/* ═══ INFOS COMPLÉMENTAIRES (Desktop uniquement) ═══ */}
          <div className="hidden lg:block mt-6 pt-6 border-t border-gray-100 space-y-4">
            
            {user?.createdAt && (
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-400 bg-gray-50 px-4 py-2 rounded-full">
                <Calendar size={14} />
                Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            )}

            {/* Mini-stats pour équilibrer visuellement avec le formulaire */}
            <div className="space-y-3 px-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Shield size={14} />
                  <span>Rôle</span>
                </div>
                <span className="font-semibold text-gray-700 text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">
                  Responsable financier
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Phone size={14} />
                  <span>Téléphone</span>
                </div>
                <span className="font-medium text-gray-700 text-xs">
                  {user.phone || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            FORMULAIRE (Droite sur Desktop)
           ═══════════════════════════════════════ */}
        <div className="lg:col-span-8 bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 lg:p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Nom</label>
              <input 
                type="text" 
                value={formData.nom || ''} 
                onChange={(e) => setFormData({...formData, nom: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#1b5333] outline-none text-sm transition-colors" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Prénom</label>
              <input 
                type="text" 
                value={formData.prenom || ''} 
                onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#1b5333] outline-none text-sm transition-colors" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Numéro de téléphone</label>
              <input 
                type="tel" 
                value={formData.phone || ''} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#1b5333] outline-none text-sm transition-colors" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">
                Numéro de téléphone
              </label>
              <input
                type="tel"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-5 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-brand-dark outline-none text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">
                Nouveau mot de passe (laisser vide pour garder l'actuel)
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={formData.password || ''} 
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#1b5333] outline-none text-sm transition-colors" 
              />
            </div>
            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#1b5333] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#154128] transition-all shadow-lg disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
  
}
