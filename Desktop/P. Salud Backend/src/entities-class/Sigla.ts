import { BaseEntity, Entity, PrimaryColumn, Column, OneToMany, Index } from 'typeorm'
import { Rol } from './Rol'

@Entity({ name: 'siglas' })
@Index(['sigla'])
export class Sigla extends BaseEntity {
  @PrimaryColumn('int')
  id_sigla!: number

  @Column({ type: 'varchar', length: 20 })
  sigla!: string

  @Column({ type: 'varchar', length: 50 })
  universo_totalizador!: string

  @Column({ type: 'varchar', length: 100 })
  tipo_hospital_sigla!: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  monovalencia?: string | null

  @OneToMany(() => Rol, (rol) => rol.sigla)
  roles!: Rol[]
}
