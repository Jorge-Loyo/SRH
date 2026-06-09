import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  username!: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null

  @Column({ type: 'varchar', length: 255 })
  password_hash!: string

  @Column({ type: 'varchar', length: 16, default: 'viewer' })
  role!: 'admin' | 'editor' | 'viewer' | 'director' | 'gerencia' | 'concursales'

  // Código de hospital al que pertenece (ej: HGACA)
  @Column({ type: 'varchar', length: 20, nullable: true })
  hospital_code!: string | null

  // Nombre visual personalizado para el rol (puramente estético, no afecta permisos)
  @Column({ type: 'varchar', length: 50, nullable: true })
  role_alias!: string | null

  @Column({ type: 'boolean', default: true })
  is_active!: boolean

  @CreateDateColumn()
  created_at!: Date

  @UpdateDateColumn()
  updated_at!: Date
}
