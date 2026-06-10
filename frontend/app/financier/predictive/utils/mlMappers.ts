export function mapPredictResponse(apiResponse: any, caPoints: any[] = []) {
  const predictions = apiResponse.predictions || [];

  // 1. CALCULS KPIs BASÉS SUR LES POINTS DU GRAPHIQUE
  const histData = caPoints.filter(p => p.historical !== null);
  const predData = caPoints.filter(p => p.predicted !== null);

  const totalHistorique = histData.reduce((acc, p) => acc + p.historical, 0);
  const totalPrediction = predData.reduce((acc, p) => acc + p.predicted, 0);

  const kpi = {
    caRealise: totalHistorique, // Plus jamais 0 si la ligne bleue du graphique existe
    // On met +10% par défaut si le modèle ML n'a pas encore de points de prédiction
    caPredicted: totalPrediction > 0 ? totalPrediction : totalHistorique * 1.1, 
    riskSessionsCount: predictions.filter((p: any) => p.risk_level === "high").length,
    profitMargin: predictions.length > 0 ? (predictions.filter((p: any) => p.is_deficit === 0).length / predictions.length) * 100 : 0,
    croissance: totalHistorique > 0 ? ((totalPrediction - totalHistorique) / totalHistorique) * 100 : 0,
  };

  // 2. MAPPING SESSIONS (Noms du Back)
  const riskSessions = predictions.map((p: any) => ({
    id: p.session_id,
    sessionName: p.session_name, // "Formation React Juin" au lieu de "session1"
    formation: p.formation_name, // "Développement Web" au lieu de "formation1"
    riskScore: p.risk_score,
    financialImpact: p.estimated_loss,
    status: p.risk_level === "high" ? "High" : p.risk_level === "medium" ? "Medium" : "Safe",
    fillRate: p.fill_rate,
    profitable: p.is_deficit === 0,
  }));

  // --- 3. RECOMMANDATIONS & INSIGHTS ---
  const recommendations = predictions
    .filter((p: any) => p.risk_level === "high")
    .map((p: any) => ({
      id: p.session_id,
      action: p.fill_rate < 0.4 ? "promote" : "reduce-costs",
      title: p.session_name,
      description: p.recommendation,
      impact: `${p.estimated_loss} TND sauvés`,
      priority: "high"
    }));

  const insights = predictions.length > 0 ? [{
    id: "ins-1",
    type: "risk",
    title: "Analyse Globale",
    description: `L'IA a détecté ${kpi.riskSessionsCount} sessions à haut risque sur la période.`
  }] : [];

  return { kpi, riskSessions, insights, recommendations };
}