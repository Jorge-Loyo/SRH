import { BaseEntity, Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm'
import { Cargo } from './Cargo'
import { Persona } from './Persona'
import { Sigla } from './Sigla'

@Entity({ name: 'roles' })
@Index(['id_rol', 'periodo'])
@Index(['periodo'])
@Index(['id_cargo'])
@Index(['id_persona'])
@Index(['id_sigla'])
export class Rol extends BaseEntity {
  @PrimaryColumn('int')
  id_rol!: number

  @PrimaryColumn({ type: 'varchar', length: 10 })
  periodo!: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  codigo_rol?: string | null

  @Column({ type: 'int', nullable: true })
  id_cargo!: number | null

  @Column({ type: 'int', nullable: true })
  id_persona!: number | null

  @Column({ type: 'int', nullable: true })
  id_sigla!: number | null

  @Column('int')
  codigo_reparticion!: number

  @Column({ type: 'varchar', length: 200 })
  descripcion_reparticion!: string

  @Column({ type: 'varchar', length: 50 })
  escalafon!: string

  @Column({ type: 'varchar', length: 5, nullable: true })
  codigo_registro?: string | null

  @Column({ type: 'varchar', length: 100 })
  literal_codigo_registro!: string

  @Column({ type: 'varchar', length: 50 })
  situacion_revista!: string

  @Column({ type: 'varchar', length: 100 })
  literal_puesto!: string

  @Column({ type: 'varchar', length: 100 })
  unificador_puesto!: string

  @Column({ type: 'varchar', length: 50 })
  agrupador!: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  j_categoria?: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  jefaturas?: string | null

  @Column({ type: 'varchar', length: 10, nullable: true })
  escritorio?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  pou_desde?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  dia?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_bloqueo?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  bloqueo_motivo?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  bloqueo_comentario?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  cargo_desde?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  cargo_hasta?: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  puesto?: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  codigo_agrupamiento?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  literal_agrupamiento?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  doc_respaldatoria_j_categoria?: string | null

  @Column({ type: 'varchar', length: 250, nullable: true })
  j_comentario?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  comision_repa?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  descripcion_repa_comision?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  documentacion_alta?: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  documentacion_baja?: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  estado?: string | null

  @ManyToOne(() => Cargo, (cargo) => cargo.roles, { nullable: true })
  @JoinColumn([
    { name: 'id_cargo', referencedColumnName: 'id_cargo' },
    { name: 'periodo', referencedColumnName: 'periodo' },
  ])
  cargo?: Cargo | null

  @ManyToOne(() => Persona, (persona) => persona.roles, { nullable: true })
  @JoinColumn([
    { name: 'id_persona', referencedColumnName: 'id_persona' },
    { name: 'periodo', referencedColumnName: 'periodo' },
  ])
  persona?: Persona | null

  @ManyToOne(() => Sigla, (sigla) => sigla.roles, { nullable: true })
  @JoinColumn({ name: 'id_sigla', referencedColumnName: 'id_sigla' })
  sigla?: Sigla | null
}
