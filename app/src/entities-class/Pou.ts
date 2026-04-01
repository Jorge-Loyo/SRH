import { BaseEntity, Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm'
import { Sigla } from './Sigla'

@Entity({ name: 'pou' })
@Index(['sigla', 'periodo'])
@Index(['periodo'])
export class Pou extends BaseEntity {
  @PrimaryColumn('int')
  id!: number

  @PrimaryColumn({ type: 'varchar', length: 7 })
  periodo!: string

  @Column({ type: 'varchar', length: 10 })
  sigla!: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  descripcion_sigla?: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  perfil?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  especialidad?: string | null

  @Column({ type: 'int', nullable: true })
  dotacion_diaria?: number | null

  @Column({ type: 'int', nullable: true })
  dotacion_sem?: number | null

  @Column({ type: 'int', nullable: true })
  dotacion_total?: number | null

  @Column({ type: 'int', nullable: true })
  activos?: number | null

  @Column({ type: 'int', nullable: true })
  tecnicos?: number | null

  @Column({ type: 'int', nullable: true })
  vacantes?: number | null

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: true })
  created_at?: Date | null

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: true })
  updated_at?: Date | null

  @ManyToOne(() => Sigla, { nullable: true })
  @JoinColumn({ name: 'sigla', referencedColumnName: 'sigla' })
  siglaRelacion?: Sigla
}
