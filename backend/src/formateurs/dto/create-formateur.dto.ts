import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class CreateFormateurDto {
  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsString()
  @IsNotEmpty()
  prenom: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  specialite?: string;

  @IsString()
  @IsOptional()
  telephone?: string;
}
