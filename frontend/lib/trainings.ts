// lib/formations.api.ts
const API_URL ='http://localhost:5000';

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
});

// Récupérer la liste des formations
export async function getMyFormations(status = '', page = 1) {
  const token = localStorage.getItem('access_token');
  // On construit les paramètres de recherche
  const params = new URLSearchParams({
    pageNumber: page.toString(),
    formationPerPage: '6', // On peut fixer à 6 ou 10
  });
  
  if (status) params.append('status', status);

  const res = await fetch(`${API_URL}/student/formations/my-list?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return { data: [], meta: { totalPages: 1 } };
  return res.json();

}

// Récupérer les détails d'une formation (pour la modale)
export async function getFormationDetails(id: number) {
  const res = await fetch(`${API_URL}/student/formations/${id}`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch details');
  return res.json();
}

export async function rateFormation(formationId: number, note: number, commentaire?: string) {
  const res = await fetch(`${API_URL}/satisfaction`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      formationId,
      note,
      commentaire
    }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Erreur lors de la notation');
  }
  return res.json();
}