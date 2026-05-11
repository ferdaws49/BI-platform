//hedha wa9t el apprenant deja approuvé , w yheb yzid yaamel inscription okhra
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ParticipateSessionDto {
  @IsInt()
  @IsNotEmpty()
  formationId: number; // L'apprenant choisit l'ID du programme

  @IsString()      // Ajoute ceci
  @IsOptional() // Ajoute ceci
  sessionId: string;
}