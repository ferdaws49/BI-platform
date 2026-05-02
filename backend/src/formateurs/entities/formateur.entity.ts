import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Session } from '../../sessions/entities/session.entity';

@Entity()
export class Formateur {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @Column()
  prenom: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  specialite: string;

  @Column({ nullable: true })
  telephone: string;

  // ✅ الفورماتور مربوط بالسيشن فقط
  @OneToMany(() => Session, (session) => session.formateur)
  sessions: Session[];
}
