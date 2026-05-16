// satisfaction/entities/satisfaction.entity.ts

import { Apprenant } from 'src/apprenants/entities/apprenant.entity';
import { Formation } from 'src/formations/entities/formation.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
@Entity()
export class Satisfaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Apprenant)
  apprenant: Apprenant;

  @ManyToOne(() => Formation)
  formation: Formation;

  @Column('decimal', { precision: 3, scale: 1 })
  note: number; // 1 à 5

  @Column({ nullable: true })
  commentaire?: string;

  @CreateDateColumn()
  createdAt: Date;

  // contrainte: un seul avis par apprenant par formation
  // @Unique(['apprenant', 'formation']) ← dans l'entity ou en migration
}
