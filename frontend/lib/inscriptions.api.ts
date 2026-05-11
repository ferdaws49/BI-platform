const API_URL ='http://localhost:5000';

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
});

// Récupérer l'historique
export async function getMyRegistrations() {
  const res = await fetch(`${API_URL}/inscriptions/student`, { headers: getHeaders() });
  return res.json();
}

// Créer une inscription
export async function createInscription(formationId: number) {
  const res = await fetch(`${API_URL}/inscriptions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ formationId }),
  });
  return res.json();
}

// Annuler une inscription
export async function cancelInscription(id: string) {
  const res = await fetch(`${API_URL}/inscriptions/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.json();
}