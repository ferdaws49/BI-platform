// lib/formations.api.ts
const API_URL ='http://localhost:5000';

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
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

  const res = await fetch(`http://localhost:5000/student/formations/my-list?page=${page}&status=${status}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
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