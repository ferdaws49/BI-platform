// import/entities/import-job.entity.ts

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ImportStatus = 'pending' | 'processing' | 'done' | 'failed';

@Entity('import_job')
export class ImportJob {
  @PrimaryGeneratedColumn()
  id: number;

  /** Type d'entité : "users" | "apprenant" | "formation" | "sessions" | "finance" */
  @Column()
  type: string;

  /** Cycle de vie du job */
  @Column({ default: 'pending' })
  status: ImportStatus;

<<<<<<< HEAD
  @Column({ nullable: true })
  filePath: string;
}
=======
  /** Nom du fichier original uploadé */
  @Column({ default: '' })
  file_path: string;
>>>>>>> 2b077d31bd11532c6659a78b2d09dbd76bf7138b

  /** Nombre de lignes valides reçues du frontend */
  @Column({ default: 0 })
  total_rows: number;

  /** Lignes effectivement persistées en DB */
  @Column({ default: 0 })
  imported_rows: number;

  /** Lignes en erreur côté serveur */
  @Column({ default: 0 })
  error_count: number;

  /** Stratégie doublons utilisée */
  @Column({ default: 'ignore' })
  duplicate_strategy: string;

  /** Stratégie relations manquantes utilisée */
  @Column({ default: 'ignore' })
  relation_strategy: string;

 @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}