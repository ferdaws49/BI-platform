import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Formation } from '../../formations/entities/formation.entity';
import { Formateur } from '../../formateurs/entities/formateur.entity';
import { Apprenant } from '../../apprenants/entities/apprenant.entity';
import { Presence } from './presence.entity';

export enum SessionType {
  PRESENTIEL = 'présentiel',
  EN_LIGNE = 'en_ligne',
}
export enum SessionStatut {
  ACTIF = 'Active',
  TERMINE = 'Completed',
  ANNULE = 'Cancelled',
}


// Une session correspond a une seance planifiee d'une formation.
// Elle contient le planning, les personnes liees a la seance
// et les presences marquees pour cette date.
@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  heureDebut: string;

  @Column({ type: 'time' })
  heureFin: string;

  @Column({ nullable: true })
  lieu: string;

  // ✅ type de session
  @Column({
    type: 'enum',
    enum: SessionType,
    default: SessionType.PRESENTIEL,
  })
  type: SessionType;

  @Column({
    type: 'enum',
    enum: SessionStatut,
    default: SessionStatut.ACTIF,
  })
  statut: SessionStatut;

  // `null` = on reprend le prix de la formation.
  // Valeur renseignee = prix specifique a cette session.
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  prix: number | null;

  // عدد الأماكن المتاحة ✅
  // ✅ Fixed
  @Column({ type: 'int', nullable: true })
  capacite: number | null;

  // Formation concernee par la session.
  @ManyToOne(() => Formation, (formation) => formation.sessions, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({ name: 'formationId' })
  formation: Formation;

  @Column()
  formationId: number;

  // Formateur assigne a la session.
  @ManyToOne(() => Formateur, (formateur) => formateur.sessions, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'formateurId' })
  formateur: Formateur | null;

  @Column({ nullable: true })
  formateurId: number | null;

  // Apprenants inscrits a cette session.
  @ManyToMany(() => Apprenant, { eager: true })
  @JoinTable({
    name: 'sessions_apprenants',
    joinColumn: { name: 'sessionId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'apprenantId', referencedColumnName: 'id' },
  })
  apprenants: Apprenant[];

  // Liste des presences enregistrees pour la session.
  @OneToMany(() => Presence, (p) => p.session, { cascade: true })
  presences: Presence[];

  // Colonnes gerees automatiquement par TypeORM.
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
