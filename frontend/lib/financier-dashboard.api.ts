
const API = "http://localhost:5000";

console.log("API =", API);

export async function getdashboard(endpoint: string, filters: any = {}) {
  // Transformer l'objet filters en paramètres d'URL (?startDate=...&formationId=...)
  const params = new URLSearchParams();
  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== ""  && value !== "undefined") {
      params.append(key, String(value));
    }
  });

 
  
  const query = params.toString();
   const url = query
    ? `${API}/${endpoint}?${query}`
    : `${API}/${endpoint}`;


  const token = localStorage.getItem("access_token");

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
       ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

 

 


  const data = await response.json();
console.log("DATA:", data);
  

  if (!response.ok) {
    console.log("API ERROR:", data);
    
    throw new Error(`Erreur API: ${response.status}`);
    
  }
  
 return data;
}