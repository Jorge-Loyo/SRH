import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

/**
 * Tabla principal del Formulario de Alta de Cargo.
 * Registra la carrera seleccionada y la fecha del alta.
 * Cada registro se vincula con una tabla hija según la carrera.
 */
@Entity({ name: 'cargos_alta' })
@Index(['carrera_seleccionada'])
export class CargosAlta extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @CreateDateColumn({ type: 'datetime' })
  fecha_registro!: Date

  @Column({ type: 'varchar', length: 10 })
  carrera_seleccionada!: string  // 'cph' | 'enf' | 'tec'

  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  categoria_interna!: string | null

  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  jornada!: string | null

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  norma_referencia!: string | null

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  nro_resolucion!: string | null

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  expediente_origen!: string | null
}
