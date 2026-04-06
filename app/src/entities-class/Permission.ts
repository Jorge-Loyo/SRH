import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

@Entity({ name: 'permissions' })
export class Permission extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  role!: 'admin' | 'editor' | 'viewer' | 'director' | 'gerencia'

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null

  // Permisos CRUD
  @Column({ type: 'boolean', default: false })
  can_read_all!: boolean

  @Column({ type: 'boolean', default: false })
  can_create!: boolean

  @Column({ type: 'boolean', default: false })
  can_update!: boolean

  @Column({ type: 'boolean', default: false })
  can_delete!: boolean

  // Permisos de estructura
  @Column({ type: 'boolean', default: false })
  can_alter_structure!: boolean

  @Column({ type: 'boolean', default: false })
  can_manage_users!: boolean

  // Auditoría
  @Column({ type: 'boolean', default: false })
  can_view_audit!: boolean

  // Filtros de datos
  @Column({ type: 'boolean', default: false })
  filter_by_hospital!: boolean

  @Column({ type: 'varchar', length: 20, nullable: true })
  hospital_code!: string | null

  @CreateDateColumn()
  created_at!: Date

  @UpdateDateColumn()
  updated_at!: Date
}
