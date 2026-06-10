const API_URL = 'http://localhost:5000/profile';

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
});

export async function getProfile() {
  const res = await fetch(`${API_URL}/me`, { headers: getHeaders() });
  return res.json();
}

export async function updateProfile(data: { username?: string; phone?: string; password?: string }) {
  const res = await fetch(`${API_URL}`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    try { const err = JSON.parse(text); throw new Error(err.message); } 
    catch { throw new Error(text); }
  }
  return res.json();
}

export async function uploadProfileImage(file: File) {
  const formData = new FormData();
  formData.append('user-image', file);

  const res = await fetch(`${API_URL}/upload-image`, {
    method: 'POST',
    headers: getHeaders(), // ← Pas de Content-Type ici
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    try {
      const err = JSON.parse(text);
      throw new Error(err.message || 'Erreur upload');
    } catch {
      throw new Error(text || 'Erreur upload');
    }
  }

  return res.json(); // ← Retourne l'objet user mis à jour par le backend
}
export const deleteProfileImage = async () => {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_URL}/images/remove-profile-image`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) {
    const text = await res.text();
    try { const err = JSON.parse(text); throw new Error(err.message); }
    catch { throw new Error(text); }
  }
  return res.json();
};