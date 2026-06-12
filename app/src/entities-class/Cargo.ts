import { BaseEntity, Entity, PrimaryColumn, Column, OneToMany, Index } from 'typeorm'
import { Rol } from './Rol'

@Entity({ name: 'cargos' })
@Index(['id_cargo', 'periodo'])
@Index(['periodo'])
export class Cargo extends BaseEntity {
  @PrimaryColumn('int')
  id_cargo!: number

  @PrimaryColumn({ type: 'varchar', length: 10 })
  periodo!: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  codigo_cargo?: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  estado_cargo?: string | null

  @OneToMany(() => Rol, (rol) => rol.cargo)
  roles!: Rol[]
}
