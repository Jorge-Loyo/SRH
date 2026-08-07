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
}
