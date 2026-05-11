'use client'
import React, { useEffect, useState } from 'react';
import { Camera, Save, Loader2, CheckCircle, Calendar } from 'lucide-react';
import { deleteProfileImage, getProfile, updateProfile, uploadProfileImage } from '@/lib/profile.api';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

    // bech ki yammel update lel image , tetbadel directement
  const [imageVersion, setImageVersion] = useState(Date.now());
  
  // États du formulaire
  const [formData, setFormData] = useState({ username: '', phone: '', password: '' });
  const [deleting, setDeleting] = useState(false);


  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const data = await getProfile();
      console.log("Données du profil :", data); // <--- AJOUTEZ CECI
    setUser(data);
    setFormData({ username: data.username || '', phone: data.phone || '', password: '' });
    setLoading(false);
  };

  const handleSave = async () => {
  setSaving(true);

  try {
    const { password, username, phone } = formData;
    const payload: any = { username, phone };
    if (password) payload.password = password;

    await updateProfile(payload);
    
    // Forcer le rechargement des données
    const updatedData = await getProfile();
    setUser(updatedData);
    // On vide le champ password après succès
    setFormData({ 
      username: updatedData.username, 
      phone: updatedData.phone, 
      password: '' 
    });
    
    alert("Profile updated successfully!");
  } catch (error) {
    console.error(error);
    alert("Error updating profile.");
  } finally {
    setSaving(false);
  }
};

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
    setLoading(true); // Optionnel : affiche un spinner
    try {
      await uploadProfileImage(e.target.files[0]);
      await loadProfile();

      setImageVersion(Date.now());

    } catch (err) {
      alert("Erreur lors de l'envoi");
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
    
    // Recharger le profil pour afficher les initiales à la place de l'image
    await loadProfile();
    alert("Photo de profil supprimée !");
  } catch (err: any) {
    alert(err.message || "Erreur lors de la suppression");
  } finally {
    setLoading(false);
  }
};

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500">Manage your personal information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Carte Identité */}
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-8 flex flex-col items-center text-center">
          <div className="relative group mb-6">
            {user.profileImage ? (
              <img 
                src={`http://localhost:5000/profile/images/${user.profileImage}?t=${user.lastUpdate}`} 
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl"
              />
            ) : (
              <div className="w-32 h-32 bg-brand-dark text-white rounded-full flex items-center justify-center text-4xl font-bold border-4 border-white shadow-xl">
                {user.username?.substring(0, 2).toUpperCase()}
              </div>
            )}
            <label className="absolute bottom-0 right-0 p-2 bg-white border border-gray-100 rounded-full shadow-lg cursor-pointer hover:bg-gray-50">
              <Camera size={18} />
              <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
            </label>
            {user.profileImage && (
              <button
              onClick={handleDeleteImage}
              className="absolute bottom-0 left-0 p-2 bg-white border border-gray-100 rounded-full shadow-lg cursor-pointer hover:bg-red-50 text-red-600"
              title="Supprimer la photo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </button>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{user.username}</h2>
          <p className="text-sm text-gray-500 mb-8">{user?.email}</p>

          {user?.createdAt && (
    <div className="flex items-center gap-2 text-xs font-medium text-gray-400 bg-gray-50 px-4 py-2 rounded-full">
      <Calendar size={14} className="text-gray-400" />
      <span>
        Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric'
        })}
      </span>
    </div>
  )}
        </div>
        

        {/* Formulaire */}
        <div className="lg:col-span-2 bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Username</label>
              <input 
                type="text" 
                value={formData.username || ''} 
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-brand-dark outline-none text-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Phone Number</label>
              <input 
                type="tel" 
                value={formData.phone || ''} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-brand-dark outline-none text-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">New Password (leave blank to keep current)</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={formData.password || ''} 
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-brand-dark outline-none text-sm" 
              />
            </div>
            <div className="pt-4 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-brand-dark text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}