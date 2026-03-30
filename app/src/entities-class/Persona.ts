import { BaseEntity, Entity, PrimaryColumn, Column, OneToMany, Index } from 'typeorm'
import { Rol } from './Rol'

@Entity({ name: 'personas' })
@Index(['id_persona', 'periodo'])
@Index(['periodo'])
export class Persona extends BaseEntity {
  @PrimaryColumn('int')
  id_persona!: number

  @PrimaryColumn({ type: 'varchar', length: 10 })
  periodo!: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  codigo_persona?: string | null

  @Column('bigint')
  cuil!: string | number

  @Column({ type: 'varchar', length: 20, nullable: true })
  cuil_rol?: string | null

  @Column({ type: 'varchar', length: 100 })
  nombre_apellido!: string

  @Column({ type: 'varchar', length: 15, nullable: true })
  fecha_nacimiento?: string | null

  @Column('int')
  edad!: number

  @Column({ type: 'varchar', length: 15, nullable: true })
  sexo?: string | null

  @Column({ type: 'varchar', length: 10 })
  tipo_doc!: string

  @Column('bigint')
  numero_doc!: string | number

  @Column({ type: 'varchar', length: 100, nullable: true })
  especialidad?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  telefono?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  mail_personal?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  mail_laboral?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  domicilio?: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  localidad?: string | null

  @Column({ type: 'varchar', length: 15, nullable: true })
  antiguedad?: string | null

  @OneToMany(() => Rol, (rol) => rol.persona)
  roles!: Rol[]
}
