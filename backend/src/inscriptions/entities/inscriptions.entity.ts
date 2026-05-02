// inscription.entity.ts

import {
    Entity, PrimaryGeneratedColumn,
    Column, CreateDateColumn,
 } from "typeorm";

export enum InscriptionStatut {
  NOT_VERIFIED = 'not_verified',
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('inscriptions')
export class Inscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @Column()
  prenom: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  telephone: string;

  @Column({ nullable: true })
  programme: string; // text بسيط ✅

  @Column()
  password: string; // hashed ✅

  @Column({
    type: 'enum',
    enum: InscriptionStatut,
    default: InscriptionStatut.NOT_VERIFIED,
  })
  statut: InscriptionStatut;

  @Column({ type: 'varchar', nullable: true })
  verifyToken: string | null; // ← ajoute "| null"
  @CreateDateColumn()
  createdAt: Date;
}
