const API_URL = 'http://localhost:5000';

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
});

export async function getMyRegistrations() {
  const res = await fetch(`${API_URL}/inscriptions/student`, { headers: getHeaders() });
  
  // 🔍 DEBUG : logue le status et le body brut avant de parser
  const text = await res.text();
  console.log('getMyRegistrations status:', res.status);
  console.log('getMyRegistrations body:', text.substring(0, 200));
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text || 'Empty response'}`);
  }
  
  return text ? JSON.parse(text) : [];
}

export async function getCatalogue() {
  const res = await fetch(`${API_URL}/student/formations/catalogue`, { headers: getHeaders() });
  const text = await res.text();
  console.log('getCatalogue status:', res.status);
  
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

export async function getAvailableSessions(formationId: number) {
  const res = await fetch(`${API_URL}/student/formations/${formationId}/available-sessions`, {
    headers: getHeaders(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

export async function createInscription(sessionId: number, formationId?: number) {
  const res = await fetch(`${API_URL}/inscriptions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ sessionId, formationId }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || 'Inscription failed');
  }
  return text ? JSON.parse(text) : {};
}

export async function cancelInscription(id: string) {
  const res = await fetch(`${API_URL}/inscriptions/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || 'Cancellation failed');
  return text ? JSON.parse(text) : {};
}