// lib/student.service.ts
const API_URL = 'http://localhost:5000';

export async function getStudentDashboardData() {
  const token = localStorage.getItem('access_token'); // Ou votre méthode de stockage
   console.log("TOKEN ENVOYÉ :", token);

  const response = await fetch(`${API_URL}/dashboard/student`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // On récupère le message d'erreur du backend s'il existe
    const errorData = await response.json().catch(() => ({}));
    console.error("Erreur Backend détaillée:", {
      status: response.status,
      message: errorData.message || "No message"
    });
    throw new Error(`Error ${response.status}: ${errorData.message || 'Failed to fetch'}`);
  }

  return response.json();
}
//Pour éviter qu'un apprenant n'aille manuellement sur /admin/dashboard en tapant l'URL :
//Côté Frontend : Utilisez un Middleware Next.js pour vérifier le rôle stocké ou le token.
//Côté Backend : Vos routes NestJS doivent avoir des Guards comme @Roles('admin').