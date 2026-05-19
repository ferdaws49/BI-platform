// services/schedule.api.ts

const API_URL ='http://localhost:5000';

/**
 * Récupère le token d'authentification
 */
const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
});

/**
 * 1. Emploi du temps global de l'apprenant
 */
export const getStudentSchedules = async (period: 'week' | 'month', date: string) => {
   const query = `?period=${period}&date=${date}`;
  const response = await fetch(`${API_URL}/schedules/student${query}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch student schedule');
  return response.json();
};

/**
 * 2. Planning spécifique d'une formation
 */
export const getFormationSchedules = async (formationId: string | number) => {
  const response = await fetch(`${API_URL}/schedules/formation/${formationId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch formation schedule');
  return response.json();
};

export const joinOnlineSession = async (sessionId: string) => {
  // Utilise la même instance axios/fetch que getStudentSchedules
  // Exemple avec fetch (adapte selon ton code existant) :
  const res = await fetch(`${API_URL}/schedules/join/${sessionId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  if (!res.ok) throw new Error('Accès refusé');
  return res.json();
};