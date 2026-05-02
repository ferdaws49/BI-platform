import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Session } from './session.entity';
import { Apprenant } from '../../apprenants/entities/apprenant.entity';

@Entity('presences')
// Une seule ligne de presence est autorisee par apprenant et par session.
@Unique(['sessionId', 'apprenantId'])
export class Presence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Session, (s) => s.presences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @Column()
  sessionId: string;

  @ManyToOne(() => Apprenant, { eager: true })
  @JoinColumn({ name: 'apprenantId' })
  apprenant: Apprenant;

  @Column()
  apprenantId: number;

  @Column({ default: false })
  estPresent: boolean;

  // Date de la derniere saisie de presence.
  @Column({ type: 'timestamp', default: () => 'NOW()' })
  dateMarquage: Date;
}
