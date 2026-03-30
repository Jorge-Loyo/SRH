import { BaseEntity, Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm'
import { Cargo } from './Cargo'

@Entity({ name: 'bajas_concursos' })
@Index(['id_baja', 'periodo'])
@Index(['periodo'])
@Index(['id_cargo'])
export class BajaConcurso extends BaseEntity {
  @PrimaryColumn('int')
  id_baja!: number

  @PrimaryColumn({ type: 'varchar', length: 10 })
  periodo!: string

  @Column('int')
  id_cargo!: number

  @Column({ type: 'varchar', length: 50, nullable: true })
  ex_baja?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  sigla?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  codigo_cargo?: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  ex_concurso?: string | null

  @Column({ type: 'varchar', length: 10, nullable: true })
  fecha_baja?: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  motivo_baja?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  nombre_apellido?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  puesto_baja?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  especialidad_baja?: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  unificador_puestos?: string | null

  @ManyToOne(() => Cargo, (cargo) => cargo.bajas, { nullable: false })
  @JoinColumn([
    { name: 'id_cargo', referencedColumnName: 'id_cargo' },
    { name: 'periodo', referencedColumnName: 'periodo' },
  ])
  cargo!: Cargo
}
