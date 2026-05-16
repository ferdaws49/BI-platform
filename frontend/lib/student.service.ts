const API_URL = 'http://localhost:5000';

export async function getStudentDashboardData() {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    throw new Error('No token found');
  }

  try {
    const response = await fetch(`${API_URL}/dashboard/student`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // 🔍 Lire le body UNE SEULE FOIS
    const text = await response.text();
    console.log('Dashboard API response:', response.status, text.substring(0, 200));

    if (!response.ok) {
      // Essayer de parser l'erreur
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errJson = JSON.parse(text);
        errorMsg = errJson.message || errorMsg;
      } catch {
        // Pas du JSON, garder le texte brut
        errorMsg = text || errorMsg;
      }
      throw new Error(errorMsg);
    }

    // Parser le JSON
    return text ? JSON.parse(text) : null;
    
  } catch (err: any) {
    console.error('Dashboard fetch error:', err);
    throw err;
  }
}
//Pour éviter qu'un apprenant n'aille manuellement sur /admin/dashboard en tapant l'URL :
//Côté Frontend : Utilisez un Middleware Next.js pour vérifier le rôle stocké ou le token.
//Côté Backend : Vos routes NestJS doivent avoir des Guards comme @Roles('admin').