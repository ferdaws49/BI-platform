import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Session } from '../../sessions/entities/session.entity';

export enum FinanceType {
  PAIEMENT = 'paiement',
  DEPENSE = 'depense',
  IMPAYE = 'impaye',
  REMBOURSEMENT = 'remboursement',
}

@Entity('finances')
export class Finance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 12, scale: 2 })
  montant: number;

  @Column({
    type: 'enum',
    enum: FinanceType,
  })
  type: FinanceType;

  // ✅ مربوطة بـ session موش formation
  @ManyToOne(() => Session, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: true,
  })
  @JoinColumn({ name: 'sessionId' })
  session: Session | null;

  @Column({ nullable: true })
  sessionId: string | null;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  date: Date;
}
