// apprenant.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,

  OneToMany,
 
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';

import { User } from 'src/users/users.entity';
import { Session } from 'src/sessions/entities/session.entity';
@Entity('apprenants')
export class Apprenant {
  @PrimaryGeneratedColumn()
  id: number;

  // FK → users ✅
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  // وقت قبول admin ✅
  @CreateDateColumn()
  dateAccepted: Date;


  
  // ✅ Table pivot explicite : sessions_apprenants
  @ManyToMany(() => Session, (session) => session.apprenants)
  @JoinTable({
    name: 'sessions_apprenants', // nom exact de ta table pivot
    joinColumn: {
      name: 'apprenantId', // FK vers apprenants.id
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'sessionId', // FK vers sessions.id
      referencedColumnName: 'id',
    },
  })
  sessions: Session[];
  

  
}
