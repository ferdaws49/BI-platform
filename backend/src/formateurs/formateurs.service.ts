import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Formateur } from './entities/formateur.entity';
import { CreateFormateurDto } from './dto/create-formateur.dto';
import { UpdateFormateurDto } from './dto/update-formateur.dto';

@Injectable()
export class FormateursService {
  constructor(
    @InjectRepository(Formateur)
    private readonly formateurRepository: Repository<Formateur>,
  ) {}

  findAll() {
    // ✅ FIX : 'formations' n'existe pas dans Formateur → causait le 500
    // Formateur a seulement une relation 'sessions'
    return this.formateurRepository.find({ relations: ['sessions'] });
  }

  create(dto: CreateFormateurDto) {
    const formateur = this.formateurRepository.create(dto);
    return this.formateurRepository.save(formateur);
  }

  async update(id: string | number, dto: UpdateFormateurDto) {
    const formateur = await this.formateurRepository.findOne({
      where: { id: Number(id) },
    });
    if (!formateur) throw new NotFoundException('Formateur non trouvé');
    Object.assign(formateur, dto);
    return this.formateurRepository.save(formateur);
  }

  async delete(id: string | number) {
    const result = await this.formateurRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException('Formateur non trouvé');
    return { deleted: true };
  }
}
