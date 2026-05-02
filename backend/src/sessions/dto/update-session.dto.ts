import { PartialType } from '@nestjs/mapped-types';
import { CreateSessionDto } from './create-session.dto';

// Meme structure que la creation, mais tous les champs sont optionnels.
export class UpdateSessionDto extends PartialType(CreateSessionDto) {}
