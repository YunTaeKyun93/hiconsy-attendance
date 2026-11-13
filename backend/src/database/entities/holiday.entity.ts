import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('holidays')
export class Holiday {
  /** 'YYYY-MM-DD' */
  @PrimaryColumn({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;
}
