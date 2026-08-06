import { BaseEntity, Entity, PrimaryGeneratedColumn, PrimaryColumn, Column } from 'typeorm'

@Entity({ name: 'carreras' })
export class Carrera extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id_carrera!: number

  @PrimaryColumn({ type: 'varchar', length: 10, unique: true })
  codigo!: string  // 'CPH' | 'ENF' | 'TEC' | ...

  @Column({ type: 'varchar', length: 100 })
  nombre!: string

  @Column({ type: 'boolean', default: true })
  activo!: boolean
}
