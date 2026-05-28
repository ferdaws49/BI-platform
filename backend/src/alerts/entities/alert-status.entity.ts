import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

// import { User } from '../../users/entities/user.entity'; // uncomment كي تربطها

@Entity('alert_status')
export class AlertStatus {
  @PrimaryGeneratedColumn()
  id: number;

  // stable hash: type-formation-date (كيما قلنا)
  @Column({ name: 'alert_id', type: 'varchar', length: 100 })
  alertId: string;

  @Column({ name: 'is_viewed', default: false })
  isViewed: boolean;

  @Column({ name: 'is_treated', default: false })
  isTreated: boolean;

  // @ManyToOne(() => User)
  // @JoinColumn({ name: 'user_id' })
  // user: User;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
