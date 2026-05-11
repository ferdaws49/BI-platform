import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
export enum UserRole {
  DIRECTEUR = 'directeur',
  ADMIN = 'admin',
  RESP_PEDAGOGIQUE = 'resp_pedagogique',
  APPRENANT = 'apprenant',
  RESP_FINANCIER = 'resp_financier'
}

export enum UserStatus {
  ACCEPTED = 'accepted',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ nullable: true })       // ← ADD : nom complet affiché dans le tableau
  nom: string;
   @Column({ nullable: true })       // ← ADD : nom complet affiché dans le tableau
  prenom: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  phone: string;

   // ─── Reset password ───────────────────────────────────────
  // ✅ Dans users.entity.ts
@Column({ type: 'varchar', nullable: true })
resetToken: string | null;

@Column({ type: 'timestamptz', nullable: true })
resetTokenExpiry: Date | null;
    @CreateDateColumn()
  createdAt: Date;
 
  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'varchar', nullable: true })
    profileImage: string | null;
}

