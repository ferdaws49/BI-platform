// performances/entities/performance.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, 
         ManyToOne, CreateDateColumn } from 'typeorm';
import { Apprenant } from '../../apprenants/entities/apprenant.entity';
import { Formation } from '../../formations/entities/formation.entity';
import { Session } from 'src/sessions/entities/session.entity';

@Entity()
export class Performance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Apprenant)
  apprenant: Apprenant;
  
  @ManyToOne(() => Session)
  session: Session;

  @ManyToOne(() => Formation)
  formation: Formation;

  @Column('decimal')
  note: number; // admin enters this manually

  @Column({ default: false })
  estReussi: boolean; // calculated automatically: note >= 10

  @CreateDateColumn()
  date: Date;
}