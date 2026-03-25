import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication } from '../job-applications/entities/job-application.entity';
import { AiService } from 'src/ai/ai.service';

@Injectable()
export class InterviewService {
  constructor(
    @InjectRepository(JobApplication)
    private readonly jobAppRepo: Repository<JobApplication>,
    private readonly aiService: AiService,
  ) {}

  async getPreparationContext(jobId: string, userId: string) {
    const application = await this.jobAppRepo.findOne({
      where: { id: jobId, user: { id: userId } },
      relations: ['cvVersion', 'user'],
    });

    if (!application) throw new NotFoundException('Postulación no encontrada');
    if (!application.cvVersion)
      throw new NotFoundException('No hay un CV asociado a esta postulación');

    const cvAnalysis = application.cvVersion.analysis;
    const score = cvAnalysis.score || 0;
    const userName = application.user?.fullName || 'Candidato';

    const systemPrompt = `
      Eres un Reclutador Técnico Senior experto en ${application.position}.
      Tu objetivo es entrenar al usuario (${userName}) para su entrevista en ${application.companyName}.
      
      DATOS DEL PERFIL:
      - Score del CV utilizado: ${score}/100.
      - Nivel de compatibilidad con la vacante: ${application.matchLevel}/5.
      - Fortalezas y Gaps detectados: ${cvAnalysis.analysis}.

      INSTRUCCIONES DE COMPORTAMIENTO:
      1. Personaliza el saludo: "Hola ${userName}, he revisado tu perfil de ${score} puntos para la posición de ${application.position}..."
      2. Mentalidad: No eres un asistente amable, eres un entrevistador exigente de ${application.companyName}. 
      3. Estrategia: Si el match es bajo (${application.matchLevel} < 3), sé más incisivo en las debilidades técnicas.
    `.trim();

    return {
      company: application.companyName,
      position: application.position,
      cvScore: score,
      matchLevel: application.matchLevel,
      systemPrompt,
      suggestedFirstQuestion: `Veo que en tu CV tienes un buen match, pero para este rol de ${application.position} buscamos a alguien con fuerte dominio de arquitecturas escalables. ¿Cómo defendés tu experiencia en ese punto?`,
    };
  }

  async processStep(
    jobId: string,
    userId: string,
    answer: string,
    history: any[],
  ) {
    const context = await this.getPreparationContext(jobId, userId);

    const chatPrompt = `
      ${context.systemPrompt}

      HISTORIAL DE LA CONVERSACIÓN:
      ${history.map((h) => `${h.role === 'user' ? 'Candidato' : 'Entrevistador'}: ${h.content}`).join('\n')}

      NUEVA RESPUESTA DEL CANDIDATO:
      "${answer}"

      TAREA: 
      Analiza la respuesta. Proporciona feedback constructivo (máximo 40 palabras) y lanza la siguiente pregunta técnica.
      
      RESPONDE EXCLUSIVAMENTE CON ESTE JSON:
      {
        "feedback": "string",
        "score": número (1-10 de la respuesta actual),
        "nextQuestion": "string"
      }
    `;

    return await this.generateAiResponse(chatPrompt);
  }

  private async generateAiResponse(prompt: string) {
    try {
      const response = await this.aiService.callGeminiRaw(prompt);
      return response;
    } catch (error) {
      throw new Error('Error en la simulación de entrevista');
    }
  }
}
