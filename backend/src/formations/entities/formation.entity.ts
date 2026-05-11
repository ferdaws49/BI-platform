import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Session } from '../../sessions/entities/session.entity';

export enum FormationStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
}


@Entity('formations')
export class Formation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  titre: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  categorie: string;

  @Column({ nullable: true })
  dureeHeures: number;

  @Column('decimal', { precision: 12, scale: 2 })
  prix: number;

  @Column({
    type: 'enum',
    enum: FormationStatus,
    default: FormationStatus.ACTIVE,
  })
  statut: FormationStatus;

  @OneToMany(() => Session, (session) => session.formation)
  sessions: Session[];

  // In formation.entity.ts, after your sessions relation:

  // No direct Finance relation — access via sessions

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  

  
}
