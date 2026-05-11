import { Injectable, Logger } from '@nestjs/common';
import { buildRecommendationPrompt } from './recommendation.ai';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly apiKey = process.env.GROQ_API_KEY;
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  async getRecommendations(payload: {
    history: any[];
    rootCauses: any[];
    problems: any[];
  }) {
    if (!this.apiKey || this.apiKey.startsWith('gsk_xxx')) {
      this.logger.warn('Groq key missing. Using fallback.');
      return this.getFallback(payload);
    }

    try {
      const prompt = buildRecommendationPrompt(payload);
      this.logger.log(`Sending prompt to Groq (length: ${prompt.length})`);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        this.logger.warn(
          `Groq API error: ${response.status} - ${JSON.stringify(errorBody)}`
        );
        return this.getFallback(payload);
      }

      const data = await response.json();
      this.logger.log(`Groq response received`);

      const text = data.choices?.[0]?.message?.content ?? '';
      this.logger.log(`Raw text: ${text.substring(0, 200)}`);

      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      return Array.isArray(parsed) ? parsed.slice(0, 3) : this.getFallback(payload);

    } catch (err) {
      this.logger.error(`Groq call failed: ${err}`);
      return this.getFallback(payload);
    }
  }

  private getFallback(payload: {
    history: any[];
    rootCauses: any[];
    problems: any[];
  }) {
    const current = payload.history?.[payload.history.length - 1];
    return [
      {
        title: "Analyser les causes d'abandon",
        description: `Le taux d'abandon actuel est de ${current?.dropoutRate ?? 'N/A'}%. Une révision pédagogique s'impose pour identifier les modules critiques.`,
        owner: 'Responsable pédagogique',
        impact: "Réduction attendue de 4 à 6 points d'abandon",
        priority: 'Haute',
        tone: 'critical',
      },
      {
        title: 'Renforcer les formations performantes',
        description: `Avec un taux de réussite de ${current?.successRate ?? 'N/A'}%, capitaliser sur les formations leaders pour attirer de nouveaux apprenants.`,
        owner: 'Direction + Marketing',
        impact: 'Augmentation des inscriptions de 10 à 15%',
        priority: 'Moyenne',
        tone: 'positive',
      },
      {
        title: 'Améliorer la satisfaction apprenants',
        description: `La satisfaction est à ${current?.satisfaction ?? 'N/A'}/100. Collecter les retours et ajuster le contenu pédagogique en conséquence.`,
        owner: 'Formateurs',
        impact: 'Hausse de la satisfaction et du bouche-à-oreille',
        priority: 'Moyenne',
        tone: 'warning',
      },
    ];
  }
}