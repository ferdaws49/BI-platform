import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsInt } from 'class-validator';

// DTO pour creer ou mettre a jour la presence d'un apprenant.
export class MarquerPresenceDto {
  @Type(() => Number)
  @IsInt()
  apprenantId!: number;

  // Accepte aussi les chaines "true" et "false" venant du front.
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  estPresent!: boolean;
}
