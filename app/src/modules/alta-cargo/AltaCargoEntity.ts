import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity({ name: 'cargos_alta' })
export class CargosAlta extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @CreateDateColumn({ type: 'datetime' })
  fecha_registro!: Date

  @Column({ type: 'enum', enum: ['ejecucion', 'estructura'], default: 'ejecucion' })
  tipo_alta!: 'ejecucion' | 'estructura'

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  documento!: string | null

  @Column({ type: 'int', unsigned: true, default: 1 })
  cantidad!: number

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  norma_referencia!: string | null

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  nro_resolucion!: string | null

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  documento_origen!: string | null
}
