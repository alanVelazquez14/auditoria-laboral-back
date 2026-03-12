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
  const currentDate = "marzo de 2026";
  
  const prompt = `
Eres el Mentor Tech Lead de DepurApp. Analiza el CV para el stack: ${userStack.join(', ')}.
FECHA ACTUAL DE REFERENCIA: ${currentDate}. No penalices fechas hasta marzo 2026 como futuras.

REGLAS DE ANÁLISIS:
1. Sé sintético. Analiza evidencia de logros y contexto técnico real.
2. ESCALA DE SCORE: 
   - 0-40: CV vacío o stack erróneo.
   - 40-65: Tiene base pero faltan logros/métricas.
   - 65-85: Perfil sólido y coherente.
   - 85-100: Excepcional con métricas de impacto.
3. EQUIDAD: Si demuestra conocimientos en ${userStack.join(', ')}, mantén el score mínimo en 60.

CV DEL CANDIDATO:
"""
${cvText}
"""

Responde EXCLUSIVAMENTE con un JSON que siga esta estructura exacta:
{
  "score": número (0-100),
  "checks": [
    { 
      "label": "Título corto", 
      "passed": boolean, 
      "feedback": "Máximo 25 palabras." 
    }
  ],
  "improvementTip": "Sugerencia estratégica (máximo 50 palabras)."
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
