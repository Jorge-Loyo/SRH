import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity({ name: 'audit_logs' })
export class AuditLog extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  // Username o email del usuario autenticado (API/JWT)
  @Index()
  @Column({ type: 'varchar', length: 120, nullable: true })
  user_username!: string | null

  @Index()
  @Column({ type: 'varchar', length: 32, nullable: true })
  user_role!: string | null

  // 'api' | 'admin' | 'auth'
  @Index()
  @Column({ type: 'varchar', length: 16 })
  source!: string

  // create | update | delete | login | refresh | logout | other
  @Index()
  @Column({ type: 'varchar', length: 32 })
  action!: string

  @Column({ type: 'varchar', length: 128, nullable: true })
  resource!: string | null

  @Column({ type: 'varchar', length: 64, nullable: true })
  record_id!: string | null

  @Column({ type: 'varchar', length: 10, nullable: true })
  method!: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  path!: string | null

  @Column({ type: 'int', nullable: true })
  status!: number | null

  @Column({ type: 'text', nullable: true })
  changes!: string | null

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null

  @Column({ type: 'varchar', length: 256, nullable: true })
  user_agent!: string | null

  @Index()
  @CreateDateColumn()
  created_at!: Date
}
