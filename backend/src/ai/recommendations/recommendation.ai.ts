export function buildRecommendationPrompt(payload: {
  history: any[];
  rootCauses: any[];
  problems: any[];
}): string {
  const current = payload.history[payload.history.length - 1];
  const previous = payload.history[Math.max(payload.history.length - 2, 0)];

  const causesText = payload.rootCauses
    .map((c) => `- ${c.title}: ${c.text}`)
    .join('\n') || 'Aucune cause critique détectée.';

  const problemsText = payload.problems
    .map((p) => `- ${p.title}: ${p.text}`)
    .join('\n') || 'Aucun problème majeur détecté.';

  return `Tu es un conseiller stratégique expert en formation professionnelle.
Voici les données actuelles d'un centre de formation privé :

INDICATEURS ACTUELS:
- Inscriptions: ${current?.enrollments ?? 'N/A'} (précédent: ${previous?.enrollments ?? 'N/A'})
- Revenu: ${current?.revenue ?? 'N/A'} DT (précédent: ${previous?.revenue ?? 'N/A'} DT)
- Taux de réussite: ${current?.successRate ?? 'N/A'}%
- Taux d'abandon: ${current?.dropoutRate ?? 'N/A'}%
- Satisfaction: ${current?.satisfaction ?? 'N/A'}/100

CAUSES IDENTIFIÉES:
${causesText}

PROBLÈMES DÉTECTÉS:
${problemsText}

Génère exactement 3 recommandations stratégiques ACTIONNABLES en français.
Réponds UNIQUEMENT avec un tableau JSON valide, sans markdown, sans explication.
Format strict:
[
  {
    "title": "Titre court et percutant",
    "description": "Description concrète (2-3 phrases max)",
    "owner": "Responsable suggéré",
    "impact": "Impact attendu mesurable",
    "priority": "Haute" ou "Moyenne",
    "tone": "positive" ou "warning" ou "critical"
  }
]`;
}