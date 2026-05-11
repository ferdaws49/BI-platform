import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ImportJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  filePath: string;
}

