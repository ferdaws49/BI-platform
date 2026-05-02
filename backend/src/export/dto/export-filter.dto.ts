import { IsOptional, IsString, IsIn, IsArray } from 'class-validator';
 
export class ExportDto {
  @IsIn(['csv', 'excel', 'pdf'])
  format: 'csv' | 'excel' | 'pdf';
 
  @IsOptional()
  @IsString()
  periode?: string; // '7 derniers jours' | '30 derniers jours' | ...
 
  @IsOptional()
  @IsString()
  formation?: string;
 
  @IsOptional()
  @IsString()
  formateur?: string;
 
  @IsOptional()
  @IsArray()
  rapports?: string[]; // ['strategique', 'financiere', 'performance', 'qualite']
}