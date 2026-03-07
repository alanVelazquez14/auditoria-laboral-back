import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AiService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY!;

    this.apiUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    if (!this.apiKey) throw new Error('Falta GEMINI_API_KEY en el .env');
  }

  async analyzeCVWithATS(cvText: string, userStack: string[]) {
    const prompt = `
Eres un experto en Recruiting IT. Analiza este CV para el stack: ${userStack.join(', ')}.

CV:
${cvText}

Devuelve SOLO JSON:
{
  "score": 0-100,
  "checks": [
    { "label": "Título profesional", "passed": true, "feedback": "..." }
  ],
  "improvementTip": "Sugerencia corta"
}
`;

    try {
      const response = await axios.post(`${this.apiUrl}?key=${this.apiKey}`, {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.data.candidates[0].content.parts[0].text;

      const cleanJson = text.replace(/```json|```/g, '').trim();

      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('Error detallado:', error.response?.data || error.message);
      throw new Error('El motor de IA falló al analizar el CV');
    }
  }
}
