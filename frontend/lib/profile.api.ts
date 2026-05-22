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
    const err = await res.json();
    throw new Error(err.message || 'Erreur mise à jour');
  }
  return res.json();
}

export async function uploadProfileImage(file: File) {
  const formData = new FormData();
  formData.append('user-image', file);

  const res = await fetch(`${API_URL}/upload-image`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData,
  });

  // ← AJOUTÉ : sinon vous ne voyez jamais l'erreur
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Erreur upload image');
  }

  return res.json();
}

export const deleteProfileImage = async () => {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_URL}/images/remove-profile-image`, { // <-- Vérifie l'URL de ton controller
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