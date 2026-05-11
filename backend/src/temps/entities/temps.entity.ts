import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'dim_temps' })
export class DateDimension {
  @PrimaryColumn({ type: 'date' })
  date_full: Date;

  @Column()
  jour: number; 

  @Column()
  mois: number; 

  @Column()
  nom_mois: string; 

  @Column()
  annee: number; 

  @Column()
  trimestre: number; 

  @Column()
  semaine: number;

  @Column()
  jour_semaine: string;
}